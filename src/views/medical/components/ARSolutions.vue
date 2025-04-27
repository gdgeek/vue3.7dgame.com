<template>
  <div class="ar-solutions-section" :class="{ 'dark-theme': isDark }">
    <div class="section-container">
      <!-- 标题区域 -->
      <div class="section-header" data-aos="fade-up">
        <h2 class="section-title">AR医疗创新</h2>
        <div class="section-divider"></div>
        <p class="section-subtitle">突破传统医疗边界，构建智能医疗新体验</p>
      </div>

      <!-- 解决方案展示区 -->
      <div class="solutions-grid">
        <div v-for="(solution, index) in arSolutions" :key="solution.id" class="solution-card" data-aos="fade-up"
          :data-aos-delay="index * 100">
          <div class="solution-icon">
            <el-icon>
              <component :is="solution.icon" />
            </el-icon>
          </div>
          <h3 class="solution-title">{{ solution.title }}</h3>
          <p class="solution-description">{{ solution.description }}</p>
          <ul class="solution-features">
            <li v-for="(feature, i) in solution.features" :key="i">{{ feature }}</li>
          </ul>
        </div>
      </div>

      <!-- 核心数据展示 -->
      <div class="stats-section" data-aos="fade-up">
        <div class="stats-header">
          <h3>技术指标</h3>
          <p>精确衡量AR医疗技术带来的价值</p>
        </div>
        <div class="stats-grid">
          <div v-for="(stat, index) in techStats" :key="index" class="stat-card" data-aos="zoom-in"
            :data-aos-delay="index * 100">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </div>

      <!-- 案例研究 -->
      <div class="case-study" data-aos="fade-up">
        <div class="case-content">
          <h3>上海仁爱医院AR手术导航系统</h3>
          <p>通过AR技术，外科医生可以在手术过程中实时查看患者内部结构的3D模型，精确定位病灶位置，显著提高手术成功率。</p>
          <div class="case-metrics">
            <div class="case-metric">
              <span class="metric-value">40%</span>
              <span class="metric-label">手术时间缩短</span>
            </div>
            <div class="case-metric">
              <span class="metric-value">95%</span>
              <span class="metric-label">医生满意度</span>
            </div>
          </div>
          <el-button type="primary" plain>查看详细案例</el-button>
        </div>
        <div class="case-image" data-aos="fade-left">
          <img
            src="https://images.unsplash.com/photo-1581595219315-a187dd40c322?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
            alt="AR手术导航系统" />
        </div>
      </div>

      <!-- 咨询区域 -->
      <div class="cta-section" data-aos="fade-up">
        <h3>体验AR医疗技术的未来</h3>
        <p>联系我们获取专业咨询与演示</p>
        <el-button type="primary" size="large" @click="openLoginDialog">预约演示</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSettingsStore } from '@/store/modules/settings';
import {
  FirstAidKit,
  User,
  EditPen,
  Monitor,
  TrendCharts,
  CreditCard,
  MagicStick,
  Clock
} from '@element-plus/icons-vue';

// 获取主题设置
const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === 'dark');

// 发送打开登录对话框事件
const emit = defineEmits(['openLogin']);
const openLoginDialog = () => {
  emit('openLogin');
};

// AR医疗解决方案
const arSolutions = [
  {
    id: 1,
    title: '手术导航',
    description: '为外科医生提供实时手术指导和三维可视化，精确定位手术部位，减少手术风险。',
    icon: 'FirstAidKit',
    features: [
      '亚毫米级精度定位',
      '实时手术路径导航',
      '三维解剖结构可视化'
    ]
  },
  {
    id: 2,
    title: '智能牙科',
    description: '结合3D口腔扫描与AR技术，实现精确诊断和治疗方案，提升患者体验。',
    icon: 'User',
    features: [
      '牙齿精确三维建模',
      '治疗方案虚拟预览',
      '植牙精确定位辅助'
    ]
  },
  {
    id: 3,
    title: '医学教育',
    description: '提供互动式医学教育平台，通过AR技术让学习者深入理解人体结构。',
    icon: 'EditPen',
    features: [
      '虚拟人体解剖学习',
      '手术流程虚拟演练',
      '远程协作指导培训'
    ]
  },
  {
    id: 4,
    title: '康复训练',
    description: '康复训练系统结合AR技术，为患者提供互动式康复指导和实时反馈。',
    icon: 'Monitor',
    features: [
      '康复动作实时指导',
      '训练数据可视化',
      '远程医师监督指导'
    ]
  }
];

// 技术统计数据
const techStats = [
  {
    value: '99.7%',
    label: '定位精确度'
  },
  {
    value: '40%',
    label: '手术时间缩短'
  },
  {
    value: '30%',
    label: '学习效率提升'
  },
  {
    value: '95%',
    label: '用户满意度'
  }
];
</script>

<style scoped>
.ar-solutions-section {
  padding: 90px 0;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
}

.dark-theme.ar-solutions-section {
  background-color: var(--el-bg-color-darker, #1e1e24);
}

.section-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* 标题样式 */
.section-header {
  text-align: center;
  margin-bottom: 70px;
}

.section-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 20px;
  background: linear-gradient(90deg, #3a7bd5, #00d2ff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-block;
}

.section-divider {
  width: 60px;
  height: 4px;
  background: linear-gradient(90deg, #3a7bd5, #00d2ff);
  margin: 0 auto 20px;
  border-radius: 2px;
}

.section-subtitle {
  font-size: 1.2rem;
  color: var(--el-text-color-secondary);
  max-width: 600px;
  margin: 0 auto;
}

/* 解决方案卡片样式 */
.solutions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 30px;
  margin-bottom: 80px;
}

.solution-card {
  background-color: var(--el-bg-color-overlay);
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.solution-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.1);
}

.solution-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, var(--el-color-primary-light-7), var(--el-color-primary));
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
  margin-bottom: 20px;
}

.solution-title {
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 15px;
  color: var(--el-text-color-primary);
}

.solution-description {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
  margin-bottom: 20px;
  flex-grow: 1;
}

.solution-features {
  padding: 0;
  margin: 0;
  list-style-type: none;
}

.solution-features li {
  position: relative;
  padding-left: 20px;
  margin-bottom: 10px;
  font-size: 0.9rem;
  color: var(--el-text-color-regular);
}

.solution-features li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: var(--el-color-primary);
  font-weight: bold;
}

/* 统计区域样式 */
.stats-section {
  margin-bottom: 80px;
  padding: 60px 40px;
  background-color: var(--el-color-primary-light-9);
  border-radius: 20px;
  position: relative;
  overflow: hidden;
}

.dark-theme .stats-section {
  background-color: rgba(0, 100, 150, 0.1);
}

.stats-header {
  text-align: center;
  margin-bottom: 40px;
}

.stats-header h3 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 10px;
  color: var(--el-text-color-primary);
}

.stats-header p {
  font-size: 1.1rem;
  color: var(--el-text-color-secondary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 30px;
}

.stat-card {
  text-align: center;
  padding: 20px;
  background-color: var(--el-bg-color);
  border-radius: 12px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.05);
}

.stat-value {
  font-size: 2.8rem;
  font-weight: 700;
  color: var(--el-color-primary);
  margin-bottom: 5px;
  background: linear-gradient(90deg, #3a7bd5, #00d2ff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.stat-label {
  font-size: 1rem;
  color: var(--el-text-color-secondary);
}

/* 案例研究区域 */
.case-study {
  display: flex;
  gap: 50px;
  margin-bottom: 80px;
  align-items: center;
}

.case-content {
  flex: 1;
}

.case-content h3 {
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: var(--el-text-color-primary);
}

.case-content p {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
  margin-bottom: 30px;
}

.case-metrics {
  display: flex;
  gap: 40px;
  margin-bottom: 30px;
}

.case-metric {
  display: flex;
  flex-direction: column;
}

.metric-value {
  font-size: 2.2rem;
  font-weight: 700;
  color: var(--el-color-primary);
}

.metric-label {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
}

.case-image {
  flex: 1;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.case-image img {
  width: 100%;
  height: 350px;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.case-image:hover img {
  transform: scale(1.05);
}

/* CTA区域样式 */
.cta-section {
  padding: 60px;
  background: linear-gradient(135deg, #3a7bd5, #00d2ff);
  border-radius: 20px;
  text-align: center;
  color: white;
}

.dark-theme .cta-section {
  background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
}

.cta-section h3 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 15px;
}

.cta-section p {
  font-size: 1.1rem;
  margin-bottom: 30px;
  opacity: 0.9;
}

/* 响应式调整 */
@media (max-width: 992px) {
  .case-study {
    flex-direction: column;
  }

  .section-title {
    font-size: 2.5rem;
  }

  .stats-section {
    padding: 40px 20px;
  }
}

@media (max-width: 768px) {
  .ar-solutions-section {
    padding: 60px 0;
  }

  .section-title {
    font-size: 2.2rem;
  }

  .case-content h3 {
    font-size: 1.6rem;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .cta-section {
    padding: 40px 20px;
  }

  .cta-section h3 {
    font-size: 1.7rem;
  }
}

@media (max-width: 576px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .case-metrics {
    flex-direction: column;
    gap: 20px;
  }
}
</style>