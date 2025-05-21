<template>
  <div class="hero-section" :class="{ 'dark-theme': isDark }">
    <!-- 背景效果 -->
    <div class="hero-background">
      <Meteors v-if="isDark" :count="30" :speed="5" color="#64748b" />
      <div class="overlay"></div>
    </div>

    <!-- 主要内容区 -->
    <div class="hero-content">
      <!-- 文字内容 -->
      <div class="hero-text" data-aos="fade-up">
        <h1 class="hero-title">
          <span class="gradient-text">
            <span class="corner-decoration top-left"></span>
            AR教育
            <span class="corner-decoration bottom-right"></span>
          </span>
          <span>创新平台</span>
        </h1>
        <p class="hero-subtitle">融合AR技术与教育创新，打造沉浸式学习新体验，让知识可视可触可互动</p>

        <!-- 特点标签 -->
        <div class="hero-features">
          <div class="feature-item">
            <el-icon>
              <View />
            </el-icon>
            <span>3D场景沉浸</span>
          </div>
          <div class="feature-item">
            <el-icon>
              <Connection />
            </el-icon>
            <span>可视化编程</span>
          </div>
          <div class="feature-item">
            <el-icon>
              <DataAnalysis />
            </el-icon>
            <span>学习分析追踪</span>
          </div>
        </div>

        <!-- 行动按钮 -->
        <div class="hero-cta">
          <el-button type="primary" size="large" @click="openLoginDialog">
            立即体验
          </el-button>
          <el-button size="large" @click="scrollToSolutions">
            了解更多
          </el-button>
        </div>
      </div>

      <!-- 3D模型展示区 -->
      <div class="hero-image" data-aos="fade-left" data-aos-delay="400">
        <div class="showcase-container">
          <!-- 主图片区域 -->
          <img src="https://ts1.tc.mm.bing.net/th/id/OIP-C.VlX5zuS8Br8LMfxYpZ0VsAHaEo?rs=1&pid=ImgDetMain"
            alt="AR教育创新平台" class="primary-image" @click="openVideoDialog" />

          <!-- 悬浮元素容器 -->
          <div class="floating-elements">
            <!-- 产品合作伙伴 - Rokid -->
            <div class="floating-element scene-card">
              <img src="/media/icon/modeling.png" alt="3D场景构建" class="scene-logo" />
              <div class="scene-info">
                <span class="scene-name">3D场景</span>
                <div class="scene-badge">3D场景构建</div>
              </div>
            </div>

            <!-- 设备展示卡片 -->
            <div class="floating-element interaction-card">
              <img src="/media/icon/interaction.png" alt="沉浸式互动" class="interaction-image" />
              <div class="interaction-info">
                <span class="interaction-name">沉浸式互动</span>
                <div class="interaction-badge">多感官学习</div>
              </div>
            </div>

            <!-- 功能亮点卡片 -->
            <div class="floating-element feature-card">
              <div class="feature-icon">
                <img src="/media/icon/blockly_logo_only.png" alt="可视化编程" class="feature-img" />
              </div>
              <div class="feature-info">
                <span class="feature-title">可视化编程</span>
                <span class="feature-desc">快速构建AR应用</span>
              </div>
            </div>
          </div>

          <!-- 视频播放按钮 -->
          <div class="play-button-container" @click="openVideoDialog">
            <div class="play-button">
              <el-icon class="play-icon">
                <VideoPlay />
              </el-icon>
            </div>
            <div class="play-label">观看演示</div>
          </div>

          <!-- 3D效果装饰 -->
          <div class="decoration-elements">
            <div class="deco-circle circle-1"></div>
            <div class="deco-circle circle-2"></div>
            <div class="deco-line line-1"></div>
            <div class="deco-line line-2"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- scroll-indicator -->
    <div class="scroll-indicator" @click="scrollToSolutions" :style="scrollIndicatorStyle">
      <div class="scroll-text">向下滚动了解更多</div>
      <div class="scroll-icon">
        <el-icon class="scroll-arrow">
          <ArrowDown />
        </el-icon>
      </div>
    </div>
  </div>

  <!-- 视频弹窗 -->
  <el-dialog v-model="videoDialogVisible" title="AR教育平台演示" width="70%" :before-close="handleCloseVideo"
    destroy-on-close>
    <Bilibili :bvid="bilibiliVideoId" :height="500" :autoplay="true" />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useSettingsStore } from '@/store/modules/settings';
import AOS from 'aos';
import 'aos/dist/aos.css';
import Meteors from '@/components/CustomUI/Meteors.vue';
import {
  VideoPlay,
  ArrowDown,
  View,
  Connection,
  DataAnalysis,
  Monitor,
  TrendCharts
} from '@element-plus/icons-vue';

// 获取主题设置
const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === 'dark');

// 定义事件
const emit = defineEmits(['openLogin']);

// 视频弹窗控制
const videoDialogVisible = ref(false);
const bilibiliVideoId = ref('BV1GJ411x7h7'); // 示例视频ID

// 视差效果状态
const mouseX = ref(0);
const mouseY = ref(0);

// 滚动指示器控制
const scrollProgress = ref(0);
const scrollIndicatorStyle = computed(() => {
  const opacity = Math.max(0, 1 - scrollProgress.value * 2);
  const translateY = scrollProgress.value * 20;
  return {
    opacity: opacity,
    transform: `translateX(-50%) translateY(${translateY}px)`,
    visibility: (opacity > 0 ? 'visible' : 'hidden') as 'visible' | 'hidden' | 'collapse'
  };
});

// 监听滚动事件
const handleScroll = () => {
  const scrollPosition = window.scrollY;
  const windowHeight = window.innerHeight;
  // 计算滚动进度 (0-1范围)
  scrollProgress.value = Math.min(1, scrollPosition / (windowHeight * 0.4));
};

// 打开视频对话框
const openVideoDialog = () => {
  videoDialogVisible.value = true;
};

// 关闭视频对话框
const handleCloseVideo = () => {
  videoDialogVisible.value = false;
};

// 监听鼠标移动实现视差效果
const handleMouseMove = (e: MouseEvent) => {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  mouseX.value = (e.clientX / windowWidth - 0.5) * 2;
  mouseY.value = (e.clientY / windowHeight - 0.5) * 2;

  // 更新CSS变量
  const container = document.querySelector('.showcase-container') as HTMLElement;
  if (container) {
    container.style.setProperty('--mouse-x', mouseX.value.toString());
    container.style.setProperty('--mouse-y', mouseY.value.toString());
  }
};

// 登录对话框
const openLoginDialog = () => {
  emit('openLogin');
};

// 滚动到解决方案部分
const scrollToSolutions = () => {
  const solutionsSection = document.getElementById('solutions');
  if (solutionsSection) {
    solutionsSection.scrollIntoView({ behavior: 'smooth' });
  }
};

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('scroll', handleScroll);
  AOS.init({
    duration: 1000,
    once: false,
    mirror: true
  });
});

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style lang="scss" scoped>
// 颜色变量
$primary-color: #3498db;
$primary-light: #00d2ff;
$text-dark: #2c3e50;
$text-light: #ecf0f1;
$text-gray: #34495e;
$text-gray-light: #7f8c8d;
$bg-light: linear-gradient(135deg, #ebf4ff 0%, #f9fcff 100%);
$bg-dark: linear-gradient(135deg, #213346 0%, #1c2c3d 100%);

// 混合器
@mixin flex-center {
  display: flex;
  align-items: center;
}

@mixin absolute-fill {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.hero-section {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  overflow: hidden;
  padding: 0 20px;
  background: $bg-light;
  color: var(--el-text-color-primary);

  &.dark-theme {
    background: $bg-dark;
    color: #ffffff;
  }
}

/* 背景效果 */
.hero-background {
  @include absolute-fill;
  z-index: 0;

  .overlay {
    @include absolute-fill;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.03) 20%, rgba(52, 152, 219, 0.05) 100%);
    z-index: 1;
  }

  .dark-theme & .overlay {
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.1) 30%, rgba(52, 152, 219, 0.1) 100%);
  }
}

/* 内容区 */
.hero-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 100px;
  position: relative;
  z-index: 2;
}

.hero-text {
  flex: 1;

  .hero-title {
    font-size: 4rem;
    font-weight: 800;
    margin-bottom: 20px;
    line-height: 1.1;
    color: $text-dark;
    position: relative;

    .dark-theme & {
      color: #ffffff;
    }
  }

  .gradient-text {
    background: linear-gradient(90deg, $primary-color, $primary-light);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    display: inline-block;
    position: relative;
    cursor: pointer;
    margin-right: 15px;

    /* 角落装饰元素 */
    .corner-decoration {
      position: absolute;
      width: 20px;
      height: 20px;
      display: block;
      transition: all 0.3s ease;

      &.top-left {
        top: -6px;
        left: -6px;
        border-top: 3px solid $primary-color;
        border-left: 3px solid $primary-color;
      }

      &.bottom-right {
        bottom: -6px;
        right: -6px;
        border-bottom: 3px solid $primary-light;
        border-right: 3px solid $primary-light;
      }
    }

    /* 鼠标悬停时的延展效果 */
    &:hover {
      .corner-decoration {

        &.top-left,
        &.bottom-right {
          width: 30px;
          height: 30px;
        }
      }
    }
  }

  .hero-subtitle {
    font-size: 1.4rem;
    color: $text-gray;
    margin-bottom: 30px;
    max-width: 600px;
    line-height: 1.5;

    .dark-theme & {
      color: $text-light;
    }
  }
}

.hero-features {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;

  .feature-item {
    @include flex-center;
    gap: 8px;
    background-color: rgba(255, 255, 255, 0.7);
    padding: 10px 16px;
    border-radius: 30px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);

    .dark-theme & {
      background-color: rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .el-icon {
      color: $primary-color;

      .dark-theme & {
        color: $primary-light;
      }
    }

    span {
      color: $text-gray;

      .dark-theme & {
        color: $text-light;
      }
    }
  }
}

.hero-cta {
  display: flex;
  gap: 15px;
}

/* 3D模型展示区 */
.hero-image {
  flex: 1;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 660px;
  perspective: 1000px;
  z-index: 2;

  .showcase-container {
    position: relative;
    width: 100%;
    transform-style: preserve-3d;
    transform: rotateY(calc(var(--mouse-x, 0) * 5deg)) rotateX(calc(var(--mouse-y, 0) * -5deg));
    transition: transform 0.1s ease-out;

    &:hover .play-button-container {
      opacity: 1;
      visibility: visible;
    }
  }

  .primary-image {
    width: 100%;
    height: auto;
    border-radius: 24px;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
    transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
    object-fit: cover;
    filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.1));
    z-index: 1;
    cursor: pointer;

    &:hover {
      transform: scale(1.02);
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.2);
    }
  }
}

.floating-elements {
  @include absolute-fill;
  pointer-events: none;
  z-index: 2;

  .floating-element {
    position: absolute;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(15px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15), 0 3px 10px rgba(0, 0, 0, 0.1);
    padding: 12px;
    display: flex;
    align-items: center;
    transform-style: preserve-3d;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    overflow: hidden;

    .dark-theme & {
      background: rgba(255, 255, 255, 0.95);
    }

    &:hover {
      transform: translateY(-5px) translateZ(20px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    }

    &::before {
      content: '';
      @include absolute-fill;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 50%);
      z-index: -1;
    }
  }
}

/* 3D场景构建卡片 */
.scene-card {
  top: -35px;
  right: -50px;
  pointer-events: auto;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  animation: float-card 8s ease-in-out infinite;
  transform: rotate(-5deg);
  z-index: 5;

  .scene-logo {
    width: 50px;
    height: auto;
    border-radius: 8px;
    object-fit: contain;
  }

  .scene-info {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .scene-name {
      font-weight: 700;
      font-size: 16px;
      color: #333;
    }

    .scene-badge {
      background: linear-gradient(90deg, $primary-color 0%, $primary-light 100%);
      color: white;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 8px;
      display: inline-block;
    }
  }
}

/* 交互体验卡片 */
.interaction-card {
  bottom: -35px;
  right: -50px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  animation: float-card 8s ease-in-out infinite;
  transform: rotate(5deg);
  z-index: 4;
  pointer-events: auto;
  cursor: pointer;

  .interaction-image {
    width: 50px;
    height: auto;
    border-radius: 8px;
    object-fit: contain;
  }

  .interaction-info {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .interaction-name {
      font-weight: 700;
      font-size: 16px;
      color: #333;
    }

    .interaction-badge {
      background: linear-gradient(90deg, $primary-color 0%, $primary-light 100%);
      color: white;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 8px;
      display: inline-block;
    }
  }
}

/* 功能亮点卡片 */
.feature-card {
  top: 40%;
  left: -70px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  animation: float-card 7s ease-in-out infinite 0.5s;
  transform: rotate(-3deg);
  z-index: 3;
  pointer-events: auto;
  cursor: pointer;

  .feature-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    overflow: hidden;

    .feature-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  .feature-info {
    display: flex;
    flex-direction: column;

    .feature-title {
      font-weight: 700;
      font-size: 16px;
      color: #333;
    }

    .feature-desc {
      font-size: 12px;
      color: #666;
    }
  }
}

/* 装饰元素 */
.decoration-elements {
  @include absolute-fill;
  pointer-events: none;
  z-index: 0;

  .deco-circle {
    position: absolute;
    border-radius: 50%;
    opacity: 0.1;

    &.circle-1 {
      width: 300px;
      height: 300px;
      top: -100px;
      right: -100px;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0) 70%);
      animation: pulse-slow 10s infinite;
    }

    &.circle-2 {
      width: 200px;
      height: 200px;
      bottom: -50px;
      left: -70px;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0) 70%);
      animation: pulse-slow 8s infinite 1s;
    }
  }

  .deco-line {
    position: absolute;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.3) 50%, rgba(255, 255, 255, 0) 100%);
    height: 1px;
    width: 100%;
    opacity: 0.5;

    &.line-1 {
      top: 30%;
      transform: rotate(-30deg);
      animation: line-move 15s infinite linear;
    }

    &.line-2 {
      bottom: 40%;
      transform: rotate(20deg);
      animation: line-move 20s infinite linear reverse;
    }
  }
}

/* 视频播放按钮样式 */
.play-button-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 10;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0;
  visibility: hidden;

  &:hover {
    transform: translate(-50%, -50%) scale(1.1);

    .play-icon {
      color: rgba(255, 255, 255, 1);
    }
  }

  .play-button {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;

    &::after {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      z-index: -1;
      transition: transform 0.5s ease, opacity 0.5s ease;
      animation: pulse-ring 2s infinite;
    }

    .play-icon {
      font-size: 48px;
      color: rgba(255, 255, 255, 0.9);
      transition: color 0.3s ease;
      filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.3));
    }
  }

  .play-label {
    font-size: 14px;
    font-weight: 600;
    color: white;
    background: rgba(0, 0, 0, 0.6);
    padding: 6px 16px;
    border-radius: 20px;
    transition: all 0.3s ease;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }
}

/* 滚动指示器样式 */
.scroll-indicator {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 5;
  cursor: pointer;
  transition: opacity 0.5s ease, transform 0.5s ease;

  .scroll-text {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 10px;
    color: $text-gray;

    .dark-theme & {
      color: $text-light;
    }
  }

  .scroll-icon {
    width: 36px;
    height: 36px;
    background-color: rgba(52, 152, 219, 0.3);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(5px);
    animation: bounce 2s infinite;

    .scroll-arrow {
      color: $primary-light;
      font-size: 18px;
    }
  }
}

/* 动画 */
@keyframes bounce {

  0%,
  20%,
  50%,
  80%,
  100% {
    transform: translateY(0);
  }

  40% {
    transform: translateY(-10px);
  }

  60% {
    transform: translateY(-5px);
  }
}

@keyframes float-card {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-15px);
  }
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.8);
    opacity: 0.8;
  }

  70% {
    transform: scale(1.5);
    opacity: 0;
  }

  100% {
    transform: scale(0.8);
    opacity: 0;
  }
}

@keyframes pulse-slow {

  0%,
  100% {
    transform: scale(1);
    opacity: 0.1;
  }

  50% {
    transform: scale(1.2);
    opacity: 0.2;
  }
}

@keyframes line-move {
  0% {
    background-position: -100% 0;
  }

  100% {
    background-position: 200% 0;
  }
}

/* 媒体查询 - 响应式设计 */
@media (max-width: 1024px) {
  .hero-content {
    flex-direction: column;
    padding-top: 80px;
    text-align: center;
  }

  .hero-text {
    display: flex;
    flex-direction: column;
    align-items: center;

    .hero-title {
      font-size: 3rem;
    }

    .hero-subtitle {
      font-size: 1.2rem;
      margin-left: auto;
      margin-right: auto;
    }
  }

  .hero-features {
    justify-content: center;
    flex-wrap: wrap;
  }

  .hero-image {
    width: 100%;
    max-width: 500px;
    margin-bottom: 40px;
  }

  .scene-card {
    top: -25px;
    right: -20px;

    .scene-logo {
      width: 60px;
    }
  }

  .interaction-card {
    bottom: -25px;
    right: -20px;

    .interaction-image {
      width: 60px;
    }
  }

  .feature-card {
    left: -30px;
  }
}

@media (max-width: 768px) {
  .hero-content {
    padding: 100px 15px 40px;
  }

  .hero-text {
    .hero-title {
      font-size: 2.5rem;
    }

    .hero-subtitle {
      font-size: 1.1rem;
    }
  }

  .hero-image {
    width: 100%;
    max-width: 350px;
    margin-bottom: 60px;

    .showcase-container {
      transform: none !important;
    }
  }

  .scene-card {
    top: -15px;
    right: -10px;
    transform: scale(0.8) rotate(-5deg);
    padding: 8px 12px;

    .scene-logo {
      width: 50px;
    }

    .scene-name {
      font-size: 14px;
    }

    .scene-badge {
      font-size: 9px;
    }
  }

  .interaction-card {
    bottom: -15px;
    right: -10px;
    transform: scale(0.8) rotate(5deg);
    padding: 8px 12px;

    .interaction-image {
      width: 50px;
    }

    .interaction-name {
      font-size: 14px;
    }

    .interaction-badge {
      font-size: 9px;
    }
  }

  .feature-card {
    left: -15px;
    transform: scale(0.8) rotate(-3deg);
    padding: 10px;

    .feature-icon {
      width: 30px;
      height: 30px;
    }

    .feature-title {
      font-size: 14px;
    }

    .feature-desc {
      font-size: 10px;
    }
  }

  .play-button-container {
    .play-button {
      width: 60px;
      height: 60px;

      .play-icon {
        font-size: 24px;
      }
    }

    .play-label {
      font-size: 12px;
      padding: 4px 12px;
    }
  }
}

@media (max-width: 480px) {
  .hero-text {
    .hero-title {
      font-size: 2rem;
    }

    .hero-subtitle {
      font-size: 1rem;
    }
  }

  .hero-features {
    flex-direction: column;
    gap: 10px;
  }

  .hero-image {
    max-width: 280px;

    .primary-image {
      border-radius: 20px;
    }
  }

  .scene-card,
  .interaction-card,
  .feature-card {
    transform: scale(0.7);
  }

  .scene-card {
    top: -10px;
    right: -5px;
  }

  .interaction-card {
    bottom: -10px;
    right: -5px;
  }

  .play-button-container {
    .play-button {
      width: 50px;
      height: 50px;

      .play-icon {
        font-size: 20px;
      }
    }
  }
}
</style>
