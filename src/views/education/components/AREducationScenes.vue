<template>
  <div class="ar-scenes-section" :class="{ 'dark-theme': isDark }" id="scenes">
    <div class="section-container">
      <!-- 标题区域 -->
      <div class="section-header" data-aos="fade-up">
        <h2 class="section-title">AR教育应用场景</h2>
        <div class="section-divider"></div>
        <p class="section-subtitle">探索AR技术在多种教育场景中的创新应用</p>
      </div>

      <!-- 案例研究区域 -->
      <div class="case-studies">
        <div class="case-cards">
          <div v-for="(caseStudy, index) in caseStudies" :key="index" class="case-card" data-aos="fade-up"
            :data-aos-delay="index * 100">
            <div class="case-image">
              <img :src="caseStudy.image" :alt="caseStudy.title">
              <div class="case-overlay"></div>
            </div>
            <div class="case-content">
              <h4>{{ caseStudy.title }}</h4>
              <p>{{ caseStudy.description }}</p>
              <div class="case-tags">
                <span v-for="(tag, i) in caseStudy.tags" :key="i">{{ tag }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 行动号召区域 -->
      <div class="cta-section" data-aos="fade-up">
        <div class="cta-content">
          <h3>探索更多AR教育应用场景</h3>
          <p>立即注册体验我们的AR教育平台，发现更多精彩教育应用</p>
          <el-button type="primary" size="large" @click="openLoginDialog" class="cta-button">免费体验</el-button>
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
  Pointer,
  Refresh,
  View,
  Location,
  Compass,
  Monitor,
  Connection,
  VideoPlay,
  Share
} from '@element-plus/icons-vue';

// 获取主题设置
const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === 'dark');

// 发送打开登录对话框事件
const emit = defineEmits(['openLogin']);
const openLoginDialog = () => {
  emit('openLogin');
};

// 案例研究
const caseStudies = [
  {
    title: '虚拟化学实验室',
    description: '学生可以在安全环境中进行化学实验，观察分子结构和化学反应过程，无需担心危险或材料消耗。',
    image: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    tags: ['化学教育', '实验模拟', '安全学习']
  },
  {
    title: '太空探索课程',
    description: '学生可以虚拟漫游太阳系，近距离观察行星特征和宇宙现象，体验无法在现实中实现的太空探索。',
    image: 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    tags: ['天文学习', '沉浸体验', '虚拟旅行']
  },
  {
    title: '编程游戏开发',
    description: '通过Blockly可视化编程创建互动游戏，学生在有趣的项目中学习编程逻辑和算法思维。',
    image: 'https://images.unsplash.com/photo-1551033406-611cf9a28f67?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    tags: ['编程教育', '游戏开发', '可视化学习']
  }
];
</script>

<style scoped>
.ar-scenes-section {
  padding: 80px 0;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
}

.dark-theme.ar-scenes-section {
  background-color: var(--el-bg-color-darker, #1e1e24);
}

.section-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 16px;
  color: var(--el-text-color-primary);
}

.dark-theme .section-title {
  color: var(--el-text-color-primary);
}

.section-divider {
  width: 80px;
  height: 4px;
  background: linear-gradient(90deg, #3498db, #00d2ff);
  margin: 0 auto 20px;
  border-radius: 2px;
}

.section-subtitle {
  font-size: 1.2rem;
  color: var(--el-text-color-secondary);
  max-width: 700px;
  margin: 0 auto;
}

.dark-theme .section-subtitle {
  color: var(--el-text-color-secondary);
}

/* 案例卡片样式 */
.case-studies {
  margin-bottom: 80px;
}

.case-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 30px;
}

.case-card {
  border-radius: 16px;
  overflow: hidden;
  background: var(--el-bg-color-overlay);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.dark-theme .case-card {
  background: var(--el-bg-color);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.case-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
}

.dark-theme .case-card:hover {
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
}

.case-image {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.case-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.case-card:hover .case-image img {
  transform: scale(1.05);
}

.case-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 60px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
}

.case-content {
  padding: 24px;
}

.case-content h4 {
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 12px;
  color: var(--el-text-color-primary);
}

.dark-theme .case-content h4 {
  color: var(--el-text-color-primary);
}

.case-content p {
  color: var(--el-text-color-secondary);
  margin-bottom: 16px;
  line-height: 1.6;
}

.dark-theme .case-content p {
  color: var(--el-text-color-secondary);
}

.case-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.case-tags span {
  background-color: #e2f1ff;
  color: #3498db;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

.dark-theme .case-tags span {
  background-color: #334155;
  color: #7dd3fc;
}

/* CTA区域样式 */
.cta-section {
  background: linear-gradient(135deg, #3498db, #00d2ff);
  border-radius: 30px;
  padding: 80px 60px;
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

.cta-content h3 {
  font-size: 2rem;
  font-weight: 700;
  color: white;
  margin-bottom: 16px;
}

.cta-content p {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.1rem;
  margin-bottom: 30px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.cta-button {
  padding: 15px 40px;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 50px;
  background: white !important;
  color: var(--el-color-primary) !important;
  border: none !important;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.cta-button:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 25px rgba(0, 0, 0, 0.15);
  background-color: white !important;
}

.cta-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.particle {
  position: absolute;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
}

.particle-1 {
  width: 150px;
  height: 150px;
  top: -50px;
  left: -50px;
  animation: float 20s infinite alternate;
}

.particle-2 {
  width: 100px;
  height: 100px;
  bottom: 20px;
  right: 10%;
  animation: float 15s infinite alternate-reverse;
}

.particle-3 {
  width: 70px;
  height: 70px;
  top: 40%;
  right: -20px;
  animation: float 12s infinite alternate;
}

.particle-4 {
  width: 120px;
  height: 120px;
  bottom: -30px;
  left: 20%;
  animation: float 18s infinite alternate-reverse;
}

.particle-5 {
  width: 60px;
  height: 60px;
  top: 30px;
  right: 30%;
  animation: float 10s infinite alternate;
}

.particle-6 {
  width: 90px;
  height: 90px;
  bottom: 40%;
  left: -30px;
  animation: float 16s infinite alternate-reverse;
}

@keyframes float {
  0% {
    transform: translateY(0) translateX(0);
  }

  50% {
    transform: translateY(10px) translateX(10px);
  }

  100% {
    transform: translateY(-10px) translateX(-10px);
  }
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .case-cards {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

@media (max-width: 768px) {
  .section-title {
    font-size: 2rem;
  }

  .case-cards {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .section-title {
    font-size: 1.8rem;
  }

  .cta-content h3 {
    font-size: 1.6rem;
  }

  .cta-section {
    padding: 40px 20px;
  }
}
</style>