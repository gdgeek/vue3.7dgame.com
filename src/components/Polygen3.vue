<template>
  <div>
    <div
      id="three"
      ref="three"
      style="position: relative; height: 300px; width: 100%"
    >
      <div class="control" :style="controlStyle">
        <el-select
          v-model="selectedAnimationIndex"
          @change="playAnimation"
          placeholder="Select Animation"
          style="width: 160px"
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
        <el-switch
          v-model="isAnimationPlaying"
          @change="toggleAnimation"
          @click.stop
          style="margin-left: 5px"
          inline-prompt
          :active-text="$t('polygen.animation.animationOn')"
          :inactive-text="$t('polygen.animation.animationOff')"
          :disabled="animations.length === 0"
        ></el-switch>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import ElementResizeDetector from "element-resize-detector";
import { convertToHttps } from "@/assets/js/helper";
import { useSettingsStore } from "@/store";
import { ThemeEnum } from "@/enums/ThemeEnum";

const isDark = computed<boolean>(
  () => useSettingsStore().theme === ThemeEnum.DARK
);

const controlStyle = computed(() => ({
  backgroundColor: isDark.value
    ? "rgba(0, 0, 0, 0.8)"
    : "rgba(255, 255, 255, 0.8)",
}));

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
  (e: "loaded", data: { size: THREE.Vector3; center: THREE.Vector3 }): void;
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

// 动画切换
const playAnimation = (index: number) => {
  if (index === 0 && animations.value.length === 0) return;
  if (mixer && animations.value.length > 0 && isAnimationPlaying.value) {
    // 停止之前的所有动画
    mixer.stopAllAction();

    // 获取选择的动画并播放
    const action = mixer.clipAction(animations.value[index]);

    // 检查是否存在动画并播放
    if (action) {
      action.reset();
      action.setLoop(THREE.LoopRepeat, Infinity); // 设置动画循环模式
      action.fadeIn(0.5); // 平滑过渡到新动画
      action.play();
    }
  }
};

// 切换动画的播放状态
const toggleAnimation = (value: string | number | boolean) => {
  if (mixer) {
    if (value) {
      playAnimation(selectedAnimationIndex.value);
    } else {
      mixer.stopAllAction();
    }
  }
};

// 刷新场景并加载新模型
const refresh = () => {
  if (!props.file || !props.file.url) {
    return;
  }
  const gltfLoader = new GLTFLoader();
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
          child.material.metalness = 1;
          child.receiveShadow = isShadowEnabled.value;
        }
      });

      scene?.add(model);
      emit("loaded", {
        size: toFixedVector3(size, 5),
        center: toFixedVector3(center, 5),
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
    renderer.setSize(width, height);
    renderer.setClearColor(0xeeffff, 1);
    renderer.shadowMap.enabled = true; // 启用阴影
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 设置阴影类型
    content.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    controls.enableDamping = true; // 启用阻尼效果，使旋转更加平滑
    controls.dampingFactor = 0.05; // 阻尼系数

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(-0.5, 0, 0.7);
    scene.add(light);
    scene.add(new THREE.PointLight(0xffffff, 3));
    scene.add(new THREE.AmbientLight(0xffffff, 1));

    // 添加光源
    // const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    // directionalLight.position.set(-0.5, 0, 0.7);
    // directionalLight.castShadow = isShadowEnabled.value; // 设置光源阴影
    // scene.add(directionalLight);
    // scene.add(new THREE.PointLight(0xffffff, 3));
    // scene.add(new THREE.AmbientLight(0xffffff, 1));

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
      if (mixer) mixer.update(delta); // 更新动画

      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    animate();
    refresh();
  }
});
</script>

<style scoped lang="scss">
#three {
  position: relative;

  .control {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}
</style>
