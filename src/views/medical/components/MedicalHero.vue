<template>
  <div class="hero-section" :class="{ 'dark-theme': isDark }">
    <div class="hero-background">
      <div class="particle-container">
        <div v-for="n in 20" :key="n" class="particle" :style="getParticleStyle(n)"></div>
      </div>
      <div class="overlay"></div>
    </div>

    <div class="hero-content">
      <div class="hero-text" data-aos="fade-up" data-aos-delay="200">
        <h1 class="hero-title">
          <span class="gradient-text">医疗AR智能平台</span>
        </h1>
        <p class="hero-subtitle">引领医疗科技创新，为医疗行业带来革命性AR解决方案</p>
        <div class="hero-cta">
          <el-button type="primary" style="width:150px" size="large" @click="openLoginDialog">
            预约演示
            <el-icon class="el-icon--right">
              <ArrowRight />
            </el-icon>
          </el-button>
          <el-button style="width:150px" size="large" @click="scrollToSolutions">
            解决方案
            <el-icon class="el-icon--right">
              <ArrowDown />
            </el-icon>
          </el-button>
        </div>
      </div>

      <div class="hero-image" data-aos="fade-left" data-aos-delay="400">
        <div class="showcase-container">
          <img
            src="https://img.freepik.com/free-photo/doctor-using-modern-computer-with-medical-records-interface_53876-96225.jpg"
            @click="openVideoDialog" alt="医疗AR智能平台" class="primary-image" />

          <div class="floating-elements">
            <!-- 医疗认证卡片 -->
            <div class="floating-element certification-card">
              <div class="certification-icon">
                <el-icon>
                  <Medal />
                </el-icon>
              </div>
              <div class="certification-info">
                <span class="certification-title">医疗器械认证</span>
                <div class="certification-badge">国际认证</div>
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
                <span class="accuracy-label">定位精度</span>
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
                <span class="feature-title">实时3D成像</span>
                <span class="feature-desc">亚毫米级精度</span>
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

    <div class="scroll-indicator" @click="scrollToSolutions">
      <div class="scroll-text">向下滚动了解更多</div>
      <div class="scroll-icon">
        <el-icon class="scroll-arrow">
          <ArrowDown />
        </el-icon>
      </div>
    </div>
  </div>

  <!-- 视频弹窗 -->
  <el-dialog v-model="videoDialogVisible" title="医疗AR智能平台演示视频" width="70%" :before-close="handleCloseVideo"
    destroy-on-close>
    <Bilibili :bvid="bilibiliVideoId" :height="500" :autoplay="true" />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useSettingsStore } from '@/store/modules/settings';
import AOS from 'aos';
import 'aos/dist/aos.css';

// 获取主题设置
const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === 'dark');

const emit = defineEmits(['openLogin']);

// 视频弹窗控制
const videoDialogVisible = ref(false);
const bilibiliVideoId = ref('BV1j2dPYWEh1');

// 视差效果状态
const mouseX = ref(0);
const mouseY = ref(0);

// 打开视频对话框
const openVideoDialog = () => {
  videoDialogVisible.value = true;
};

// 关闭视频对话框
const handleCloseVideo = () => {
  videoDialogVisible.value = false;
};

// 生成粒子样式
const getParticleStyle = (n: number) => {
  const size = Math.floor(Math.random() * 10) + 3;
  const posX = Math.random() * 100;
  const posY = Math.random() * 100;
  const duration = (Math.random() * 20) + 10;
  const delay = Math.random() * 5;

  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${posX}%`,
    top: `${posY}%`,
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`
  };
};

// 监听鼠标移动实现视差效果
const handleMouseMove = (e: MouseEvent) => {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  mouseX.value = (e.clientX / windowWidth - 0.5) * 2;
  mouseY.value = (e.clientY / windowHeight - 0.5) * 2;
};

const openLoginDialog = () => {
  emit('openLogin');
};

const scrollToSolutions = () => {
  const solutionsSection = document.querySelector('.solutions-section');
  if (solutionsSection) {
    solutionsSection.scrollIntoView({ behavior: 'smooth' });
  }
};

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove);
  AOS.init({
    duration: 1000,
    once: false,
    mirror: true
  });
});

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove);
});
</script>

<style lang="scss" scoped>
.hero-section {
  position: relative;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background: linear-gradient(135deg, #0396FF 0%, #ABDCFF 100%);
  color: #fff;

  &.dark-theme {
    background: linear-gradient(135deg, #1C4584 0%, #2D6DAD 100%);
  }
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;

  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.2);
    z-index: 1;
  }
}

.particle-container {
  position: absolute;
  width: 100%;
  height: 100%;
}

.particle {
  position: absolute;
  background-color: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  pointer-events: none;
  animation: float linear infinite;
  z-index: 0;
}

@keyframes float {
  0% {
    transform: translateY(0) translateX(0) rotate(0deg);
    opacity: 0;
  }

  10% {
    opacity: 1;
  }

  90% {
    opacity: 1;
  }

  100% {
    transform: translateY(-100vh) translateX(100px) rotate(360deg);
    opacity: 0;
  }
}

.hero-content {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 60px;
}

.hero-text {
  flex: 1;
  max-width: 600px;

  .hero-title {
    font-size: 3.5rem;
    font-weight: 800;
    margin-bottom: 1.5rem;
    line-height: 1.2;
  }

  .gradient-text {
    background: linear-gradient(90deg, #ffffff 0%, #E0F7FF 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hero-subtitle {
    font-size: 1.5rem;
    font-weight: 400;
    margin-bottom: 3rem;
    opacity: 0.9;
  }

  .hero-cta {
    display: flex;
    gap: 16px;
  }
}

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

    &:hover {
      .play-button-container {
        opacity: 1;
        visibility: visible;
      }
    }
  }

  .primary-image {
    width: 100%;
    height: auto;
    border-radius: 24px;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
    transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
    object-fit: contain;
    filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.1));
    z-index: 1;

    &:hover {
      transform: scale(1.02);
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.3);
    }
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
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(15px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
    padding: 12px;
    transform-style: preserve-3d;
    transition: transform 0.3s ease, box-shadow 0.3s ease;

    &:hover {
      transform: translateY(-5px) translateZ(20px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
    }
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

    .certification-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0396FF, #ABDCFF);
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
      color: #333;
    }

    .certification-badge {
      background: linear-gradient(90deg, #0396FF, #ABDCFF);
      color: white;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 8px;
    }
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

    .accuracy-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0396FF, #ABDCFF);
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
      color: #0396FF;
    }

    .accuracy-label {
      font-size: 12px;
      color: #666;
    }
  }

  /* 技术特点卡片 */
  .feature-card {
    top: 40%;
    left: -70px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    animation: float-card 7s ease-in-out infinite 1s;
    transform: rotate(-3deg);
    z-index: 3;

    .feature-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0396FF, #ABDCFF);
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
      color: #333;
    }

    .feature-desc {
      font-size: 12px;
      color: #666;
    }
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

    &:hover {
      transform: translate(-50%, -50%) scale(1.1);

      .play-icon {
        color: rgba(255, 255, 255, 1);
      }
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

  .scroll-text {
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 10px;
    letter-spacing: 1px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .scroll-icon {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(5px);
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    animation: pulse 2s infinite;
    transition: all 0.3s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-3px);
    }

    .scroll-arrow {
      font-size: 18px;
      color: rgba(255, 255, 255, 0.9);
    }
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
  }

  70% {
    box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
  }
}

// 移动端适配
@media screen and (max-width: 1024px) {
  .hero-content {
    flex-direction: column;
    padding: 120px 30px 60px;
    justify-content: center;
    text-align: center;
  }

  .hero-text {
    margin-bottom: 40px;

    .hero-title {
      font-size: 2.5rem;
    }

    .hero-subtitle {
      font-size: 1.2rem;
    }

    .hero-cta {
      justify-content: center;
    }
  }

  .hero-image {
    width: 100%;
    max-width: 500px;
    margin-bottom: 40px;

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
  }

  .scroll-indicator {
    bottom: 20px;
  }
}

@media screen and (max-width: 768px) {
  .hero-content {
    padding: 100px 15px 40px;
  }

  .hero-text {
    .hero-title {
      font-size: 2rem;
    }

    .hero-subtitle {
      font-size: 1rem;
      margin-bottom: 2rem;
    }

    .hero-cta {
      flex-direction: column;
      gap: 12px;
    }
  }

  .hero-image {
    width: 100%;
    max-width: 350px;
    margin-bottom: 60px;

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

  .scroll-indicator {
    bottom: 15px;

    .scroll-text {
      font-size: 12px;
      margin-bottom: 5px;
    }

    .scroll-icon {
      width: 30px;
      height: 30px;

      .scroll-arrow {
        font-size: 14px;
      }
    }
  }
}

@media screen and (max-width: 480px) {
  .hero-image {
    max-width: 280px;

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
}
</style>