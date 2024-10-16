<template>
  <div>
    <div>
      <el-select
        v-model="selectedAnimationIndex"
        @change="playAnimation"
        placeholder="Select Animation"
        style="width: 240px"
      >
        <el-option
          v-for="(animation, index) in animations"
          :key="index"
          :label="'animation ' + (index + 1)"
          :value="index"
        ></el-option>
      </el-select>
    </div>
    <div id="three" ref="three" style="height: 300px; width: 100%"></div>
  </div>
</template>

<script setup lang="ts">
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
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

// 定义动画列表和当前选择的动画索引
let animations: THREE.AnimationClip[] = []; // 存储动画列表
const selectedAnimationIndex = ref(0); // 当前选择的动画索引

// 切换动画的函数
const playAnimation = (index: number) => {
  if (mixer && animations.length > 0) {
    // 停止之前的所有动画
    mixer.stopAllAction();

    // 获取选择的动画并播放
    const action = mixer.clipAction(animations[index]);

    // 检查是否存在动画并播放
    if (action) {
      action.reset(); // 重置动画时间到0
      action.setLoop(THREE.LoopRepeat, Infinity); // 设置动画循环模式
      action.fadeIn(0.5); // 平滑过渡到新动画
      action.play(); // 播放新动画
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
      // const animations = gltf.animations; // 获取动画列表
      console.log("GLTF", gltf);

      // 将动画列表保存到 animations 中
      animations = gltf.animations;
      console.log("GLTF Animations:", animations);

      // 添加动画混合器并播放动画
      if (animations.length > 0) {
        console.log("Animations found:");
        mixer = new THREE.AnimationMixer(model);
        // const action = mixer.clipAction(
        //   animations.value[selectedAnimation.value]
        // );
        // action.play();
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

// 监听动画选择变化，自动切换动画
// watch(selectedAnimation, () => {
//   changeAnimation();
//   console.log("Selected Animation:", animations.value[selectedAnimation.value]);
// });

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
    content.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    // const light = new THREE.DirectionalLight(0xffffff, 1);
    // light.position.set(-0.5, 0, 0.7);
    // scene.add(light);
    // scene.add(new THREE.PointLight(0xffffff, 3));
    // scene.add(new THREE.AmbientLight(0xffffff, 1));

    // scene.add(new THREE.PointLight(0xffffff, 0.01));
    // scene.add(new THREE.AmbientLight(0xffffff, 0.01));

    // 替换之前的光源添加部分
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(-0.5, 0, 0.7);
    scene.add(light);

    // 增加点光源
    const pointLight = new THREE.PointLight(0xffffff, 3); // 强度增加
    pointLight.position.set(1, 1, 2); // 设置位置
    scene.add(pointLight);

    // 增加环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 1); // 强度提高
    scene.add(ambientLight);

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
