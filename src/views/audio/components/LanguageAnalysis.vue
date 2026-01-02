<template>
  <div class="language-analysis" v-if="visible && text.length > 0">
    <div class="analysis-header">
      <span class="analysis-title">{{ $t("tts.languageAnalysis") }}</span>
      <el-button type="text" size="small" @click="$emit('close')">{{
        $t("tts.close")
      }}</el-button>
    </div>
    <div class="language-analysis-content">
      <div class="language-bars">
        <div
          class="language-bar-item"
          v-for="[type, item] in filteredItems"
          :key="type"
        >
          <div class="bar-label" :class="type">
            {{ item.label }} ({{ Math.round(animatedPercentages[type] || 0) }}%
            - {{ item.count }}{{ $t("tts.totalChars") }})
          </div>
          <el-progress
            :percentage="animatedPercentages[type] || 0"
            :color="getProgressColor(type)"
            :show-text="false"
            :stroke-width="8"
            :track-color="isDark ? '#444' : '#e4e7ed'"
            class="language-progress"
          ></el-progress>
        </div>
      </div>
    </div>
    <div class="analysis-suggestion" v-if="analysis.suggestion">
      <el-alert
        :title="analysis.suggestion"
        type="info"
        :closable="false"
      ></el-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";

interface LanguageAnalysis {
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

const props = defineProps<{
  visible: boolean;
  text: string;
  analysis: LanguageAnalysis;
  isDark: boolean;
}>();

defineEmits<{
  close: [];
}>();

const { t } = useI18n();

// 动画相关
const animatedPercentages = ref<Record<string, number>>({});
const animationDuration = 1500;

// 语言分析项
const languageItems = computed(() => {
  return {
    chinese: {
      label: t("tts.chinese"),
      percentage: props.analysis.chinesePercentage,
      count: props.analysis.chineseCount,
    },
    japanese: {
      label: t("tts.japanese"),
      percentage: props.analysis.japanesePercentage,
      count: props.analysis.japaneseCount,
    },
    english: {
      label: t("tts.english"),
      percentage: props.analysis.englishPercentage,
      count: props.analysis.englishCount,
    },
    other: {
      label: t("tts.other"),
      percentage: props.analysis.otherPercentage,
      count: props.analysis.otherCount,
    },
  };
});

const filteredItems = computed(() => {
  return Object.entries(languageItems.value).filter(
    ([_, item]) => item.percentage > 0
  );
});

// 获取进度条颜色
const getProgressColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    chinese: "#f56c6c",
    japanese: "#67c23a",
    english: "#409eff",
    other: "#909399",
  };
  return colorMap[type] || "#909399";
};

// 缓动函数
const easeOutCubic = (x: number): number => {
  return 1 - Math.pow(1 - x, 3);
};

// 更新动画百分比
const updateAnimatedPercentages = () => {
  const targetPercentages: Record<string, number> = {};
  filteredItems.value.forEach(([type, item]) => {
    targetPercentages[type] = item.percentage;
  });

  Object.keys(targetPercentages).forEach((type) => {
    if (!(type in animatedPercentages.value)) {
      animatedPercentages.value[type] = 0;
    }
  });

  let animationStartTime: number | null = null;

  const animate = (timestamp: number) => {
    if (!animationStartTime) {
      animationStartTime = timestamp;
    }

    const progress = Math.min(
      (timestamp - animationStartTime) / animationDuration,
      1
    );
    const easeProgress = easeOutCubic(progress);

    Object.keys(targetPercentages).forEach((type) => {
      const target = targetPercentages[type];
      const start = animatedPercentages.value[type] || 0;
      animatedPercentages.value[type] = start + (target - start) * easeProgress;
    });

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };

  requestAnimationFrame(animate);
};

// 监听 analysis 变化
watch(
  () => props.analysis,
  () => {
    if (props.visible) {
      updateAnimatedPercentages();
    }
  },
  { deep: true }
);

// 监听 visible 变化
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      nextTick(() => {
        updateAnimatedPercentages();
      });
    }
  }
);

onMounted(() => {
  if (props.visible) {
    nextTick(() => {
      updateAnimatedPercentages();
    });
  }
});
</script>

<style scoped lang="scss">
.language-analysis {
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.analysis-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.language-analysis-content {
  display: flex;
  gap: 20px;
}

.language-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.language-bar-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bar-label {
  font-size: 12px;
  color: var(--el-text-color-regular);

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

.analysis-suggestion {
  margin-top: 12px;
}
</style>
