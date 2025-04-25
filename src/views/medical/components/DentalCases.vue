<template>
  <div class="dental-cases-section" :class="{ 'dark-theme': isDark }">
    <div class="section-header" data-aos="fade-up">
      <h2 class="section-title">AR牙科典型案例</h2>
      <p class="section-subtitle">探索增强现实如何彻底改变传统牙科治疗体验</p>
      <div class="section-divider"></div>
    </div>

    <!-- 核心价值展示 -->
    <div class="value-proposition" data-aos="fade-up">
      <div class="value-content">
        <h3>为什么选择AR牙科技术？</h3>
        <p>增强现实技术正在彻底改变牙科行业，通过直观可视化、精确定位和实时数据分析，为医生和患者创造前所未有的诊疗体验。</p>

        <div class="value-metrics">
          <div class="metric">
            <div class="metric-value">98%</div>
            <div class="metric-label">患者满意度</div>
          </div>
          <div class="metric">
            <div class="metric-value">40%</div>
            <div class="metric-label">治疗时间缩短</div>
          </div>
          <div class="metric">
            <div class="metric-value">99.5%</div>
            <div class="metric-label">治疗成功率</div>
          </div>
        </div>
      </div>

      <div class="value-image" data-aos="fade-left">
        <img src="https://img.freepik.com/free-photo/dentist-explaining-dental-implant-patient_107420-65863.jpg"
          alt="AR牙科技术" />
        <div class="image-overlay">
          <div class="play-button" @click="openVideoDialog">
            <el-icon class="play-icon">
              <VideoPlay />
            </el-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- 案例展示 -->
    <div class="cases-container">
      <div class="case-tabs">
        <el-tabs v-model="activeTab" class="demo-tabs" @tab-click="handleTabClick">
          <el-tab-pane v-for="tab in caseTabs" :key="tab.name" :label="tab.label" :name="tab.name">
            <div class="case-content" data-aos="fade-up">
              <div class="case-image" :style="{ backgroundImage: `url(${tab.image})` }">
                <div class="case-badge">{{ tab.badge }}</div>
              </div>
              <div class="case-details">
                <h3 class="case-title">{{ tab.title }}</h3>
                <p class="case-description">{{ tab.description }}</p>

                <div class="case-highlights">
                  <div v-for="(highlight, index) in tab.highlights" :key="index" class="highlight-item">
                    <div class="highlight-icon">
                      <el-icon>
                        <component :is="highlight.icon" />
                      </el-icon>
                    </div>
                    <div class="highlight-content">
                      <h4>{{ highlight.title }}</h4>
                      <p>{{ highlight.description }}</p>
                    </div>
                  </div>
                </div>

                <div class="case-testimonial" v-if="tab.testimonial">
                  <div class="quote-icon">
                    <el-icon>
                      <ChatDotRound />
                    </el-icon>
                  </div>
                  <blockquote>{{ tab.testimonial.content }}</blockquote>
                  <div class="testimonial-author">
                    <img :src="tab.testimonial.avatar" alt="作者头像" class="author-avatar" />
                    <div class="author-info">
                      <div class="author-name">{{ tab.testimonial.name }}</div>
                      <div class="author-title">{{ tab.testimonial.title }}</div>
                    </div>
                  </div>
                </div>

                <el-button type="primary" plain>查看详细案例</el-button>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 合作医院/诊所 -->
    <div class="partners-section" data-aos="fade-up">
      <h3 class="partners-title">合作伙伴与医疗机构</h3>
      <p class="partners-subtitle">全国领先的牙科诊所和医院都在使用我们的AR技术</p>

      <div class="partners-logos">
        <div v-for="(partner, index) in partners" :key="index" class="partner-logo" data-aos="zoom-in"
          :data-aos-delay="index * 100">
          <img :src="partner.logo" :alt="partner.name" />
          <div class="partner-name">{{ partner.name }}</div>
        </div>
      </div>
    </div>

    <!-- CTA区域 -->
    <div class="cta-section" data-aos="fade-up">
      <div class="cta-content">
        <h3>想了解AR技术如何应用到您的牙科诊所？</h3>
        <p>与我们联系，获取专业咨询和演示</p>
        <el-button type="primary" size="large" @click="openLoginDialog">免费咨询</el-button>
      </div>
    </div>

    <!-- 视频弹窗 -->
    <el-dialog v-model="videoDialogVisible" title="AR牙科技术演示" width="70%" :before-close="handleCloseVideo"
      destroy-on-close>
      <div class="video-container">
        <iframe width="100%" height="500" src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="AR牙科技术演示"
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
  UserFilled,
  Operation,
  Notebook
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
const handleTabClick = (tab: any) => {
  console.log('Tab clicked:', tab.props.name);
};

// 案例数据
const caseTabs = [
  {
    name: 'implant',
    label: '种植牙精准定位',
    badge: '临床案例',
    title: 'AR辅助种植牙手术精准定位系统',
    description: '通过增强现实技术实现种植牙的高精度定位和实时手术导航，大幅提高种植成功率和患者满意度。',
    image: 'https://img.freepik.com/free-photo/dentist-showing-patient-his-dental-prosthesis_1150-21581.jpg',
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
    ],
    testimonial: {
      content: '采用AR技术后，种植牙手术的精确度和效率有了质的飞跃。患者恢复时间缩短，术后并发症显著减少，临床效果非常理想。',
      name: '王医生',
      title: '北京口腔医院种植科主任',
      avatar: 'https://img.freepik.com/free-photo/portrait-smiling-handsome-male-doctor-man_171337-5055.jpg'
    }
  },
  {
    name: 'orthodontics',
    label: '正畸治疗规划',
    badge: '技术创新',
    title: 'AR正畸治疗虚拟规划系统',
    description: '结合3D口腔扫描和AR可视化技术，为患者提供个性化正畸治疗方案，实时预览治疗效果。',
    image: 'https://img.freepik.com/free-photo/dentist-showing-model-teeth-dental-braces_1150-19415.jpg',
    highlights: [
      {
        icon: 'Notebook',
        title: '个性化治疗规划',
        description: '基于患者口腔的精确3D模型，制定最佳个性化治疗方案。'
      },
      {
        icon: 'UserFilled',
        title: '虚拟效果预览',
        description: '通过AR技术，患者可以在治疗前预览整个治疗过程和最终效果。'
      },
      {
        icon: 'TrendCharts',
        title: '治疗进度实时监控',
        description: '医生可以随时比对实际治疗进展与预期计划，及时调整治疗方案。'
      }
    ],
    testimonial: {
      content: 'AR正畸技术让我的患者能清晰看到治疗前后的对比，大大提高了治疗接受度。同时实时监控功能也让我能更精确地掌控治疗进程。',
      name: '张医生',
      title: '上海市第九人民医院正畸科',
      avatar: 'https://img.freepik.com/free-photo/woman-doctor-wearing-lab-coat-with-stethoscope-isolated_1303-29791.jpg'
    }
  },
  {
    name: 'patient-education',
    label: '患者教育系统',
    badge: '用户体验',
    title: 'AR牙科患者教育交互系统',
    description: '通过AR技术为患者提供直观、互动的口腔健康教育，增强患者理解和治疗依从性。',
    image: 'https://img.freepik.com/free-photo/dentist-explaining-teeth-treatment-girl-dental-office_1303-21211.jpg',
    highlights: [
      {
        icon: 'SetUp',
        title: '互动式口腔结构展示',
        description: '患者可以通过AR设备直观了解自己的口腔状况和治疗方案。'
      },
      {
        icon: 'Trophy',
        title: '个性化护理指导',
        description: '根据患者具体情况，提供量身定制的口腔护理建议和演示。'
      },
      {
        icon: 'ChatDotRound',
        title: '提升医患沟通效率',
        description: '形象直观的AR展示大幅提高医患沟通效率和患者满意度。'
      }
    ],
    testimonial: {
      content: 'AR教育系统帮助我更有效地向患者解释复杂的治疗方案，患者能直观理解自己的口腔问题和解决方案，接受度明显提高。',
      name: '李医生',
      title: '广州阳光口腔诊所院长',
      avatar: 'https://img.freepik.com/free-photo/woman-doctor-with-co-workers-background_1301-2105.jpg'
    }
  }
];

// 合作伙伴
const partners = [
  {
    name: '北京口腔医院',
    logo: 'https://img.freepik.com/free-vector/blue-medical-symbol-design_1017-30713.jpg'
  },
  {
    name: '上海交通大学附属第九人民医院',
    logo: 'https://img.freepik.com/free-vector/hospital-logo-design-vector-medical-cross_53876-136743.jpg'
  },
  {
    name: '广州中山大学附属口腔医院',
    logo: 'https://img.freepik.com/free-vector/medical-center-hospital-sign-isolated-white-background-logo-clinic_93083-835.jpg'
  },
  {
    name: '深圳爱康健口腔',
    logo: 'https://img.freepik.com/free-vector/flat-design-dental-logo-template_23-2149720856.jpg'
  },
  {
    name: '佳美口腔连锁',
    logo: 'https://img.freepik.com/free-vector/hand-drawn-dental-logo-template_23-2149196284.jpg'
  },
  {
    name: '瑞尔齿科',
    logo: 'https://img.freepik.com/free-vector/flat-dental-care-logo-template_23-2149517943.jpg'
  }
];
</script>

<style scoped>
.dental-cases-section {
  padding: 100px 0;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
}

.dark-theme.dental-cases-section {
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

/* 价值主张区域 */
.value-proposition {
  max-width: 1200px;
  margin: 0 auto 80px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 50px;
}

.value-content {
  flex: 1;
}

.value-content h3 {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: var(--el-text-color-primary);
}

.value-content p {
  font-size: 1.1rem;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
  margin-bottom: 30px;
}

.value-metrics {
  display: flex;
  gap: 30px;
}

.metric {
  text-align: center;
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
}

.value-image {
  flex: 1;
  position: relative;
  height: 400px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
}

.value-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.5s ease;
}

.value-image:hover img {
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

.value-image:hover .image-overlay {
  opacity: 1;
}

.play-button {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: rgba(var(--el-color-primary-rgb), 0.9);
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

.play-icon {
  color: white;
  font-size: 30px;
}

/* 案例展示区域 */
.cases-container {
  max-width: 1200px;
  margin: 0 auto 80px;
  padding: 0 20px;
}

.case-content {
  display: flex;
  gap: 40px;
  margin-top: 30px;
}

.case-image {
  flex: 1;
  height: 450px;
  border-radius: 16px;
  background-size: cover;
  background-position: center;
  position: relative;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
}

.case-badge {
  position: absolute;
  top: 20px;
  left: 20px;
  background-color: var(--el-color-primary);
  color: white;
  padding: 8px 16px;
  border-radius: 30px;
  font-size: 14px;
  font-weight: 600;
}

.case-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.case-title {
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 15px;
  color: var(--el-text-color-primary);
}

.case-description {
  font-size: 1.1rem;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
  margin-bottom: 25px;
}

.case-highlights {
  margin-bottom: 30px;
}

.highlight-item {
  display: flex;
  margin-bottom: 20px;
}

.highlight-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-right: 20px;
  flex-shrink: 0;
}

.highlight-content h4 {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0 0 5px;
  color: var(--el-text-color-primary);
}

.highlight-content p {
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.case-testimonial {
  background-color: var(--el-bg-color-overlay);
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 30px;
  position: relative;
}

.quote-icon {
  position: absolute;
  top: -15px;
  left: 25px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--el-color-success-light-8);
  color: var(--el-color-success);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.case-testimonial blockquote {
  font-size: 1rem;
  line-height: 1.6;
  font-style: italic;
  color: var(--el-text-color-primary);
  margin: 0 0 20px;
}

.testimonial-author {
  display: flex;
  align-items: center;
}

.author-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 15px;
}

.author-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.author-title {
  font-size: 0.85rem;
  color: var(--el-text-color-secondary);
}

/* 合作伙伴区域 */
.partners-section {
  max-width: 1200px;
  margin: 0 auto 80px;
  padding: 50px 20px;
  background-color: var(--el-bg-color-overlay);
  border-radius: 20px;
  text-align: center;
}

.partners-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 10px;
  color: var(--el-text-color-primary);
}

.partners-subtitle {
  font-size: 1.1rem;
  color: var(--el-text-color-secondary);
  margin-bottom: 40px;
}

.partners-logos {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
}

.partner-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  transition: transform 0.3s ease;
}

.partner-logo:hover {
  transform: translateY(-10px);
}

.partner-logo img {
  width: 100px;
  height: 100px;
  object-fit: contain;
  margin-bottom: 15px;
}

.partner-name {
  font-size: 1rem;
  font-weight: 500;
  color: var(--el-text-color-primary);
  text-align: center;
}

/* CTA区域 */
.cta-section {
  max-width: 1000px;
  margin: 0 auto;
  padding: 60px 40px;
  background: linear-gradient(135deg, var(--el-color-primary-light-8), var(--el-color-primary-light-7));
  border-radius: 20px;
  text-align: center;
}

.dark-theme .cta-section {
  background: linear-gradient(135deg, #1a2980, #26d0ce);
}

.cta-content h3 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 15px;
  color: var(--el-text-color-primary);
}

.dark-theme .cta-content h3 {
  color: white;
}

.cta-content p {
  font-size: 1.1rem;
  color: var(--el-text-color-secondary);
  margin-bottom: 30px;
}

.dark-theme .cta-content p {
  color: rgba(255, 255, 255, 0.8);
}

/* 视频容器样式 */
.video-container {
  width: 100%;
  position: relative;
  padding-bottom: 56.25%;
  /* 16:9比例 */
}

.video-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* 响应式样式 */
@media (max-width: 992px) {
  .value-proposition {
    flex-direction: column;
    gap: 40px;
  }

  .value-content h3 {
    font-size: 1.8rem;
  }

  .value-image {
    width: 100%;
    height: 350px;
  }

  .case-content {
    flex-direction: column;
  }

  .case-image {
    width: 100%;
    height: 350px;
  }

  .partners-logos {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .dental-cases-section {
    padding: 70px 0;
  }

  .section-title {
    font-size: 2.2rem;
  }

  .section-subtitle {
    font-size: 1rem;
  }

  .value-metrics {
    flex-direction: column;
    gap: 20px;
  }

  .metric-value {
    font-size: 2rem;
  }

  .case-title {
    font-size: 1.5rem;
  }

  .case-description {
    font-size: 1rem;
  }

  .highlight-item {
    align-items: flex-start;
  }

  .cta-content h3 {
    font-size: 1.7rem;
  }

  .cta-content p {
    font-size: 1rem;
  }
}

@media (max-width: 576px) {
  .partners-logos {
    grid-template-columns: 1fr;
  }

  .value-image {
    height: 300px;
  }

  .case-image {
    height: 300px;
  }

  .highlight-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }

  .highlight-content h4 {
    font-size: 1.1rem;
  }
}
</style>