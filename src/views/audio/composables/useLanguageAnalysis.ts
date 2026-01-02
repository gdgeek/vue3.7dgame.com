import { ref, Ref } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";

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
  detectedLanguage: string;
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

  let languageDetectionTimer: number | null = null;

  const updateLanguageSuggestion = () => {
    const { isMultiLanguage, detectedLanguage } = languageAnalysis.value;

    if (!detectedLanguage) return;

    if (isMultiLanguage) {
      const detectedLanguageText =
        detectedLanguage === "中文"
          ? t("tts.chinese")
          : detectedLanguage === "英文"
            ? t("tts.english")
            : detectedLanguage === "日文"
              ? t("tts.japanese")
              : detectedLanguage;
      languageAnalysis.value.suggestion = t("tts.mixedLanguageDetected", [
        detectedLanguageText,
      ]);
    } else {
      const detectedLanguageText =
        detectedLanguage === "中文"
          ? t("tts.chinese")
          : detectedLanguage === "英文"
            ? t("tts.english")
            : detectedLanguage === "日文"
              ? t("tts.japanese")
              : detectedLanguage;
      languageAnalysis.value.suggestion = t("tts.mainLanguageDetected", [
        detectedLanguageText,
      ]);
    }
  };

  const checkTextLanguage = (
    text: string,
    voiceLanguage: Ref<string>,
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

    let detectedLanguage = "";
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
        detectedLanguage = "中文";
      } else if (
        japaneseCount >= chineseCount &&
        japaneseCount >= englishCount
      ) {
        detectedLanguage = "日文";
      } else {
        detectedLanguage = "英文";
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
        window.clearTimeout(languageDetectionTimer);
      }

      languageDetectionTimer = window.setTimeout(() => {
        const detectedLanguageText =
          detectedLanguage === "中文"
            ? t("tts.chinese")
            : detectedLanguage === "英文"
              ? t("tts.english")
              : detectedLanguage === "日文"
                ? t("tts.japanese")
                : detectedLanguage;
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
        const oldLanguage = voiceLanguage.value;
        const oldLanguageText =
          oldLanguage === "中文"
            ? t("tts.chinese")
            : oldLanguage === "英文"
              ? t("tts.english")
              : oldLanguage === "日文"
                ? t("tts.japanese")
                : oldLanguage;
        voiceLanguage.value = detectedLanguage;
        const newLanguageText =
          detectedLanguage === "中文"
            ? t("tts.chinese")
            : detectedLanguage === "英文"
              ? t("tts.english")
              : detectedLanguage === "日文"
                ? t("tts.japanese")
                : detectedLanguage;
        if (!isMultiLanguage) {
          ElMessage.success(
            t("tts.autoSwitchedLanguage", [oldLanguageText, newLanguageText])
          );
        }
      }

      if (detectedLanguage && !voiceLanguage.value) {
        voiceLanguage.value = detectedLanguage;
        const detectedLanguageText =
          detectedLanguage === "中文"
            ? t("tts.chinese")
            : detectedLanguage === "英文"
              ? t("tts.english")
              : detectedLanguage === "日文"
                ? t("tts.japanese")
                : detectedLanguage;
        if (!isMultiLanguage) {
          ElMessage.success(
            t("tts.autoDetectedLanguage", [detectedLanguageText])
          );
        }
      }
    }

    if (detectedLanguage === "中文" || detectedLanguage === "日文") {
      if (text.length > 150) {
        const detectedLanguageText =
          detectedLanguage === "中文" ? t("tts.chinese") : t("tts.japanese");
        ElMessage.warning(
          t("tts.textLimitWarning", [detectedLanguageText, 150, text.length])
        );
      }
    } else if (detectedLanguage === "英文") {
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
