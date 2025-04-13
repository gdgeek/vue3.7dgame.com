<template>
  <div class="hero-section" :class="{ 'dark-theme': isDark }">
    <div class="hero-background">
      <div class="particle-container">
        <div v-for="n in 20" :key="n" class="particle" :style="getParticleStyle(n)"></div>
      </div>
      <div class="overlay"></div>
    </div>
    <!-- 
    <div class="video-container">
    嵌入 B 站视频的 iframe
      <iframe :src="videoUrl" frameborder="0" allowfullscreen width="640" height="360"></iframe>
    </div> -->
    <div class="hero-content">
      <div class="hero-text" data-aos="fade-up" data-aos-delay="200">
        <h1 class="hero-title">
          <span class="gradient-text">不加班AR创作平台</span>
        </h1>
        <p class="hero-subtitle">让创意在AR设备中绽放，无需加班即可完成！</p>
        <div class="hero-cta">
          <el-button type="primary" style="width:250px" size="large" @click="openLoginDialog">
            开始创建
            <el-icon class="el-icon--right">
              <ArrowRight />
            </el-icon>
          </el-button>
          <el-button style="width:100px" size="large">
            免费授权
            <el-icon class="el-icon--right">
              <ArrowDown />
            </el-icon>
          </el-button>

        </div>
      </div>

      <div class="hero-image" data-aos="fade-left" data-aos-delay="400">


        <div class="image-container">

          <img src="/media/bg/bujiaban.png" @click="openLoginDialog" alt="不加班AR创作平台" class="primary-image" />
          <div class="floating-elements">
            <el-link class="floating-link" href="https://www.rokid.com/" target="_blank">
              <img src="/media/bg/rokid.webp" alt="功能展示" class="floating-image float-1" />

            </el-link>
            <img src="/media/bg/rokid-lite.webp" alt="功能展示" class="floating-image float-2" />
            <div class="stats-card float-3">
              <div class="stats-item">
                <span class="stats-number count-up">可视化编程</span>
                <span class="stats-label">AR应用</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="scroll-indicator" @click="scrollToFeatures">
      <div class="scroll-text">向下滚动了解更多</div>
      <div class="scroll-icon">
        <el-icon class="scroll-arrow">
          <ArrowDown />
        </el-icon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useSettingsStore } from '@/store/modules/settings';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { ArrowRight, ArrowDown } from '@element-plus/icons-vue';

// 获取主题设置
const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === 'dark');

const emit = defineEmits(['openLogin']);

// 视差效果状态
const mouseX = ref(0);
const mouseY = ref(0);

// 这里需要替换为你要播放的 B 站视频的嵌入链接
const videoUrl = ref('https://player.bilibili.com/player.html?bvid=BV1j2dPYWEh1&page=1');
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

  // 计算鼠标位置的百分比
  mouseX.value = (e.clientX / windowWidth - 0.5) * 2;
  mouseY.value = (e.clientY / windowHeight - 0.5) * 2;
};

const openLoginDialog = () => {
  emit('openLogin');
};

const scrollToFeatures = () => {
  const newsSection = document.querySelector('.news-section');
  if (newsSection) {
    newsSection.scrollIntoView({ behavior: 'smooth' });
  }
};

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove);

  // 初始化AOS动画库
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
  background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%);
  color: #fff;

  &.dark-theme {
    background: linear-gradient(135deg, #16222a 0%, #3a6073 100%);
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
    background: rgba(0, 0, 0, 0.3);
    z-index: 1;
  }
}

// 粒子动画
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
    background: linear-gradient(90deg, #ffffff 0%, #8e8e8e 100%);
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
    // display: flex;
    gap: 16px;

    .cta-button {
      padding: 12px 32px;
      font-weight: 600;
      border-radius: 50px;
      background: linear-gradient(90deg, #00dbde 0%, #b2b2b2 100%);
      transition: transform 0.3s ease, box-shadow 0.3s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
      }
    }

    .cta-button-primary {
      &:hover {
        background: linear-gradient(90deg, #b2b2b2 0%, #00dbde 100%);
      }
    }

    .cta-button-secondary {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.3);

      &:hover {
        background: rgba(255, 255, 255, 0.25);
      }
    }
  }
}

.hero-image {
  flex: 1;
  position: relative;
  display: flex;
  justify-content: center;

  .image-container {
    position: relative;
    width: 100%;
    max-width: 660px;
  }

  .primary-image {
    width: 100%;
    height: auto;
    border-radius: 16px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    transition: transform 0.5s ease-out;
  }

  .floating-elements {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .floating-image {
    position: absolute;
    border-radius: 12px;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  }

  .float-1 {
    width: 140px;
    top: -20px;
    left: -40px;
    animation: float-animation-1 6s ease-in-out infinite;
  }

  .float-2 {
    width: 160px;
    bottom: -30px;
    right: -30px;
    animation: float-animation-2 8s ease-in-out infinite;
  }

  .stats-card {
    position: absolute;
    bottom: 30%;
    left: -50px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
    animation: float-animation-3 7s ease-in-out infinite;

    .stats-item {
      display: flex;
      flex-direction: column;
      align-items: center;

      .stats-number {
        font-size: 28px;
        font-weight: 700;
        color: #1a2980;
      }

      .stats-label {
        font-size: 14px;
        color: #666;
      }
    }
  }
}

@keyframes float-animation-1 {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-15px);
  }
}

@keyframes float-animation-2 {

  0%,
  100% {
    transform: translateY(0) rotate(2deg);
  }

  50% {
    transform: translateY(-20px) rotate(-2deg);
  }
}

@keyframes float-animation-3 {

  0%,
  100% {
    transform: translateY(0) rotate(-3deg);
  }

  50% {
    transform: translateY(-25px) rotate(3deg);
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

@keyframes bounce {

  0%,
  20%,
  50%,
  80%,
  100% {
    transform: translateY(0) translateX(-50%);
  }

  40% {
    transform: translateY(-10px) translateX(-50%);
  }

  60% {
    transform: translateY(-5px) translateX(-50%);
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
    margin-bottom: 60px;

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

    .image-container {
      max-width: 400px;
    }
  }
}

@media screen and (max-width: 768px) {
  .hero-content {
    padding: 100px 20px 40px;
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

      .cta-button,
      .cta-button-secondary {
        width: 100%;
      }
    }
  }

  .hero-image {
    .image-container {
      max-width: 280px;
    }

    .float-1,
    .float-2 {
      width: 100px;
    }

    .stats-card {
      padding: 10px;
      left: -20px;

      .stats-number {
        font-size: 20px;
      }

      .stats-label {
        font-size: 12px;
      }
    }
  }
}
</style>
