<template>
  <el-card class="box-card" shadow="never" style="background: transparent; border: none;">
    <div id="three" ref="three" style="height: 400px; width: 100%"></div>

    <!-- Animation Controls - Visible only when animations exist -->
    <div class="animation-bar" v-if="animations && animations.length > 0">
      <div class="animation-play-btn" :class="{ disabled: animations.length === 0 }"
        @click="animations.length > 0 && toggleAnimation(!isAnimationPlaying)">
        <span class="material-symbols-outlined">{{ isAnimationPlaying ? 'pause' : 'play_arrow' }}</span>
      </div>

      <div class="animation-select-wrapper">
        <span class="animation-label">动画</span>
        <el-select v-model="selectedAnimationIndex" @change="playAnimation" placeholder="Static"
          class="animation-select" size="default" :disabled="animations.length === 0">
          <el-option v-if="animations.length === 0" :key="-1" label="Static" :value="-1"></el-option>
          <el-option v-for="(animation, index) in animations" :key="index"
            :label="animation.name || 'Animation ' + (index + 1)" :value="index"></el-option>
        </el-select>
      </div>

      <div class="animation-time">
        {{ formatTime(currentAnimationTime) }} / {{ formatTime(totalAnimationDuration) }}
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useDark } from "@vueuse/core";
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

const isDark = useDark();

// 监听主题变化，调整 3D 场景氛围
watch(isDark, (dark) => {
  if (scene) {
    // 可以在这里调整背景色或灯光强度，实现更好的风格适配
    scene.traverse((child) => {
      if (child instanceof THREE.AmbientLight) {
        child.intensity = dark ? 0.6 : 0.8;
      }
      if (child instanceof THREE.DirectionalLight) {
        child.intensity = dark ? 1.5 : 2.0;
      }
    });
  }
}, { immediate: true });

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

      animations.value = gltf.animations || [];

      if (animations.value && animations.value.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        playAnimation(selectedAnimationIndex.value);
      } else {
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
      alpha: true, // Allow transparency
    });
    renderer.setViewport(0, 0, width, height);
    renderer.setSize(width, height, true);
    renderer.setClearColor(0x000000, 0); // Transparent background
    renderer.setClearColor(0x000000, 0); // Transparent background
    renderer.shadowMap.enabled = false;
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
/* Animation Bar - New Style */
.animation-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-card, #fff);
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.animation-play-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--bg-hover, #f1f5f9);
  border: 1px solid var(--border-color, #e2e8f0);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.animation-play-btn:hover:not(.disabled) {
  background: var(--bg-active, #e2e8f0);
}

.animation-play-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.animation-play-btn .material-symbols-outlined {
  font-size: 24px;
  color: var(--text-secondary, #64748b);
}

.animation-select-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.animation-label {
  font-size: 12px;
  color: var(--text-muted, #94a3b8);
}

.animation-select {
  width: 100%;
}

.animation-select :deep(.el-input__wrapper) {
  background: var(--bg-hover, #f8fafc);
  border-radius: var(--radius-md, 12px);
  box-shadow: none;
  border: 1px solid var(--border-color, #e2e8f0);
}

.animation-select :deep(.el-input__inner) {
  color: var(--text-primary, #1e293b);
}

.animation-time {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary, #64748b);
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
