<template>
  <div class="language-analysis" v-if="visible && text.length > 0">
    <div class="analysis-header">
      <span class="analysis-title">{{ $t('tts.languageAnalysis') }}</span>
      <el-button type="text" size="small" @click="$emit('close')">{{ $t('tts.close') }}</el-button>
    </div>
    <div class="language-analysis-content">
      <div class="language-bars">
        <div class="language-bar-item" v-for="[type, item] in filteredItems" :key="type">
          <div class="bar-label" :class="type">
            {{ item.label }} ({{ Math.round(animatedPercentages[type] || 0) }}% - {{ item.count }}{{
              $t('tts.totalChars')
            }})
          </div>
          <el-progress :percentage="animatedPercentages[type] || 0" :color="getProgressColor(type)" :show-text="false"
            :stroke-width="8" :track-color="isDark ? '#444' : '#e4e7ed'" class="language-progress" />
        </div>
      </div>
      <div class="language-chart" ref="languageChartRef"></div>
    </div>
    <div class="analysis-suggestion" v-if="analysis.suggestion">
      <el-alert :title="analysis.suggestion" type="info" :closable="false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import * as echarts from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { LabelLayout } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'

// 注册ECharts组件
echarts.use([
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  LabelLayout,
  CanvasRenderer
])

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
  isMultiLanguage: boolean
  detectedLanguage: string
}

const props = defineProps<{
  visible: boolean
  text: string
  analysis: LanguageAnalysis
  isDark: boolean
}>()

defineEmits<{
  'close': []
}>()

const { t } = useI18n()

// DOM引用
const languageChartRef = ref<HTMLElement | null>(null)

// 图表实例
let languageChart: echarts.ECharts | null = null

// 动画相关
const animatedPercentages = ref<Record<string, number>>({})
const animationDuration = 1500

// 语言分析项
const languageItems = computed(() => {
  return {
    chinese: {
      label: t('tts.chinese'),
      percentage: props.analysis.chinesePercentage,
      count: props.analysis.chineseCount
    },
    japanese: {
      label: t('tts.japanese'),
      percentage: props.analysis.japanesePercentage,
      count: props.analysis.japaneseCount
    },
    english: {
      label: t('tts.english'),
      percentage: props.analysis.englishPercentage,
      count: props.analysis.englishCount
    },
    other: {
      label: t('tts.other'),
      percentage: props.analysis.otherPercentage,
      count: props.analysis.otherCount
    }
  }
})

const filteredItems = computed(() => {
  return Object.entries(languageItems.value).filter(([_, item]) => item.percentage > 0)
})

// 获取进度条颜色
const getProgressColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    chinese: '#f56c6c',
    japanese: '#67c23a',
    english: '#409eff',
    other: '#909399'
  }
  return colorMap[type] || '#909399'
}

// 缓动函数
const easeOutCubic = (x: number): number => {
  return 1 - Math.pow(1 - x, 3)
}

// 更新动画百分比
const updateAnimatedPercentages = () => {
  const targetPercentages: Record<string, number> = {}
  filteredItems.value.forEach(([type, item]) => {
    targetPercentages[type] = item.percentage
  })

  Object.keys(targetPercentages).forEach(type => {
    if (!(type in animatedPercentages.value)) {
      animatedPercentages.value[type] = 0
    }
  })

  let animationStartTime: number | null = null

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

  requestAnimationFrame(animate)
}

// 更新语言分析图表
const updateLanguageChart = () => {
  if (!languageChartRef.value) return

  if (!languageChart) {
    languageChart = echarts.init(languageChartRef.value)
  } else {
    languageChart.resize()
  }

  const colorMap = {
    '中文': '#f56c6c',
    '日文': '#67c23a',
    '英文': '#409eff',
    '其他': '#909399'
  }

  const chartData = [
    {
      value: props.analysis.chinesePercentage,
      name: t('tts.chinese'),
      itemStyle: { color: colorMap['中文'] },
      count: props.analysis.chineseCount
    },
    {
      value: props.analysis.japanesePercentage,
      name: t('tts.japanese'),
      itemStyle: { color: colorMap['日文'] },
      count: props.analysis.japaneseCount
    },
    {
      value: props.analysis.englishPercentage,
      name: t('tts.english'),
      itemStyle: { color: colorMap['英文'] },
      count: props.analysis.englishCount
    },
    {
      value: props.analysis.otherPercentage,
      name: t('tts.other'),
      itemStyle: { color: colorMap['其他'] },
      count: props.analysis.otherCount
    }
  ].filter(item => item.value > 0)

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
        color: props.isDark ? '#fff' : '#333'
      },
      backgroundColor: props.isDark ? '#1e1e1e' : '#fff',
      borderColor: props.isDark ? '#444' : '#ddd'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      textStyle: {
        color: props.isDark ? '#e0e0e0' : '#606266'
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
          borderColor: props.isDark ? '#1e1e1e' : '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center',
          color: props.isDark ? '#e0e0e0' : '#606266'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '20',
            fontWeight: 'bold',
            color: props.isDark ? '#e0e0e0' : '#606266'
          }
        },
        labelLine: {
          show: false
        },
        data: chartData
      }
    ]
  }

  languageChart.setOption(option)
}

// 监听 analysis 变化
watch(() => props.analysis, () => {
  if (props.visible) {
    updateAnimatedPercentages()
    nextTick(() => {
      updateLanguageChart()
    })
  }
}, { deep: true })

// 监听 visible 变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    nextTick(() => {
      updateAnimatedPercentages()
      updateLanguageChart()
    })
  }
})

// 窗口大小变化时重新绘制图表
const handleResize = () => {
  if (languageChart) {
    languageChart.resize()
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  if (props.visible) {
    nextTick(() => {
      updateAnimatedPercentages()
      updateLanguageChart()
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (languageChart) {
    languageChart.dispose()
    languageChart = null
  }
})
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

.language-chart {
  width: 150px;
  height: 150px;
}

.analysis-suggestion {
  margin-top: 12px;
}
</style>
