<template>
  <div class="word-to-audio" :class="{ 'leaving': isLeaving, 'entering': isEntering }">
    <div class="page-header">
      <el-page-header @back="goBack" content="文字转语音" />
    </div>

    <div class="main-content">
      <div class="voice-select-section">
        <el-select v-model="selectedVoice" placeholder="请选择音色" class="voice-select">
          <el-option v-for="voice in availableVoices" :key="voice.name" :label="voice.name" :value="voice" />
        </el-select>
      </div>

      <div class="input-section">
        <el-input id="word" type="textarea" placeholder="请输入要转换的文本内容..." v-model="word" maxlength="2000" show-word-limit
          :rows="6" />
      </div>

      <div class="action-section">
        <el-button type="primary" size="large" @click="changeToAudio" class="action-button">
          转为语音
        </el-button>
      </div>

      <div class="control-section">
        <el-button-group>
          <el-button @click="pause" type="warning" class="control-button">暂停</el-button>
          <el-button @click="resume" type="success" class="control-button">继续</el-button>
          <el-button @click="cancel" type="info" class="control-button">取消</el-button>
        </el-button-group>
      </div>

      <div class="debug-section">
        <el-button @click="getVoices" type="primary" plain class="debug-button">
          获取语音合成数据(F12)
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

// 定义状态
const word = ref('')
const isPaused = ref(false)
const isLeaving = ref(false)
const isEntering = ref(true)
const router = useRouter()

interface Voice extends SpeechSynthesisVoice {
  name: string;
}

// 将 null 改为 undefined，并设置初始值为 undefined
const selectedVoice = ref<Voice | undefined>(undefined)
const availableVoices = ref<Voice[]>([])

// 获取可用的语音列表
const loadVoices = () => {
  const voices = window.speechSynthesis.getVoices()
  availableVoices.value = voices.filter(voice => voice.lang.includes('zh')) as Voice[]
  if (availableVoices.value.length > 0) {
    selectedVoice.value = availableVoices.value[0]
  }
}

// 页面加载完成后
onMounted(() => {
  setTimeout(() => {
    isEntering.value = false
  }, 300)

  // 加载语音列表
  loadVoices()

  // 监听voiceschanged事件，因为语音列表可能会延迟加载
  window.speechSynthesis.onvoiceschanged = loadVoices
})

// 文字转语音
const changeToAudio = () => {
  if (!word.value) {
    ElMessage.warning("请输入文本")
    return
  }

  if (isPaused.value) {
    ElMessage.warning("当前语音已暂停,请点击继续!")
    return
  } else if (window.speechSynthesis.speaking) {
    ElMessage.warning("当前已有正在播放的语音!")
    return
  }

  try {
    // 为了防止在暂停状态下转语音，调用前设置继续播放
    window.speechSynthesis.resume()

    // 创建语音合成对象
    const speech = new window.SpeechSynthesisUtterance()
    speech.text = word.value // 内容
    speech.lang = "zh-CN" // 语言
    speech.volume = 0.7 // 声音的音量区间范围是0到1，默认是1
    speech.rate = 1 // 语速，范围是0.1到10，默认值是1
    speech.pitch = 1 // 音高，范围从0（最小）到2（最大），默认值为1

    // 设置选择的语音
    if (selectedVoice.value !== undefined) {
      speech.voice = selectedVoice.value
    }

    // 开始播放
    window.speechSynthesis.speak(speech)

    // 高亮显示文本
    // const textArea = document.getElementById('word')
    // if (textArea) {
    //   const range = document.createRange()
    //   range.selectNodeContents(textArea)
    //   const highlight = document.createElement('span')
    //   highlight.style.backgroundColor = 'red'
    //   range.surroundContents(highlight)
    // }
  } catch (error) {
    ElMessage.error('语音合成失败，请检查浏览器支持情况')
    console.error(error)
  }
}

// 暂停播放
const pause = () => {
  isPaused.value = true
  window.speechSynthesis.pause()
}

// 继续播放
const resume = () => {
  isPaused.value = false
  window.speechSynthesis.resume()
}

// 取消播放
const cancel = () => {
  isPaused.value = false
  window.speechSynthesis.cancel()
}

// 获取可用的语音列表
const getVoices = () => {
  const voices = window.speechSynthesis.getVoices()
  console.log('可用的语音列表:', voices)
}

// 返回方法
const goBack = () => {
  isLeaving.value = true
  // 取消当前播放
  cancel()
  setTimeout(() => {
    router.push({ path: "/tts" })
  }, 300)
}
</script>

<style scoped lang="scss">
.word-to-audio {
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

.voice-select-section {
  width: 100%;
  margin-bottom: 1rem;
}

.voice-select {
  width: 100%;

  :deep(.el-input__wrapper) {
    border-radius: 12px;
    padding: 0.5rem;

    &:hover {
      border-color: #409eff;
    }

    &.is-focus {
      border-color: #409eff;
      box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
    }
  }
}

.input-section {
  width: 100%;

  :deep(.el-textarea__inner) {
    border-radius: 12px;
    padding: 1rem;
    font-size: 1rem;
    border: 1px solid #e0e0e0;
    transition: all 0.3s ease;

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

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 16px rgba(64, 158, 255, 0.3);
  }
}

.control-section {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;

  .el-button-group {
    .control-button {
      height: 40px;
      font-weight: 500;
      border-radius: 0;

      &:first-child {
        border-radius: 8px 0 0 8px;
      }

      &:last-child {
        border-radius: 0 8px 8px 0;
      }
    }
  }
}

.debug-section {
  width: 100%;
  display: flex;
  justify-content: center;

  .debug-button {
    font-size: 0.9rem;
    border-radius: 8px;
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