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
          <img src="https://ts1.tc.mm.bing.net/th/id/OIP-C.VlX5zuS8Br8LMfxYpZ0VsAHaEo?rs=1&pid=ImgDetMain"
            alt="AR教育创新平台" class="primary-image" @click="openVideoDialog" />

          <div class="floating-elements">
            <!-- 3D建模卡片 -->
            <div class="floating-element modeling-card">
              <div class="modeling-icon">
                <el-icon>
                  <Monitor />
                </el-icon>
              </div>
              <div class="modeling-info">
                <span class="modeling-title">Three.js</span>
                <div class="modeling-badge">3D场景构建</div>
              </div>
            </div>

            <!-- 编程卡片 -->
            <div class="floating-element programming-card">
              <div class="programming-icon">
                <el-icon>
                  <Connection />
                </el-icon>
              </div>
              <div class="programming-info">
                <span class="programming-value">Blockly</span>
                <span class="programming-label">可视化编程</span>
              </div>
            </div>

            <!-- 交互卡片 -->
            <div class="floating-element interaction-card">
              <div class="interaction-icon">
                <el-icon>
                  <TrendCharts />
                </el-icon>
              </div>
              <div class="interaction-info">
                <span class="interaction-title">沉浸式互动</span>
                <span class="interaction-desc">多感官学习</span>
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

<style scoped>
.hero-section {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  overflow: hidden;
  padding: 0 20px;
  background: linear-gradient(135deg, #ebf4ff 0%, #f9fcff 100%);
  color: var(--el-text-color-primary);
}

.dark-theme.hero-section {
  background: linear-gradient(135deg, #213346 0%, #1c2c3d 100%);
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
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.03) 20%, rgba(52, 152, 219, 0.05) 100%);
  z-index: 1;
}

.dark-theme .overlay {
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.1) 30%, rgba(52, 152, 219, 0.1) 100%);
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
  position: relative;
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
  position: relative;
  cursor: pointer;
  margin-right: 15px;
}

/* 角落装饰元素 */
.corner-decoration {
  position: absolute;
  width: 20px;
  height: 20px;
  display: block;
  transition: all 0.3s ease;
}

.corner-decoration.top-left {
  top: -6px;
  left: -6px;
  border-top: 3px solid #3498db;
  border-left: 3px solid #3498db;
}

.corner-decoration.bottom-right {
  bottom: -6px;
  right: -6px;
  border-bottom: 3px solid #00d2ff;
  border-right: 3px solid #00d2ff;
}

/* 鼠标悬停时的延展效果 */
.gradient-text:hover .corner-decoration.top-left {
  width: 30px;
  height: 30px;
}

.gradient-text:hover .corner-decoration.bottom-right {
  width: 30px;
  height: 30px;
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
  object-fit: cover;
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.1));
  z-index: 1;
  cursor: pointer;
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
  display: flex;
  align-items: center;
  transform-style: preserve-3d;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.dark-theme .floating-element {
  background: rgba(30, 41, 59, 0.8);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
}

.floating-element:hover {
  transform: translateY(-5px) translateZ(20px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

/* 3D建模卡片 */
.modeling-card {
  top: -35px;
  right: -50px;
  transform: translateZ(40px);
  animation: float-card 8s ease-in-out infinite;
  transform: rotate(-5deg);
  z-index: 5;
}

.modeling-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #3498db, #2980b9);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-right: 12px;
}

.modeling-info {
  display: flex;
  flex-direction: column;
}

.modeling-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: #2c3e50;
}

.dark-theme .modeling-title {
  color: #ecf0f1;
}

.modeling-badge {
  font-size: 0.75rem;
  background-color: rgba(52, 152, 219, 0.2);
  color: #3498db;
  padding: 3px 8px;
  border-radius: 20px;
  margin-top: 4px;
}

.dark-theme .modeling-badge {
  background-color: rgba(52, 152, 219, 0.3);
  color: #4fc3f7;
}

/* 编程卡片 */
.programming-card {
  top: 40%;
  left: -70px;
  transform: translateZ(30px);
  animation: float-card 8s ease-in-out infinite 0.5s;
  transform: rotate(-3deg);
  z-index: 4;
}

.programming-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #9b59b6, #8e44ad);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-right: 12px;
}

.programming-info {
  display: flex;
  flex-direction: column;
}

.programming-value {
  font-size: 1rem;
  font-weight: 700;
  color: #2c3e50;
}

.dark-theme .programming-value {
  color: #ecf0f1;
}

.programming-label {
  font-size: 0.75rem;
  color: #7f8c8d;
}

.dark-theme .programming-label {
  color: #bdc3c7;
}

/* 交互卡片 */
.interaction-card {
  bottom: -35px;
  right: -50px;
  transform: translateZ(20px);
  animation: float-card 8s ease-in-out infinite 1s;
  transform: rotate(5deg);
  z-index: 3;
}

.interaction-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-right: 12px;
}

.interaction-info {
  display: flex;
  flex-direction: column;
}

.interaction-title {
  font-weight: 600;
  font-size: 0.9rem;
  color: #2c3e50;
}

.dark-theme .interaction-title {
  color: #ecf0f1;
}

.interaction-desc {
  font-size: 0.75rem;
  color: #7f8c8d;
}

.dark-theme .interaction-desc {
  color: #bdc3c7;
}

/* 装饰元素 */
.decoration-elements {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(52, 152, 219, 0.2) 0%, rgba(52, 152, 219, 0) 70%);
}

.deco-line {
  position: absolute;
  background: linear-gradient(90deg, rgba(52, 152, 219, 0), rgba(52, 152, 219, 0));
  height: 2px;
  transform-origin: left center;
  opacity: 0;
  visibility: hidden;
}

.circle-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  right: -50px;
  opacity: 0.5;
}

.circle-2 {
  width: 200px;
  height: 200px;
  bottom: -30px;
  left: 10%;
  opacity: 0.3;
}

.line-1 {
  width: 150px;
  top: 20%;
  left: -20px;
  transform: rotate(20deg);
}

.line-2 {
  width: 100px;
  bottom: 25%;
  right: 10%;
  transform: rotate(-30deg);
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
}

.scroll-text {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 10px;
  color: #34495e;
}

.dark-theme .scroll-text {
  color: #ecf0f1;
}

.scroll-icon {
  width: 36px;
  height: 36px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(5px);
  animation: bounce 2s infinite;
}

.dark-theme .scroll-icon {
  background-color: rgba(52, 152, 219, 0.3);
}

.scroll-arrow {
  color: #3498db;
  font-size: 18px;
}

.dark-theme .scroll-arrow {
  color: #00d2ff;
}

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
  }

  .hero-features {
    justify-content: center;
    flex-wrap: wrap;
  }

  .hero-title {
    font-size: 3rem;
  }

  .hero-subtitle {
    font-size: 1.2rem;
    margin-left: auto;
    margin-right: auto;
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: 1.1rem;
  }

  .floating-element {
    display: none;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .hero-features {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
