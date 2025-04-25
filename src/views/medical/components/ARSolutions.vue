<template>
  <div class="ar-solutions-section" :class="{ 'dark-theme': isDark }">
    <div class="section-header" data-aos="fade-up">
      <h2 class="section-title">AR医疗创新应用</h2>
      <p class="section-subtitle">通过增强现实技术为医疗行业带来全新体验</p>
      <div class="section-divider"></div>
    </div>

    <div class="solutions-container">
      <div v-for="(solution, index) in arSolutions" :key="solution.id" class="solution-card"
        :data-aos="index % 2 === 0 ? 'fade-right' : 'fade-left'" :data-aos-delay="200 + index * 100">
        <div class="solution-image">
          <img :src="solution.image" :alt="solution.title" />
          <div class="solution-overlay">
            <div class="overlay-icon">
              <el-icon>
                <component :is="solution.icon" />
              </el-icon>
            </div>
          </div>
        </div>
        <div class="solution-content">
          <h3 class="solution-title">{{ solution.title }}</h3>
          <p class="solution-description">{{ solution.description }}</p>
          <ul class="solution-features">
            <li v-for="(feature, i) in solution.features" :key="i">
              <el-icon>
                <Check />
              </el-icon>
              <span>{{ feature }}</span>
            </li>
          </ul>
          <el-button type="primary" plain>了解更多</el-button>
        </div>
      </div>
    </div>

    <div class="benefits-section" data-aos="fade-up">
      <div class="benefits-header">
        <h3>AR医疗技术的优势</h3>
        <p>增强现实技术正在改变医疗行业的多个方面</p>
      </div>

      <div class="benefits-container">
        <div v-for="(benefit, index) in arBenefits" :key="index" class="benefit-card" data-aos="zoom-in"
          :data-aos-delay="index * 100">
          <div class="benefit-icon">
            <el-icon>
              <component :is="benefit.icon" />
            </el-icon>
          </div>
          <h4 class="benefit-title">{{ benefit.title }}</h4>
          <p class="benefit-description">{{ benefit.description }}</p>
        </div>
      </div>
    </div>

    <div class="tech-stats-section" data-aos="fade-up">
      <div class="stats-container">
        <div v-for="(stat, index) in techStats" :key="index" class="stat-item" data-aos="fade-up"
          :data-aos-delay="index * 100">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <div class="cta-container" data-aos="fade-up">
      <div class="cta-content">
        <h3>准备好探索AR医疗技术了吗？</h3>
        <p>联系我们，了解如何将AR技术应用到您的医疗实践中</p>
        <el-button type="primary" size="large" @click="openLoginDialog">预约咨询</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSettingsStore } from '@/store/modules/settings';
import {
  FirstAidKit,
  Monitor,
  User,
  EditPen,
  Connection,
  Check,
  TrendCharts,
  CreditCard,
  MagicStick,
  Clock,
  StarFilled,
  Medal
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
    title: '手术规划与导航',
    description: '通过AR技术为外科医生提供实时手术指导和视觉辅助，减少手术风险，提高精确度。',
    image: 'https://img.freepik.com/free-photo/robot-processor-working-ar-operation_23-2149326486.jpg',
    icon: 'FirstAidKit',
    features: [
      '三维解剖结构可视化',
      '实时手术路径导航',
      '手术器械追踪定位',
      '术中数据实时显示'
    ]
  },
  {
    id: 2,
    title: '牙科AR治疗系统',
    description: '为牙医提供实时口腔扫描和增强现实可视化，提高治疗精度和患者体验。',
    image: 'https://img.freepik.com/free-photo/dentist-treating-patient-teeth_107420-65844.jpg',
    icon: 'User',
    features: [
      '口腔3D实时扫描',
      '治疗过程虚拟预览',
      '植牙精确定位辅助',
      '患者教育可视化工具'
    ]
  },
  {
    id: 3,
    title: '医学教育与培训',
    description: '提供互动式AR医学教育平台，让学习者通过三维模型深入理解人体结构和医疗程序。',
    image: 'https://img.freepik.com/free-photo/medical-students-using-vr-headset_23-2149351862.jpg',
    icon: 'EditPen',
    features: [
      '交互式人体解剖学习',
      '手术流程虚拟演练',
      '远程协作指导培训',
      '医学案例沉浸式体验'
    ]
  },
  {
    id: 4,
    title: '患者康复辅助系统',
    description: '结合AR技术的康复训练系统，为患者提供互动式康复指导和实时反馈。',
    image: 'https://img.freepik.com/free-photo/therapist-assisting-patient-with-physical-therapy-exercise_107420-62893.jpg',
    icon: 'Monitor',
    features: [
      '康复动作实时指导',
      '训练数据可视化分析',
      '个性化康复计划生成',
      '远程医生监督指导'
    ]
  }
];

// AR医疗技术优势
const arBenefits = [
  {
    icon: 'TrendCharts',
    title: '提高手术精确度',
    description: '通过AR导航和虚拟标记，手术精确度提高至亚毫米级别。'
  },
  {
    icon: 'CreditCard',
    title: '减少医疗成本',
    description: '减少手术并发症和二次手术需求，降低整体医疗成本。'
  },
  {
    icon: 'MagicStick',
    title: '改善患者体验',
    description: '通过视觉化解释和治疗预览，增强患者理解和治疗参与度。'
  },
  {
    icon: 'Clock',
    title: '缩短手术时间',
    description: '提高手术效率，减少病人麻醉时间和住院时间。'
  },
  {
    icon: 'StarFilled',
    title: '增强学习效果',
    description: '通过沉浸式AR学习，提高医学生和医生的学习效率。'
  },
  {
    icon: 'Medal',
    title: '远程医疗协作',
    description: '实现专家远程实时指导，打破地理限制。'
  }
];

// 技术统计数据
const techStats = [
  {
    value: '95%',
    label: '诊断准确率提升'
  },
  {
    value: '30%',
    label: '手术时间缩短'
  },
  {
    value: '80%',
    label: '患者满意度'
  },
  {
    value: '60%',
    label: '学习效率提升'
  }
];
</script>

<style scoped>
.ar-solutions-section {
  padding: 100px 0;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
}

.dark-theme.ar-solutions-section {
  background-color: var(--el-bg-color-darker, #1e1e24);
}

.section-header {
  text-align: center;
  margin-bottom: 60px;
}

.section-title {
  font-size: 2.8rem;
  font-weight: 700;
  margin-bottom: 15px;
  background: linear-gradient(90deg, #36d1dc, #5b86e5);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-block;
}

.section-subtitle {
  font-size: 1.2rem;
  color: var(--el-text-color-secondary);
  max-width: 700px;
  margin: 0 auto 20px;
}

.section-divider {
  width: 80px;
  height: 4px;
  background: linear-gradient(90deg, #36d1dc, #5b86e5);
  margin: 0 auto;
  border-radius: 2px;
}

.solutions-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 80px;
}

.solution-card {
  display: flex;
  align-items: center;
  gap: 40px;
}

.solution-card:nth-child(even) {
  flex-direction: row-reverse;
}

.solution-image {
  flex: 1;
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.solution-image:hover {
  transform: translateY(-10px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.solution-image img {
  width: 100%;
  height: 350px;
  object-fit: cover;
  display: block;
  transition: transform 0.5s ease;
}

.solution-image:hover img {
  transform: scale(1.05);
}

.solution-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0) 60%);
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 20px;
}

.overlay-icon {
  background-color: var(--el-color-primary);
  color: white;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.solution-content {
  flex: 1;
}

.solution-title {
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 15px;
  color: var(--el-text-color-primary);
}

.solution-description {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
  margin-bottom: 20px;
}

.solution-features {
  padding: 0;
  margin: 0 0 25px;
  list-style: none;
}

.solution-features li {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  color: var(--el-text-color-regular);
}

.solution-features li .el-icon {
  color: var(--el-color-success);
  margin-right: 10px;
}

/* 优势部分样式 */
.benefits-section {
  max-width: 1200px;
  margin: 100px auto 0;
  padding: 0 20px;
}

.benefits-header {
  text-align: center;
  margin-bottom: 50px;
}

.benefits-header h3 {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 15px;
  color: var(--el-text-color-primary);
}

.benefits-header p {
  font-size: 1.1rem;
  color: var(--el-text-color-secondary);
}

.benefits-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
}

.benefit-card {
  background-color: var(--el-bg-color-overlay);
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  text-align: center;
}

.benefit-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.1);
}

.benefit-icon {
  width: 70px;
  height: 70px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, var(--el-color-primary-light-7), var(--el-color-primary));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 26px;
}

.benefit-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 15px;
  color: var(--el-text-color-primary);
}

.benefit-description {
  font-size: 0.95rem;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

/* 统计部分样式 */
.tech-stats-section {
  margin-top: 100px;
  padding: 80px 0;
  background: linear-gradient(135deg, #2c3e50, #4ca1af);
  color: white;
}

.dark-theme .tech-stats-section {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
}

.stats-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 30px;
  padding: 0 20px;
}

.stat-item {
  text-align: center;
  flex-basis: 200px;
}

.stat-value {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 10px;
  color: white;
}

.stat-label {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.8);
}

/* CTA部分样式 */
.cta-container {
  max-width: 1000px;
  margin: 100px auto 0;
  padding: 60px 40px;
  background-color: var(--el-color-primary-light-9);
  border-radius: 20px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.dark-theme .cta-container {
  background-color: var(--el-color-info-dark-2);
}

.cta-content h3 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 15px;
  color: var(--el-text-color-primary);
}

.cta-content p {
  font-size: 1.1rem;
  color: var(--el-text-color-secondary);
  margin-bottom: 30px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

/* 响应式样式 */
@media (max-width: 992px) {

  .solution-card,
  .solution-card:nth-child(even) {
    flex-direction: column;
    gap: 30px;
  }

  .solution-image {
    width: 100%;
  }

  .benefits-container {
    grid-template-columns: repeat(2, 1fr);
  }

  .section-title {
    font-size: 2.4rem;
  }

  .benefits-header h3 {
    font-size: 2rem;
  }
}

@media (max-width: 768px) {
  .ar-solutions-section {
    padding: 70px 0;
  }

  .section-title {
    font-size: 2rem;
  }

  .section-subtitle {
    font-size: 1rem;
  }

  .solution-title {
    font-size: 1.5rem;
  }

  .stat-value {
    font-size: 2.5rem;
  }

  .stat-label {
    font-size: 1rem;
  }

  .cta-content h3 {
    font-size: 1.7rem;
  }

  .cta-content p {
    font-size: 1rem;
  }
}

@media (max-width: 576px) {
  .benefits-container {
    grid-template-columns: 1fr;
  }

  .stats-container {
    flex-direction: column;
    align-items: center;
  }

  .stat-item {
    margin-bottom: 30px;
  }
}
</style>