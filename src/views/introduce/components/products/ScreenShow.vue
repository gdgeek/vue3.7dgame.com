<template>
  <!-- 模型展示-->
  <section>
    <div class="modle_box">
      <!-- 外框架元素 -->
      <div v-show="isShow" class="modle_init">
        <!-- 3D渲染元素 -->
        <div id="container"></div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, shallowRef } from "vue";
import * as Three from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import ElementResizeDetector from "element-resize-detector";

const isShow = ref(true);
const camera = shallowRef<Three.PerspectiveCamera | null>(null);
const scene = shallowRef<Three.Scene | null>(null);
const renderer = shallowRef<Three.WebGLRenderer | null>(null);
const mesh = shallowRef<Three.Mesh | null>(null);

const init = () => {
  const container = document.getElementById("container");
  if (!container) return;

  // 创建场景
  scene.value = new Three.Scene();

  // 创建相机
  camera.value = new Three.PerspectiveCamera(
    70,
    container.clientWidth / container.clientHeight,
    0.01,
    1000
  );
  camera.value.position.z = 0.6;

  // 创建渲染器
  renderer.value = new Three.WebGLRenderer({
    alpha: true,
    antialias: true,
  });
  renderer.value.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.value.domElement);

  // 创建几何体
  const radius = 0.2;
  const geometry = new Three.IcosahedronGeometry(radius);
  const material = new Three.MeshNormalMaterial();

  mesh.value = new Three.Mesh(geometry, material);
  scene.value.add(mesh.value);

  // 监听容器大小变化
  const erd = new ElementResizeDetector();
  erd.listenTo(container, () => {
    if (!renderer.value || !camera.value) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.value.setSize(width, height);
    camera.value.aspect = width / height;
    camera.value.updateProjectionMatrix();
  });
};

let animationFrameId: number;

const animate = () => {
  animationFrameId = requestAnimationFrame(animate);

  if (!mesh.value || !renderer.value || !scene.value || !camera.value) return;

  mesh.value.rotation.x += 0.002;
  mesh.value.rotation.y += 0.006;

  renderer.value.render(scene.value, camera.value);
};

onMounted(() => {
  init();
  animate();
});

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  if (mesh.value) {
    mesh.value.geometry.dispose();
    if (mesh.value.material instanceof Three.Material) {
      mesh.value.material.dispose();
    }
  }

  if (renderer.value) {
    renderer.value.dispose();
  }
});
</script>

<style lang="scss" scoped>
.modle_init {
  max-width: 800px;
  max-height: 650px;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: calc(48% + 30px);
  width: 50%;
  height: 30vw;
  width: 50%;
  height: calc(30vw + 60px);
  line-height: 50px;
  z-index: 50;
}

#container {
  height: 100%;
  width: 100%;
}
</style>
