<template>
  <div class="tencent-tts" :class="{ 'leaving': isLeaving, 'entering': isEntering }">
    <div class="main-content">
      <div class="voice-select-section">
        <div class="voice-filters">
          <div class="filter-item">
            <span class="param-label">{{ t('tts.voiceType') }}</span>
            <el-select v-model="voiceType" :placeholder="t('tts.voiceType')">
              <el-option :label="t('tts.all')" value="" />
              <el-option :label="t('tts.premiumVoice')" value="精品音色" />
              <el-option :label="t('tts.standardVoice')" value="标准音色" />
            </el-select>
          </div>
          <div class="filter-item">
            <span class="param-label">{{ t('tts.voiceScene') }}</span>
            <el-select v-model="voiceScene" :placeholder="t('tts.voiceScene')">
              <el-option :label="t('tts.all')" value="" />
              <el-option v-for="scene in availableScenes" :key="scene" :label="scene" :value="scene" />
            </el-select>
          </div>
          <div class="filter-item">
            <span class="param-label">{{ t('tts.voiceLanguage') }}</span>
            <div class="language-control">
              <el-select v-model="voiceLanguage" :placeholder="t('tts.voiceLanguage')" :disabled="autoSwitchLanguage">
                <el-option :label="t('tts.all')" value="" />
                <el-option :label="t('tts.chinese')" value="中文" />
                <el-option :label="t('tts.english')" value="英文" />
                <el-option :label="t('tts.japanese')" value="日文" />
              </el-select>
              <el-tooltip :content="t('tts.openAutoSwitch')" placement="top" :effect="isDark ? 'light' : 'dark'">
                <el-switch v-model="autoSwitchLanguage" inline-prompt :active-text="t('tts.autoSwitch')"
                  :inactive-text="t('tts.openAutoSwitch')" class="auto-detect-switch" />
              </el-tooltip>
            </div>
          </div>
        </div>
        <div class="voice-type">
          <span class="param-label">{{ t('tts.voice') }}</span>
          <el-select v-model="selectedVoiceType" :placeholder="t('tts.voice')" class="voice-select">
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
                      {{ voice.language === '中文' ? t('tts.chinese') : voice.language === '英文' ? t('tts.english') :
                        voice.language === '日文' ? t('tts.japanese') : voice.language }}
                    </el-tag>
                    <el-tag v-if="voice.emotions.length > 1" size="small" type="warning" effect="plain"
                      @click="showEmotions(voice)">
                      {{ voice.emotions.length }}{{ t('tts.emotionCount') }}
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
                <span class="param-label">{{ t('tts.emotionType') }}</span>
                <el-select v-model="emotionCategory" :placeholder="t('tts.emotionType')" class="emotion-select"
                  :disabled="availableEmotions.length <= 1">
                  <el-option :label="t('tts.default')" value="" />
                  <el-option v-for="emotion in filteredEmotions" :key="emotion" :label="emotion" :value="emotion" />
                </el-select>
              </div>
              <div class="emotion-intensity" v-if="emotionCategory">
                <span class="param-label">{{ t('tts.emotionIntensity') }} ({{ emotionIntensity }})</span>
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
            <span class="param-label">{{ t('tts.volume') }}</span>
            <el-slider v-model="volume" :min="-10" :max="10" :step="1" show-stops />
          </div>
          <div class="param-item">
            <span class="param-label">{{ t('tts.speed') }}</span>
            <el-slider v-model="speed" :min="-2" :max="6" :step="0.5" show-stops />
          </div>
        </div>
        <div class="param-row">
          <div class="param-item">
            <span class="param-label">{{ t('tts.audioFormat') }}</span>
            <el-radio-group v-model="codec">
              <el-radio label="wav">WAV</el-radio>
              <el-radio label="mp3">MP3</el-radio>
              <el-radio label="pcm">PCM</el-radio>
            </el-radio-group>
          </div>
          <div class="param-item">
            <span class="param-label">{{ t('tts.sampleRate') }}</span>
            <el-radio-group v-model="sampleRate">
              <el-radio :label="8000">8k</el-radio>
              <el-radio :label="16000">16k</el-radio>
              <el-radio v-if="supportHighSampleRate" :label="24000">24k</el-radio>
            </el-radio-group>
          </div>
        </div>
      </div>

      <div class="input-section">
        <div class="language-tag" v-if="voiceLanguage || (!autoSwitchLanguage && languageAnalysis.suggestion)">
          <template v-if="voiceLanguage">
            <el-tag :type="voiceLanguage === '中文' ? 'danger' : voiceLanguage === '日文' ? 'success' : 'primary'"
              effect="dark">
              {{ voiceLanguage === '中文' ? t('tts.chinese') : voiceLanguage === '英文' ? t('tts.english') : voiceLanguage
                === '日文' ? t('tts.japanese') : voiceLanguage }}
            </el-tag>
            <span class="limit-info">
              {{ getLanguageLimitText }}
              <template v-if="!autoSwitchLanguage && languageAnalysis.suggestion && !voiceLanguage">
                ({{ languageAnalysis.suggestion }})
              </template>
              <template v-if="text.length > 0">
                - {{ t('tts.totalChars') }}：{{ languageAnalysis.totalChars }}
              </template>
            </span>
          </template>
          <template v-else>
            <span class="limit-info">{{ languageAnalysis.suggestion }}</span>
          </template>
        </div>

        <!-- 语言分析组件 -->
        <div class="language-analysis" v-if="showLanguageAnalysis && text.length > 5">
          <div class="analysis-header">
            <span class="analysis-title">{{ t('tts.languageAnalysis') }}</span>
            <el-button type="text" size="small" @click="showLanguageAnalysis = false">{{ t('tts.close') }}</el-button>
          </div>
          <div class="language-analysis-content">
            <div class="language-bars">
              <div class="language-bar-item" v-for="[type, item] in languageItems" :key="type">
                <div class="bar-label" :class="type">
                  {{ item.label }} ({{ Math.round(animatedPercentages[type] || 0) }}% - {{ item.count }}{{
                    t('tts.totalChars')
                  }})
                </div>
                <el-progress :percentage="animatedPercentages[type] || 0" :color="getProgressColor(type)"
                  :show-text="false" :stroke-width="8" :track-color="isDark ? '#444' : '#e4e7ed'"
                  class="language-progress" />
              </div>
            </div>
            <div class="language-chart" ref="languageChartRef"></div>
          </div>
          <div class="analysis-suggestion" v-if="languageAnalysis.suggestion">
            <el-alert :title="languageAnalysis.suggestion" type="info" :closable="false" />
          </div>
        </div>

        <div class="text-container" ref="textContainerRef" v-show="isPlaying">
          <div v-if="!text" class="empty-text">{{ t('tts.inputPlaceholder') }}</div>
          <template v-else>
            <span class="highlighted-text">{{ highlightedText }}</span>
            <span class="normal-text">{{ normalText }}</span>
          </template>
        </div>
        <div class="text-actions" v-if="text.length > 5">
          <el-button type="text" size="small" @click="showLanguageAnalysis = !showLanguageAnalysis">
            {{ showLanguageAnalysis ? t('tts.hideLanguageAnalysis') : t('tts.showLanguageAnalysis') }}
          </el-button>
        </div>
        <el-input id="word" type="textarea"
          :placeholder="voiceLanguage === '中文' ? t('tts.inputChinesePlaceholder') : voiceLanguage === '英文' ? t('tts.inputEnglishPlaceholder') : voiceLanguage === '日文' ? t('tts.inputJapanesePlaceholder') : t('tts.inputPlaceholder')"
          v-model="text" :maxlength="voiceLanguage === '英文' ? 500 : 150" :rows="4" show-word-limit :disabled="isLoading"
          @input="onTextInput" v-show="!isPlaying" />
      </div>

      <div class="preview-section" v-if="audioUrl">
        <audio :src="audioUrl" controls class="audio-player" ref="audioPlayerRef" @play="onAudioPlayerPlay"
          @pause="onAudioPlayerPause" @ended="onAudioPlayerEnded"></audio>
      </div>

      <div class="action-section">
        <el-button type="primary" size="large" @click="synthesizeSpeech" :loading="isLoading" class="action-button">
          {{ isLoading ? t('tts.synthesizing') : t('tts.synthesize') }}
        </el-button>
        <el-button type="success" size="large" @click="uploadAudio" :loading="isUploading" :disabled="!currentAudioBlob"
          class="action-button upload-button">
          {{ isUploading ? t('tts.uploading') : t('tts.upload') }}
        </el-button>
      </div>

      <div class="tips-section">
        <el-alert :title="t('tts.tips')" type="info" :description="t('tts.tipsContent')" :closable="false" show-icon
          class="tips-alert" />
      </div>
    </div>

    <!-- 情感列表对话框 -->
    <el-dialog :title="t('tts.selectEmotion')" v-model="emotionsDialogVisible" width="30%" :close-on-click-modal="true"
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
          <el-button @click="emotionsDialogVisible = false">{{ t('tts.cancel') }}</el-button>
          <el-button type="primary" @click="confirmEmotionSelection">{{ t('tts.confirm') }}</el-button>
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
import * as echarts from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { LabelLayout } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'
import { useI18n } from 'vue-i18n'


// 注册ECharts组件
echarts.use([
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  LabelLayout,
  CanvasRenderer
])

interface VoiceOption {
  value: number
  label: string
  type: string
  scene: string
  language: string
  emotions: string[]
  sampleRate: string[]
}

// 语言分析接口
interface LanguageAnalysis {
  chinesePercentage: number
  japanesePercentage: number
  englishPercentage: number
  otherPercentage: number
  chineseCount: number
  japaneseCount: number
  englishCount: number
  otherCount: number
  totalChars: number
  suggestion: string
}

const { t } = useI18n();

const settingsStore = useSettingsStore()
const isDark = computed<boolean>(() => settingsStore.theme === ThemeEnum.DARK);

// 动画相关的状态
const animatedPercentages = ref<Record<string, number>>({})

// 进度条颜色
const getProgressColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    chinese: '#f56c6c',
    japanese: '#67c23a',
    english: '#409eff',
    other: '#909399'
  }
  return colorMap[type] || '#909399'
}

// 监听主题变化，更新图表
watch(isDark, () => {
  if (showLanguageAnalysis.value) {
    // 重新初始化图表
    if (languageChart) {
      const oldChart = languageChart
      nextTick(() => {
        oldChart.dispose()
        languageChart = null
        updateLanguageChart()
      })
    }

    // 重新播放进度条动画
    const currentPercentages = { ...animatedPercentages.value }
    animatedPercentages.value = {}
    nextTick(() => {
      // 先将所有值设为0
      Object.keys(currentPercentages).forEach(key => {
        animatedPercentages.value[key] = 0
      })
      // 延迟一帧后开始动画
      requestAnimationFrame(() => {
        updateAnimatedPercentages()
      })
    })

    // 重新播放组件动画
    const bars = document.querySelectorAll('.language-bar-item')
    bars.forEach((bar) => {
      const element = bar as HTMLElement
      element.style.animation = 'none'
      void element.offsetWidth // 触发重排，重置动画
      element.style.animation = ''
    })
  }
})

// 更新动画百分比
const updateAnimatedPercentages = () => {
  const targetPercentages: Record<string, number> = {}
  languageItems.value.forEach(([type, item]) => {
    targetPercentages[type] = item.percentage
  })

  // 重置所有百分比为0
  Object.keys(targetPercentages).forEach(type => {
    if (!(type in animatedPercentages.value)) {
      animatedPercentages.value[type] = 0
    }
  })

  // 使用requestAnimationFrame实现平滑动画
  const animate = (timestamp: number) => {
    if (!animationStartTime) {
      animationStartTime = timestamp
    }

    const progress = Math.min((timestamp - animationStartTime) / animationDuration, 1)
    const easeProgress = easeOutCubic(progress)

    Object.keys(targetPercentages).forEach(type => {
      const target = targetPercentages[type]
      const start = animatedPercentages.value[type] || 0
      animatedPercentages.value[type] = start + (target - start) * easeProgress
    })

    if (progress < 1) {
      requestAnimationFrame(animate)
    }
  }

  let animationStartTime: number | null = null
  const animationDuration = 1500 // 动画持续时间（毫秒）

  requestAnimationFrame(animate)
}

// 缓动函数
const easeOutCubic = (x: number): number => {
  return 1 - Math.pow(1 - x, 3)
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
let languageDetectionTimer: number | null = null

// DOM引用
const textContainerRef = ref<HTMLElement | null>(null)
const audioPlayerRef = ref<HTMLAudioElement | null>(null)
const languageChartRef = ref<HTMLElement | null>(null)

// 图表实例
let languageChart: echarts.ECharts | null = null

// TTS参数
const selectedVoiceType = ref(101002) // 默认音色：智聆
const volume = ref(0)
const speed = ref(0)
const codec = ref('mp3')
const sampleRate = ref(16000)
const emotionCategory = ref('')
const emotionIntensity = ref(100)
const showLanguageAnalysis = ref(false) // 是否显示语言分析
const languageAnalysis = ref<LanguageAnalysis>({
  chinesePercentage: 0,
  japanesePercentage: 0,
  englishPercentage: 0,
  otherPercentage: 0,
  chineseCount: 0,
  japaneseCount: 0,
  englishCount: 0,
  otherCount: 0,
  totalChars: 0,
  suggestion: ''
})

// 筛选参数
const voiceType = ref('')
const voiceScene = ref('')
const voiceLanguage = ref('')
const emotionsDialogVisible = ref(false)
const selectedVoiceEmotions = ref<string[]>([])
const autoSwitchLanguage = ref(true) // 添加自动语言切换开关状态

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
      ElMessage.success(t('tts.englishLimit'))
      if (text.value && text.value.length > 500) {
        text.value = text.value.substring(0, 500)
        ElMessage.warning(t('tts.textLimitWarning', [t('tts.english'), 500, text.value.length]))
      }
    } else if (newLanguage === '中文' || newLanguage === '日文') {
      ElMessage.success(newLanguage === '中文' ? t('tts.chineseLimit') : t('tts.japaneseLimit'))
      if (text.value && text.value.length > 150) {
        text.value = text.value.substring(0, 150)
        ElMessage.warning(t('tts.textLimitWarning', [
          newLanguage === '中文' ? t('tts.chinese') : t('tts.japanese'),
          150,
          text.value.length
        ]))
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

// 添加watch监听autoSwitchLanguage的变化
watch(autoSwitchLanguage, (newValue) => {
  if (newValue && text.value) {
    // 如果开启自动切换且有文本，立即进行检测和切换
    checkTextLanguage()
  }
})

// 检查文本语言类型
const checkTextLanguage = () => {
  if (!text.value) return

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
  const otherCount = text.value.length - (chineseCount + japaneseCount + englishCount)

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
    chineseCount,
    japaneseCount,
    englishCount,
    otherCount,
    totalChars,
    suggestion: ''
  }

  // 更新饼图
  nextTick(() => {
    updateLanguageChart()
  })

  // 确定主要语言类型
  let detectedLanguage = ''
  let isMultiLanguage = false
  const maxCount = Math.max(chineseCount, japaneseCount, englishCount)
  // const threshold = 0.7 // 70%的阈值来确定主要语言

  // 只要存在多种语言就标记为混合语言
  if (maxCount > 0) {
    if (chineseCount > 0 && (japaneseCount > 0 || englishCount > 0)) {
      isMultiLanguage = true
    } else if (japaneseCount > 0 && (chineseCount > 0 || englishCount > 0)) {
      isMultiLanguage = true
    } else if (englishCount > 0 && (chineseCount > 0 || japaneseCount > 0)) {
      isMultiLanguage = true
    }

    // 主要语言（数量最多的）
    if (chineseCount >= japaneseCount && chineseCount >= englishCount) {
      detectedLanguage = '中文'
    } else if (japaneseCount >= chineseCount && japaneseCount >= englishCount) {
      detectedLanguage = '日文'
    } else {
      detectedLanguage = '英文'
    }
  }

  // 设置语言分析建议
  if (isMultiLanguage) {
    const detectedLanguageText = detectedLanguage === '中文' ? t('tts.chinese') :
      detectedLanguage === '英文' ? t('tts.english') :
        detectedLanguage === '日文' ? t('tts.japanese') : detectedLanguage
    languageAnalysis.value.suggestion = t('tts.mixedLanguageDetected', [detectedLanguageText])
    // 自动显示语言分析
    // showLanguageAnalysis.value = true
  } else if (detectedLanguage) {
    const detectedLanguageText = detectedLanguage === '中文' ? t('tts.chinese') :
      detectedLanguage === '英文' ? t('tts.english') :
        detectedLanguage === '日文' ? t('tts.japanese') : detectedLanguage
    languageAnalysis.value.suggestion = t('tts.mainLanguageDetected', [detectedLanguageText])
  }

  // 如果是混合语言，给出更详细的提示
  if (isMultiLanguage && text.value.length > 10) {
    const languageInfo = t('tts.languagePercentage', [
      Math.round(chinesePercentage),
      Math.round(japanesePercentage),
      Math.round(englishPercentage)
    ])

    // 使用防抖定时器显示消息
    if (languageDetectionTimer) {
      clearTimeout(languageDetectionTimer)
    }

    languageDetectionTimer = window.setTimeout(() => {
      const detectedLanguageText = detectedLanguage === '中文' ? t('tts.chinese') :
        detectedLanguage === '英文' ? t('tts.english') :
          detectedLanguage === '日文' ? t('tts.japanese') : detectedLanguage
      ElMessage({
        message: `${languageInfo}，${autoSwitchLanguage.value ? t('tts.autoSwitched', [detectedLanguageText]) : t('tts.mixedLanguageDetected', [detectedLanguageText])}`,
        type: 'warning',
        duration: 5000
      })
    }, 3000) // 3秒后显示提示
  }

  // 只有在自动切换开启时才执行语言切换
  if (autoSwitchLanguage.value) {
    // 如果检测到的语言与当前选择的语言不匹配
    if (detectedLanguage && voiceLanguage.value && detectedLanguage !== voiceLanguage.value) {
      // 自动切换语言
      const oldLanguage = voiceLanguage.value
      const oldLanguageText = oldLanguage === '中文' ? t('tts.chinese') :
        oldLanguage === '英文' ? t('tts.english') :
          oldLanguage === '日文' ? t('tts.japanese') : oldLanguage
      voiceLanguage.value = detectedLanguage
      const newLanguageText = detectedLanguage === '中文' ? t('tts.chinese') :
        detectedLanguage === '英文' ? t('tts.english') :
          detectedLanguage === '日文' ? t('tts.japanese') : detectedLanguage
      if (!isMultiLanguage) {
        ElMessage.success(t('tts.autoSwitchedLanguage', [oldLanguageText, newLanguageText]))
      }
    }

    // 如果未选择语言但检测到了语言，自动设置语言
    if (detectedLanguage && !voiceLanguage.value) {
      voiceLanguage.value = detectedLanguage
      const detectedLanguageText = detectedLanguage === '中文' ? t('tts.chinese') :
        detectedLanguage === '英文' ? t('tts.english') :
          detectedLanguage === '日文' ? t('tts.japanese') : detectedLanguage
      if (!isMultiLanguage) {
        ElMessage.success(t('tts.autoDetectedLanguage', [detectedLanguageText]))
      }
    }
  }

  // 根据检测到的语言类型，提供文本长度限制提示
  if (detectedLanguage === '中文' || detectedLanguage === '日文') {
    if (text.value.length > 150) {
      const detectedLanguageText = detectedLanguage === '中文' ? t('tts.chinese') : t('tts.japanese')
      ElMessage.warning(t('tts.textLimitWarning', [detectedLanguageText, 150, text.value.length]))
    }
  } else if (detectedLanguage === '英文') {
    if (text.value.length > 500) {
      ElMessage.warning(t('tts.textLimitWarning', [t('tts.english'), 500, text.value.length]))
    }
  }
}

// 监听语言分析显示状态变化
watch(showLanguageAnalysis, (newVal) => {
  if (newVal) {
    nextTick(() => {
      // 确保DOM元素已经渲染
      setTimeout(() => {
        // 如果图表实例存在，先销毁它
        if (languageChart) {
          languageChart.dispose()
          languageChart = null
        }
        // 重新创建图表
        updateLanguageChart()
        // 重置动画状态并重新开始
        animatedPercentages.value = {}
        updateAnimatedPercentages()
      }, 100)
    })
  }
})

// 更新语言分析饼图
const updateLanguageChart = () => {
  if (!languageChartRef.value) return

  // 如果图表实例不存在，则创建新实例
  if (!languageChart) {
    languageChart = echarts.init(languageChartRef.value)
  } else {
    // 如果图表实例已存在，先调整大小以适应容器
    languageChart.resize()
  }

  //颜色映射
  const colorMap = {
    '中文': '#f56c6c',
    '日文': '#67c23a',
    '英文': '#409eff',
    '其他': '#909399'
  }

  // 图表数据
  const chartData = [
    {
      value: languageAnalysis.value.chinesePercentage,
      name: t('tts.chinese'),
      itemStyle: { color: colorMap['中文'] },
      count: languageAnalysis.value.chineseCount
    },
    {
      value: languageAnalysis.value.japanesePercentage,
      name: t('tts.japanese'),
      itemStyle: { color: colorMap['日文'] },
      count: languageAnalysis.value.japaneseCount
    },
    {
      value: languageAnalysis.value.englishPercentage,
      name: t('tts.english'),
      itemStyle: { color: colorMap['英文'] },
      count: languageAnalysis.value.englishCount
    },
    {
      value: languageAnalysis.value.otherPercentage,
      name: t('tts.other'),
      itemStyle: { color: colorMap['其他'] },
      count: languageAnalysis.value.otherCount
    }
  ].filter(item => item.value > 0)

  // 设置图表选项
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: function (params: any) {
        return `${t('tts.languageAnalysis')}<br/>
               ${params.name}: ${params.percent}%<br/>
               ${t('tts.totalChars')}: ${params.data.count}<br/>
              `
      },
      textStyle: {
        color: isDark.value ? '#fff' : '#333'
      },
      backgroundColor: isDark.value ? '#1e1e1e' : '#fff',
      borderColor: isDark.value ? '#444' : '#ddd'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      textStyle: {
        color: isDark.value ? '#e0e0e0' : '#606266'
      }
    },
    series: [
      {
        name: t('tts.languageAnalysis'),
        type: 'pie',
        radius: ['40%', '95%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: isDark.value ? '#1e1e1e' : '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center',
          color: isDark.value ? '#e0e0e0' : '#606266'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '20',
            fontWeight: 'bold',
            color: isDark.value ? '#e0e0e0' : '#606266'
          }
        },
        labelLine: {
          show: false
        },
        data: chartData
      }
    ]
  }

  // 应用图表选项
  languageChart.setOption(option)
}

// 语言分析项
const languageItems = computed(() => {
  return Object.entries({
    chinese: {
      label: t('tts.chinese'),
      percentage: languageAnalysis.value.chinesePercentage,
      count: languageAnalysis.value.chineseCount
    },
    japanese: {
      label: t('tts.japanese'),
      percentage: languageAnalysis.value.japanesePercentage,
      count: languageAnalysis.value.japaneseCount
    },
    english: {
      label: t('tts.english'),
      percentage: languageAnalysis.value.englishPercentage,
      count: languageAnalysis.value.englishCount
    },
    other: {
      label: t('tts.other'),
      percentage: languageAnalysis.value.otherPercentage,
      count: languageAnalysis.value.otherCount
    }
  }).filter(([_, item]) => item.percentage > 0)
})

// 监听语言分析数据变化
watch(() => languageAnalysis.value, () => {
  // 重置动画状态并重新开始
  animatedPercentages.value = {}
  updateAnimatedPercentages()
}, { deep: true })

// 语音合成
const synthesizeSpeech = async () => {
  if (!text.value) {
    ElMessage.warning(t('tts.noText'))
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

      ElMessage.success(t('tts.synthesisSuccess'))
    } else {
      throw new Error(t('tts.synthesisError'))
    }
  } catch (error) {
    console.error('语音合成错误:', error)
    ElMessage.error(t('tts.synthesisError'))
  } finally {
    isLoading.value = false
  }
}

// 上传音频文件
const uploadAudio = async () => {
  if (!currentAudioBlob.value) {
    ElMessage.warning(t('tts.noAudio'))
    return
  }

  try {
    // 弹出输入框让用户输入音频名称
    const { value: audioName } = await ElMessageBox.prompt(
      t('tts.enterAudioName'),
      t('tts.uploadAudio'),
      {
        confirmButtonText: t('tts.confirm'),
        cancelButtonText: t('tts.cancel'),
        inputPattern: /.+/,
        inputErrorMessage: t('tts.nameRequired'),
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
        ElMessage.success(t('tts.uploadSuccess'))
        await router.push({
          path: '/resource/audio/view',
          query: { id: audioResponse.data.id }
        })
      } else {
        throw new Error(t('tts.uploadError'))
      }
    } else {
      throw new Error(t('tts.uploadError'))
    }
  } catch (error) {
    if (error === 'cancel') {
      ElMessage.info(t('tts.uploadCanceled'))
      return
    }
    console.error('上传错误:', error)
    ElMessage.error(t('tts.uploadError'))
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
      return t('tts.chineseLimit')
    case '英文':
      return t('tts.englishLimit')
    case '日文':
      return t('tts.japaneseLimit')
    default:
      return t('tts.selectLanguageFirst')
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

  // 初始化语言分析图表和动画
  nextTick(() => {
    if (showLanguageAnalysis.value && text.value.length > 5) {
      updateLanguageChart()
      updateAnimatedPercentages()
    }
  })

  // 添加窗口大小变化监听器
  window.addEventListener('resize', handleResize)
})

// 处理窗口大小变化
const handleResize = () => {
  if (languageChart) {
    languageChart.resize()
  }
}

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

  // 销毁图表实例
  if (languageChart) {
    languageChart.dispose()
    languageChart = null
  }

  // 移除窗口大小变化监听器
  window.removeEventListener('resize', handleResize)
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
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0;
    transform: translateY(-10px);
    animation: slideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .analysis-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.8rem;
      opacity: 0;
      animation: fadeIn 0.5s ease 0.2s forwards;

      .analysis-title {
        font-weight: 600;
        font-size: 0.9rem;
        color: v-bind('isDark ? "#e0e0e0" : "#606266"');
        position: relative;

        &::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 0;
          height: 2px;
          background: #409eff;
          animation: lineGrow 0.6s ease-out 0.5s forwards;
        }
      }
    }

    .language-analysis-content {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
      opacity: 0;
      animation: fadeIn 0.5s ease 0.3s forwards;

      .language-bars {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
      }

      .language-chart {
        flex: 1;
        height: 200px;
        border-radius: 8px;
        overflow: hidden;
        opacity: 0;
        animation: fadeIn 0.5s ease 0.4s forwards;
        box-shadow: v-bind('isDark ? "0 4px 12px rgba(0, 0, 0, 0.2)" : "0 4px 12px rgba(0, 0, 0, 0.05)"');
      }
    }

    .language-bar-item {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      opacity: 0;
      animation: slideInRight 0.5s ease forwards;

      @for $i from 1 through 4 {
        &:nth-child(#{$i}) {
          animation-delay: #{0.2 + $i * 0.1}s;
        }
      }

      &.animate-in {
        animation: slideInRight 0.5s ease forwards;
      }

      .bar-label {
        font-size: 0.8rem;
        color: v-bind('isDark ? "#bbb" : "#606266"');
        display: flex;
        align-items: center;
        gap: 0.5rem;

        &.chinese {
          color: #f56c6c;
        }

        &.japanese {
          color: #67c23a;
        }

        &.english {
          color: #409eff;
        }

        &.other {
          color: #909399;
        }
      }

      .language-progress {
        :deep(.el-progress-bar__outer) {
          background-color: v-bind('isDark ? "#444" : "#e4e7ed"');
          border-radius: 4px;
        }

        :deep(.el-progress-bar__inner) {
          border-radius: 4px;
          transition: width 0.3s ease-out;
          position: relative;
          overflow: hidden;

          &::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(90deg,
                rgba(255, 255, 255, 0) 0%,
                rgba(255, 255, 255, 0.1) 50%,
                rgba(255, 255, 255, 0) 100%);
            transform: translateX(-100%);
            animation: shimmer 2s infinite;
          }
        }
      }
    }

    .analysis-suggestion {
      margin-top: 1rem;
      opacity: 0;
      animation: fadeIn 0.5s ease 0.6s forwards;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }

      to {
        opacity: 1;
      }
    }

    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }

      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes lineGrow {
      from {
        width: 0;
      }

      to {
        width: 100%;
      }
    }

    @keyframes shimmer {
      100% {
        transform: translateX(100%);
      }
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

  .language-analysis {
    .language-analysis-content {
      flex-direction: column;
      gap: 2rem;

      .language-bars {
        width: 100%;
      }

      .language-chart {
        width: 100%;
        min-height: 300px;
      }
    }
  }
}

@media (max-width: 768px) {
  .tencent-tts {
    width: 100%;
    padding: 0;
  }

  .language-analysis {
    .language-analysis-content {
      flex-direction: column;

      .language-chart {
        min-height: 250px;
      }
    }
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