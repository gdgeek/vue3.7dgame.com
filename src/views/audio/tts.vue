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
            <div class="language-control">
              <el-select v-model="voiceLanguage" placeholder="请选择语言" :disabled="autoDetectLanguage">
                <el-option label="全部" value="" />
                <el-option label="中文" value="中文" />
                <el-option label="英文" value="英文" />
                <el-option label="日文" value="日文" />
              </el-select>
              <el-tooltip content="开启后将自动检测输入文本的语言类型" placement="top" :effect="isDark ? 'light' : 'dark'">
                <el-switch v-model="autoDetectLanguage" inline-prompt active-text="自动检测" inactive-text="开启自动检测"
                  class="auto-detect-switch" />
              </el-tooltip>
            </div>
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
        <div class="language-tag" v-if="voiceLanguage">
          <el-tag :type="voiceLanguage === '中文' ? 'danger' : voiceLanguage === '日文' ? 'success' : 'primary'"
            effect="dark">
            {{ voiceLanguage || '请选择语言' }}
          </el-tag>
          <span class="limit-info">{{ getLanguageLimitText }}</span>
        </div>

        <!-- 语言分析组件 -->
        <div class="language-analysis" v-if="showLanguageAnalysis && text.length > 5">
          <div class="analysis-header">
            <span class="analysis-title">语言分析</span>
            <el-button type="text" size="small" @click="showLanguageAnalysis = false">关闭</el-button>
          </div>
          <div class="language-bars">
            <div class="language-bar-item">
              <div class="bar-label">中文 ({{ languageAnalysis.chinesePercentage }}%)</div>
              <div class="progress-bar">
                <div class="progress-fill chinese" :style="{ width: languageAnalysis.chinesePercentage + '%' }"></div>
              </div>
            </div>
            <div class="language-bar-item">
              <div class="bar-label">日文 ({{ languageAnalysis.japanesePercentage }}%)</div>
              <div class="progress-bar">
                <div class="progress-fill japanese" :style="{ width: languageAnalysis.japanesePercentage + '%' }"></div>
              </div>
            </div>
            <div class="language-bar-item">
              <div class="bar-label">英文 ({{ languageAnalysis.englishPercentage }}%)</div>
              <div class="progress-bar">
                <div class="progress-fill english" :style="{ width: languageAnalysis.englishPercentage + '%' }"></div>
              </div>
            </div>
            <div class="language-bar-item">
              <div class="bar-label">其他 ({{ languageAnalysis.otherPercentage }}%)</div>
              <div class="progress-bar">
                <div class="progress-fill other" :style="{ width: languageAnalysis.otherPercentage + '%' }"></div>
              </div>
            </div>
          </div>
          <div class="analysis-suggestion" v-if="languageAnalysis.suggestion">
            <el-alert :title="languageAnalysis.suggestion" type="info" :closable="false" />
          </div>
        </div>

        <div class="text-container" ref="textContainerRef" v-show="isPlaying">
          <div v-if="!text" class="empty-text">请输入要转换的文本内容...</div>
          <template v-else>
            <span class="highlighted-text">{{ highlightedText }}</span>
            <span class="normal-text">{{ normalText }}</span>
          </template>
        </div>
        <div class="text-actions" v-if="text.length > 5">
          <el-button type="text" size="small" @click="showLanguageAnalysis = !showLanguageAnalysis">
            {{ showLanguageAnalysis ? '隐藏语言分析' : '显示语言分析' }}
          </el-button>
        </div>
        <el-input id="word" type="textarea"
          :placeholder="voiceLanguage === '中文' ? '请输入中文内容...' : voiceLanguage === '英文' ? 'Please input English text...' : voiceLanguage === '日文' ? '日本語を入力してください...' : '请输入要转换的文本内容...'"
          v-model="text" :maxlength="voiceLanguage === '英文' ? 500 : 150" :rows="4" show-word-limit :disabled="isLoading"
          @input="onTextInput" v-show="!isPlaying" />
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
        <el-alert title="使用提示" type="info" :description="`不同语言的文本限制：
          • 中文：最多支持150个汉字（全角标点符号算一个汉字）
          • 英文：最多支持500个字母（半角标点符号算一个字母）
          • 日文：最多支持150个字符（全角标点符号算一个字符）
          
          请尽量确保转换的文本内容与所选语言类型一致，否则可能导致发音不准确甚至无法转换。`
          " :closable="false" show-icon class="tips-alert" />
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
import type { UploadFileType } from "@/api/user/model"
import { useSettingsStore } from '@/store'
import { ThemeEnum } from '@/enums/ThemeEnum'

interface VoiceOption {
  value: number
  label: string
  type: string
  scene: string
  language: string
  emotions: string[]
  sampleRate: string[]
}

const settingsStore = useSettingsStore()
const isDark = computed<boolean>(() => settingsStore.theme === ThemeEnum.DARK);

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
let languageDetectionTimer: number | null = null

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
const showLanguageAnalysis = ref(false) // 是否显示语言分析
const languageAnalysis = ref({
  chinesePercentage: 0,
  japanesePercentage: 0,
  englishPercentage: 0,
  otherPercentage: 0,
  suggestion: ''
})

// 筛选参数
const voiceType = ref('')
const voiceScene = ref('')
const voiceLanguage = ref('')
const emotionsDialogVisible = ref(false)
const selectedVoiceEmotions = ref<string[]>([])
const autoDetectLanguage = ref(true) // 添加自动语言检测开关状态

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

// 监听语言变化
watch(voiceLanguage, (newLanguage, oldLanguage) => {
  if (newLanguage !== oldLanguage) {
    if (text.value) {
      checkTextLanguage()
    }

    // 根据语言类型自动调整文本输入框的最大长度
    if (newLanguage === '英文') {
      ElMessage.success('英文模式下最多可输入500个字符')
      if (text.value && text.value.length > 500) {
        text.value = text.value.substring(0, 500)
        ElMessage.warning('英文模式下最多支持500个字符，已自动截断')
      }
    } else if (newLanguage === '中文' || newLanguage === '日文') {
      ElMessage.success(`${newLanguage}模式下最多可输入150个字符`)
      if (text.value && text.value.length > 150) {
        text.value = text.value.substring(0, 150)
        ElMessage.warning(`${newLanguage}模式下最多支持150个字符，已自动截断`)
      }
    }
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

  // 检查文本语言是否匹配
  checkTextLanguage()
}

// 检查文本语言类型
const checkTextLanguage = () => {
  if (!text.value || !autoDetectLanguage.value) return

  const chineseRegex = /[\u4e00-\u9fa5]/g // 匹配中文字符
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF]/g // 匹配日文假名
  const japaneseKanjiRegex = /[\u4E00-\u9FAF]/g // 匹配日文汉字（与中文汉字重叠）
  const englishRegex = /[a-zA-Z]/g // 匹配英文字符

  // 计算各种语言字符的数量
  const chineseCount = (text.value.match(chineseRegex) || []).length 
  const japaneseKanaCount = (text.value.match(japaneseRegex) || []).length 
  const japaneseKanjiCount = (text.value.match(japaneseKanjiRegex) || []).length - chineseCount // 减去中文字符，避免重复计算
  const japaneseCount = japaneseKanaCount + Math.max(0, japaneseKanjiCount) 
  const englishCount = (text.value.match(englishRegex) || []).length

  // 计算总字符数和各语言占比
  const totalChars = text.value.length
  const chinesePercentage = (chineseCount / totalChars) * 100
  const japanesePercentage = (japaneseCount / totalChars) * 100
  const englishPercentage = (englishCount / totalChars) * 100
  const otherPercentage = 100 - chinesePercentage - japanesePercentage - englishPercentage

  // 更新语言分析数据
  languageAnalysis.value = {
    chinesePercentage: Math.round(chinesePercentage),
    japanesePercentage: Math.round(japanesePercentage),
    englishPercentage: Math.round(englishPercentage),
    otherPercentage: Math.round(otherPercentage),
    suggestion: ''
  }

  // 确定主要语言类型
  let detectedLanguage = ''
  let isMultiLanguage = false
  const maxCount = Math.max(chineseCount, japaneseCount, englishCount)
  const threshold = 0.7 // 70%的阈值来确定主要语言

  if (maxCount > 0) {
    if (chineseCount === maxCount && chinesePercentage > threshold * 100) {
      detectedLanguage = '中文'
    } else if (japaneseCount === maxCount && japanesePercentage > threshold * 100) {
      detectedLanguage = '日文'
    } else if (englishCount === maxCount && englishPercentage > threshold * 100) {
      detectedLanguage = '英文'
    } else {
      // 混合语言情况
      isMultiLanguage = true
      // 选择占比最高的语言
      if (chineseCount >= japaneseCount && chineseCount >= englishCount) {
        detectedLanguage = '中文'
      } else if (japaneseCount >= chineseCount && japaneseCount >= englishCount) {
        detectedLanguage = '日文'
      } else {
        detectedLanguage = '英文'
      }
    }
  }

  // 设置语言分析建议
  if (isMultiLanguage) {
    languageAnalysis.value.suggestion = `检测到混合语言文本，建议选择${detectedLanguage}作为主要语言`
    // 自动显示语言分析
    // showLanguageAnalysis.value = true
  } else if (detectedLanguage) {
    languageAnalysis.value.suggestion = `检测到文本主要语言为${detectedLanguage}`
  }

  // 如果是混合语言，给出更详细的提示
  if (isMultiLanguage && text.value.length > 10) {
    const languageInfo = `检测到混合语言文本：中文约${Math.round(chinesePercentage)}%，日文约${Math.round(japanesePercentage)}%，英文约${Math.round(englishPercentage)}%`

    // 使用防抖定时器显示消息
    if (languageDetectionTimer) {
      clearTimeout(languageDetectionTimer)
    }

    languageDetectionTimer = window.setTimeout(() => {
      ElMessage({
        message: `${languageInfo}，已自动选择主要语言：${detectedLanguage}`,
        type: 'warning',
        duration: 5000
      })
    }, 3000) // 3秒后显示提示
  }

  // 如果检测到的语言与当前选择的语言不匹配
  if (detectedLanguage && voiceLanguage.value && detectedLanguage !== voiceLanguage.value) {
    // 自动切换语言
    const oldLanguage = voiceLanguage.value
    voiceLanguage.value = detectedLanguage
    if (!isMultiLanguage) {
      ElMessage.success(`检测到文本语言为${detectedLanguage}，已自动从${oldLanguage}切换为${detectedLanguage}`)
    }
  }

  // 如果未选择语言但检测到了语言，自动设置语言
  if (detectedLanguage && !voiceLanguage.value) {
    voiceLanguage.value = detectedLanguage
    if (!isMultiLanguage) {
      ElMessage.success(`已自动检测并设置语言为：${detectedLanguage}`)
    }
  }

  // 根据检测到的语言类型，提供文本长度限制提示
  if (detectedLanguage === '中文' || detectedLanguage === '日文') {
    if (text.value.length > 150) {
      ElMessage.warning(`${detectedLanguage}文本超过150字符限制，已检测到${text.value.length}字符，可能会被截断`)
    }
  } else if (detectedLanguage === '英文') {
    if (text.value.length > 500) {
      ElMessage.warning(`英文文本超过500字符限制，已检测到${text.value.length}字符，可能会被截断`)
    }
  }
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
      'https://sound.bujiaban.com/tencentTTS',
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

    // 上传文件
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
      const audioResponse = await postAudio({
        name: audioName,
        file_id: fileResponse.data.id
      })

      if (audioResponse.data?.id) {
        ElMessage.success('音频上传成功')
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

// 当前语言的文本限制说明
const getLanguageLimitText = computed(() => {
  switch (voiceLanguage.value) {
    case '中文':
      return '中文最多支持150个汉字（全角标点符号算一个汉字）'
    case '英文':
      return '英文最多支持500个字母（半角标点符号算一个字母）'
    case '日文':
      return '日文最多支持150个字符'
    default:
      return '请先选择语言类型'
  }
})

// 添加watch监听autoDetectLanguage的变化
watch(autoDetectLanguage, (newValue) => {
  if (newValue && text.value) {
    // 如果开启自动检测且有文本，立即进行检测
    checkTextLanguage()
  }
})

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

  // 清理语言检测定时器
  if (languageDetectionTimer) {
    clearTimeout(languageDetectionTimer)
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
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  background-color: v-bind('isDark ? "#1e1e1e" : "#fff"');
  border-radius: 16px;
  padding: 2rem;
  box-shadow: v-bind('isDark ? "0 4px 20px rgba(0, 0, 0, 0.2)" : "0 4px 20px rgba(0, 0, 0, 0.05)"');
  color: v-bind('isDark ? "#e0e0e0" : "inherit"');
  transition: background-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
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

  .language-tag {
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    .el-tag {
      font-size: 0.9rem;
      font-weight: 500;
    }

    .limit-info {
      font-size: 0.8rem;
      color: v-bind('isDark ? "#777" : "#999"');
    }
  }

  .language-analysis {
    margin: 0.5rem 0 1rem;
    padding: 1rem;
    border-radius: 8px;
    background-color: v-bind('isDark ? "#2a2a2a" : "#f5f7fa"');
    border: 1px solid v-bind('isDark ? "#444" : "#e4e7ed"');
    transition: all 0.3s ease;

    .analysis-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.8rem;

      .analysis-title {
        font-weight: 600;
        font-size: 0.9rem;
        color: v-bind('isDark ? "#e0e0e0" : "#606266"');
      }
    }

    .language-bars {
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
    }

    .language-bar-item {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;

      .bar-label {
        font-size: 0.8rem;
        color: v-bind('isDark ? "#bbb" : "#606266"');
      }

      .progress-bar {
        height: 8px;
        width: 100%;
        background-color: v-bind('isDark ? "#444" : "#e4e7ed"');
        border-radius: 4px;
        overflow: hidden;

        .progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s ease;

          &.chinese {
            background-color: #f56c6c;
          }

          &.japanese {
            background-color: #67c23a;
          }

          &.english {
            background-color: #409eff;
          }

          &.other {
            background-color: #909399;
          }
        }
      }
    }

    .analysis-suggestion {
      margin-top: 1rem;
    }
  }

  .text-container {
    min-height: 100px;
    max-height: 200px;
    overflow-y: auto;
    padding: 1rem;
    border-radius: 12px;
    background-color: v-bind('isDark ? "#2c2c2c" : "#fff"');
    border: 1px solid v-bind('isDark ? "#444" : "#dcdfe6"');
    font-size: 1rem;
    line-height: 1.5;
    scroll-behavior: smooth;
    position: relative;
    font-family: inherit;
    text-align: left;
    white-space: pre-wrap;
    word-break: break-word;
    transition: all 0.3s ease;
    color: v-bind('isDark ? "#e0e0e0" : "#606266"');
    box-sizing: border-box;

    &::-webkit-scrollbar {
      width: 8px;

      &-track {
        background: v-bind('isDark ? "#333" : "#f1f1f1"');
        border-radius: 4px;
      }

      &-thumb {
        background: v-bind('isDark ? "#555" : "#c1c1c1"');
        border-radius: 4px;

        &:hover {
          background: v-bind('isDark ? "#666" : "#a8a8a8"');
        }
      }
    }

    .empty-text {
      color: v-bind('isDark ? "#777" : "#999"');
      text-align: center;
      padding: 2rem 0;
    }

    .highlighted-text {
      color: v-bind('isDark ? "#ff8c38" : "#FF6700"');
      font-weight: 500;
      transition: color 0.3s ease;
    }

    .normal-text {
      color: v-bind('isDark ? "#e0e0e0" : "#606266"');
    }
  }

  :deep(.el-textarea__inner) {
    border-radius: 12px;
    padding: 1rem;
    font-size: 1rem;
    border: 1px solid v-bind('isDark ? "#444" : "#dcdfe6"');
    background-color: v-bind('isDark ? "#2c2c2c" : "#fff"');
    color: v-bind('isDark ? "#e0e0e0" : "#606266"');
    transition: all 0.3s ease;

    &:focus {
      border-color: #409eff;
      box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
    }

    &::placeholder {
      color: v-bind('isDark ? "#777" : "#999"');
    }
  }

  .text-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.5rem;
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
      white-space: pre-line;
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
  color: v-bind('isDark ? "#e0e0e0" : "#606266"');
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
  .tencent-tts {
    width: 100%;
    padding: 1rem;
  }

  .params-section {
    .param-row {
      flex-direction: column;
      gap: 1rem;
    }
  }
}

@media (max-width: 768px) {
  .tencent-tts {
    width: 100%;
    padding: 0;
  }
}

// 在样式部分添加新的CSS
.language-control {
  display: flex;
  gap: 0.5rem;
  align-items: center;

  .el-select {
    flex: 1;
  }

  .auto-detect-switch {
    margin-left: 0.5rem;
  }
}
</style>