<template>
  <div class="cta-section" :class="{ 'dark-theme': isDark }">
    <div class="container">
      <div class="cta-container" data-aos="fade-up">
        <div class="cta-content">
          <h2 class="cta-title">准备好开始创造 AR 世界了吗？</h2>
          <p class="cta-description">立即加入我们的平台，开启混合现实创作之旅。不需要任何编程经验，即可创建专业级 AR 应用。</p>

          <div class="cta-features">
            <div class="cta-feature">
              <el-icon class="feature-icon">
                <Timer />
              </el-icon>
              <span>快速上手，立即创建</span>
            </div>
            <div class="cta-feature">
              <el-icon class="feature-icon">
                <Unlock />
              </el-icon>
              <span>免费开始，按需升级</span>
            </div>
            <div class="cta-feature">
              <el-icon class="feature-icon">
                <Connection />
              </el-icon>
              <span>随时随地云端协作</span>
            </div>
          </div>

          <div class="cta-buttons">
            <el-button type="primary" size="large" class="cta-button" @click="openLoginDialog">
              立即开始
            </el-button>
            <el-button size="large" class="cta-button-secondary">
              申请演示
            </el-button>
          </div>
        </div>

        <div class="cta-image" data-aos="fade-left" data-aos-delay="200">
          <img src="/media/bg/m2-screen.jpg" alt="AR编程平台" />
          <div class="floating-elements">
            <div class="floating-badge badge-1">
              <el-icon class="floating-icon">
                <Medal />
              </el-icon>
              <span>行业领先</span>
            </div>
            <div class="floating-badge badge-2">
              <el-icon class="floating-icon">
                <Odometer />
              </el-icon>
              <span>高性能</span>
            </div>
            <div class="floating-badge badge-3">
              <el-icon class="floating-icon">
                <Cpu />
              </el-icon>
              <span>易用性</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="wave-container">
      <div class="wave"></div>
      <div class="wave"></div>
      <div class="wave"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSettingsStore } from '@/store/modules/settings';
import { Timer, Unlock, Connection, Medal, Odometer, Cpu } from '@element-plus/icons-vue';

const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === 'dark');

const emit = defineEmits(['openLogin']);

const openLoginDialog = () => {
  emit('openLogin');
};
</script>

<style lang="scss" scoped>
.cta-section {
  position: relative;
  padding: 120px 0 160px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  overflow: hidden;

  &.dark-theme {
    background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
  }
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  position: relative;
  z-index: 10;
}

.cta-container {
  display: flex;
  align-items: center;
  gap: 60px;
}

.cta-content {
  flex: 1;

  .cta-title {
    font-size: 2.8rem;
    font-weight: 800;
    margin-bottom: 1.5rem;
    line-height: 1.2;
  }

  .cta-description {
    font-size: 1.1rem;
    margin-bottom: 2rem;
    opacity: 0.9;
    line-height: 1.6;
  }
}

.cta-features {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 2.5rem;

  .cta-feature {
    display: flex;
    align-items: center;
    gap: 12px;

    .feature-icon {
      font-size: 1.2rem;
      background-color: rgba(255, 255, 255, 0.2);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    span {
      font-size: 1.1rem;
    }
  }
}

.cta-buttons {
  display: flex;
  gap: 16px;

  .cta-button {
    padding: 12px 32px;
    font-weight: 600;
    border-radius: 50px;
    background-color: white;
    color: #6366f1;
    border: none;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
      background-color: white;
      color: #4f46e5;
    }
  }

  .cta-button-secondary {
    padding: 12px 32px;
    font-weight: 600;
    border-radius: 50px;
    background-color: transparent;
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
      border-color: rgba(255, 255, 255, 0.6);
    }
  }
}

.cta-image {
  flex: 1;
  position: relative;

  img {
    width: 100%;
    max-width: 500px;
    border-radius: 16px;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
    transform: perspective(1000px) rotateY(-5deg) rotateX(5deg);
    transition: all 0.5s ease;

    &:hover {
      transform: perspective(1000px) rotateY(0deg) rotateX(0deg);
    }
  }

  .floating-elements {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .floating-badge {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 50px;
    background-color: white;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);

    .floating-icon {
      font-size: 1rem;
      color: #6366f1;
    }

    span {
      font-size: 0.9rem;
      font-weight: 600;
      color: #4b5563;
    }
  }

  .badge-1 {
    top: -20px;
    left: 20px;
    animation: float-badge-1 5s ease-in-out infinite;
  }

  .badge-2 {
    bottom: 30px;
    left: -30px;
    animation: float-badge-2 6s ease-in-out infinite;
  }

  .badge-3 {
    top: 40%;
    right: -20px;
    animation: float-badge-3 7s ease-in-out infinite;
  }
}

@keyframes float-badge-1 {

  0%,
  100% {
    transform: translateY(0) rotate(-2deg);
  }

  50% {
    transform: translateY(-15px) rotate(2deg);
  }
}

@keyframes float-badge-2 {

  0%,
  100% {
    transform: translateY(0) rotate(3deg);
  }

  50% {
    transform: translateY(-10px) rotate(-3deg);
  }
}

@keyframes float-badge-3 {

  0%,
  100% {
    transform: translateY(0) rotate(-5deg);
  }

  50% {
    transform: translateY(-20px) rotate(5deg);
  }
}

// 波浪效果
.wave-container {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  overflow: hidden;
  line-height: 0;
  z-index: 1;
}

.wave {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 200%;
  height: 80px;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none"><path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" fill="%23FFFFFF" opacity="0.2"></path></svg>');
  background-size: 1200px 80px;
  background-repeat: repeat-x;
  animation: wave-animation 25s linear infinite;
}

.wave:nth-child(2) {
  bottom: 10px;
  animation: wave-animation 15s linear infinite reverse;
  opacity: 0.5;
}

.wave:nth-child(3) {
  bottom: 20px;
  animation: wave-animation 20s linear infinite;
  opacity: 0.2;
}

@keyframes wave-animation {
  0% {
    transform: translateX(0);
  }

  100% {
    transform: translateX(-50%);
  }
}

// 响应式设计
@media screen and (max-width: 992px) {
  .cta-container {
    flex-direction: column;
    text-align: center;
  }

  .cta-content {
    .cta-title {
      font-size: 2.4rem;
    }
  }

  .cta-features {
    .cta-feature {
      justify-content: center;
    }
  }

  .cta-buttons {
    justify-content: center;
  }

  .cta-image {
    margin-top: 40px;
    display: flex;
    justify-content: center;

    img {
      max-width: 400px;
    }
  }
}

@media screen and (max-width: 768px) {
  .cta-section {
    padding: 80px 0 120px;
  }

  .cta-content {
    .cta-title {
      font-size: 2rem;
    }

    .cta-description {
      font-size: 1rem;
    }
  }

  .cta-buttons {
    flex-direction: column;
    gap: 12px;

    .cta-button,
    .cta-button-secondary {
      width: 100%;
    }
  }

  .cta-image {
    img {
      max-width: 300px;
    }

    .floating-badge {
      padding: 8px 12px;

      span {
        font-size: 0.8rem;
      }
    }

    .badge-1 {
      top: -15px;
      left: 10px;
    }

    .badge-2 {
      bottom: 20px;
      left: -15px;
    }

    .badge-3 {
      right: -10px;
    }
  }
}
</style>