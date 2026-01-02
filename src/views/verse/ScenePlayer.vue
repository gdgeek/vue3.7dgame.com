<template>
  <div>
    <div
      id="scene"
      ref="scene"
      :style="{
        height: isSceneFullscreen ? '100vh' : '75vh',
        width: '100%',
        margin: '0 auto',
        position: 'relative',
      }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "stats.js";

import { ref, onMounted, onUnmounted, watch } from "vue";

import { ThemeEnum } from "@/enums/ThemeEnum";
import { useSettingsStore } from "@/store/modules/settings";
import { useModelLoader } from "./composables/useModelLoader";
import {
  Verse,
  Entity,
  Resource,
  CollisionObject,
  RotatingObject,
  MoveableObject,
  DragState,
  Transform,
} from "@/types/verse";

const settingsStore = useSettingsStore();

const props = defineProps<{
  verse: Verse;
  isSceneFullscreen?: boolean;
}>();

declare global {
  interface Window {
    verse: {
      [key: string]: Function;
    };
  }
}

const scene = ref<HTMLDivElement | null>(null);
const threeScene = new THREE.Scene();
const camera = ref<THREE.PerspectiveCamera | null>(null);
const renderer = ref<THREE.WebGLRenderer | null>(null);
let mixers: Map<string, THREE.AnimationMixer> = new Map();
let sources: Map<string, any> = new Map();
let clock = new THREE.Clock();
const eventContainer = ref<{ [key: string]: any }>({});
const isDark = computed<boolean>(() => settingsStore.theme === ThemeEnum.DARK);

const collisionObjects = ref<CollisionObject[]>([]);

const rotatingObjects = ref<RotatingObject[]>([]);

const moveableObjects = ref<MoveableObject[]>([]);

// 添加拖拽状态管理
const dragState = reactive<DragState>({
  isDragging: false,
  draggedObject: null, // 拖动的对象
  dragStartPosition: new THREE.Vector3(), // 拖动开始位置
  dragOffset: new THREE.Vector3(), // 拖动偏移量
  mouseStartPosition: new THREE.Vector2(), // 鼠标开始位置
  lastIntersection: new THREE.Vector3(), // 最后一次交点
});

const controls = ref<OrbitControls | null>(null);
const mouse = new THREE.Vector2(); // 鼠标位置
const raycaster = new THREE.Raycaster(); // 射线投射器
// 使用共享的 getConfiguredGLTFLoader()
// 初始化事件容器
const initEventContainer = () => {
  if (props.verse?.data) {
    const verseData =
      typeof props.verse.data === "string"
        ? JSON.parse(props.verse.data)
        : props.verse.data;
    if (verseData.children?.modules) {
      verseData.children.modules.forEach((module: any) => {
        const metaId = module.parameters.meta_id;
        const meta = props.verse.metas.find(
          (m: any) => m.id.toString() === metaId.toString()
        );

        if (meta?.events) {
          try {
            // const events = JSON.parse(meta.events);
            const events = meta.events;
            eventContainer.value[module.parameters.uuid] = events;
            console.log(
              `Module ${module.parameters.uuid} 的事件已加载:`,
              events
            );
          } catch (error) {
            console.error(
              `解析Module ${module.parameters.uuid} 的事件失败:`,
              error
            );
          }
        }
      });
    }
  }
};

// 合并transform, 处理父子相对位置
const combineTransforms = (parentTransform: any, childTransform: any) => {
  if (!parentTransform) {
    return (
      childTransform || {
        position: { x: 0, y: 0, z: 0 },
        rotate: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      }
    );
  }

  if (!childTransform) {
    return parentTransform;
  }

  // 创建父对象的旋转矩阵
  const parentRotationMatrix = new THREE.Matrix4();
  const parentRotationEuler = new THREE.Euler(
    THREE.MathUtils.degToRad(parentTransform.rotate.x),
    THREE.MathUtils.degToRad(parentTransform.rotate.y),
    THREE.MathUtils.degToRad(parentTransform.rotate.z),
    "XYZ"
  );
  parentRotationMatrix.makeRotationFromEuler(parentRotationEuler);

  // 创建子对象的位置向量
  const childPosition = new THREE.Vector3(
    childTransform.position.x,
    childTransform.position.y,
    childTransform.position.z
  );

  // 应用父对象的旋转到子对象的位置
  childPosition.applyMatrix4(parentRotationMatrix);

  // 应用父对象的缩放到子对象的位置
  childPosition.multiply(
    new THREE.Vector3(
      parentTransform.scale.x,
      parentTransform.scale.y,
      parentTransform.scale.z
    )
  );

  // 最终位置是父对象位置加上变换后的子对象位置
  const finalPosition = {
    x: parentTransform.position.x + childPosition.x,
    y: parentTransform.position.y + childPosition.y,
    z: parentTransform.position.z + childPosition.z,
  };

  // 旋转角度简单相加
  const finalRotation = {
    x: parentTransform.rotate.x + childTransform.rotate.x,
    y: parentTransform.rotate.y + childTransform.rotate.y,
    z: parentTransform.rotate.z + childTransform.rotate.z,
  };

  // 缩放值相乘
  const finalScale = {
    x: parentTransform.scale.x * childTransform.scale.x,
    y: parentTransform.scale.y * childTransform.scale.y,
    z: parentTransform.scale.z * childTransform.scale.z,
  };

  return {
    position: finalPosition,
    rotate: finalRotation,
    scale: finalScale,
  };
};

// 加载模型
const { loadModel } = useModelLoader({
  threeScene,
  camera,
  renderer,
  mixers,
  sources,
  collisionObjects,
  rotatingObjects,
  moveableObjects,
  dragState,
  controls,
  mouse,
  raycaster,
  verse: props.verse,
});

// 获取音频URL
const getAudioUrl = (uuid: string): string | undefined => {
  const source = sources.get(uuid.toString());
  if (!source || source.type !== "audio") {
    console.error(`找不到UUID为 ${uuid} 的音频资源`);
    return undefined;
  }
  return (source.data as { url: string }).url;
};

// 播放动画
const playAnimation = (uuid: string, animationName: string) => {
  const source = sources.get(uuid.toString());
  if (!source || source.type !== "model") {
    console.error(`找不到UUID为 ${uuid} 的模型资源`);
    return;
  }

  const model = source.data.mesh as THREE.Object3D;
  const mixer = mixers.get(uuid);

  if (!model) {
    console.error(
      `找不到UUID为 ${uuid} 的模型，可用模型:`,
      Array.from(sources.keys())
    );
    return;
  }

  if (!mixer) {
    console.error(`找不到UUID为 ${uuid} 的动画混合器`);
    return;
  }

  const animations = model.userData?.animations;
  if (!animations || animations.length === 0) {
    console.error(`模型 ${uuid} 没有动画数据`);
    return;
  }

  const clip = animations.find(
    (anim: THREE.AnimationClip) => anim.name === animationName
  );
  if (!clip) {
    console.error(
      `找不到动画 "${animationName}"，可用动画:`,
      animations.map((a: THREE.AnimationClip) => a.name)
    );
    return;
  }

  mixer.stopAllAction();
  const action = mixer.clipAction(clip);
  action.reset();
  action.setLoop(THREE.LoopRepeat, Infinity);
  action.fadeIn(0.5);
  action.play();
};

// 音频播放处理
const handleAudioPlay = (audio: HTMLAudioElement) => {
  console.log("开始处理音频播放:", {
    src: audio.src,
    duration: audio.duration,
    currentTime: audio.currentTime,
  });

  return new Promise<void>((resolve) => {
    // 重置音频到开始位置
    audio.currentTime = 0;

    // 当音频播放结束时调用 resolve
    audio.onended = () => {
      console.log("音频播放完成:", {
        src: audio.src,
        duration: audio.duration,
      });
      resolve();
    };

    // 处理音频播放错误
    audio.onerror = () => {
      console.error("音频播放出错:", {
        src: audio.src,
        error: audio.error,
      });
      resolve();
    };

    // 开始播放
    audio.play().catch((error) => {
      console.error("播放音频失败:", {
        src: audio.src,
        error: error,
      });
      resolve();
    });
  });
};

// 音频播放队列管理
const audioPlaybackQueue: { audio: HTMLAudioElement; resolve: Function }[] = [];
let isPlaying = false;

// 处理音频队列
const processAudioQueue = async () => {
  console.log("处理音频队列:", {
    isPlaying,
    queueLength: audioPlaybackQueue.length,
  });

  if (isPlaying || audioPlaybackQueue.length === 0) return;

  isPlaying = true;

  while (audioPlaybackQueue.length > 0) {
    const current = audioPlaybackQueue[0];
    console.log("播放队列中的音频:", {
      src: current.audio.src,
      queueLength: audioPlaybackQueue.length,
    });

    await handleAudioPlay(current.audio);
    current.resolve();
    audioPlaybackQueue.shift();
  }

  isPlaying = false;
  console.log("音频队列处理完成");
};

// 音频播放
const playQueuedAudio = async (
  audio: HTMLAudioElement,
  skipQueue: boolean = false
) => {
  console.log("添加音频到播放队列:", {
    src: audio.src,
    skipQueue,
    currentQueueLength: audioPlaybackQueue.length,
  });

  // 如果设置跳过队列，则直接播放
  if (skipQueue) {
    return handleAudioPlay(audio);
  }

  // 否则加入队列
  return new Promise<void>((resolve) => {
    audioPlaybackQueue.push({ audio, resolve });
    processAudioQueue();
  });
};

// 递归处理meta中的实体
const processEntities = async (
  entities: Entity[],
  parentTransform?: Transform,
  level: number = 0,
  parentActive: boolean = true
) => {
  for (const entity of entities) {
    const entityTransform = combineTransforms(
      parentTransform,
      entity.parameters?.transform
    );

    // 计算当前实体的可见性状态，需要考虑父级的可见性
    const currentActive =
      (entity.parameters?.active !== undefined
        ? entity.parameters.active
        : true) && parentActive;

    console.log(`处理实体 [Level ${level}]:`, {
      type: entity.type,
      name: entity.parameters?.name,
      uuid: entity.parameters?.uuid,
      originalTransform: entity.parameters?.transform,
      parentTransform,
      combinedTransform: entityTransform,
      isActive: currentActive,
      parentActive,
    });

    // 处理当前实体
    if (entity.type === "Text") {
      try {
        const textResource: Resource = {
          type: "text",
          content: entity.parameters.text || "DEFAULT TEXT",
          id: entity.parameters.uuid || crypto.randomUUID(),
          file: { url: "" },
        };
        await loadModel(
          textResource,
          {
            ...entity,
            parameters: {
              ...entity.parameters,
              transform: entityTransform,
              active: currentActive, // 传递计算后的可见性状态
            },
          },
          undefined,
          currentActive // 使用计算后的可见性状态
        );
      } catch (error) {
        console.error("处理文本实体失败:", error);
      }
    } else if (entity.type === "Entity") {
      // 处理Entity类型
      console.log("处理Entity类型容器:", entity.parameters.uuid);
      const entityData = {
        type: "entity",
        data: {
          transform: entityTransform,
          setVisibility: () => {
            // Entity本身没有可见性，需要通过子实体控制
            console.log("Entity不支持直接设置可见性");
          },
        },
      };
      sources.set(entity.parameters.uuid, entityData);
    } else if (entity.parameters?.resource) {
      const resource = props.verse.resources.find(
        (r: Resource) =>
          r.id?.toString() === entity.parameters.resource?.toString()
      );
      if (resource) {
        try {
          await loadModel(
            resource,
            {
              ...entity,
              parameters: {
                ...entity.parameters,
                transform: entityTransform,
                active: currentActive, // 传递计算后的可见性状态
              },
            },
            undefined,
            currentActive // 使用计算后的可见性状态
          );
        } catch (error) {
          console.error(`加载模型失败:`, error);
        }
      }
    }

    // 递归处理子实体，传递当前实体的可见性状态
    if (entity.children?.entities) {
      await processEntities(
        entity.children.entities,
        entityTransform,
        level + 1,
        currentActive // 传递计算后的可见性状态给子实体
      );
    }
  }
};

// 初始化场景
onMounted(async () => {
  if (!scene.value) return;

  const width = scene.value.clientWidth;
  const height = scene.value.clientHeight;

  // 渲染器设置
  renderer.value = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.value.setSize(width, height);
  renderer.value.setClearColor(isDark.value ? 0x242424 : 0xeeeeee, 1);
  renderer.value.setPixelRatio(window.devicePixelRatio);
  renderer.value.outputColorSpace = THREE.SRGBColorSpace;
  scene.value.appendChild(renderer.value.domElement);

  // 相机设置
  camera.value = new THREE.PerspectiveCamera(50, width / height, 0.1, 1800); //
  camera.value.position.set(0, 7, 20); // 调整相机距离

  // 主环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  threeScene.add(ambientLight);

  // 主平行光
  const mainLight = new THREE.DirectionalLight(0xffffff, 2);
  mainLight.castShadow = true;
  mainLight.position.set(5, 10, 5);
  threeScene.add(mainLight);

  // 点光源
  const fillLight = new THREE.PointLight(0xffffff, 0.05);
  fillLight.castShadow = true;
  fillLight.position.set(0, 0, 0);
  threeScene.add(fillLight);

  // 轨道控制器设置
  controls.value = new OrbitControls(camera.value!, renderer.value!.domElement);
  controls.value.enableDamping = true;
  controls.value.dampingFactor = 0.05;
  controls.value.screenSpacePanning = true;
  controls.value.minDistance = 1; // 最小距离
  controls.value.maxDistance = 1000; // 最大距离

  // 加载verse中所有数据
  if (props.verse?.data) {
    const verseData =
      typeof props.verse.data === "string"
        ? JSON.parse(props.verse.data)
        : props.verse.data;
    console.log("解析后的verse全部数据:", props.verse);
    if (verseData.children?.modules) {
      for (const module of verseData.children.modules) {
        const metaId = module.parameters.meta_id;
        const meta = props.verse.metas.find(
          (m: any) => m.id.toString() === metaId.toString()
        );

        if (meta && meta.data) {
          // const metaData = JSON.parse(meta.data);
          const metaData = meta.data;
          console.log("解析后的metaData:", metaData);
          if (metaData.children?.entities) {
            // 使用递归处理可能存在的多级嵌套
            await processEntities(
              metaData.children.entities,
              module.parameters.transform
            );
          }
        }
      }
    }
  }

  initEventContainer();
  console.error("事件容器:", eventContainer.value);

  // 初始化性能监控
  const stats = new Stats();
  stats.showPanel(0); // 0: fps, 1: ms, 2: mb
  stats.dom.style.position = "absolute";
  stats.dom.style.top = "0px";
  stats.dom.style.left = "0px";
  if (scene.value) {
    scene.value.appendChild(stats.dom);
  }

  // 动画循环
  const animate = () => {
    stats.begin();
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    mixers.forEach((mixer) => mixer.update(delta));

    // 更新旋转
    rotatingObjects.value.forEach((obj) => {
      if (obj.checkVisibility && !obj.mesh.visible) {
        return;
      }
      obj.mesh.rotation.x += obj.speed.x * delta;
      obj.mesh.rotation.y += obj.speed.y * delta;
      obj.mesh.rotation.z += obj.speed.z * delta;
    });

    // 碰撞检测
    if (collisionObjects.value.length > 0) {
      for (const collisionObj of collisionObjects.value) {
        // 更新当前物体的包围盒
        const sourceModel = sources.get(collisionObj.sourceUuid)?.data.mesh;
        const targetModel = sources.get(collisionObj.targetUuid)?.data.mesh;

        // 如果任一模型不可见，跳过碰撞检测
        if (
          collisionObj.checkVisibility &&
          (!sourceModel?.visible || !targetModel?.visible)
        ) {
          continue;
        }

        // 检查物体是否移动
        if (!sourceModel.position.equals(collisionObj.lastPosition)) {
          // 更新包围盒
          collisionObj.boundingBox.setFromObject(sourceModel);

          // 创建目标物体的包围盒
          const targetBoundingBox = new THREE.Box3().setFromObject(targetModel);

          // 检测碰撞
          const isColliding =
            collisionObj.boundingBox.intersectsBox(targetBoundingBox);

          // 如果发生碰撞且之前未处于碰撞状态
          if (isColliding && !collisionObj.isColliding) {
            collisionObj.isColliding = true;
            console.log("检测到碰撞:", {
              source: collisionObj.sourceUuid,
              target: collisionObj.targetUuid,
            });

            // 执行碰撞事件
            if (
              window.meta &&
              typeof window.meta[`@${collisionObj.eventUuid}`] === "function"
            ) {
              try {
                window.meta[`@${collisionObj.eventUuid}`]();
              } catch (error) {
                console.error("执行碰撞事件处理函数失败:", error);
              }
            }
          }
          // 如果不再碰撞，重置碰撞状态
          else if (!isColliding && collisionObj.isColliding) {
            collisionObj.isColliding = false;
          }

          // 更新上一帧位置
          collisionObj.lastPosition.copy(sourceModel.position);
        }
      }
    }

    controls.value!.update();
    renderer.value!.render(threeScene, camera.value!);
    stats.end();
  };
  animate();

  // 窗口大小变化监听
  const handleResize = () => {
    if (!scene.value || !camera.value || !renderer.value) return;
    // 获取新的尺寸
    const width = scene.value.clientWidth;
    const height = scene.value.clientHeight;
    // 更新相机
    camera.value.aspect = width / height;
    camera.value.updateProjectionMatrix();
    // 更新渲染器
    renderer.value.setSize(width, height, true); // 添加 true 参数以更新像素比
    // 强制重新渲染一帧
    renderer.value.render(threeScene, camera.value);
  };

  // 监听容器尺寸变化
  const resizeObserver = new ResizeObserver(() => {
    handleResize();
  });
  if (scene.value) {
    resizeObserver.observe(scene.value);
  }

  // 监听全屏状态变化
  watch(
    () => props.isSceneFullscreen,
    (newValue) => {
      // 给浏览器一点时间来完成全屏切换
      setTimeout(() => {
        handleResize();
      }, 50);

      // 再次延迟检查以确保尺寸正确更新
      setTimeout(() => {
        handleResize();
      }, 100);
    }
  );

  // 在组件卸载时清理
  onUnmounted(() => {
    resizeObserver.disconnect();
    window.removeEventListener("resize", handleResize);
  });
});

// 监听主题变化
watch(isDark, (newValue) => {
  if (renderer.value) {
    renderer.value.setClearColor(newValue ? 0x242424 : 0xeeeeee, 1);
  }
});

// 清理
onUnmounted(() => {
  sources.forEach((source) => {
    if (source.type === "video") {
      const video = source.data.video;
      video.pause();
      video.src = "";
      video.load();

      // 清理事件监听器
      if (source.data.cleanup) {
        source.data.cleanup();
      }
    } else if (source.type === "audio") {
      // 清理音频队列
      while (audioPlaybackQueue.length > 0) {
        const queueItem = audioPlaybackQueue.shift();
        if (queueItem) {
          const audio = queueItem.audio;
          audio.pause();
          audio.src = "";
          audio.load();
          queueItem.resolve(); // 解决所有待处理的Promise
        }
      }
    }
  });

  if (renderer.value) {
    renderer.value.dispose();
    renderer.value.forceContextLoss();
    renderer.value.domElement.remove();
  }

  isPlaying = false;
  sources.clear();
  mixers.clear();
  clock = new THREE.Clock();

  // 清理碰撞检测数据
  collisionObjects.value = [];
  // 清理旋转对象
  rotatingObjects.value = [];
  // 清理可移动对象
  moveableObjects.value = [];
  // 清理拖拽状态
  dragState.isDragging = false;
  // 清理拖拽对象
  dragState.draggedObject = null;
});

// 暴露方法
defineExpose({
  sources,
  playAnimation,
  getAudioUrl,
  playQueuedAudio,
});
</script>

<style scoped>
#scene {
  transition: height 0.3s ease;
}
</style>
