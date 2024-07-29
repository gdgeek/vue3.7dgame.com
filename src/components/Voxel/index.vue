<template>
  <div>
    <div id="three" style="height: 300px; width: 100%"></div>
  </div>
</template>

<script setup lang="ts">
import ElementResizeDetector from "element-resize-detector";
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Vector3,
  Box3,
  DirectionalLight,
  AmbientLight,
  PointLight,
  MeshPhysicalMaterial,
  Mesh,
} from "three";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import {
  VOXLoader,
  VOXMesh,
  VOXData3DTexture,
} from "@/assets/js/voxel/VOXLoader";

import { convertToHttps } from "@/assets/js/helper";

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

const toFixedVector3 = (vec: Vector3, n: number) => {
  const result = new Vector3();
  result.x = parseFloat(vec.x.toFixed(n));
  result.y = parseFloat(vec.y.toFixed(n));
  result.z = parseFloat(vec.z.toFixed(n));
  return result;
};

// 解析节点
const parseNode = async (json: any) => {
  try {
    const loader = new THREE.ObjectLoader();
    const data = await loader.parseAsync(json);
    return data;
  } catch (e) {
    alert(e);
    throw e;
  }
};

/**
 * 截图函数
 *
 * @returns 返回一个Promise对象，resolve参数为Blob对象，reject参数为错误信息
 */
const screenshot = () => {
  return new Promise<Blob>((resolve, reject) => {
    if (!renderer.value || !camera.value || !scene.value)
      return reject("Renderer or Camera or Scene is not initialized");

    sleep.value = true;
    renderer.value.setSize(512, 512);
    camera.value.aspect = 1 / 1;
    camera.value.updateProjectionMatrix();
    renderer.value.render(scene.value, camera.value);
    const element = renderer.value.domElement;

    element.toBlob((blob) => {
      if (!blob) return reject("Failed to create blob");

      const content = document.getElementById("three");
      if (!content) return reject("Element #three not found");

      const width = content.clientWidth;
      const height = content.clientHeight;
      renderer.value?.setSize(width, height);
      renderer.value?.render(scene.value!, camera.value!);
      camera.value!.aspect = width / height;
      camera.value!.updateProjectionMatrix();
      sleep.value = false;
      resolve(blob);
    }, "image/jpeg");
  });
};

// 刷新场景并加载
const refresh = () => {
  if (!scene.value || !props.file) return;

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/three.js/examples/js/libs/draco/");
  const gltf = new GLTFLoader();
  gltf.setDRACOLoader(dracoLoader);
  const loader = new VOXLoader();
  // 加载
  loader.load(
    convertToHttps(props.file.url),
    (chunks) => {
      const chunk = chunks[0];
      const mesh = new VOXMesh(chunk);
      const box = new Box3().setFromObject(mesh);
      const center = new Vector3();
      box.getCenter(center);
      const size = new Vector3();
      box.getSize(size);
      const scale = props.target / size.x;
      mesh.position.set(
        -center.x * scale,
        -center.y * scale,
        -center.z * scale
      );
      mesh.scale.set(scale, scale, scale);

      scene.value?.add(mesh);
      emit("loaded", {
        count: chunk.data.length / 4,
        size: toFixedVector3(size, 5),
        center: toFixedVector3(new Vector3(center.x, center.y, center.z), 5),
      });
    },
    (xhr) => {
      emit("progress", parseFloat(((xhr.loaded / xhr.total) * 100).toFixed(1)));
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    }
  );
};

watch(
  () => props.file,
  () => {
    if (props.file) refresh();
  }
);

onMounted(() => {
  const content = document.getElementById("three");
  if (!content) return;

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
  // 添加控制器
  const controls = new OrbitControls(camera.value, renderer.value.domElement);
  controls.update();
  // 添加光源
  const light = new DirectionalLight(0xffffff, 1);
  light.position.set(-0.5, 0, 0.7);

  scene.value.add(light);
  scene.value.add(new PointLight(0xffffff, 3));
  const ambient = new AmbientLight(0xffffff, 1);
  scene.value.add(ambient);

  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.value?.render(scene.value!, camera.value!);
  };

  animate();
  // 监听容器尺寸变化
  const erd = new ElementResizeDetector();
  erd.listenTo(content, () => {
    if (!sleep.value && renderer.value && camera.value) {
      const width = content.clientWidth;
      const height = content.clientHeight;
      renderer.value.setSize(width, height);
      camera.value.aspect = width / height;
      camera.value.updateProjectionMatrix();
    }
  });

  refresh();
});
</script>
