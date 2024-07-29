<template>
  <div>
    <div id="three" style="height: 300px; width: 100%"></div>
  </div>
</template>

<script setup lang="ts">
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Vector3,
  Box3,
  DirectionalLight,
  AmbientLight,
  PointLight,
} from "three";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import ElementResizeDetector from "element-resize-detector";
import { convertToHttps } from "@/assets/js/helper";

// 将Vector3的坐标值固定到小数点后n位
function toFixedVector3(vec: Vector3, n: number): Vector3 {
  const result = new Vector3();
  result.x = parseFloat(vec.x.toFixed(n));
  result.y = parseFloat(vec.y.toFixed(n));
  result.z = parseFloat(vec.z.toFixed(n));
  return result;
}

const props = defineProps({
  file: {
    type: Object,
    required: true,
  },
  target: {
    type: Number,
    default: 1.5,
  },
});

const emit = defineEmits(["loaded", "progress"]);

const scene = ref<THREE.Scene | null>(null);
const renderer = ref<THREE.WebGLRenderer | null>(null);
const camera = ref<THREE.PerspectiveCamera | null>(null);
const sleep = ref(false);

// 刷新场景并加载新模型
const refresh = () => {
  if (scene.value && file && file.url) {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/three.js/examples/js/libs/draco/");
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);
    let url = convertToHttps(file.url);
    // 加载模型
    gltfLoader.load(
      url,
      (model) => {
        const box = new Box3().setFromObject(model.scene);
        const center = new Vector3();
        box.getCenter(center);
        const size = new Vector3();
        box.getSize(size);
        const scale = target / size.x;
        model.scene.position.set(
          -center.x * scale,
          -center.y * scale,
          -center.z * scale
        );
        model.scene.scale.set(scale, scale, scale);

        scene.value?.add(model.scene);
        // 触发加载完成事件
        emit("loaded", {
          size: toFixedVector3(size, 5),
          center: toFixedVector3(new Vector3(center.x, center.y, center.z), 5),
        });
      },
      (xhr) => {
        emit(
          "progress",
          parseFloat(((xhr.loaded / xhr.total) * 100).toFixed(1))
        );
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
      }
    );
  }
};

// 截图功能
const screenshot = () => {
  return new Promise<Blob>((resolve) => {
    if (!renderer.value || !camera.value || !scene.value) {
      resolve(new Blob());
      return;
    }
    sleep.value = true;
    renderer.value.setSize(512, 512);
    camera.value.aspect = 1 / 1;
    camera.value.updateProjectionMatrix();
    renderer.value.render(scene.value, camera.value);
    renderer.value.domElement.toBlob((blob) => {
      if (blob) {
        const content = document.getElementById("three");
        if (content) {
          const width = content.clientWidth;
          const height = content.clientHeight;
          renderer.value?.setSize(width, height);
          renderer.value?.render(scene.value, camera.value);
          camera.value.aspect = width / height;
          camera.value.updateProjectionMatrix();
          sleep.value = false;
          resolve(blob);
        }
      } else {
        resolve(new Blob());
      }
    }, "image/jpeg");
  });
};

// 解析模型节点
const parseNode = async (json: any): Promise<THREE.Object3D> => {
  const loader = new THREE.ObjectLoader();
  return loader.parseAsync(json);
};

// 监听文件变化
watch(file, () => {
  if (file) {
    refresh();
  }
});

onMounted(() => {
  const content = document.getElementById("three");
  if (content) {
    const width = content.clientWidth;
    const height = content.clientHeight;

    scene.value = new Scene();
    camera.value = new PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.value.position.set(0, 0, 2);
    renderer.value = new WebGLRenderer({
      preserveDrawingBuffer: true,
      antialias: true,
    });
    renderer.value.setViewport(0, 0, width, height);
    renderer.value.setSize(width, height);
    renderer.value.setClearColor(0xeeffff, 1);
    content.appendChild(renderer.value.domElement);

    // 初始化轨道控制器
    const controls = new OrbitControls(camera.value, renderer.value.domElement);
    controls.update();

    // 添加光源
    const light = new DirectionalLight(0xffffff, 1);
    light.position.set(-0.5, 0, 0.7);
    scene.value.add(light);
    scene.value.add(new PointLight(0xffffff, 3));
    scene.value.add(new AmbientLight(0xffffff, 1));

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.value?.render(scene.value, camera.value);
    };

    animate();

    // 监听容器尺寸变化
    const erd = new ElementResizeDetector();
    erd.listenTo(content, () => {
      if (!sleep.value) {
        const width = content.clientWidth;
        const height = content.clientHeight;
        renderer.value?.setSize(width, height);
        camera.value.aspect = width / height;
        camera.value.updateProjectionMatrix();
      }
    });

    refresh();
  }
});
</script>
