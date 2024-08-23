<template>
  <div>
    <div ref="three" style="height: 300px; width: 100%"></div>
  </div>
</template>

<script setup lang="ts">
import ElementResizeDetector from "element-resize-detector";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import {
  VOXLoader,
  VOXMesh,
  VOXData3DTexture,
} from "three/examples/jsm/loaders/VOXLoader.js";
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

const three = ref<HTMLDivElement | null>(null);

const scene = new THREE.Scene();
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let sleep = false;

const toFixedVector3 = (vec: THREE.Vector3, n: number) => {
  const result = new THREE.Vector3();
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
    throw e;
  }
};

/**
 * 截图函数
 *
 * @returns 返回一个Promise对象，resolve参数为Blob对象，reject参数为错误信息
 */
const screenshot = () => {
  alert("screenshot");
  /*
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
  });*/
};

// 刷新场景并加载
const refresh = () => {
  if (!props.file || !props.file.url) {
    return;
  }

  const loader = new VOXLoader();
  const url = convertToHttps(props.file.url);
  // 加载
  loader.load(
    url,
    (chunks) => {
      const chunk = chunks[0];
      console.error(chunks);
      const mesh = new VOXMesh(chunk);

      const box = new THREE.Box3().setFromObject(mesh);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      const scale = props.target / size.x;
      mesh.position.set(
        -center.x * scale,
        -center.y * scale,
        -center.z * scale
      );
      mesh.scale.set(scale, scale, scale);

      scene?.add(mesh);
      emit("loaded", {
        count: chunk.data.length / 4,
        size: toFixedVector3(size, 5),
        center: toFixedVector3(
          new THREE.Vector3(center.x, center.y, center.z),
          5
        ),
      });
    },
    (xhr) => {
      emit("progress", parseFloat(((xhr.loaded / xhr.total) * 100).toFixed(1)));
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    }
  );
};

onMounted(() => {
  const content = three.value;
  if (content) {
    const width = content.clientWidth;
    const height = content.clientHeight;

    // const scene = new THREE.Scene();
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

    // 初始化轨道控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    // controls.update();

    // 添加光源
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(-0.5, 0, 0.7);
    scene.add(light);
    scene.add(new THREE.PointLight(0xffffff, 3));
    scene.add(new THREE.AmbientLight(0xffffff, 1));

    // renderer.render(scene, camera);

    // 监听容器尺寸变化
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
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    animate();
    refresh();
  }
});
</script>
