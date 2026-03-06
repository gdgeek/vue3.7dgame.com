import { ref, Ref, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import type { LanguageCode } from "@/types/language";

export interface LanguageAnalysisData {
  chinesePercentage: number;
  japanesePercentage: number;
  englishPercentage: number;
  otherPercentage: number;
  chineseCount: number;
  japaneseCount: number;
  englishCount: number;
  otherCount: number;
  totalChars: number;
  suggestion: string;
  isMultiLanguage: boolean;
  detectedLanguage: LanguageCode | "";
}

export function useLanguageAnalysis() {
  const { t } = useI18n();

  const languageAnalysis = ref<LanguageAnalysisData>({
    chinesePercentage: 0,
    japanesePercentage: 0,
    englishPercentage: 0,
    otherPercentage: 0,
    chineseCount: 0,
    japaneseCount: 0,
    englishCount: 0,
    otherCount: 0,
    totalChars: 0,
    suggestion: "",
    isMultiLanguage: false,
    detectedLanguage: "",
  });

  let languageDetectionTimer: ReturnType<typeof setTimeout> | null = null;

  onUnmounted(() => {
    if (languageDetectionTimer) {
      clearTimeout(languageDetectionTimer);
      languageDetectionTimer = null;
    }
  });

  const LANG_CODE_TO_I18N_KEY: Record<LanguageCode, string> = {
    zh: "tts.chinese",
    en: "tts.english",
    ja: "tts.japanese",
    other: "",
  };

  const getLangDisplayText = (code: LanguageCode | "") => {
    if (!code || code === "other") return code;
    return t(LANG_CODE_TO_I18N_KEY[code]);
  };

  const updateLanguageSuggestion = () => {
    const { isMultiLanguage, detectedLanguage } = languageAnalysis.value;

    if (!detectedLanguage) return;

    const detectedLanguageText = getLangDisplayText(detectedLanguage);

    if (isMultiLanguage) {
      languageAnalysis.value.suggestion = t("tts.mixedLanguageDetected", [
        detectedLanguageText,
      ]);
    } else {
      languageAnalysis.value.suggestion = t("tts.mainLanguageDetected", [
        detectedLanguageText,
      ]);
    }
  };

  const checkTextLanguage = (
    text: string,
    voiceLanguage: Ref<LanguageCode | string>,
    autoSwitchLanguage: Ref<boolean>
  ) => {
    if (!text) return;

    const chineseRegex = /[\u4e00-\u9fa5]/g;
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF]/g;
    const japaneseKanjiRegex = /[\u4E00-\u9FAF]/g;
    const englishRegex = /[a-zA-Z]/g;

    const chineseCount = (text.match(chineseRegex) || []).length;
    const japaneseKanaCount = (text.match(japaneseRegex) || []).length;
    const japaneseKanjiCount =
      (text.match(japaneseKanjiRegex) || []).length - chineseCount;
    const japaneseCount = japaneseKanaCount + Math.max(0, japaneseKanjiCount);
    const englishCount = (text.match(englishRegex) || []).length;
    const otherCount =
      text.length - (chineseCount + japaneseCount + englishCount);

    const totalChars = text.length;
    const chinesePercentage = (chineseCount / totalChars) * 100;
    const japanesePercentage = (japaneseCount / totalChars) * 100;
    const englishPercentage = (englishCount / totalChars) * 100;
    const otherPercentage =
      100 - chinesePercentage - japanesePercentage - englishPercentage;

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
      suggestion: "",
      isMultiLanguage: false,
      detectedLanguage: "",
    };

    let detectedLanguage: LanguageCode | "" = "";
    let isMultiLanguage = false;
    const maxCount = Math.max(chineseCount, japaneseCount, englishCount);

    if (maxCount > 0) {
      if (chineseCount > 0 && (japaneseCount > 0 || englishCount > 0)) {
        isMultiLanguage = true;
      } else if (japaneseCount > 0 && (chineseCount > 0 || englishCount > 0)) {
        isMultiLanguage = true;
      } else if (englishCount > 0 && (chineseCount > 0 || japaneseCount > 0)) {
        isMultiLanguage = true;
      }

      if (chineseCount >= japaneseCount && chineseCount >= englishCount) {
        detectedLanguage = "zh";
      } else if (
        japaneseCount >= chineseCount &&
        japaneseCount >= englishCount
      ) {
        detectedLanguage = "ja";
      } else {
        detectedLanguage = "en";
      }
    }

    languageAnalysis.value.isMultiLanguage = isMultiLanguage;
    languageAnalysis.value.detectedLanguage = detectedLanguage;

    updateLanguageSuggestion();

    if (isMultiLanguage && text.length > 10) {
      const languageInfo = t("tts.languagePercentage", [
        Math.round(chinesePercentage),
        Math.round(japanesePercentage),
        Math.round(englishPercentage),
      ]);

      if (languageDetectionTimer) {
        clearTimeout(languageDetectionTimer);
      }

      languageDetectionTimer = setTimeout(() => {
        const detectedLanguageText = getLangDisplayText(detectedLanguage);
        ElMessage({
          message: `${languageInfo}，${
            autoSwitchLanguage.value
              ? t("tts.autoSwitched", [detectedLanguageText])
              : t("tts.mixedLanguageDetected", [detectedLanguageText])
          }`,
          type: "warning",
          duration: 5000,
        });
      }, 3000);
    }

    if (autoSwitchLanguage.value) {
      if (
        detectedLanguage &&
        voiceLanguage.value &&
        detectedLanguage !== voiceLanguage.value
      ) {
        const oldLanguageText = getLangDisplayText(voiceLanguage.value as LanguageCode | "");
        voiceLanguage.value = detectedLanguage;
        const newLanguageText = getLangDisplayText(detectedLanguage);
        if (!isMultiLanguage) {
          ElMessage.success(
            t("tts.autoSwitchedLanguage", [oldLanguageText, newLanguageText])
          );
        }
      }

      if (detectedLanguage && !voiceLanguage.value) {
        voiceLanguage.value = detectedLanguage;
        const detectedLanguageText = getLangDisplayText(detectedLanguage);
        if (!isMultiLanguage) {
          ElMessage.success(
            t("tts.autoDetectedLanguage", [detectedLanguageText])
          );
        }
      }
    }

    if (detectedLanguage === "zh" || detectedLanguage === "ja") {
      if (text.length > 150) {
        const detectedLanguageText = getLangDisplayText(detectedLanguage);
        ElMessage.warning(
          t("tts.textLimitWarning", [detectedLanguageText, 150, text.length])
        );
      }
    } else if (detectedLanguage === "en") {
      if (text.length > 500) {
        ElMessage.warning(
          t("tts.textLimitWarning", [t("tts.english"), 500, text.length])
        );
      }
    }
  };

  return {
    languageAnalysis,
    checkTextLanguage,
  };
}
