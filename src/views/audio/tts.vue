<template>
  <div class="tencent-tts" :class="{ 'leaving': isLeaving, 'entering': isEntering }">
    <!-- <div class="page-header">
      <el-page-header @back="goBack" content="腾讯云语音合成" />
    </div> -->

    <div class="main-content">
      <div class="voice-select-section">
        <div class="voice-filters">
          <div class="filter-item">
            <span class="param-label">音色类型</span>
            <el-select v-model="voiceType" placeholder="请选择音色类型">
              <el-option label="全部" value="" />
              <el-option label="精品音色" value="精品音色" />
              <el-option label="标准音色" value="标准音色" />
            </el-select>
          </div>
          <div class="filter-item">
            <span class="param-label">场景</span>
            <el-select v-model="voiceScene" placeholder="请选择场景">
              <el-option label="全部" value="" />
              <el-option v-for="scene in availableScenes" :key="scene" :label="scene" :value="scene" />
            </el-select>
          </div>
          <div class="filter-item">
            <span class="param-label">语言</span>
            <el-select v-model="voiceLanguage" placeholder="请选择语言">
              <el-option label="全部" value="" />
              <el-option label="中文" value="中文" />
              <el-option label="英文" value="英文" />
              <el-option label="日文" value="日文" />
            </el-select>
          </div>
        </div>
        <div class="voice-type">
          <span class="param-label">音色</span>
          <el-select v-model="selectedVoiceType" placeholder="请选择音色" class="voice-select">
            <el-option-group v-for="group in groupedVoices" :key="group.type" :label="group.type">
              <el-option v-for="voice in group.voices" :key="voice.value" :label="voice.label" :value="voice.value">
                <div class="voice-option">
                  <span>{{ voice.label }}</span>
                  <div class="voice-tags">
                    <el-tag size="small"
                      :type="voice.scene.includes('男') ? 'primary' : voice.scene.includes('女') ? 'danger' : 'info'">
                      {{ voice.scene }}
                    </el-tag>
                    <el-tag size="small"
                      :type="voice.language === '中文' ? 'danger' : voice.language === '日文' ? 'success' : 'primary'"
                      effect="dark">
                      {{ voice.language }}
                    </el-tag>
                    <el-tag v-if="voice.emotions.length > 1" size="small" type="warning" effect="plain"
                      @click="showEmotions(voice)">
                      {{ voice.emotions.length }}种情感
                    </el-tag>
                  </div>
                </div>
              </el-option>
            </el-option-group>
          </el-select>
        </div>

        <div class="param-item emotion-params">
          <div class="emotion-controls">
            <div class="emotion-row">
              <div class="emotion-type">
                <span class="param-label">情感类型</span>
                <el-select v-model="emotionCategory" placeholder="请选择情感类型" class="emotion-select"
                  :disabled="availableEmotions.length <= 1">
                  <el-option label="默认" value="" />
                  <el-option v-for="emotion in filteredEmotions" :key="emotion" :label="emotion" :value="emotion" />
                </el-select>
              </div>
              <div class="emotion-intensity" v-if="emotionCategory">
                <span class="param-label">情感强度 ({{ emotionIntensity }})</span>
                <el-slider v-model="emotionIntensity" :min="50" :max="200" :step="10" show-stops
                  class="intensity-slider" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="params-section">
        <div class="param-row">
          <div class="param-item">
            <span class="param-label">音量</span>
            <el-slider v-model="volume" :min="-10" :max="10" :step="1" show-stops />
          </div>
          <div class="param-item">
            <span class="param-label">语速</span>
            <el-slider v-model="speed" :min="-2" :max="6" :step="0.5" show-stops />
          </div>
        </div>
        <div class="param-row">
          <div class="param-item">
            <span class="param-label">音频格式</span>
            <el-radio-group v-model="codec">
              <el-radio label="wav">WAV</el-radio>
              <el-radio label="mp3">MP3</el-radio>
              <el-radio label="pcm">PCM</el-radio>
            </el-radio-group>
          </div>
          <div class="param-item">
            <span class="param-label">采样率</span>
            <el-radio-group v-model="sampleRate">
              <el-radio :label="8000">8k</el-radio>
              <el-radio :label="16000">16k</el-radio>
              <el-radio v-if="supportHighSampleRate" :label="24000">24k</el-radio>
            </el-radio-group>
          </div>
        </div>
      </div>

      <div class="input-section">
        <div class="text-container" ref="textContainerRef" v-show="isPlaying">
          <div v-if="!text" class="empty-text">请输入要转换的文本内容...</div>
          <template v-else>
            <span class="highlighted-text">{{ highlightedText }}</span>
            <span class="normal-text">{{ normalText }}</span>
          </template>
        </div>
        <el-input id="word" type="textarea" placeholder="请输入要转换的文本内容..." v-model="text" maxlength="150" :rows="4"
          show-word-limit :disabled="isLoading" @input="onTextInput" v-show="!isPlaying" />
      </div>

      <div class="preview-section" v-if="audioUrl">
        <audio :src="audioUrl" controls class="audio-player" ref="audioPlayerRef" @play="onAudioPlayerPlay"
          @pause="onAudioPlayerPause" @ended="onAudioPlayerEnded"></audio>
      </div>

      <div class="action-section">
        <el-button type="primary" size="large" @click="synthesizeSpeech" :loading="isLoading" class="action-button">
          {{ isLoading ? '合成中...' : '合成语音' }}
        </el-button>
      </div>

      <div class="tips-section">
        <el-alert title="使用提示" type="info" description="中文最大支持150个汉字（全角标点符号算一个汉字）；英文最大支持500个字母（半角标点符号算一个字母）。"
          :closable="false" show-icon class="tips-alert" />
      </div>
    </div>

    <!-- 情感列表对话框 -->
    <el-dialog title="选择情感类型" v-model="emotionsDialogVisible" width="30%" :close-on-click-modal="true"
      :close-on-press-escape="true">
      <div class="emotions-list">
        <el-tag v-for="emotion in selectedVoiceEmotions" :key="emotion" class="emotion-tag"
          :type="emotion === emotionCategory ? 'primary' : 'info'" @click="selectEmotion(emotion)"
          :effect="emotion === emotionCategory ? 'light' : 'plain'">
          {{ emotion }}
        </el-tag>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="emotionsDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmEmotionSelection">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { availableVoices as voicesList, emotionMap, VoiceType } from '@/store/modules/availableVoices'

// 定义状态
const text = ref('')
const isLoading = ref(false)
const isLeaving = ref(false)
const isEntering = ref(true)
const audioUrl = ref('')

// 文本高亮相关变量
const highlightedText = ref('')
const normalText = ref('')
const isPlaying = ref(false)
const textContainerRef = ref<HTMLElement | null>(null)
const currentCharIndex = ref(0) // 当前字符索引
const audioPlayerRef = ref<HTMLAudioElement | null>(null)
const isManualScrolling = ref(false) // 是否正在手动滚动
const isMouseHovering = ref(false) // 是否鼠标悬停在预览区域
let scrollTimeout: number | null = null // 滚动超时定时器
let hoverTimeout: number | null = null // 鼠标移出超时定时器

// 腾讯云TTS参数
const selectedVoiceType = ref(101002) // 默认音色改为智聆
const volume = ref(0) // 音量，范围[-10, 10]
const speed = ref(0) // 语速，范围[-2, 6]
const codec = ref('mp3') // 音频格式：wav, mp3, pcm
const sampleRate = ref(16000) // 采样率：8000, 16000
const emotionCategory = ref('') // 情感类型
const emotionIntensity = ref(100) // 情感强度，范围[50, 200]

const secretKey = 'J8rOjhV9dxBGLJ6g4IMDvgJm6NXWJxhH'

// 可用音色列表
const availableVoices = ref<VoiceType[]>(voicesList)

// 根据选择的音色获取可用的情感类型
const availableEmotions = computed(() => {
  const selectedVoice = availableVoices.value.find(voice => voice.value === selectedVoiceType.value)
  return selectedVoice ? selectedVoice.emotions : ['中性']
})

// 过滤情感类型，排除"中性"（除非只有中性一个选项）
const filteredEmotions = computed(() => {
  if (availableEmotions.value.length === 1) {
    return availableEmotions.value // 如果只有一个情感类型（通常是"中性"），则直接返回
  }
  return availableEmotions.value.filter(emotion => emotion !== '中性')
})

// 监听音色变化，重置情感类型
watch(selectedVoiceType, () => {
  // 如果当前选择的情感类型不在新音色的可用情感列表中，则重置为空（默认）
  if (emotionCategory.value && !availableEmotions.value.includes(emotionCategory.value)) {
    emotionCategory.value = ''
  }
})

// 页面加载完成后
onMounted(() => {
  setTimeout(() => {
    isEntering.value = false
  }, 300)

  // 添加滚动事件监听
  if (textContainerRef.value) {
    // 滚动事件处理
    textContainerRef.value.addEventListener('scroll', () => {
      // 清除之前的定时器
      if (scrollTimeout) {
        window.clearTimeout(scrollTimeout)
      }

      // 设置手动滚动状态
      isManualScrolling.value = true

      //1秒后恢复自动滚动
      scrollTimeout = window.setTimeout(() => {
        isManualScrolling.value = false
      }, 1000)
    })

    // 鼠标进入事件
    textContainerRef.value.addEventListener('mouseenter', () => {
      isMouseHovering.value = true
      // 清除之前的hover定时器
      if (hoverTimeout) {
        window.clearTimeout(hoverTimeout)
      }
    })

    // 鼠标离开事件
    textContainerRef.value.addEventListener('mouseleave', () => {
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

// 文本输入处理
const onTextInput = () => {
  // 重置高亮状态
  highlightedText.value = ''
  normalText.value = text.value

  // 如果有正在播放的音频，停止它
  if (audioPlayerRef.value) {
    audioPlayerRef.value.pause()
  }
  isPlaying.value = false
}

// 合成语音
const synthesizeSpeech = async () => {
  if (!text.value) {
    ElMessage.warning("请输入文本")
    return
  }

  try {
    isLoading.value = true

    // 准备请求参数
    const params: any = {
      Text: text.value,
      SessionId: 'session-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      Volume: volume.value,
      Speed: speed.value,
      VoiceType: selectedVoiceType.value,
      Codec: codec.value,
      SampleRate: sampleRate.value,
      PrimaryLanguage: voiceLanguage.value === '中文' ? 1 : voiceLanguage.value === '英文' ? 2 : 3,
      ModelType: voiceType.value === '精品音色' ? 1 : 0,
    }

    // 添加情感参数（如果有选择情感类型）
    if (emotionCategory.value) {
      // 将中文情感类型转换为英文代码
      params.EmotionCategory = emotionMap[emotionCategory.value] || 'neutral'
      params.EmotionIntensity = emotionIntensity.value
    }

    // 调用云函数API
    const response = await axios.post('https://game-9ghhigyq57e00dc3-1251022382.ap-shanghai.app.tcloudbase.com/TencentTTS', params, {
      headers: {
        'Content-Type': 'application/json',
      }
    })
    console.log(response.data)

    if (response.data && response.data.Audio) {
      // 将Base64编码的音频数据转换为Blob
      const audioData = atob(response.data.Audio)
      const arrayBuffer = new ArrayBuffer(audioData.length)
      const uint8Array = new Uint8Array(arrayBuffer)

      for (let i = 0; i < audioData.length; i++) {
        uint8Array[i] = audioData.charCodeAt(i)
      }

      const blob = new Blob([arrayBuffer], { type: `audio/${codec.value}` })

      // 创建音频URL
      if (audioUrl.value) {
        URL.revokeObjectURL(audioUrl.value)
      }
      audioUrl.value = URL.createObjectURL(blob)

      // 初始化文本高亮
      highlightedText.value = ''
      normalText.value = text.value
      currentCharIndex.value = 0
      isPlaying.value = true

      // 等待DOM更新，确保audio元素已经渲染
      await nextTick()

      // 使用页面上的audio元素而不是创建新的Audio对象
      if (audioPlayerRef.value) {
        // 设置音频时间更新事件，用于更新文本高亮
        audioPlayerRef.value.addEventListener('timeupdate', updateHighlight)

        // 播放音频
        audioPlayerRef.value.play()
      }

      ElMessage.success('语音合成成功')
    } else {
      throw new Error('语音合成失败，未返回音频数据')
    }
  } catch (error) {
    console.error('语音合成错误:', error)
    ElMessage.error('语音合成失败，请稍后重试')
  } finally {
    isLoading.value = false
  }
}

// 处理播放器播放事件
const onAudioPlayerPlay = () => {
  isPlaying.value = true
}

// 处理播放器暂停事件
const onAudioPlayerPause = () => {
  // 不改变isPlaying状态，保持文本高亮显示
}

// 处理播放器结束事件
const onAudioPlayerEnded = () => {
  isPlaying.value = false
  highlightedText.value = text.value
  normalText.value = ''
}

// 更新文本高亮
const updateHighlight = () => {
  if (!audioPlayerRef.value || !text.value) return

  // 根据音频播放进度计算应该高亮的文本长度
  const progress = audioPlayerRef.value.currentTime / audioPlayerRef.value.duration
  const charCount = Math.floor(text.value.length * progress)

  // 更新高亮文本
  currentCharIndex.value = charCount
  highlightedText.value = text.value.substring(0, charCount)
  normalText.value = text.value.substring(charCount)

  // 处理滚动
  nextTick(() => {
    if (textContainerRef.value) {
      const container = textContainerRef.value
      const highlightedElement = container.querySelector('.highlighted-text')

      // 只有在非手动滚动、非鼠标悬停且非暂停状态下才执行自动滚动
      if (highlightedElement && !isManualScrolling.value && !isMouseHovering.value) {
        // 计算需要滚动的位置
        const containerRect = container.getBoundingClientRect()
        const highlightedRect = highlightedElement.getBoundingClientRect()

        // 计算一行文本的高度（使用行高）
        const lineHeight = parseFloat(getComputedStyle(highlightedElement).lineHeight)

        // 设置预留空间（一行的高度）
        const reserveSpace = 2 * lineHeight

        // 如果高亮文本接近底部（预留2行的空间）或超出顶部，则滚动
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

// 组件卸载时清理资源
onUnmounted(() => {
  if (audioPlayerRef.value) {
    audioPlayerRef.value.pause()
    audioPlayerRef.value.removeEventListener('timeupdate', updateHighlight)
  }

  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }

  // 清理滚动和悬停相关的定时器
  if (scrollTimeout) {
    window.clearTimeout(scrollTimeout)
  }

  if (hoverTimeout) {
    window.clearTimeout(hoverTimeout)
  }

  // 移除事件监听器
  if (textContainerRef.value) {
    textContainerRef.value.removeEventListener('scroll', () => { })
    textContainerRef.value.removeEventListener('mouseenter', () => { })
    textContainerRef.value.removeEventListener('mouseleave', () => { })
  }
})

// 音色筛选相关状态
const voiceType = ref('')
const voiceScene = ref('')
const voiceLanguage = ref('')
const emotionsDialogVisible = ref(false)
const selectedVoiceEmotions = ref<string[]>([])

// 获取所有可用场景
const availableScenes = computed(() => {
  const scenes = new Set<string>()
  voicesList.forEach(voice => scenes.add(voice.scene))
  return Array.from(scenes) 
})

// 根据筛选条件过滤音色
const filteredVoices = computed(() => {
  return voicesList.filter(voice => {
    if (voiceType.value && voice.type !== voiceType.value) return false
    if (voiceScene.value && voice.scene !== voiceScene.value) return false
    if (voiceLanguage.value && voice.language !== voiceLanguage.value) return false
    return true
  })
})

// 按类型分组音色
const groupedVoices = computed(() => {
  const groups: { type: string; voices: VoiceType[] }[] = []
  const typeMap = new Map<string, VoiceType[]>()

  filteredVoices.value.forEach(voice => {
    if (!typeMap.has(voice.type)) {
      typeMap.set(voice.type, [])
    }
    typeMap.get(voice.type)?.push(voice)
  })

  typeMap.forEach((voices, type) => {
    groups.push({ type, voices })
  })

  return groups
})

// 显示情感列表对话框
const showEmotions = (voice: VoiceType) => {
  selectedVoiceEmotions.value = voice.emotions
  emotionsDialogVisible.value = true
}

// 检查是否支持24k采样率
const supportHighSampleRate = computed(() => {
  const selectedVoice = voicesList.find(voice => voice.value === selectedVoiceType.value)
  return selectedVoice?.sampleRate.includes('24k') || false
})

// 监听采样率变化
watch(selectedVoiceType, () => {
  // 如果当前选择的采样率不在新音色支持的范围内，则重置为16k
  if (!supportHighSampleRate.value && sampleRate.value === 24000) {
    sampleRate.value = 16000
  }
})

// 选择情感类型
const selectEmotion = (emotion: string) => {
  emotionCategory.value = emotion
}

// 确认情感选择
const confirmEmotionSelection = () => {
  emotionsDialogVisible.value = false
}
</script>

<style scoped lang="scss">
.tencent-tts {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  // background-color: #f9fafc;
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
  width: 90%;
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
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.voice-filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;

  .filter-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    .param-label {
      font-size: 0.9rem;
      font-weight: 500;
      color: #606266;
    }
  }
}

.voice-type {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .param-label {
    font-size: 0.9rem;
    font-weight: 500;
    color: #606266;
  }
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

.params-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 1rem;

  .param-row {
    display: flex;
    gap: 2rem;
    width: 100%;

    .param-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      .param-label {
        font-size: 0.9rem;
        font-weight: 500;
        color: #606266;
      }
    }
  }
}

.input-section {
  width: 100%;
  position: relative;

  .text-container {
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
  display: flex;
  justify-content: center;

  .audio-player {
    width: 100%;
    border-radius: 12px;
    outline: none;
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

.emotion-params {
  width: 100%;

  .emotion-controls {
    .emotion-row {
      display: flex;
      gap: 2rem;
      align-items: flex-start;

      .emotion-type,
      .emotion-intensity {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        .param-label {
          font-size: 0.9rem;
          font-weight: 500;
          color: #606266;
        }
      }

      .emotion-select {
        width: 100%;
      }

      .intensity-slider {
        width: 100%;
        margin-top: 0.2rem;
      }
    }
  }
}

.emotion-select {
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

.voice-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;

  .voice-tags {
    display: flex;
    gap: 0.5rem;
  }
}

.emotions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  padding: 1rem;

  .emotion-tag {
    margin: 0.25rem;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
  }
}

.dialog-footer {
  text-align: right;
  margin-top: 1rem;
}

:deep(.el-select-dropdown__item) {
  padding: 0 12px;
}

.voice-tags {
  .el-tag {
    cursor: pointer;

    &:hover {
      opacity: 0.8;
    }
  }
}

@media (max-width: 1200px) {

  .page-header,
  .main-content {
    width: 80%;
  }

  .params-section {
    .param-row {
      flex-direction: column;
      gap: 1rem;
    }
  }
}

@media (max-width: 768px) {

  .page-header,
  .main-content {
    width: 95%;
  }
}
</style>