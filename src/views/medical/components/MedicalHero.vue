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
          <span>3D牙科</span>
          <span class="gradient-text">XR平台</span>
        </h1>
        <p class="hero-subtitle">融合拓展现实与数字牙科技术，引领牙科数字化体验新时代</p>

        <!-- 特点标签 -->
        <div class="hero-features">
          <div class="feature-item">
            <el-icon>
              <Aim />
            </el-icon>
            <span>微米级精度</span>
          </div>
          <div class="feature-item">
            <el-icon>
              <Operation />
            </el-icon>
            <span>3D视觉导航</span>
          </div>
          <div class="feature-item">
            <el-icon>
              <DataAnalysis />
            </el-icon>
            <span>智能诊疗分析</span>
          </div>
        </div>

        <!-- 行动按钮 -->
        <div class="hero-cta">
          <el-button type="primary" size="large" @click="openLoginDialog">
            预约演示
          </el-button>
          <el-button size="large" @click="scrollToSolutions">
            了解更多
          </el-button>
        </div>
      </div>

      <!-- 保持原有的hero-image区域 -->
      <div class="hero-image" data-aos="fade-left" data-aos-delay="400">
        <div class="showcase-container">
          <img src="/media/image/ar_medical.png" @click="openVideoDialog" alt="牙科XR智能平台" class="primary-image" />

          <div class="floating-elements">
            <!-- 认证卡片 -->
            <div class="floating-element certification-card">
              <div class="certification-icon">
                <el-icon>
                  <Medal />
                </el-icon>
              </div>
              <div class="certification-info">
                <span class="certification-title">技术认证</span>
                <div class="certification-badge">国际标准</div>
              </div>
            </div>

            <!-- 精准度卡片 -->
            <div class="floating-element accuracy-card">
              <div class="accuracy-icon">
                <el-icon>
                  <Aim />
                </el-icon>
              </div>
              <div class="accuracy-info">
                <span class="accuracy-value">99.9%</span>
                <span class="accuracy-label">模型精度</span>
              </div>
            </div>

            <!-- 技术特点卡片 -->
            <div class="floating-element feature-card">
              <div class="feature-icon">
                <el-icon>
                  <Monitor />
                </el-icon>
              </div>
              <div class="feature-info">
                <span class="feature-title">实时3D建模</span>
                <span class="feature-desc">微米级精度</span>
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
  <el-dialog v-model="videoDialogVisible" title="牙科XR智能平台演示" width="70%" :before-close="handleCloseVideo"
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
  Aim,
  Operation,
  DataAnalysis,
  Medal,
  Monitor,
  ArrowRight,
  View
} from '@element-plus/icons-vue';

// 获取主题设置
const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === 'dark');

// 定义事件
const emit = defineEmits(['openLogin']);

// 视频弹窗控制
const videoDialogVisible = ref(false);
const bilibiliVideoId = ref('BV1j2dPYWEh1');

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
};

// 登录对话框
const openLoginDialog = () => {
  emit('openLogin');
};

// 滚动到解决方案部分
const scrollToSolutions = () => {
  const solutionsSection = document.querySelector('.ar-solutions-section');
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

<style scoped>
.hero-section {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  overflow: hidden;
  padding: 0 20px;
  background: linear-gradient(135deg, #e0eeff 0%, #f8fcff 100%);
  color: var(--el-text-color-primary);
}

.dark-theme.hero-section {
  background: linear-gradient(135deg, #253746 0%, #1e3c5a 100%);
  color: #ffffff;
}

/* 背景效果 */
.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.05) 20%, rgba(41, 128, 185, 0.05) 100%);
  z-index: 1;
}

.dark-theme .overlay {
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.1) 30%, rgba(41, 128, 185, 0.1) 100%);
}

/* 内容区 */
.hero-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 60px;
  position: relative;
  z-index: 2;
}

.hero-text {
  flex: 1;
}

.hero-title {
  font-size: 4rem;
  font-weight: 800;
  margin-bottom: 20px;
  line-height: 1.1;
  color: #2c3e50;
}

.dark-theme .hero-title {
  color: #ffffff;
}

.gradient-text {
  background: linear-gradient(90deg, #3498db, #00d2ff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-block;
}

.hero-subtitle {
  font-size: 1.4rem;
  color: #34495e;
  margin-bottom: 30px;
  max-width: 600px;
  line-height: 1.5;
}

.dark-theme .hero-subtitle {
  color: #ecf0f1;
}

.hero-features {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: rgba(255, 255, 255, 0.7);
  padding: 10px 16px;
  border-radius: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.dark-theme .feature-item {
  background-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.feature-item .el-icon {
  color: #3498db;
}

.dark-theme .feature-item .el-icon {
  color: #00d2ff;
}

.feature-item span {
  color: #34495e;
}

.dark-theme .feature-item span {
  color: #ecf0f1;
}

.hero-cta {
  display: flex;
  gap: 15px;
}

/* 视频容器 */
.video-container {
  width: 100%;
  position: relative;
  padding-bottom: 56.25%;
  /* 16:9 */
}

.video-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* 保留原来的hero-image样式，稍微调整背景 */
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
}

.showcase-container {
  position: relative;
  width: 100%;
  transform-style: preserve-3d;
  transform: rotateY(calc(var(--mouse-x, 0) * 5deg)) rotateX(calc(var(--mouse-y, 0) * -5deg));
  transition: transform 0.1s ease-out;
}

.showcase-container:hover .play-button-container {
  opacity: 1;
  visibility: visible;
}

.primary-image {
  width: 100%;
  height: auto;
  border-radius: 24px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
  object-fit: contain;
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.1));
  z-index: 1;
}

.primary-image:hover {
  transform: scale(1.02);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.2);
}

.floating-elements {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
}

.floating-element {
  position: absolute;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(15px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  padding: 12px;
  transform-style: preserve-3d;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.dark-theme .floating-element {
  background: rgba(44, 62, 80, 0.85);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
}

.floating-element:hover {
  transform: translateY(-5px) translateZ(20px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

/* 医疗认证卡片 */
.certification-card {
  top: -35px;
  right: -50px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  animation: float-card 8s ease-in-out infinite;
  transform: rotate(-5deg);
  z-index: 5;
}

.certification-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3498db, #00d2ff);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.certification-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.certification-title {
  font-weight: 700;
  font-size: 16px;
  color: #2c3e50;
}

.dark-theme .certification-title {
  color: #ecf0f1;
}

.certification-badge {
  background: linear-gradient(90deg, #3498db, #00d2ff);
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 8px;
}

/* 精准度卡片 */
.accuracy-card {
  bottom: -35px;
  right: -50px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  animation: float-card 8s ease-in-out infinite 0.5s;
  transform: rotate(5deg);
  z-index: 4;
}

.accuracy-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3498db, #00d2ff);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.accuracy-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.accuracy-value {
  font-weight: 700;
  font-size: 20px;
  color: #3498db;
}

.dark-theme .accuracy-value {
  color: #00d2ff;
}

.accuracy-label {
  font-size: 12px;
  color: #7f8c8d;
}

.dark-theme .accuracy-label {
  color: #bdc3c7;
}

/* 技术特点卡片 */
.feature-card {
  top: 40%;
  left: -70px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  animation: float-card 8s ease-in-out infinite;
  transform: rotate(-3deg);
  z-index: 3;
}

.feature-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3498db, #00d2ff);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.feature-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.feature-title {
  font-weight: 700;
  font-size: 16px;
  color: #2c3e50;
}

.dark-theme .feature-title {
  color: #ecf0f1;
}

.feature-desc {
  font-size: 12px;
  color: #7f8c8d;
}

.dark-theme .feature-desc {
  color: #bdc3c7;
}

/* 播放按钮样式 */
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
}

.play-button-container:hover {
  transform: translate(-50%, -50%) scale(1.1);
}

.play-button-container:hover .play-icon {
  color: rgba(255, 255, 255, 1);
}

.play-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-button::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  z-index: -1;
  animation: pulse-ring 2s infinite;
}

.play-icon {
  font-size: 48px;
  color: rgba(255, 255, 255, 0.9);
  transition: color 0.3s ease;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.3));
}

.play-label {
  font-size: 14px;
  font-weight: 600;
  color: white;
  background: rgba(52, 152, 219, 0.8);
  padding: 6px 16px;
  border-radius: 20px;
  transition: all 0.3s ease;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* 3D效果装饰 */
.decoration-elements {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  border: 2px solid rgba(52, 152, 219, 0.1);
  opacity: 0.5;
}

.dark-theme .deco-circle {
  border: 2px solid rgba(41, 128, 185, 0.2);
}

.deco-line {
  position: absolute;
  background: linear-gradient(90deg, rgba(52, 152, 219, 0.1), transparent);
  height: 1px;
}

.dark-theme .deco-line {
  background: linear-gradient(90deg, rgba(41, 128, 185, 0.2), transparent);
}

.circle-1 {
  width: 200px;
  height: 200px;
  top: -100px;
  right: -50px;
}

.circle-2 {
  width: 150px;
  height: 150px;
  bottom: -50px;
  left: -70px;
}

.line-1 {
  width: 150px;
  transform: rotate(45deg);
  top: 100px;
  left: -20px;
}

.line-2 {
  width: 180px;
  transform: rotate(-30deg);
  bottom: 120px;
  right: 0;
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

/* 滚动指示器样式 */
.scroll-indicator {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.4s ease-out;
}

.scroll-text {
  color: #2c3e50;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 10px;
  letter-spacing: 1px;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
  transition: opacity 0.3s ease;
}

.dark-theme .scroll-text {
  color: #ecf0f1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.scroll-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(52, 152, 219, 0.2);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  border: 1px solid rgba(52, 152, 219, 0.3);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  animation: pulse 2s infinite;
  transition: all 0.3s ease;
}

.dark-theme .scroll-icon {
  background: rgba(41, 128, 185, 0.3);
  border: 1px solid rgba(41, 128, 185, 0.4);
}

.scroll-icon:hover {
  background: rgba(52, 152, 219, 0.3);
  transform: translateY(-3px);
}

.dark-theme .scroll-icon:hover {
  background: rgba(41, 128, 185, 0.4);
}

.scroll-arrow {
  font-size: 18px;
  color: #2c3e50;
}

.dark-theme .scroll-arrow {
  color: #ecf0f1;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.4);
  }

  70% {
    box-shadow: 0 0 0 10px rgba(52, 152, 219, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(52, 152, 219, 0);
  }
}

/* 响应式调整 */
@media (max-width: 992px) {
  .hero-content {
    flex-direction: column;
    gap: 40px;
    padding-top: 80px;
  }

  .hero-title {
    font-size: 3rem;
  }

  .hero-subtitle {
    font-size: 1.2rem;
  }

  .hero-image {
    max-width: 500px;
    margin-bottom: 40px;
  }

  .certification-card {
    top: -25px;
    right: -20px;
  }

  .accuracy-card {
    bottom: -25px;
    right: -20px;
  }

  .feature-card {
    left: -30px;
  }

  .scroll-indicator {
    bottom: 20px;
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }

  .hero-features {
    flex-direction: column;
    gap: 10px;
  }

  .hero-image {
    width: 100%;
    max-width: 350px;
  }

  .feature-item {
    width: fit-content;
  }

  .showcase-container {
    transform: none !important;
  }

  .certification-card,
  .accuracy-card,
  .feature-card {
    transform: scale(0.8);
    padding: 8px 12px;
  }

  .certification-card {
    top: -15px;
    right: -10px;
  }

  .accuracy-card {
    bottom: -15px;
    right: -10px;
  }

  .feature-card {
    left: -15px;
  }

  .scroll-indicator {
    bottom: 15px;
  }

  .scroll-text {
    font-size: 12px;
    margin-bottom: 5px;
  }

  .scroll-icon {
    width: 30px;
    height: 30px;
  }

  .scroll-arrow {
    font-size: 14px;
  }
}

@media (max-width: 576px) {
  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .hero-cta {
    flex-direction: column;
    width: 100%;
  }

  .hero-cta .el-button {
    width: 100%;
  }

  .hero-image {
    max-width: 280px;
  }

  .primary-image {
    border-radius: 20px;
  }

  .certification-card,
  .accuracy-card,
  .feature-card {
    transform: scale(0.7);
  }

  .certification-card {
    top: -10px;
    right: -5px;
  }

  .accuracy-card {
    bottom: -10px;
    right: -5px;
  }
}
</style>