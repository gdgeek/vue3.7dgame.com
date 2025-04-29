<template>
  <div class="ar-solutions-section" :class="{ 'dark-theme': isDark }">
    <div class="section-container">
      <!-- 标题区域 - 使用更现代的设计 -->
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

      <!-- 创新科技展示区 - 替代案例研究区 -->
      <div class="innovation-showcase" data-aos="fade-up">
        <div class="showcase-header">
          <h3>前沿科技应用</h3>
          <div class="section-divider showcase-divider"></div>
          <p>探索AR医疗技术如何改变医疗行业的未来</p>
        </div>

        <div class="technology-cards">
          <div v-for="(tech, index) in arTechnologies" :key="index" class="tech-card" data-aos="zoom-in"
            :data-aos-delay="index * 100">
            <div class="tech-image">
              <img :src="tech.image" :alt="tech.title">
              <div class="tech-overlay">
                <el-icon>
                  <component :is="tech.icon" />
                </el-icon>
              </div>
            </div>
            <div class="tech-content">
              <h4>{{ tech.title }}</h4>
              <p>{{ tech.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 交互式数据可视化区域 -->
      <div class="interactive-stats" data-aos="fade-up">
        <div class="stats-container">
          <div class="stats-visual">
            <img
              src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
              alt="AR医疗数据可视化" class="stats-image">
            <div class="stats-overlay"></div>
          </div>
          <div class="stats-content">
            <h3>数据驱动的医疗革新</h3>
            <p>通过AR技术实现精确医疗决策，从数据中获取关键洞察</p>

            <div class="stats-grid">
              <div v-for="(stat, index) in techStats" :key="index" class="stat-item" data-aos="zoom-in"
                :data-aos-delay="index * 100">
                <div class="stat-value">{{ stat.value }}</div>
                <div class="stat-label">{{ stat.label }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 未来愿景区域 - 替代案例研究区 -->
      <div class="vision-section" data-aos="fade-up">
        <div class="vision-content">
          <h3>医疗科技的未来愿景</h3>
          <p>我们致力于通过增强现实技术，突破传统医疗的限制，开创全新的医患互动模式和治疗方案</p>

          <div class="vision-pillars">
            <div class="vision-pillar" v-for="(pillar, index) in visionPillars" :key="index">
              <div class="pillar-icon">
                <el-icon>
                  <component :is="pillar.icon" />
                </el-icon>
              </div>
              <div class="pillar-content">
                <h4>{{ pillar.title }}</h4>
                <p>{{ pillar.description }}</p>
              </div>
            </div>
          </div>

          <el-button type="primary" class="vision-btn">探索合作机会</el-button>
        </div>
        <div class="vision-image" data-aos="fade-left">
          <img
            src="https://images.unsplash.com/photo-1551076805-e1869033e561?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
            alt="医疗科技未来愿景">
        </div>
      </div>

      <!-- 合作咨询区域 - 改进版 -->
      <div class="cta-section" data-aos="fade-up">
        <div class="cta-content">
          <h3>体验AR医疗技术的未来</h3>
          <p>联系我们获取专业咨询与演示，开启医疗科技创新之旅</p>
          <el-button type="primary" size="large" @click="openLoginDialog" class="cta-button">预约演示</el-button>
        </div>
        <div class="cta-particles">
          <div v-for="n in 6" :key="n" class="particle" :class="`particle-${n}`"></div>
        </div>
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
  Clock,
  Connection,
  DataAnalysis,
  Cpu,
  Discount,
  Aim,
  Guide
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

// 新增：AR技术展示区
const arTechnologies = [
  {
    title: '3D解剖建模',
    description: '通过高精度扫描与AI技术，构建精确的人体组织三维模型，支持互动式浏览与分析',
    image: 'https://images.unsplash.com/photo-1583911860205-72f8ac8ddcbe?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    icon: 'DataAnalysis'
  },
  {
    title: '实时手术投影',
    description: '将关键医疗信息实时投影到患者身体表面，为医生提供直观的手术辅助',
    image: 'https://images.unsplash.com/photo-1579154204835-44e505281a38?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    icon: 'Connection'
  },
  {
    title: '远程协作平台',
    description: '通过云端AR技术，实现全球医疗专家的远程协作诊断与手术指导',
    image: 'https://images.unsplash.com/photo-1530026186672-2cd00ffc50fe?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    icon: 'Cpu'
  }
];

// 新增：愿景支柱
const visionPillars = [
  {
    title: '精准医疗',
    description: '通过AR技术实现微创手术的精确引导，降低手术风险，提高成功率',
    icon: 'Aim'
  },
  {
    title: '医学培训革新',
    description: '建立沉浸式医学教育体系，提供真实手术场景模拟，加速医学人才培养',
    icon: 'Guide'
  },
  {
    title: '远程医疗普及',
    description: '突破地域限制，让优质医疗资源覆盖更广阔地区，惠及更多患者',
    icon: 'Connection'
  }
];
</script>

<style scoped>
.ar-solutions-section {
  padding: 90px 0;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
  overflow: hidden;
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

/* 新增：创新科技展示区 */
.innovation-showcase {
  margin-bottom: 80px;
}

.showcase-header {
  text-align: center;
  margin-bottom: 50px;
}

.showcase-header h3 {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 15px;
  color: var(--el-text-color-primary);
}

.showcase-header p {
  font-size: 1.1rem;
  color: var(--el-text-color-secondary);
  max-width: 700px;
  margin: 0 auto;
}

.showcase-divider {
  margin-bottom: 15px;
}

.technology-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
}

.tech-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
  background-color: var(--el-bg-color);
  transition: transform 0.3s ease;
}

.tech-card:hover {
  transform: translateY(-10px);
}

.tech-card:hover .tech-image img {
  transform: scale(1.05);
}

.tech-image {
  height: 200px;
  position: relative;
  overflow: hidden;
}

.tech-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.tech-overlay {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  backdrop-filter: blur(5px);
}

.tech-content {
  padding: 25px;
}

.tech-content h4 {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--el-text-color-primary);
}

.tech-content p {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

/* 交互式数据可视化区域 */
.interactive-stats {
  margin-bottom: 80px;
  position: relative;
}

.stats-container {
  display: flex;
  align-items: center;
  border-radius: 24px;
  overflow: hidden;
  background-color: var(--el-bg-color-overlay);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
}

.stats-visual {
  flex: 1;
  position: relative;
  height: 400px;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.12);
}

.stats-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s ease;
}

.stats-visual:hover .stats-image {
  transform: scale(1.03);
}

.stats-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0));
}

.stats-content {
  flex: 1;
  padding: 50px;
  position: relative;
  z-index: 2;
}

.stats-content h3 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 15px;
  color: var(--el-text-color-primary);
}

.stats-content p {
  font-size: 1.05rem;
  color: var(--el-text-color-secondary);
  margin-bottom: 40px;
  max-width: 450px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 30px;
}

.stat-item {
  position: relative;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(90deg, #3a7bd5, #00d2ff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.1;
}

.stat-label {
  font-size: 0.95rem;
  color: var(--el-text-color-secondary);
}

/* 未来愿景区域 */
.vision-section {
  display: flex;
  align-items: center;
  gap: 60px;
  margin-bottom: 80px;
  position: relative;
}

.vision-content {
  flex: 1;
}

.vision-content h3 {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: var(--el-text-color-primary);
  line-height: 1.2;
}

.vision-content>p {
  font-size: 1.05rem;
  line-height: 1.7;
  color: var(--el-text-color-secondary);
  margin-bottom: 40px;
}

.vision-pillars {
  margin-bottom: 40px;
}

.vision-pillar {
  display: flex;
  align-items: flex-start;
  margin-bottom: 25px;
}

.pillar-icon {
  width: 44px;
  height: 44px;
  background-color: var(--el-color-primary-light-8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  color: var(--el-color-primary);
  flex-shrink: 0;
}

.pillar-content h4 {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--el-text-color-primary);
}

.pillar-content p {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.vision-image {
  flex: 1;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.12);
  position: relative;
}

.vision-image img {
  width: 100%;
  height: 450px;
  object-fit: cover;
  transition: transform 0.6s ease;
}

.vision-image:hover img {
  transform: scale(1.03);
}

.vision-btn {
  padding: 12px 30px;
  font-size: 1rem;
}

/* 改进的CTA区域 */
.cta-section {
  padding: 80px 60px;
  background: linear-gradient(135deg, #3a7bd5, #00d2ff);
  border-radius: 30px;
  text-align: center;
  color: white;
  position: relative;
  overflow: hidden;
}

.dark-theme .cta-section {
  background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
}

.cta-content {
  position: relative;
  z-index: 2;
}

.cta-section h3 {
  font-size: 2.3rem;
  font-weight: 700;
  margin-bottom: 20px;
}

.cta-section p {
  font-size: 1.1rem;
  margin-bottom: 40px;
  opacity: 0.9;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.cta-button {
  padding: 15px 40px;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 50px;
  background: white;
  color: var(--el-color-primary);
  border: none;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.cta-button:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 25px rgba(0, 0, 0, 0.15);
}

/* 粒子动画效果 */
.cta-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.particle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
}

.particle-1 {
  width: 150px;
  height: 150px;
  top: -50px;
  left: 10%;
  animation: float 8s infinite ease-in-out;
}

.particle-2 {
  width: 80px;
  height: 80px;
  bottom: 20px;
  right: 20%;
  animation: float 6s infinite ease-in-out 1s;
}

.particle-3 {
  width: 200px;
  height: 200px;
  bottom: -80px;
  left: 30%;
  animation: float 10s infinite ease-in-out 2s;
}

.particle-4 {
  width: 120px;
  height: 120px;
  top: 40px;
  right: 10%;
  animation: float 7s infinite ease-in-out 1.5s;
}

.particle-5 {
  width: 100px;
  height: 100px;
  top: 50%;
  left: 5%;
  animation: float 9s infinite ease-in-out 0.5s;
}

.particle-6 {
  width: 170px;
  height: 170px;
  bottom: 10%;
  right: 5%;
  animation: float 8s infinite ease-in-out 2.5s;
}

@keyframes float {

  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }

  50% {
    transform: translateY(-20px) rotate(5deg);
  }
}

/* 响应式调整 */
@media (max-width: 1100px) {
  .vision-section {
    flex-direction: column;
  }

  .vision-image {
    width: 100%;
  }

  .vision-image img {
    height: 400px;
  }

  .technology-cards {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }

  .stats-container {
    flex-direction: column;
  }

  .stats-content {
    padding: 40px;
  }
}

@media (max-width: 992px) {
  .section-title {
    font-size: 2.5rem;
  }

  .cta-section {
    padding: 60px 40px;
  }

  .cta-section h3 {
    font-size: 2rem;
  }
}

@media (max-width: 768px) {
  .ar-solutions-section {
    padding: 60px 0;
  }

  .section-title {
    font-size: 2.2rem;
  }

  .showcase-header h3 {
    font-size: 1.8rem;
  }

  .vision-content h3 {
    font-size: 1.8rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .stats-visual {
    height: 300px;
  }

  .cta-section {
    padding: 50px 30px;
  }

  .cta-section h3 {
    font-size: 1.7rem;
  }
}

@media (max-width: 576px) {
  .technology-cards {
    grid-template-columns: 1fr;
  }

  .tech-image {
    height: 180px;
  }

  .vision-pillar {
    align-items: center;
  }

  .cta-button {
    padding: 12px 30px;
    font-size: 1rem;
  }
}
</style>