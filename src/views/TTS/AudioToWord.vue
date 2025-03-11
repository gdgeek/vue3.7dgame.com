<template>
  <div class="audio-to-word" :class="{ 'leaving': isLeaving, 'entering': isEntering }">
    <div class="page-header">
      <el-page-header @back="goBack" content="语音转文字" />
    </div>

    <div class="main-content">
      <div class="result-section">
        <el-input :readonly="true" id="word" v-model="word" placeholder="识别结果将显示在这里..." type="textarea" :rows="6" />
      </div>

      <div class="action-section">
        <el-button type="primary" size="large" @click="audioChangeWord" :loading="isListening" :disabled="isListening"
          class="action-button">
          {{ isListening ? '语音识别中...' : '开始语音识别' }}
        </el-button>
      </div>

      <div class="tips-section">
        <el-alert title="使用提示" type="info" description="点击按钮后，请对着麦克风说话，系统将自动识别您的语音并转换为文字。请确保您的浏览器已授权使用麦克风。"
          :closable="false" show-icon class="tips-alert" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

// Web Speech API 类型定义
interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition {
  new(): SpeechRecognition;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new(): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new(): SpeechRecognition;
    };
  }
}

const word = ref('')
const isListening = ref(false)
const isLeaving = ref(false)
const isEntering = ref(true)
const router = useRouter()

// 页面加载完成后
onMounted(() => {
  setTimeout(() => {
    isEntering.value = false
  }, 300)
})

const audioChangeWord = () => {
  word.value = ''

  try {
    // 创建SpeechRecognition对象
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      throw new Error('您的浏览器不支持语音识别功能')
    }

    const recognition = new SpeechRecognitionAPI()

    // 设置语言
    recognition.lang = 'zh-CN'

    // 开始语音识别
    recognition.start()
    isListening.value = true

    // 监听识别结果
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[0][0].transcript
      console.log("监听结果:", result)
      word.value = result
    }

    // 监听错误事件
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      isListening.value = false
      ElMessage.error(`监听语音失败: ${event.error}`)
      console.error(event.error)
    }

    // 监听结束事件
    recognition.onend = () => {
      isListening.value = false
      console.log("语音识别停止")
    }
  } catch (error) {
    isListening.value = false
    ElMessage.error(error instanceof Error ? error.message : '语音识别初始化失败')
  }
}

// 返回方法
const goBack = () => {
  isLeaving.value = true
  setTimeout(() => {
    router.push({ path: "/tts" })
  }, 300)
}
</script>

<style scoped lang="scss">
.audio-to-word {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  background-color: #f9fafc;
  transition: all 0.3s ease;
  opacity: 1;
  transform: translateX(0);

  &.leaving {
    opacity: 0.5;
    transform: translateX(30px);
  }

  &.entering {
    opacity: 0;
    transform: translateX(-30px);
  }
}

.page-header {
  width: 100%;
  max-width: 60%;
  margin-bottom: 2rem;

  :deep(.el-page-header__content) {
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
  }

  :deep(.el-page-header__icon) {
    font-size: 1.2rem;
  }
}

.main-content {
  width: 60%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  background-color: #fff;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.result-section {
  width: 100%;

  :deep(.el-textarea__inner) {
    border-radius: 12px;
    padding: 1rem;
    font-size: 1rem;
    border: 1px solid #e0e0e0;
    transition: all 0.3s ease;
    background-color: #f9f9f9;

    &:focus {
      border-color: #409eff;
      box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
    }
  }
}

.action-section {
  width: 100%;
  display: flex;
  justify-content: center;
  margin: 1rem 0;
}

.action-button {
  min-width: 180px;
  height: 50px;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 8px 16px rgba(64, 158, 255, 0.3);
  }

  &:disabled {
    opacity: 0.8;
  }
}

.tips-section {
  width: 100%;

  .tips-alert {
    border-radius: 12px;

    :deep(.el-alert__title) {
      font-weight: 600;
    }

    :deep(.el-alert__description) {
      margin-top: 0.5rem;
      line-height: 1.5;
    }
  }
}

@media (max-width: 1200px) {

  .page-header,
  .main-content {
    width: 80%;
  }
}

@media (max-width: 768px) {

  .page-header,
  .main-content {
    width: 95%;
  }
}
</style>