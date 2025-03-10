<template>
  <div class="tts-container" :class="{ 'entering': isEntering }">
    <div class="g-bg">
      <div class="g-polygon g-polygon-1"></div>
      <div class="g-polygon g-polygon-2"></div>
      <div class="g-polygon g-polygon-3"></div>
    </div>

    <div class="tts-content">
      <h1 class="tts-title">
        <span class="tts-title-en">Text To Speech</span>
        <span class="tts-title-divider">-</span>
        <span class="tts-title-zh">语音合成</span>
      </h1>

      <div class="tts-buttons">
        <el-button type="primary" size="large" @click="navigateTo('wordToAudio')"
          :class="['tts-button', activeButton === 'wordToAudio' ? 'active' : '']">
          文字转语音
        </el-button>

        <el-button type="success" size="large" @click="navigateTo('audioToWord')"
          :class="['tts-button', activeButton === 'audioToWord' ? 'active' : '']">
          语音转文字
        </el-button>

        <el-button type="warning" size="large" @click="navigateTo('wordToAudioV2')"
          :class="['tts-button', activeButton === 'wordToAudioV2' ? 'active' : '']">
          文字转语音(文本跟随朗读变色)
        </el-button>

        <el-button type="danger" size="large" @click="navigateTo('tencentTTS')"
          :class="['tts-button', activeButton === 'tencentTTS' ? 'active' : '']">
          腾讯云语音合成
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'

const router = useRouter()
const activeButton = ref('')
const isEntering = ref(true)

// 页面加载完成后
onMounted(() => {
  setTimeout(() => {
    isEntering.value = false
  }, 300)
})

const navigateTo = (route: string) => {
  activeButton.value = route
  setTimeout(() => {
    router.push(`/tts/${route}`)
  }, 300)
}
</script>

<style scoped lang="scss">
.tts-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  opacity: 1;
  transform: translateY(0);

  &.entering {
    opacity: 0;
    transform: translateY(30px);
  }

  .g-bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;

    &::before {
      content: "";
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      backdrop-filter: blur(150px);
      z-index: 1;
    }
  }

  .g-polygon {
    position: absolute;
    opacity: .3;
    z-index: 0;
    transition: all 0.8s ease;
  }

  .g-polygon-1 {
    top: -20%;
    left: -10%;
    width: 80%;
    height: 80%;
    background: #ffee55;
    clip-path: polygon(0 10%, 30% 0, 100% 40%, 70% 100%, 20% 90%);
    animation: float 15s ease-in-out infinite;
  }

  .g-polygon-2 {
    top: 20%;
    right: -20%;
    width: 70%;
    height: 70%;
    background: #E950D1;
    clip-path: polygon(10% 0, 100% 70%, 100% 100%, 20% 90%);
    animation: float 20s ease-in-out infinite reverse;
  }

  .g-polygon-3 {
    bottom: -30%;
    left: 10%;
    width: 60%;
    height: 60%;
    background: rgba(87, 80, 233);
    clip-path: polygon(80% 0, 100% 70%, 100% 100%, 20% 90%);
    animation: float 18s ease-in-out infinite;
  }

  @keyframes float {
    0% {
      transform: translate(0, 0) rotate(0deg);
    }

    50% {
      transform: translate(5px, 10px) rotate(5deg);
    }

    100% {
      transform: translate(0, 0) rotate(0deg);
    }
  }
}

.tts-content {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  z-index: 2;
}

.tts-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 3rem;
  text-align: center;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.tts-title-en {
  font-family: 'Montserrat', 'Arial', sans-serif;
  background: linear-gradient(45deg, #4a6cf7, #9f6cf7);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.5px;
}

.tts-title-zh {
  font-family: 'PingFang SC', 'Microsoft YaHei', 'SimHei', sans-serif;
  background: linear-gradient(45deg, #9f6cf7, #e950d1);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 600;
}

.tts-title-divider {
  opacity: 0.4;
  font-weight: 600;
  background: linear-gradient(45deg, #9f6cf7, #9f6cf7);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0.3rem;
}

.tts-buttons {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  max-width: 400px;
}

.tts-button {
  width: 100%;
  height: 60px;
  margin: 0px;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  }

  &.active {
    transform: scale(0.95);
    opacity: 0.8;
  }
}

@media (max-width: 768px) {
  .tts-title {
    font-size: 2rem;
    flex-wrap: wrap;
  }

  .tts-title-en,
  .tts-title-zh {
    font-size: 1.8rem;
  }
}
</style>