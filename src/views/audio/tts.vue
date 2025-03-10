<template>
  <div class="tencent-tts" :class="{ 'leaving': isLeaving, 'entering': isEntering }">
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
        <el-button type="success" size="large" @click="uploadAudio" :loading="isUploading" :disabled="!currentAudioBlob"
          class="action-button upload-button">
          {{ isUploading ? '上传中...' : '上传音频' }}
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
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import { availableVoices as voicesList, emotionMap } from '@/store/modules/availableVoices'
import { postFile } from "@/api/v1/files"
import { postAudio } from "@/api/v1/resources/index"
import { useFileStore } from "@/store/modules/config"
import { useRouter } from "vue-router"
import { useI18n } from 'vue-i18n'
import type { UploadFileType } from "@/api/user/model"

interface VoiceOption {
  value: number
  label: string
  type: string
  scene: string
  language: string
  emotions: string[]
  sampleRate: string[]
}

const text = ref('')
const isLoading = ref(false)
const isLeaving = ref(false)
const isEntering = ref(true)
const audioUrl = ref('')

// 文本高亮相关状态
const highlightedText = ref('')
const normalText = ref('')
const isPlaying = ref(false)
const currentCharIndex = ref(0)
const isManualScrolling = ref(false)
const isMouseHovering = ref(false)

// 定时器
let scrollTimeout: number | null = null
let hoverTimeout: number | null = null

// DOM引用
const textContainerRef = ref<HTMLElement | null>(null)
const audioPlayerRef = ref<HTMLAudioElement | null>(null)

// TTS参数
const selectedVoiceType = ref(101002) // 默认音色：智聆
const volume = ref(0)
const speed = ref(0)
const codec = ref('mp3')
const sampleRate = ref(16000)
const emotionCategory = ref('')
const emotionIntensity = ref(100)

// 筛选参数
const voiceType = ref('')
const voiceScene = ref('')
const voiceLanguage = ref('')
const emotionsDialogVisible = ref(false)
const selectedVoiceEmotions = ref<string[]>([])

const router = useRouter()
const fileStore = useFileStore()
const currentAudioBlob = ref<Blob | null>(null)
const isUploading = ref(false)

// 可用场景列表
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
  const groups: { type: string; voices: VoiceOption[] }[] = []
  const typeMap = new Map<string, VoiceOption[]>()

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

// 可用情感列表
const availableEmotions = computed(() => {
  const selectedVoice = voicesList.find(voice => voice.value === selectedVoiceType.value)
  return selectedVoice ? selectedVoice.emotions : ['中性']
})

// 过滤后的情感列表
const filteredEmotions = computed(() => {
  if (availableEmotions.value.length === 1) {
    return availableEmotions.value
  }
  return availableEmotions.value.filter(emotion => emotion !== '中性')
})

// 是否支持高采样率
const supportHighSampleRate = computed(() => {
  const selectedVoice = voicesList.find(voice => voice.value === selectedVoiceType.value)
  return selectedVoice?.sampleRate.includes('24k') || false
})

// 监听音色变化
watch(selectedVoiceType, () => {
  // 重置情感类型（如果当前选择的情感类型不可用）
  if (emotionCategory.value && !availableEmotions.value.includes(emotionCategory.value)) {
    emotionCategory.value = ''
  }

  // 重置采样率（如果当前采样率不支持）
  if (!supportHighSampleRate.value && sampleRate.value === 24000) {
    sampleRate.value = 16000
  }
})

// 监听筛选条件变化
watch([voiceType, voiceScene, voiceLanguage], () => {
  // 获取筛选后的第一个音色
  const firstVoice = filteredVoices.value[0]
  if (firstVoice) {
    selectedVoiceType.value = firstVoice.value
  }
})

// 文本输入处理
const onTextInput = () => {
  highlightedText.value = ''
  normalText.value = text.value

  if (audioPlayerRef.value) {
    audioPlayerRef.value.pause()
  }
  isPlaying.value = false
}

// 语音合成
const synthesizeSpeech = async () => {
  if (!text.value) {
    ElMessage.warning("请输入文本")
    return
  }

  try {
    isLoading.value = true

    //请求参数
    const params = {
      Text: text.value,
      SessionId: `session-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      Volume: volume.value,
      Speed: speed.value,
      VoiceType: selectedVoiceType.value,
      Codec: codec.value,
      SampleRate: sampleRate.value,
      PrimaryLanguage: voiceLanguage.value === '中文' ? 1 : voiceLanguage.value === '英文' ? 2 : 3,
      ModelType: voiceType.value === '精品音色' ? 1 : 0,
      ...(emotionCategory.value && {
        EmotionCategory: emotionMap[emotionCategory.value] || 'neutral',
        EmotionIntensity: emotionIntensity.value
      })
    }

    // 调用云函数API
    const response = await axios.post(
      'https://game-9ghhigyq57e00dc3-1251022382.ap-shanghai.app.tcloudbase.com/TencentTTS',
      params,
      { headers: { 'Content-Type': 'application/json' } }
    )

    if (response.data?.Audio) {
      // 处理音频数据
      const audioData = atob(response.data.Audio)
      const arrayBuffer = new ArrayBuffer(audioData.length)
      const uint8Array = new Uint8Array(arrayBuffer)

      for (let i = 0; i < audioData.length; i++) {
        uint8Array[i] = audioData.charCodeAt(i)
      }

      const blob = new Blob([arrayBuffer], { type: `audio/${codec.value}` })
      currentAudioBlob.value = blob

      // 更新音频URL
      if (audioUrl.value) {
        URL.revokeObjectURL(audioUrl.value)
      }
      audioUrl.value = URL.createObjectURL(blob)

      // 重置文本高亮状态
      highlightedText.value = ''
      normalText.value = text.value
      currentCharIndex.value = 0
      isPlaying.value = true

      await nextTick()

      // 设置音频播放和高亮
      if (audioPlayerRef.value) {
        audioPlayerRef.value.addEventListener('timeupdate', updateHighlight)
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

// 上传音频文件
const uploadAudio = async () => {
  if (!currentAudioBlob.value) {
    ElMessage.warning('请先合成语音')
    return
  }

  try {
    // 弹出输入框让用户输入音频名称
    const { value: audioName } = await ElMessageBox.prompt(
      '请输入音频名称',
      '上传音频',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /.+/,
        inputErrorMessage: '名称不能为空',
        inputValue: text.value.slice(0, 20) + '...',
      }
    )

    if (!audioName) return

    isUploading.value = true
    const fileName = `tts_${Date.now()}.${codec.value}`
    const file = new File([currentAudioBlob.value], fileName, { type: `audio/${codec.value}` })

    // 使用 fileStore 直接上传文件
    const handler = await fileStore.store.publicHandler()
    const md5 = await fileStore.store.fileMD5(file, (p: number) => {
      console.log('MD5计算进度:', p)
    })
    const extension = `.${codec.value}`

    const has = await fileStore.store.fileHas(md5, extension, handler, 'audio')
    if (!has) {
      await fileStore.store.fileUpload(md5, extension, file, (p: number) => {
        console.log('上传进度:', p)
      }, handler, 'audio')
    }

    const data: UploadFileType = {
      filename: fileName,
      md5,
      key: md5 + extension,
      url: fileStore.store.fileUrl(md5, extension, handler, 'audio'),
    }

    // 保存文件信息
    const fileResponse = await postFile(data)

    if (fileResponse.data?.id) {
      // 保存音频信息到数据库
      const audioResponse = await postAudio({
        name: audioName,
        file_id: fileResponse.data.id
      })

      if (audioResponse.data?.id) {
        ElMessage.success('音频上传成功')
        // 跳转到音频查看页面
        await router.push({
          path: '/resource/audio/view',
          query: { id: audioResponse.data.id }
        })
      } else {
        throw new Error('保存音频信息失败')
      }
    } else {
      throw new Error('保存文件信息失败')
    }
  } catch (error) {
    if (error === 'cancel') {
      ElMessage.info('已取消上传')
      return
    }
    console.error('上传错误:', error)
    ElMessage.error('音频上传失败，请稍后重试')
  } finally {
    isUploading.value = false
  }
}

// 更新文本高亮
const updateHighlight = () => {
  if (!audioPlayerRef.value || !text.value) return

  // 计算高亮进度
  const progress = audioPlayerRef.value.currentTime / audioPlayerRef.value.duration
  const charCount = Math.floor(text.value.length * progress)

  // 更新高亮文本
  currentCharIndex.value = charCount
  highlightedText.value = text.value.substring(0, charCount)
  normalText.value = text.value.substring(charCount)

  // 处理文本滚动
  nextTick(() => {
    if (textContainerRef.value) {
      const container = textContainerRef.value
      const highlightedElement = container.querySelector('.highlighted-text')

      if (highlightedElement && !isManualScrolling.value && !isMouseHovering.value) {
        const containerRect = container.getBoundingClientRect()
        const highlightedRect = highlightedElement.getBoundingClientRect()
        const lineHeight = parseFloat(getComputedStyle(highlightedElement).lineHeight)
        const reserveSpace = 2 * lineHeight

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

// 音频播放器事件处理
const onAudioPlayerPlay = () => isPlaying.value = true
const onAudioPlayerPause = () => { }
const onAudioPlayerEnded = () => {
  isPlaying.value = false
  highlightedText.value = text.value
  normalText.value = ''
}

// 情感选择相关方法
const showEmotions = (voice: VoiceOption) => {
  selectedVoiceEmotions.value = voice.emotions
  emotionsDialogVisible.value = true
}

const selectEmotion = (emotion: string) => {
  emotionCategory.value = emotion
}

const confirmEmotionSelection = () => {
  emotionsDialogVisible.value = false
}

onMounted(() => {
  // 初始化动画
  setTimeout(() => {
    isEntering.value = false
  }, 300)

  // 设置文本容器事件监听
  if (textContainerRef.value) {
    // 滚动事件
    textContainerRef.value.addEventListener('scroll', () => {
      if (scrollTimeout) {
        window.clearTimeout(scrollTimeout)
      }
      isManualScrolling.value = true
      scrollTimeout = window.setTimeout(() => {
        isManualScrolling.value = false
      }, 1000)
    })

    // 鼠标进入事件
    textContainerRef.value.addEventListener('mouseenter', () => {
      isMouseHovering.value = true
      if (hoverTimeout) {
        window.clearTimeout(hoverTimeout)
      }
    })

    // 鼠标离开事件
    textContainerRef.value.addEventListener('mouseleave', () => {
      if (hoverTimeout) {
        window.clearTimeout(hoverTimeout)
      }
      hoverTimeout = window.setTimeout(() => {
        isMouseHovering.value = false
      }, 1000)
    })
  }
})

onUnmounted(() => {
  // 清理音频相关资源
  if (audioPlayerRef.value) {
    audioPlayerRef.value.pause()
    audioPlayerRef.value.removeEventListener('timeupdate', updateHighlight)
  }

  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }

  // 清理定时器
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
</script>

<style scoped lang="scss">
.tencent-tts {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  transition: all 0.3s ease;
  opacity: 1;
  transform: translateX(0);

  // 动画状态
  &.leaving {
    opacity: 0.5;
    transform: translateX(30px);
  }

  &.entering {
    opacity: 0;
    transform: translateX(-30px);
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

// 音色选择区域
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
  }
}

.voice-type {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

// 音色选择
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

// 参数设置区域
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
    }
  }
}

// 情感参数区域
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

// 文本输入区域
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

      &-track {
        background: #f1f1f1;
        border-radius: 4px;
      }

      &-thumb {
        background: #c1c1c1;
        border-radius: 4px;

        &:hover {
          background: #a8a8a8;
        }
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

// 音频预览区域
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

// 操作按钮区域
.action-section {
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin: 1rem 0;

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

  .upload-button {
    box-shadow: 0 4px 12px rgba(103, 194, 58, 0.2);

    &:hover:not(:disabled) {
      box-shadow: 0 8px 16px rgba(103, 194, 58, 0.3);
    }
  }
}

// 提示信息区域
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

// 情感选择对话框
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

// 通用样式
.param-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #606266;
}

.voice-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;

  .voice-tags {
    display: flex;
    gap: 0.5rem;

    .el-tag {
      cursor: pointer;

      &:hover {
        opacity: 0.8;
      }
    }
  }
}

:deep(.el-select-dropdown__item) {
  padding: 0 12px;
}

// 响应式布局
@media (max-width: 1200px) {
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
  .main-content {
    width: 95%;
  }
}
</style>