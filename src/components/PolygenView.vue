<template>
  <el-card class="box-card">
    <template #header v-if="animations.length !== 0">
      <el-select
        v-model="selectedAnimationIndex"
        @change="playAnimation"
        placeholder="Select Animation"
        style="width: 100%"
        size="small"
        :emptyText="'No data'"
        :disabled="animations.length === 0"
      >
        <el-option
          v-if="animations.length === 0"
          :key="0"
          :label="'No data'"
          :value="0"
          disabled
        ></el-option>
        <el-option
          v-for="(animation, index) in animations"
          :key="index"
          :label="animation.name"
          :value="index"
        ></el-option>
      </el-select>
      <!--
      <el-switch v-model="isAnimationPlaying" @change="toggleAnimation" style="margin-left: 5px" inline-prompt
        :active-text="$t('polygen.animation.animationOn')" :inactive-text="$t('polygen.animation.animationOff')"
        :disabled="animations.length === 0"></el-switch>-->
    </template>

    <div id="three" ref="three" style="height: 400px; width: 100%"></div>

    <!--动画时间进度条 -->
    <div v-if="animations.length > 0" class="animation-progress">
      <el-slider
        v-model="animationProgress"
        :disabled="animations.length === 0"
        :min="0"
        :max="100"
        :step="0.1"
        @input="previewAnimation"
        @change="seekAnimation"
        size="small"
        :show-tooltip="true"
        :format-tooltip="(value) => `${value.toFixed(1)}%`"
      ></el-slider>
      <div class="animation-controls">
        <div
          class="animation-button"
          @click="animations.length > 0 && toggleAnimation(!isAnimationPlaying)"
          :class="{ disabled: animations.length === 0 }"
        >
          <img
            :src="
              isAnimationPlaying
                ? '/media/icon/animation_pause.png'
                : '/media/icon/animation_play.png'
            "
            class="animation-icon"
            alt="animation control"
          />
        </div>
        <span v-if="animations.length > 0" class="animation-time">
          {{ formatTime(currentAnimationTime) }} /
          {{ formatTime(totalAnimationDuration) }}
        </span>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js"; // ★ 新增
import ElementResizeDetector from "element-resize-detector";
import { convertToHttps } from "@/assets/js/helper";

// 将Vector3的坐标值固定到小数点后n位
function toFixedVector3(vec: THREE.Vector3, n: number): THREE.Vector3 {
  const result = new THREE.Vector3();
  result.x = parseFloat(vec.x.toFixed(n));
  result.y = parseFloat(vec.y.toFixed(n));
  result.z = parseFloat(vec.z.toFixed(n));
  return result;
}

const props = defineProps<{
  file: { url: string };
  target?: number;
}>();
const emit = defineEmits<{
  (
    e: "loaded",
    data: {
      size: THREE.Vector3;
      center: THREE.Vector3;
      anim?: { name: string; length: number }[];
    }
  ): void;
  (e: "progress", progress: number): void;
}>();

const three = ref<HTMLDivElement | null>(null);

const scene = new THREE.Scene();
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let mixer: THREE.AnimationMixer | null = null; // 添加动画混合器
let clock = new THREE.Clock(); // 用于更新动画的时钟
let sleep = false;

const animations = ref<THREE.AnimationClip[]>([]);
const selectedAnimationIndex = ref<number>(0);
const isAnimationPlaying = ref(true);
const isShadowEnabled = ref(false); // 阴影开关状态
const animationProgress = ref(0); // 动画进度（百分比）
const currentAnimationTime = ref(0); // 当前动画时间（秒）
const totalAnimationDuration = ref(0); // 总动画时长（秒）
let currentAction: THREE.AnimationAction | null = null; // 当前播放的动画

// 格式化时间为 MM:SS 格式
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

// 在拖动进度条时实时预览动画状态
const previewAnimation = (progress: number | number[]) => {
  if (mixer && currentAction && animations.value.length > 0) {
    const selectedAnimation = animations.value[selectedAnimationIndex.value];
    // 确保progress是数字类型
    const progressValue = Array.isArray(progress) ? progress[0] : progress;
    const targetTime = (progressValue / 100) * selectedAnimation.duration;

    // 更新当前时间显示
    currentAnimationTime.value = targetTime;

    // 根据动画状态处理
    if (currentAction.paused) {
      // 如果是暂停状态，我们需要先激活动作再设置时间
      currentAction.paused = false;
      mixer.setTime(targetTime);
      currentAction.paused = true;
    } else {
      // 如果是播放状态，直接设置时间
      mixer.setTime(targetTime);
    }

    // 确保视图立即更新，不管是否在播放
    if (renderer && camera) {
      renderer.render(scene, camera);
    }
  }
};

// 动画切换
const playAnimation = (index: number) => {
  if (index === 0 && animations.value.length === 0) return;
  if (mixer && animations.value.length > 0) {
    // 停止之前的所有动画
    mixer.stopAllAction();

    // 获取选择的动画并播放
    currentAction = mixer.clipAction(animations.value[index]);
    totalAnimationDuration.value = animations.value[index].duration;
    currentAnimationTime.value = 0;
    animationProgress.value = 0;

    // 检查是否存在动画并播放
    if (currentAction) {
      currentAction.reset();
      currentAction.setLoop(THREE.LoopRepeat, Infinity); // 设置动画循环模式
      currentAction.fadeIn(0.5); // 平滑过渡到新动画
      if (isAnimationPlaying.value) {
        currentAction.play();
      }
    }
  }
};

// 通过进度条控制动画播放位置（释放进度条时触发）
const seekAnimation = (progress: number | number[]) => {
  if (mixer && currentAction && animations.value.length > 0) {
    const selectedAnimation = animations.value[selectedAnimationIndex.value];
    // 确保progress是数字类型
    const progressValue = Array.isArray(progress) ? progress[0] : progress;
    const targetTime = (progressValue / 100) * selectedAnimation.duration;

    // 更新当前时间
    currentAnimationTime.value = targetTime;

    // 确保动画动作处于激活状态
    if (currentAction.paused) {
      // 如果是暂停状态，我们需要先激活动作再设置时间
      currentAction.paused = false;
      mixer.setTime(targetTime);
      currentAction.paused = true;
    } else {
      // 如果是播放状态，直接设置时间
      mixer.setTime(targetTime);
    }

    // 确保在任何状态下都渲染一帧，以便显示当前位置的动画帧
    if (renderer && camera) {
      renderer.render(scene, camera);
    }

    // 如果动画是在播放状态，重置时钟以避免大的时间跳跃
    if (isAnimationPlaying.value) {
      clock.getDelta();
    }
  }
};

// 切换动画的播放状态
const toggleAnimation = (value: string | number | boolean) => {
  isAnimationPlaying.value = Boolean(value);

  if (mixer && currentAction) {
    if (isAnimationPlaying.value) {
      // 从当前位置继续播放，不需要额外设置时间
      // 直接取消暂停状态
      currentAction.paused = false;
      // 确保时钟重置，避免暂停后第一帧出现跳跃
      clock.getDelta();
    } else {
      // 暂停动画
      currentAction.paused = true;
    }
  }
};

// 切换阴影功能
const toggleShadow = (value: any) => {
  scene.traverse((child) => {
    if (child instanceof THREE.Light) {
      child.castShadow = value; // 控制光源是否启用阴影
    }
    if (child instanceof THREE.Mesh) {
      child.receiveShadow = value; // 控制物体是否接收阴影
      child.castShadow = value; // 控制物体是否投射阴影
    }
  });
};

let ktx2Loader: KTX2Loader | null = null; // ★ 新增

// 刷新场景并加载新模型
const refresh = () => {
  if (!props.file || !props.file.url) {
    return;
  }
  const gltfLoader = new GLTFLoader();

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/js/three.js/libs/draco/");
  gltfLoader.setDRACOLoader(dracoLoader);

  // ★ KTX2
  if (renderer && !ktx2Loader) {
    ktx2Loader = new KTX2Loader()
      .setTranscoderPath("/js/three.js/libs/basis/") // 放 basis_transcoder.* 的目录
      .detectSupport(renderer); // 侦测 GPU 支持
  }
  if (ktx2Loader) {
    gltfLoader.setKTX2Loader(ktx2Loader);
  }

  const url = convertToHttps(props.file.url);
  gltfLoader.load(
    url,
    (gltf) => {
      const model = gltf.scene;
      console.log("GLTF", gltf);

      animations.value = gltf.animations;
      console.log("GLTF Animations:", animations);

      if (animations.value.length > 0) {
        console.log("Animations found:");
        mixer = new THREE.AnimationMixer(model);
        playAnimation(selectedAnimationIndex.value);
      } else {
        console.log("No animations found in this GLB file.");
      }

      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      const scale = (props.target ?? 1.5) / size.x;
      model.position.set(
        -center.x * scale,
        -center.y * scale,
        -center.z * scale
      );
      model.scale.set(scale, scale, scale);

      model.traverse((child) => {
        child.castShadow = isShadowEnabled.value;
        if (child instanceof THREE.Mesh) {
          child.geometry.computeVertexNormals();
          child.receiveShadow = isShadowEnabled.value;
        }
      });

      scene?.add(model);

      // 创建动画信息数组
      const animationsInfo = animations.value.map((anim) => ({
        name: anim.name,
        length: anim.duration,
      }));

      emit("loaded", {
        size: toFixedVector3(size, 5),
        center: toFixedVector3(center, 5),
        anim: animationsInfo,
      });
    },
    (xhr: any) => {
      emit("progress", parseFloat(((xhr.loaded / xhr.total) * 100).toFixed(1)));
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    }
  );
};

// 截图功能
const screenshot = (): Promise<Blob> => {
  return new Promise<Blob>((resolve, reject) => {
    if (!renderer || !camera || !scene)
      return reject("Renderer or Camera or Scene is not initialized");

    sleep = true;
    renderer.setSize(512, 512);
    camera.aspect = 1 / 1;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    const element = renderer.domElement;

    element.toBlob((blob) => {
      if (!blob) return reject("Failed to create blob");

      const content = three.value;
      if (!content) return reject("Element #three not found");

      const width = content.clientWidth;
      const height = content.clientHeight;

      if (renderer && camera) {
        renderer.setSize(width, height);
        renderer.render(scene, camera);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        sleep = false;
        resolve(blob);
      } else {
        sleep = false;
        reject("Renderer or Camera is not initialized");
      }
    }, "image/jpeg");
  });
};
defineExpose({ screenshot });

// 解析模型节点
const parseNode = async (json: any): Promise<THREE.Object3D> => {
  const loader = new THREE.ObjectLoader();
  return loader.parseAsync(json);
};

onMounted(() => {
  const content = three.value;
  if (content) {
    const width = content.clientWidth;
    const height = content.clientHeight;

    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 2);
    renderer = new THREE.WebGLRenderer({
      preserveDrawingBuffer: true,
      antialias: true,
    });
    renderer.setViewport(0, 0, width, height);
    renderer.setSize(width, height, true);
    renderer.setClearColor(0xeeffff, 1);
    renderer.shadowMap.enabled = true; // 启用阴影
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 设置阴影类型
    content.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    controls.enableDamping = true; // 启用阻尼效果，使旋转更加平滑
    controls.dampingFactor = 0.05; // 阻尼系数

    // 调整主光源位置和强度
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
    mainLight.position.set(2, 1, 1);
    scene.add(mainLight);

    // 添加补光，从反方向照亮模型
    const fillLight = new THREE.DirectionalLight(0xffffff, 1.2);
    fillLight.position.set(-1, 0.5, -1);
    scene.add(fillLight);

    // 添加顶光
    const topLight = new THREE.PointLight(0xffffff, 2);
    topLight.position.set(0, 3, 0);
    scene.add(topLight);

    // 保持适量环境光
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));

    const erd = new ElementResizeDetector();
    erd.listenTo(content, () => {
      if (!sleep && renderer && camera) {
        const width = content.clientWidth;
        const height = content.clientHeight;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
    });

    const animate = () => {
      if (!renderer || !camera) {
        return;
      }
      const delta = clock.getDelta();
      if (mixer) {
        // 只有在播放状态才更新动画
        if (isAnimationPlaying.value) {
          mixer.update(delta); // 更新动画

          // 更新动画进度
          if (animations.value.length > 0) {
            const selectedAnimation =
              animations.value[selectedAnimationIndex.value];
            if (selectedAnimation) {
              // 判断是否是短动画（小于0.1秒）
              const isShortAnimation = selectedAnimation.duration < 0.1;

              // 更新当前动画时间
              currentAnimationTime.value += delta;

              // 对于短动画，一旦达到100%就保持不变
              if (
                isShortAnimation &&
                currentAnimationTime.value >= selectedAnimation.duration
              ) {
                currentAnimationTime.value = selectedAnimation.duration;
                animationProgress.value = 100;
              } else {
                // 正常动画循环逻辑
                if (currentAnimationTime.value > selectedAnimation.duration) {
                  currentAnimationTime.value =
                    currentAnimationTime.value % selectedAnimation.duration;
                }
                // 计算进度百分比
                animationProgress.value =
                  (currentAnimationTime.value / selectedAnimation.duration) *
                  100;
              }
            }
          }
        }
      }

      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    animate();
    refresh();
  }
});
</script>

<style scoped>
.animation-progress {
  margin-top: 10px;
}

.animation-controls {
  display: flex;
  align-items: center;
  margin-top: 8px;
}

.animation-time {
  margin-left: 10px;
  font-size: 14px;
  color: #606266;
}

.animation-icon {
  width: 24px;
  height: 24px;
  vertical-align: middle;
}

.animation-button {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.animation-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
