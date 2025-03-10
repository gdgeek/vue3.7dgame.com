<template>
  <div class="word-to-audio-v2" :class="{ 'leaving': isLeaving, 'entering': isEntering }">
    <div class="page-header">
      <el-page-header @back="goBack" content="文字转语音（文本跟随朗读变色）" />
    </div>

    <div class="main-content">
      <div class="voice-select-section">
        <el-select v-model="selectedVoice" placeholder="请选择音色" class="voice-select">
          <el-option v-for="voice in availableVoices" :key="voice.name" :label="voice.name" :value="voice" />
        </el-select>
      </div>

      <div class="input-section">
        <el-input id="word" type="textarea" placeholder="请输入要转换的文本内容..." v-model="word" maxlength="2000" ref="input"
          @input="inputWord" :readonly="inputReadonly" show-word-limit :rows="6" />
      </div>

      <div class="preview-section">
        <div class="preview-content" ref="previewContentRef">
          <div v-if="!word" class="empty-text">暂无文本</div>
          <template v-else>
            <span class="highlighted-text">{{ highlightedText }}</span>
            <span class="normal-text">{{ normalText }}</span>
          </template>
        </div>
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
import { ref, watch, onMounted, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { Ref } from 'vue'

const word = ref('')
const isPaused = ref(false)
const speakIndex = ref(0) // 朗读了多少文本的下标
const highlightedText = ref('') // 需要变色的文本
const normalText = ref('') // 正常文本
const inputReadonly = ref(false)
const isLeaving = ref(false)
const isEntering = ref(true)
const router = useRouter()
const previewContentRef = ref<HTMLElement | null>(null)
const isManualScrolling = ref(false) // 是否正在手动滚动
const isMouseHovering = ref(false) // 是否鼠标悬停在预览区域
let scrollTimeout: number | null = null // 滚动超时定时器
let hoverTimeout: number | null = null // 鼠标移出超时定时器

interface Voice extends SpeechSynthesisVoice {
  name: string;
}

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

  // 添加滚动事件监听
  if (previewContentRef.value) {
    // 滚动事件处理
    previewContentRef.value.addEventListener('scroll', () => {
      // 清除之前的定时器
      if (scrollTimeout) {
        window.clearTimeout(scrollTimeout)
      }

      // 设置手动滚动状态
      isManualScrolling.value = true

      // 1秒后恢复自动滚动
      scrollTimeout = window.setTimeout(() => {
        isManualScrolling.value = false
      }, 1000)
    })

    // 鼠标进入事件
    previewContentRef.value.addEventListener('mouseenter', () => {
      isMouseHovering.value = true
      // 清除之前的hover定时器
      if (hoverTimeout) {
        window.clearTimeout(hoverTimeout)
      }
    })

    // 鼠标离开事件
    previewContentRef.value.addEventListener('mouseleave', () => {
      // 清除之前的hover定时器
      if (hoverTimeout) {
        window.clearTimeout(hoverTimeout)
      }

      // 2秒后恢复自动滚动
      hoverTimeout = window.setTimeout(() => {
        isMouseHovering.value = false
      }, 1000)
    })
  }
})

// 监听朗读进度
watch(speakIndex, (newValue) => {
  changeTextColorV2(newValue)
})

// 输入文本时取消当前朗读
const inputWord = () => {
  cancel()
}

// 文字转语音
const changeToAudio = () => {
  if (!word.value) {
    ElMessage.warning("请输入文本")
    return
  }

  if (isPaused.value) {
    if (window.speechSynthesis.speaking) {
      ElMessage.warning("当前语音已暂停,请点击继续!")
      return
    } else {
      isPaused.value = false
      cancel()
    }
  } else if (window.speechSynthesis.speaking) {
    ElMessage.warning("当前已有正在播放的语音!")
    return
  }

  try {
    // 初始化朗读下标
    speakIndex.value = 0

    // 为了防止在暂停状态下转语音，调用前设置继续播放
    window.speechSynthesis.resume()

    // 创建语音合成对象
    const speech = new window.SpeechSynthesisUtterance()
    speech.text = word.value // 内容
    speech.lang = "zh-CN" // 语言
    speech.volume = 1 // 声音的音量区间范围是0到1，默认是1
    speech.rate = 1 // 语速，范围是0.1到10，默认值是1
    speech.pitch = 1 // 音高，范围从0（最小）到2（最大），默认值为1

    // 设置选择的语音
    if (selectedVoice.value !== undefined) {
      speech.voice = selectedVoice.value
    }

    // 设置不可输入
    inputReadonly.value = true

    // 开始播放
    window.speechSynthesis.speak(speech)

    // 监听朗读边界事件
    speech.onboundary = (event: SpeechSynthesisEvent) => {
      const charIndex = event.charIndex || 0
      speakIndex.value = charIndex
      console.log('已朗读的文本：', speech.text.substring(0, charIndex))
    }

    // 监听朗读结束事件
    speech.onend = () => {
      inputReadonly.value = false
      highlightedText.value = word.value
      normalText.value = ""
      console.log("朗读结束")
    }
  } catch (error) {
    ElMessage.error('语音合成失败，请检查浏览器支持情况')
    console.error(error)
  }
}

// 暂停播放
const pause = () => {
  isPaused.value = true
  inputReadonly.value = false
  window.speechSynthesis.pause()
}

// 继续播放
const resume = () => {
  isPaused.value = false
  window.speechSynthesis.resume()
  if (window.speechSynthesis.speaking) {
    inputReadonly.value = true
  } else {
    inputReadonly.value = false
  }
}

// 取消播放
const cancel = () => {
  speakIndex.value = 0
  inputReadonly.value = false
  highlightedText.value = ""
  normalText.value = word.value
  window.speechSynthesis.cancel()
}

// 获取可用的语音列表
const getVoices = () => {
  const voices = window.speechSynthesis.getVoices()
  console.log('可用的语音列表:', voices)
}

// 更新文本颜色并处理滚动
const changeTextColorV2 = (index: number) => {
  const text = word.value
  highlightedText.value = text.slice(0, index)
  normalText.value = text.slice(index)

  // 处理滚动
  nextTick(() => {
    if (previewContentRef.value) {
      const container = previewContentRef.value
      const highlightedElement = container.querySelector('.highlighted-text')

      // 只有在非手动滚动、非鼠标悬停且非暂停状态下才执行自动滚动
      if (highlightedElement && !isManualScrolling.value && !isMouseHovering.value && !isPaused.value) {
        // 计算需要滚动的位置
        const containerRect = container.getBoundingClientRect()
        const highlightedRect = highlightedElement.getBoundingClientRect()

        // 计算一行文本的高度（使用行高）
        const lineHeight = parseFloat(getComputedStyle(highlightedElement).lineHeight)

        // 设置预留空间（一行的高度）
        const reserveSpace = lineHeight

        // 如果高亮文本接近底部（预留一行的空间）或超出顶部，则滚动
        if (highlightedRect.bottom > (containerRect.bottom - reserveSpace) || highlightedRect.top < containerRect.top) {
          container.scrollTo({
            top: container.scrollTop + (highlightedRect.bottom - (containerRect.bottom - reserveSpace)),
            behavior: 'smooth'
          })
        }
      }
    }
  })
}

// 返回方法
const goBack = () => {
  isLeaving.value = true
  // 取消当前朗读
  cancel()
  setTimeout(() => {
    router.push({ path: "/tts" })
  }, 300)
}

// 在组件卸载时清理事件监听和定时器
onUnmounted(() => {
  if (scrollTimeout) {
    window.clearTimeout(scrollTimeout)
  }

  if (hoverTimeout) {
    window.clearTimeout(hoverTimeout)
  }

  if (previewContentRef.value) {
    previewContentRef.value.removeEventListener('scroll', () => { })
    previewContentRef.value.removeEventListener('mouseenter', () => { })
    previewContentRef.value.removeEventListener('mouseleave', () => { })
  }
})
</script>

<style scoped lang="scss">
.word-to-audio-v2 {
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
    border: 1px solid #dcdfe6;
    transition: all 0.3s ease;

    &:focus {
      border-color: #409eff;
      box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
    }
  }
}

.preview-section {
  width: 100%;
  margin: 1rem 0;

  .preview-content {
    min-height: 100px;
    max-height: 200px;
    overflow-y: auto;
    padding: 1rem;
    border-radius: 12px;
    background-color: #fff;
    border: 1px solid #dcdfe6;
    font-size: 1rem;
    line-height: 1.5;
    scroll-behavior: smooth;
    position: relative;
    font-family: inherit;
    text-align: left;
    white-space: pre-wrap;
    word-break: break-word;
    transition: all 0.3s ease;
    color: #606266;
    box-sizing: border-box;
    box-shadow: 0 0 0 1px transparent; //

    &:hover {
      border-color: #c0c4cc;
    }

    /* 自定义滚动条样式 */
    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;

      &:hover {
        background: #a8a8a8;
      }
    }

    .empty-text {
      color: #999;
      text-align: center;
      padding: 2rem 0;
    }

    .highlighted-text {
      color: #FF6700;
      font-weight: 500;
      transition: color 0.3s ease;
    }

    .normal-text {
      color: #606266;
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