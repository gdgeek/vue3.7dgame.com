<template>
  <div class="dental-cases-section" :class="{ 'dark-theme': isDark }">
    <div class="section-container">
      <!-- 标题区域 -->
      <div class="section-header" data-aos="fade-up">
        <h2 class="section-title">AR牙科应用</h2>
        <div class="section-divider"></div>
        <p class="section-subtitle">探索增强现实如何重塑现代牙科诊疗体验</p>
      </div>

      <!-- 优势概览 -->
      <div class="benefits-overview" data-aos="fade-up">
        <div class="overview-image">
          <img
            src="https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
            alt="AR牙科应用" />
          <div class="image-overlay">
            <div class="play-button" @click="openVideoDialog">
              <el-icon>
                <VideoPlay />
              </el-icon>
            </div>
          </div>
        </div>
        <div class="overview-content">
          <h3>数字化牙科的未来</h3>
          <p>增强现实技术正在彻底改变牙科行业，从精确诊断到治疗规划，从患者教育到手术导航，AR技术为牙科医生和患者带来前所未有的体验。</p>

          <div class="key-metrics">
            <div class="metric">
              <div class="metric-value">99.7%</div>
              <div class="metric-label">植入精度</div>
            </div>
            <div class="metric">
              <div class="metric-value">40%</div>
              <div class="metric-label">时间节省</div>
            </div>
            <div class="metric">
              <div class="metric-value">95%</div>
              <div class="metric-label">患者满意度</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 应用展示 -->
      <div class="applications-section" data-aos="fade-up">
        <h3 class="applications-title">主要应用场景</h3>

        <div class="tabs-container">
          <el-tabs v-model="activeTab" class="custom-tabs">
            <el-tab-pane v-for="tab in caseTabs" :key="tab.name" :label="tab.label" :name="tab.name">
              <div class="tab-content">
                <div class="tab-image">
                  <img :src="tab.image" :alt="tab.title" />
                  <div class="tab-badge">{{ tab.badge }}</div>
                </div>
                <div class="tab-details">
                  <h3>{{ tab.title }}</h3>
                  <p>{{ tab.description }}</p>

                  <div class="features-list">
                    <div v-for="(highlight, index) in tab.highlights" :key="index" class="feature-item">
                      <div class="feature-icon">
                        <el-icon>
                          <component :is="highlight.icon" />
                        </el-icon>
                      </div>
                      <div>
                        <h4>{{ highlight.title }}</h4>
                        <p>{{ highlight.description }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>

      <!-- AR技术优势展示 -->
      <div class="technology-advantages" data-aos="fade-up">
        <div class="advantages-header">
          <h3>AR技术优势</h3>
          <div class="section-divider advantages-divider"></div>
          <p>增强现实技术为牙科医疗带来的革命性变革与潜力</p>
        </div>

        <div class="advantages-grid">
          <div v-for="(advantage, index) in arAdvantages" :key="index" class="advantage-card" data-aos="zoom-in"
            :data-aos-delay="index * 100">
            <div class="advantage-icon">
              <el-icon>
                <component :is="advantage.icon" />
              </el-icon>
            </div>
            <h4 class="advantage-title">{{ advantage.title }}</h4>
            <p class="advantage-description">{{ advantage.description }}</p>
          </div>
        </div>
      </div>

      <!-- 咨询区域 -->
      <div class="contact-section" data-aos="fade-up">
        <div class="contact-content">
          <h3>想了解AR技术如何应用到您的牙科诊所？</h3>
          <p>预约演示，探索AR技术如何提升您的诊疗效果</p>
          <el-button type="primary" size="large" @click="openLoginDialog" class="contact-button">预约咨询</el-button>
        </div>
        <div class="contact-particles">
          <div v-for="n in 6" :key="n" class="particle" :class="`particle-${n}`"></div>
        </div>
      </div>
    </div>

    <!-- 视频弹窗 -->
    <el-dialog v-model="videoDialogVisible" title="AR牙科技术演示" width="70%" :before-close="handleCloseVideo"
      destroy-on-close>
      <div class="video-container">
        <iframe width="100%" height="500" src="https://www.bilibili.com/video/BV1Q5411K75v" title="AR牙科技术演示"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen>
        </iframe>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSettingsStore } from '@/store/modules/settings';
import {
  VideoPlay,
  ChatDotRound,
  Aim,
  Trophy,
  TrendCharts,
  Timer,
  SetUp,
  Operation
} from '@element-plus/icons-vue';

// 获取主题设置
const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === 'dark');

// 发送打开登录对话框事件
const emit = defineEmits(['openLogin']);
const openLoginDialog = () => {
  emit('openLogin');
};

// 视频弹窗控制
const videoDialogVisible = ref(false);
const openVideoDialog = () => {
  videoDialogVisible.value = true;
};
const handleCloseVideo = () => {
  videoDialogVisible.value = false;
};

// 案例选项卡
const activeTab = ref('implant');

// 案例数据
const caseTabs = [
  {
    name: 'implant',
    label: '种植牙导航',
    badge: '精准医疗',
    title: 'AR辅助种植牙精准定位系统',
    description: '通过增强现实技术实现种植牙的高精度定位和实时手术导航，大幅提高种植成功率。',
    image: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    highlights: [
      {
        icon: 'Aim',
        title: '亚毫米精度定位',
        description: '采用光学追踪和三维重建技术，实现种植体亚毫米级精确定位。'
      },
      {
        icon: 'Operation',
        title: '实时手术导航',
        description: 'AR眼镜投射虚拟导航路径，实时指导医生完成最佳角度的植入。'
      },
      {
        icon: 'Timer',
        title: '手术时间缩短40%',
        description: '预设手术路径和实时反馈大幅缩短手术时间，减轻患者痛苦。'
      }
    ]
  },
  {
    name: 'orthodontics',
    label: '正畸治疗',
    badge: '个性化医疗',
    title: 'AR正畸虚拟规划系统',
    description: '结合3D口腔扫描和AR可视化技术，为患者提供个性化正畸治疗方案，实时预览治疗效果。',
    image: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    highlights: [
      {
        icon: 'TrendCharts',
        title: '个性化治疗规划',
        description: '基于患者口腔的精确3D模型，制定最佳个性化治疗方案。'
      },
      {
        icon: 'SetUp',
        title: '虚拟效果预览',
        description: '通过AR技术，患者可以在治疗前预览整个治疗过程和最终效果。'
      },
      {
        icon: 'Trophy',
        title: '治疗进度监控',
        description: '医生可以随时比对实际治疗进展与预期计划，及时调整治疗方案。'
      }
    ]
  },
  {
    name: 'education',
    label: '患者教育',
    badge: '交互体验',
    title: 'AR牙科患者教育系统',
    description: '通过AR技术为患者提供直观、互动的口腔健康教育，增强患者理解和治疗依从性。',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    highlights: [
      {
        icon: 'SetUp',
        title: '互动式口腔展示',
        description: '患者可以通过AR设备直观了解自己的口腔状况和治疗方案。'
      },
      {
        icon: 'ChatDotRound',
        title: '增强医患沟通',
        description: '形象直观的AR展示大幅提高医患沟通效率和患者满意度。'
      },
      {
        icon: 'Trophy',
        title: '个性化护理指导',
        description: '根据患者具体情况，提供量身定制的口腔护理建议和演示。'
      }
    ]
  }
];

// AR技术优势
const arAdvantages = [
  {
    icon: 'Aim',
    title: '极高精度',
    description: 'AR技术能够提供亚毫米级别的精确定位，为牙科手术和种植提供前所未有的精确度'
  },
  {
    icon: 'Timer',
    title: '提高效率',
    description: '通过直观的可视化指导和实时反馈，AR技术能够显著减少手术时间和治疗周期'
  },
  {
    icon: 'Trophy',
    title: '提升体验',
    description: '为患者提供更加舒适和透明的治疗过程，增强患者对治疗方案的理解和接受度'
  },
  {
    icon: 'TrendCharts',
    title: '行业前沿',
    description: '作为牙科医疗领域的前沿技术，AR代表着数字化牙科的未来发展方向'
  }
];
</script>

<style scoped>
.dental-cases-section {
  padding: 90px 0;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
}

.dark-theme.dental-cases-section {
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

/* 优势概览样式 */
.benefits-overview {
  display: flex;
  gap: 60px;
  margin-bottom: 80px;
  align-items: center;
}

.overview-image {
  flex: 1;
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.overview-image img {
  width: 100%;
  height: 400px;
  object-fit: cover;
  display: block;
  transition: transform 0.5s ease;
}

.overview-image:hover img {
  transform: scale(1.05);
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.overview-image:hover .image-overlay {
  opacity: 1;
}

.play-button {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(var(--el-color-primary-rgb), 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease;
}

.play-button:hover {
  transform: scale(1.1);
}

.play-button .el-icon {
  color: white;
  font-size: 30px;
}

.overview-content {
  flex: 1;
}

.overview-content h3 {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: var(--el-text-color-primary);
}

.overview-content p {
  font-size: 1.1rem;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
  margin-bottom: 30px;
}

.key-metrics {
  display: flex;
  gap: 40px;
}

.metric {
  flex: 1;
}

.metric-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--el-color-primary);
  margin-bottom: 5px;
}

.metric-label {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

/* 应用展示样式 */
.applications-section {
  margin-bottom: 80px;
}

.applications-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 40px;
  text-align: center;
  color: var(--el-text-color-primary);
}

.tabs-container {
  background-color: var(--el-bg-color-overlay);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
}

.tab-content {
  display: flex;
  gap: 40px;
  margin-top: 30px;
}

.tab-image {
  flex: 1;
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
}

.tab-image img {
  width: 100%;
  height: 350px;
  object-fit: cover;
  display: block;
}

.tab-badge {
  position: absolute;
  top: 20px;
  left: 20px;
  background: var(--el-color-primary);
  color: white;
  padding: 8px 16px;
  border-radius: 30px;
  font-size: 14px;
  font-weight: 600;
}

.tab-details {
  flex: 1.2;
}

.tab-details h3 {
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 15px;
  color: var(--el-text-color-primary);
}

.tab-details>p {
  font-size: 1.1rem;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
  margin-bottom: 30px;
}

.features-list {
  margin-bottom: 30px;
}

.feature-item {
  display: flex;
  gap: 15px;
  margin-bottom: 25px;
}

.feature-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.feature-item h4 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 5px;
  color: var(--el-text-color-primary);
}

.feature-item p {
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  margin: 0;
}

/* AR技术优势展示区域 */
.technology-advantages {
  margin-bottom: 80px;
}

.advantages-header {
  text-align: center;
  margin-bottom: 50px;
}

.advantages-header h3 {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 15px;
  color: var(--el-text-color-primary);
}

.advantages-header p {
  font-size: 1.1rem;
  color: var(--el-text-color-secondary);
  max-width: 700px;
  margin: 0 auto;
}

.advantages-divider {
  margin-bottom: 15px;
}

.advantages-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30px;
}

.advantage-card {
  background-color: var(--el-bg-color-overlay);
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.08);
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  height: 100%;
}

.advantage-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
}

.advantage-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, var(--el-color-primary-light-7), var(--el-color-primary));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
}

.advantage-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 15px;
}

.advantage-description {
  font-size: 0.95rem;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

/* 咨询区域样式 */
.contact-section {
  background: linear-gradient(135deg, #3a7bd5, #00d2ff);
  border-radius: 30px;
  padding: 80px 60px;
  text-align: center;
  color: white;
  position: relative;
  overflow: hidden;
}

.dark-theme .contact-section {
  background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
}

.contact-content {
  position: relative;
  z-index: 2;
}

.contact-section h3 {
  font-size: 2.3rem;
  font-weight: 700;
  margin-bottom: 20px;
}

.contact-section p {
  font-size: 1.1rem;
  margin-bottom: 40px;
  opacity: 0.9;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.contact-button {
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

.contact-button:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 25px rgba(0, 0, 0, 0.15);
}

/* 粒子动画效果 */
.contact-particles {
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

/* 视频容器样式 */
.video-container {
  width: 100%;
  position: relative;
  padding-bottom: 56.25%;
  /* 16:9 */
}

.video-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* 响应式调整 */
@media (max-width: 1100px) {
  .advantages-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 992px) {
  .benefits-overview {
    flex-direction: column;
    gap: 40px;
  }

  .tab-content {
    flex-direction: column;
  }

  .section-title {
    font-size: 2.5rem;
  }

  .overview-content h3 {
    font-size: 2rem;
  }

  .contact-section {
    padding: 40px 30px;
  }
}

@media (max-width: 768px) {
  .dental-cases-section {
    padding: 60px 0;
  }

  .section-title {
    font-size: 2.2rem;
  }

  .overview-content h3 {
    font-size: 1.8rem;
  }

  .tab-details h3 {
    font-size: 1.6rem;
  }

  .key-metrics {
    flex-direction: column;
    gap: 20px;
  }

  .advantages-grid {
    grid-template-columns: 1fr;
  }

  .contact-section h3 {
    font-size: 1.7rem;
  }

  .contact-section {
    padding: 50px 30px;
  }
}

@media (max-width: 576px) {
  .metric-value {
    font-size: 2rem;
  }

  .tab-details>p {
    font-size: 1rem;
  }
}
</style>