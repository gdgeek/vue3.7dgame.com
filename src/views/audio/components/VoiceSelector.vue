<template>
  <div class="voice-select-section">
    <div class="voice-filters">
      <div class="filter-item">
        <span class="param-label">{{ $t('tts.voiceType') }}</span>
        <el-select v-model="localVoiceType" :placeholder="$t('tts.voiceType')">
          <el-option :label="$t('tts.all')" value="" />
          <el-option :label="$t('tts.premiumVoice')" value="精品音色" />
          <el-option :label="$t('tts.standardVoice')" value="标准音色" />
        </el-select>
      </div>
      <div class="filter-item">
        <span class="param-label">{{ $t('tts.voiceScene') }}</span>
        <el-select v-model="localVoiceScene" :placeholder="$t('tts.voiceScene')">
          <el-option :label="$t('tts.all')" value="" />
          <el-option v-for="scene in availableScenes" :key="scene" :label="scene" :value="scene" />
        </el-select>
      </div>
      <div class="filter-item">
        <span class="param-label">{{ $t('tts.voiceLanguage') }}</span>
        <div class="language-control">
          <el-select v-model="localVoiceLanguage" :placeholder="$t('tts.voiceLanguage')" :disabled="autoSwitchLanguage">
            <el-option :label="$t('tts.all')" value="" />
            <el-option :label="$t('tts.chinese')" value="中文" />
            <el-option :label="$t('tts.english')" value="英文" />
            <el-option :label="$t('tts.japanese')" value="日文" />
          </el-select>
          <el-tooltip :content="$t('tts.openAutoSwitch')" placement="top" :effect="isDark ? 'light' : 'dark'">
            <el-switch v-model="localAutoSwitchLanguage" inline-prompt :active-text="$t('tts.autoSwitch')"
              :inactive-text="$t('tts.openAutoSwitch')" class="auto-detect-switch" />
          </el-tooltip>
        </div>
      </div>
    </div>
    <div class="voice-type">
      <span class="param-label">{{ $t('tts.voice') }}</span>
      <el-select v-model="localSelectedVoice" :placeholder="$t('tts.voice')" class="voice-select">
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
                  {{ voice.language === '中文' ? $t('tts.chinese') : voice.language === '英文' ? $t('tts.english') :
                    voice.language === '日文' ? $t('tts.japanese') : voice.language }}
                </el-tag>
                <el-tag v-if="voice.emotions.length > 1" size="small" type="warning" effect="plain"
                  @click.stop="$emit('show-emotions', voice)">
                  {{ voice.emotions.length }}{{ $t('tts.emotionCount') }}
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
            <span class="param-label">{{ $t('tts.emotionType') }}</span>
            <el-select v-model="localEmotionCategory" :placeholder="$t('tts.emotionType')" class="emotion-select"
              :disabled="availableEmotions.length <= 1">
              <el-option :label="$t('tts.default')" value="" />
              <el-option v-for="emotion in filteredEmotions" :key="emotion" :label="emotion" :value="emotion" />
            </el-select>
          </div>
          <div class="emotion-intensity" v-if="localEmotionCategory">
            <span class="param-label">{{ $t('tts.emotionIntensity') }} ({{ localEmotionIntensity }})</span>
            <el-slider v-model="localEmotionIntensity" :min="50" :max="200" :step="10" show-stops
              class="intensity-slider" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { availableVoices as voicesList } from '@/store/modules/availableVoices'

interface VoiceOption {
  value: number
  label: string
  type: string
  scene: string
  language: string
  emotions: string[]
  sampleRate: string[]
}

const props = defineProps<{
  selectedVoice: number
  voiceType: string
  voiceScene: string
  voiceLanguage: string
  autoSwitchLanguage: boolean
  emotionCategory: string
  emotionIntensity: number
  isDark: boolean
}>()

const emit = defineEmits<{
  'update:selectedVoice': [value: number]
  'update:voiceType': [value: string]
  'update:voiceScene': [value: string]
  'update:voiceLanguage': [value: string]
  'update:autoSwitchLanguage': [value: boolean]
  'update:emotionCategory': [value: string]
  'update:emotionIntensity': [value: number]
  'show-emotions': [voice: VoiceOption]
}>()

// 双向绑定
const localSelectedVoice = computed({
  get: () => props.selectedVoice,
  set: (val) => emit('update:selectedVoice', val)
})

const localVoiceType = computed({
  get: () => props.voiceType,
  set: (val) => emit('update:voiceType', val)
})

const localVoiceScene = computed({
  get: () => props.voiceScene,
  set: (val) => emit('update:voiceScene', val)
})

const localVoiceLanguage = computed({
  get: () => props.voiceLanguage,
  set: (val) => emit('update:voiceLanguage', val)
})

const localAutoSwitchLanguage = computed({
  get: () => props.autoSwitchLanguage,
  set: (val) => emit('update:autoSwitchLanguage', val)
})

const localEmotionCategory = computed({
  get: () => props.emotionCategory,
  set: (val) => emit('update:emotionCategory', val)
})

const localEmotionIntensity = computed({
  get: () => props.emotionIntensity,
  set: (val) => emit('update:emotionIntensity', val)
})

// 可用场景列表
const availableScenes = computed(() => {
  const scenes = new Set<string>()
  voicesList.forEach(voice => scenes.add(voice.scene))
  return Array.from(scenes)
})

// 根据筛选条件过滤音色
const filteredVoices = computed(() => {
  return voicesList.filter(voice => {
    if (props.voiceType && voice.type !== props.voiceType) return false
    if (props.voiceScene && voice.scene !== props.voiceScene) return false
    if (props.voiceLanguage && voice.language !== props.voiceLanguage) return false
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
  const selectedVoice = voicesList.find(voice => voice.value === props.selectedVoice)
  return selectedVoice ? selectedVoice.emotions : ['中性']
})

// 过滤后的情感列表
const filteredEmotions = computed(() => {
  if (availableEmotions.value.length === 1) {
    return availableEmotions.value
  }
  return availableEmotions.value.filter(emotion => emotion !== '中性')
})
</script>

<style scoped lang="scss">
.voice-select-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.voice-filters {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.language-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.voice-type {
  display: flex;
  align-items: center;
  gap: 8px;
}

.voice-select {
  flex: 1;
  max-width: 400px;
}

.voice-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.voice-tags {
  display: flex;
  gap: 4px;
}

.emotion-params {
  margin-top: 8px;
}

.emotion-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.emotion-row {
  display: flex;
  gap: 24px;
  align-items: center;
  flex-wrap: wrap;
}

.emotion-type {
  display: flex;
  align-items: center;
  gap: 8px;
}

.emotion-intensity {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 200px;
}

.intensity-slider {
  flex: 1;
  max-width: 200px;
}

.param-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

.auto-detect-switch {
  --el-switch-on-color: #67c23a;
}
</style>
