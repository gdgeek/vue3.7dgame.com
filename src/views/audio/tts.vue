<template>
  <TransitionWrapper>
    <div class="tencent-tts">
      <div class="main-content">
        <!-- 语音选择器组件 -->
        <VoiceSelector
          v-model:selected-voice="selectedVoiceType"
          v-model:voice-type="voiceType"
          v-model:voice-scene="voiceScene"
          v-model:voice-language="voiceLanguage"
          v-model:auto-switch-language="autoSwitchLanguage"
          v-model:emotion-category="emotionCategory"
          v-model:emotion-intensity="emotionIntensity"
          :available-scenes="availableScenes"
          :grouped-voices="groupedVoices"
          :available-emotions="availableEmotions"
          :filtered-emotions="filteredEmotions"
          :is-dark="isDark"
          @show-emotions="showEmotions"
        ></VoiceSelector>

        <!-- TTS 参数控制组件 -->
        <TTSParams
          v-model:volume="volume"
          v-model:speed="speed"
          v-model:codec="codec"
          v-model:sample-rate="sampleRate"
          :support-high-sample-rate="supportHighSampleRate"
        ></TTSParams>

        <div class="input-section">
          <div class="tag-actions-container">
            <div
              class="language-tag"
              v-if="
                voiceLanguage ||
                (!autoSwitchLanguage && languageAnalysis.suggestion)
              "
            >
              <template v-if="voiceLanguage">
                <el-tag
                  :type="
                    voiceLanguage === '中文'
                      ? 'danger'
                      : voiceLanguage === '日文'
                        ? 'success'
                        : 'primary'
                  "
                  effect="dark"
                >
                  {{
                    voiceLanguage === "中文"
                      ? t("tts.chinese")
                      : voiceLanguage === "英文"
                        ? t("tts.english")
                        : voiceLanguage === "日文"
                          ? t("tts.japanese")
                          : voiceLanguage
                  }}
                </el-tag>
                <span class="limit-info">
                  {{ getLanguageLimitText }}
                  <template
                    v-if="
                      !autoSwitchLanguage &&
                      languageAnalysis.suggestion &&
                      !voiceLanguage
                    "
                  >
                    ({{ languageAnalysis.suggestion }})
                  </template>
                  <template v-if="text.length > 0">
                    - {{ t("tts.totalChars") }}：{{
                      languageAnalysis.totalChars
                    }}
                  </template>
                </span>
              </template>
              <template v-else>
                <span class="limit-info">{{
                  languageAnalysis.suggestion
                }}</span>
              </template>
            </div>

            <div class="text-actions" v-if="text.length > 0">
              <el-button
                type="text"
                size="small"
                @click="showLanguageAnalysis = !showLanguageAnalysis"
              >
                {{
                  showLanguageAnalysis
                    ? t("tts.hideLanguageAnalysis")
                    : t("tts.showLanguageAnalysis")
                }}
              </el-button>
            </div>
          </div>

          <!-- 语言分析组件 -->
          <LanguageAnalysis
            :visible="showLanguageAnalysis"
            :text="text"
            :analysis="languageAnalysis"
            :is-dark="isDark"
            @close="showLanguageAnalysis = false"
          ></LanguageAnalysis>

          <div class="text-area-container">
            <div
              class="text-container"
              ref="textContainerRef"
              v-show="isPlaying"
            >
              <div v-if="!text" class="empty-text">
                {{ t("tts.inputPlaceholder") }}
              </div>
              <template v-else>
                <span class="highlighted-text">{{ highlightedText }}</span>
                <span class="normal-text">{{ normalText }}</span>
              </template>
            </div>
            <el-input
              id="word"
              type="textarea"
              :placeholder="
                voiceLanguage === '中文'
                  ? t('tts.inputChinesePlaceholder')
                  : voiceLanguage === '英文'
                    ? t('tts.inputEnglishPlaceholder')
                    : voiceLanguage === '日文'
                      ? t('tts.inputJapanesePlaceholder')
                      : t('tts.inputPlaceholder')
              "
              v-model="text"
              :maxlength="voiceLanguage === '英文' ? 500 : 150"
              :rows="4"
              show-word-limit
              :disabled="isLoading"
              @input="onTextInput"
              v-show="!isPlaying"
            ></el-input>
          </div>
        </div>

        <div class="preview-section" v-if="audioUrl">
          <audio
            :src="audioUrl"
            controls
            class="audio-player"
            ref="audioPlayerRef"
            @play="onAudioPlayerPlay"
            @pause="onAudioPlayerPause"
            @ended="onAudioPlayerEnded"
          ></audio>
        </div>

        <div class="action-section">
          <el-button
            type="primary"
            size="large"
            @click="synthesizeSpeech"
            :loading="isLoading"
            class="action-button"
          >
            {{ isLoading ? t("tts.synthesizing") : t("tts.synthesize") }}
          </el-button>
          <el-button
            type="success"
            size="large"
            @click="uploadAudio"
            :loading="isUploading"
            :disabled="!currentAudioBlob"
            class="action-button upload-button"
          >
            {{ isUploading ? t("tts.uploading") : t("tts.upload") }}
          </el-button>
        </div>

        <div class="tips-section">
          <el-alert
            :title="t('tts.tips')"
            type="info"
            :description="t('tts.tipsContent')"
            :closable="false"
            show-icon
            class="tips-alert"
          ></el-alert>
        </div>
      </div>

      <!-- 情感列表对话框 -->
      <el-dialog
        :title="t('tts.selectEmotion')"
        v-model="emotionsDialogVisible"
        width="30%"
        :close-on-click-modal="true"
        :close-on-press-escape="true"
      >
        <div class="emotions-list">
          <el-tag
            v-for="emotion in selectedVoiceEmotions"
            :key="emotion"
            class="emotion-tag"
            :type="emotion === emotionCategory ? 'primary' : 'info'"
            @click="selectEmotion(emotion)"
            :effect="emotion === emotionCategory ? 'light' : 'plain'"
          >
            {{ emotion }}
          </el-tag>
        </div>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="emotionsDialogVisible = false">{{
              t("tts.cancel")
            }}</el-button>
            <el-button type="primary" @click="confirmEmotionSelection">{{
              t("tts.confirm")
            }}</el-button>
          </span>
        </template>
      </el-dialog>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";

import { useSettingsStore } from "@/store";
import { ThemeEnum } from "@/enums/ThemeEnum";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import VoiceSelector from "./components/VoiceSelector.vue";
import TTSParams from "./components/TTSParams.vue";
import LanguageAnalysis from "./components/LanguageAnalysis.vue";

import {
  useVoiceSelection,
  VoiceOption,
} from "./composables/useVoiceSelection";
import { useLanguageAnalysis } from "./composables/useLanguageAnalysis";
import { useTTS } from "./composables/useTTS";

const { t } = useI18n();
const settingsStore = useSettingsStore();

const isDark = computed<boolean>(() => settingsStore.theme === ThemeEnum.DARK);

// Text State
const text = ref("");
const showLanguageAnalysis = ref(false);

// Composables
const {
  selectedVoiceType,
  voiceType,
  voiceScene,
  voiceLanguage,
  autoSwitchLanguage,
  emotionCategory,
  emotionIntensity,
  availableScenes,
  groupedVoices,
  availableEmotions,
  filteredEmotions,
  supportHighSampleRate,
  voiceType: voiceTypeRef, // Alias if needed, or use struct desc
} = useVoiceSelection();

const { languageAnalysis, checkTextLanguage } = useLanguageAnalysis();

// Initialize useTTS with refs from other composables
const volume = ref(0);
const speed = ref(0);
const codec = ref("mp3");
const sampleRate = ref(16000);

const {
  isLoading,
  isUploading,
  isPlaying,
  audioUrl,
  currentAudioBlob,
  audioPlayerRef,
  textContainerRef,
  highlightedText,
  normalText,
  synthesizeSpeech,
  uploadAudio,
  onTextInput: handleTextInput, // Rename to avoid conflict if any
  onAudioPlayerPlay,
  onAudioPlayerPause,
  onAudioPlayerEnded,
} = useTTS({
  text,
  volume,
  speed,
  selectedVoiceType,
  codec,
  sampleRate,
  voiceLanguage,
  voiceType,
  emotionCategory,
  emotionIntensity,
  checkTextLanguage: () =>
    checkTextLanguage(text.value, voiceLanguage, autoSwitchLanguage),
});

// Dialog State (UI concern)
const emotionsDialogVisible = ref(false);
const selectedVoiceEmotions = ref<string[]>([]);

// UI Methods
const showEmotions = (voice: VoiceOption) => {
  selectedVoiceEmotions.value = voice.emotions;
  emotionsDialogVisible.value = true;
};

const selectEmotion = (emotion: string) => {
  emotionCategory.value = emotion;
};

const confirmEmotionSelection = () => {
  emotionsDialogVisible.value = false;
};

// Handler wrapper to update local state logic if needed
const onTextInput = () => {
  handleTextInput();
};

// Derived UI Computeds
const getLanguageLimitText = computed(() => {
  switch (voiceLanguage.value) {
    case "中文":
      return t("tts.chineseLimit");
    case "英文":
      return t("tts.englishLimit");
    case "日文":
      return t("tts.japaneseLimit");
    default:
      return t("tts.selectLanguageFirst");
  }
});
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
  box-shadow: v-bind(
    'isDark ? "0 4px 20px rgba(0, 0, 0, 0.2)" : "0 4px 20px rgba(0, 0, 0, 0.05)"'
  );
  color: v-bind('isDark ? "#e0e0e0" : "inherit"');
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    box-shadow 0.3s ease;
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

  .tag-actions-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .language-tag {
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

  .text-actions {
    display: flex;
    align-items: center;
  }

  // 语言分析组件
  .language-analysis {
    position: relative;
    margin: 0 0 1rem;
    padding: 1rem;
    border-radius: 8px;
    background-color: v-bind('isDark ? "#2a2a2a" : "#f5f7fa"');
    border: 1px solid v-bind('isDark ? "#444" : "#e4e7ed"');
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0;
    transform: translateY(-10px);
    animation: slideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    z-index: 10;
    box-shadow: none;

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
          content: "";
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
        box-shadow: none;
        border: 1px solid v-bind('isDark ? "#444" : "#e4e7ed"');
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
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
              90deg,
              rgba(255, 255, 255, 0) 0%,
              rgba(255, 255, 255, 0.1) 50%,
              rgba(255, 255, 255, 0) 100%
            );
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

      :deep(.el-alert) {
        box-shadow: none;
        border: 1px solid v-bind('isDark ? "#444" : "#e4e7ed"');
      }
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

  .text-area-container {
    position: relative;
    width: 100%;
    height: 150px;
  }

  .text-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow-y: auto;
    padding: 1rem;
    border-radius: 12px;
    background-color: v-bind('isDark ? "#2c2c2c" : "#fff"');
    border: 1px solid v-bind('isDark ? "#444" : "#dcdfe6"');
    font-size: 1rem;
    line-height: 1.5;
    scroll-behavior: smooth;
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

  :deep(.el-textarea) {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  :deep(.el-textarea__inner) {
    border-radius: 12px;
    padding: 1rem;
    font-size: 1rem;
    border: 1px solid v-bind('isDark ? "#444" : "#dcdfe6"');
    background-color: v-bind('isDark ? "#2c2c2c" : "#fff"');
    color: v-bind('isDark ? "#e0e0e0" : "#606266"');
    transition: all 0.3s ease;
    height: 100% !important; // 强制高度为100%
    resize: none; // 禁止用户调整大小

    &:focus {
      border-color: #409eff;
      box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
    }

    &::placeholder {
      color: v-bind('isDark ? "#777" : "#999"');
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
    min-height: 54px;
  }
}

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
