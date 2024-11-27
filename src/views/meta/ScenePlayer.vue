<template>
  <div>
    <div
      id="scene"
      ref="scene"
      style="height: 600px; width: 100%; margin: 0 auto"
    ></div>
  </div>
</template>

<script setup lang="ts">
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ref, onMounted } from "vue";
import { convertToHttps } from "@/assets/js/helper";

const props = defineProps<{
  meta: any;
}>();

const scene = ref<HTMLDivElement | null>(null);
const threeScene = new THREE.Scene();
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let mixers: Map<string, THREE.AnimationMixer> = new Map();
let models: Map<string, THREE.Object3D> = new Map();
let clock = new THREE.Clock();

// 加载模型
const loadModel = async (resource: any, transform: any) => {
  console.log("加载模型参数:", {
    resource,
    transform,
    resourceId: resource.id,
    transformUUID: transform?.uuid,
  });

  const loader = new GLTFLoader();
  const url = convertToHttps(resource.file.url);

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;

        // 确保transform对象存在且包含必要的属性
        if (!transform || !transform.uuid) {
          console.error("transform对象无效:", transform);
          return reject(new Error("Invalid transform object"));
        }

        // 设置位置、旋转和缩放
        model.position.set(
          transform.position?.x || 0,
          transform.position?.y || 0,
          transform.position?.z || 0
        );
        model.rotation.set(
          transform.rotate?.x || 0,
          transform.rotate?.y || 0,
          transform.rotate?.z || 0
        );
        model.scale.set(
          transform.scale?.x || 1,
          transform.scale?.y || 1,
          transform.scale?.z || 1
        );

        // 保存动画数据
        if (gltf.animations && gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(model);
          mixers.set(transform.uuid, mixer);
          model.userData.animations = gltf.animations;
          console.log(`模型 ${transform.uuid} 动画加载完成:`, {
            animations: gltf.animations,
            animationNames: gltf.animations.map((a) => a.name),
          });
        }

        // 使用transform中的UUID
        models.set(transform.uuid, model);
        model.uuid = transform.uuid;

        threeScene.add(model);
        resolve(model);
      },
      // 添加加载进度回调
      (progress) => {
        console.log(
          `模型加载进度: ${((progress.loaded / progress.total) * 100).toFixed(2)}%`
        );
      },
      (error) => {
        console.error("模型加载失败:", error);
        reject(error);
      }
    );
  });
};

// 播放动画
const playAnimation = (uuid: string, animationName: string) => {
  console.log("开始播放动画:", {
    uuid,
    animationName,
    availableModels: Array.from(models.keys()),
    availableMixers: Array.from(mixers.keys()),
  });

  const model = models.get(uuid);
  const mixer = mixers.get(uuid);

  if (!model) {
    console.error(`找不到UUID为 ${uuid} 的模型`);
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

// 初始化场景
onMounted(async () => {
  if (!scene.value) return;

  const width = scene.value.clientWidth;
  const height = scene.value.clientHeight;

  // 设置相机
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(0, 2, 5);

  // 设置渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setClearColor(0xeeeeee);
  scene.value.appendChild(renderer.domElement);

  // 添加轨道控制器
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // 添加光源
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  threeScene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 5, 5);
  threeScene.add(directionalLight);

  // 加载所有模型
  const metaData = JSON.parse(props.meta.data);
  console.log("解析后的metaData:", metaData);

  if (metaData.children?.entities) {
    for (const entity of metaData.children.entities) {
      console.log("处理实体:", entity);

      if (!entity.parameters?.resource) {
        console.warn("实体缺少resource参数:", entity);
        continue;
      }

      const resource = props.meta.resources.find(
        (r: any) => r.id.toString() === entity.parameters.resource.toString()
      );

      if (resource) {
        try {
          await loadModel(resource, entity.parameters);
        } catch (error) {
          console.error(
            `加载模型失败 (resource ${entity.parameters.resource}):`,
            error
          );
        }
      } else {
        console.warn(`未找到资源 ID ${entity.parameters.resource}`);
      }
    }
  } else {
    console.error("metaData格式错误:", metaData);
  }

  // 动画循环
  const animate = () => {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    mixers.forEach((mixer) => mixer.update(delta));

    controls.update();
    renderer!.render(threeScene, camera!);
  };
  animate();
});

// 暴露方法给父组件
defineExpose({
  models,
  playAnimation,
});
</script>
