<template>
  <div class="ar-solutions-section" :class="{ 'dark-theme': isDark }" id="solutions">
    <div class="section-container">
      <!-- 标题区域 -->
      <div class="section-header" data-aos="fade-up">
        <h2 class="section-title">AR教育创新平台</h2>
        <div class="section-divider"></div>
        <p class="section-subtitle">打破传统教学边界，构建沉浸式数字化学习新体验</p>
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

      <!-- Three.js 3D模型场景展示区 -->
      <div class="technology-showcase" data-aos="fade-up">
        <div class="showcase-header">
          <h3>Three.js 3D场景构建</h3>
          <div class="section-divider showcase-divider"></div>
          <p>利用前沿Three.js技术打造身临其境的3D学习环境</p>
        </div>

        <div class="technology-container">
          <div class="technology-visual" data-aos="fade-right">
            <img
              src="https://images.unsplash.com/photo-1633356122544-f134324a6cee?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
              alt="Three.js 3D场景" class="tech-image">
            <div class="tech-overlay"></div>
          </div>
          <div class="technology-content" data-aos="fade-left">
            <h4>沉浸式3D学习环境</h4>
            <p>通过Three.js构建的高度互动性3D场景让学习者能从多角度观察和探索知识点，提供更直观、更有吸引力的学习体验。</p>

            <div class="tech-features">
              <div class="tech-feature">
                <el-icon>
                  <Pointer />
                </el-icon>
                <span>实时交互式3D模型</span>
              </div>
              <div class="tech-feature">
                <el-icon>
                  <View />
                </el-icon>
                <span>360°全方位视角</span>
              </div>
              <div class="tech-feature">
                <el-icon>
                  <TrendCharts />
                </el-icon>
                <span>物理场景模拟</span>
              </div>
              <div class="tech-feature">
                <el-icon>
                  <Link />
                </el-icon>
                <span>多平台适配</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Blockly 可视化编程展示区 -->
      <div class="technology-showcase blockly-section" data-aos="fade-up">
        <div class="showcase-header">
          <h3>Blockly 可视化编程</h3>
          <div class="section-divider showcase-divider"></div>
          <p>让编程学习变得简单易懂，培养逻辑思维与创新能力</p>
        </div>

        <div class="technology-container reverse">
          <div class="technology-content" data-aos="fade-right">
            <h4>直观易用的可视化编程环境</h4>
            <p>Blockly拖拽式编程模块让编程学习变得直观有趣，学生无需深入了解代码语法即可创建复杂交互和逻辑，激发编程学习兴趣。</p>

            <div class="tech-features">
              <div class="tech-feature">
                <el-icon>
                  <Connection />
                </el-icon>
                <span>积木式拖拽编程</span>
              </div>
              <div class="tech-feature">
                <el-icon>
                  <EditPen />
                </el-icon>
                <span>自动代码生成</span>
              </div>
              <div class="tech-feature">
                <el-icon>
                  <Monitor />
                </el-icon>
                <span>实时预览效果</span>
              </div>
              <div class="tech-feature">
                <el-icon>
                  <Switch />
                </el-icon>
                <span>无缝转换多种编程语言</span>
              </div>
            </div>
          </div>
          <div class="technology-visual" data-aos="fade-left">
            <img
              src="https://images.unsplash.com/photo-1583508915901-b5f84c1dcde1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
              alt="Blockly可视化编程" class="tech-image">
            <div class="tech-overlay"></div>
          </div>
        </div>
      </div>

      <!-- 统计数据展示区 -->
      <div class="stats-section" data-aos="fade-up">
        <div class="stats-header">
          <h3>学习成效提升</h3>
          <div class="section-divider stats-divider"></div>
          <p>基于AR技术的教育平台显著提升学习效率和知识吸收</p>
        </div>

        <div class="stats-grid">
          <div v-for="(stat, index) in educationStats" :key="index" class="stat-card" data-aos="zoom-in"
            :data-aos-delay="index * 100">
            <div class="stat-icon">
              <el-icon>
                <component :is="stat.icon" />
              </el-icon>
            </div>
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
            <div class="stat-desc">{{ stat.description }}</div>
          </div>
        </div>
      </div>

      <!-- 行动号召区域 -->
      <div class="cta-section" data-aos="fade-up">
        <div class="cta-content">
          <h3>开启AR教育创新之旅</h3>
          <p>立即体验我们的AR教育平台，开启沉浸式学习新时代</p>
          <el-button type="primary" size="large" @click="openLoginDialog" class="cta-button">免费试用</el-button>
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

// 获取主题设置
const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === 'dark');

// 发送打开登录对话框事件
const emit = defineEmits(['openLogin']);
const openLoginDialog = () => {
  emit('openLogin');
};

// AR教育解决方案
const arSolutions = [
  {
    id: 1,
    title: '沉浸式学习',
    description: '通过AR技术创建交互式学习环境，让学生在虚拟场景中探索和互动，提升知识理解和记忆效果。',
    icon: 'View',
    features: [
      '3D模型互动探索',
      '身临其境的知识讲解',
      '多感官学习体验'
    ]
  },
  {
    id: 2,
    title: '可视化编程',
    description: 'Blockly拖拽式编程模块，让编程学习变得直观有趣，降低编程学习门槛，培养逻辑思维能力。',
    icon: 'Connection',
    features: [
      '积木式编程界面',
      '一键转换多种编程语言',
      '实时预览运行效果'
    ]
  },
  {
    id: 3,
    title: '远程协作学习',
    description: '支持多人同时在线协作学习，突破地域限制，实现远程教学和协作项目开发。',
    icon: 'Operation',
    features: [
      '实时多人协作',
      '远程指导互动',
      '项目共享与展示'
    ]
  },
  {
    id: 4,
    title: '学习数据分析',
    description: '全面记录和分析学习过程数据，为教师和学生提供个性化学习反馈和建议。',
    icon: 'DataAnalysis',
    features: [
      '学习行为追踪',
      '个性化学习报告',
      '智能学习路径推荐'
    ]
  }
];

// 教育统计数据
const educationStats = [
  {
    icon: 'TrendCharts',
    value: '75%',
    label: '知识吸收效率提升',
    description: '相比传统教学方法，AR教育显著提高了知识理解和记忆效率'
  },
  {
    icon: 'Timer',
    value: '45%',
    label: '学习时间减少',
    description: '通过AR沉浸式学习，学生掌握同样知识点所需时间大幅减少'
  },
  {
    icon: 'Star',
    value: '87%',
    label: '学习兴趣提升',
    description: '生动互动的AR学习体验明显增强了学生的学习积极性和兴趣'
  },
  {
    icon: 'Checked',
    value: '93%',
    label: '用户满意度',
    description: '教师和学生对AR教育平台的功能和学习效果表示高度满意'
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
  background: linear-gradient(90deg, #3498db, #00d2ff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-block;
}

.section-divider {
  width: 60px;
  height: 4px;
  background: linear-gradient(90deg, #3498db, #00d2ff);
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

/* 技术展示区样式 */
.technology-showcase {
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

.technology-container {
  display: flex;
  align-items: center;
  gap: 50px;
  background-color: var(--el-bg-color-overlay);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.08);
}

.technology-container.reverse {
  flex-direction: row-reverse;
}

.technology-visual {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.tech-image {
  width: 100%;
  height: 100%;
  min-height: 400px;
  object-fit: cover;
  transition: transform 0.6s ease;
}

.technology-visual:hover .tech-image {
  transform: scale(1.05);
}

.tech-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.4), transparent);
}

.technology-container.reverse .tech-overlay {
  background: linear-gradient(to left, rgba(0, 0, 0, 0.4), transparent);
}

.technology-content {
  flex: 1;
  padding: 50px;
}

.technology-content h4 {
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: var(--el-text-color-primary);
}

.technology-content p {
  font-size: 1.05rem;
  line-height: 1.7;
  color: var(--el-text-color-secondary);
  margin-bottom: 30px;
}

.tech-features {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.tech-feature {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tech-feature .el-icon {
  color: var(--el-color-primary);
  font-size: 22px;
}

.tech-feature span {
  font-size: 0.95rem;
  color: var(--el-text-color-regular);
}

/* 统计数据样式 */
.stats-section {
  margin-bottom: 80px;
}

.stats-header {
  text-align: center;
  margin-bottom: 50px;
}

.stats-header h3 {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 15px;
  color: var(--el-text-color-primary);
}

.stats-header p {
  font-size: 1.1rem;
  color: var(--el-text-color-secondary);
  max-width: 700px;
  margin: 0 auto;
}

.stats-divider {
  margin-bottom: 15px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
}

.stat-card {
  background-color: var(--el-bg-color-overlay);
  border-radius: 16px;
  padding: 30px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-10px);
}

.stat-icon {
  width: 70px;
  height: 70px;
  background: linear-gradient(135deg, var(--el-color-primary-light-7), var(--el-color-primary));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  color: white;
  font-size: 32px;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(90deg, #3498db, #00d2ff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 10px;
}

.stat-label {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 10px;
}

.stat-desc {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

/* 行动号召区域 */
.cta-section {
  padding: 80px 60px;
  background: linear-gradient(135deg, #3498db, #00d2ff);
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
  overflow: hidden;
  z-index: 1;
}

.particle {
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float 15s infinite linear;
}

.particle-1 {
  top: -50px;
  left: 10%;
  width: 120px;
  height: 120px;
  animation-duration: 20s;
}

.particle-2 {
  top: 30%;
  right: -30px;
  width: 80px;
  height: 80px;
  animation-duration: 25s;
  animation-delay: 2s;
}

.particle-3 {
  bottom: 20%;
  left: 5%;
  width: 60px;
  height: 60px;
  animation-duration: 18s;
  animation-delay: 5s;
}

.particle-4 {
  bottom: -30px;
  right: 20%;
  width: 90px;
  height: 90px;
  animation-duration: 22s;
  animation-delay: 7s;
}

.particle-5 {
  top: 40%;
  left: 30%;
  width: 50px;
  height: 50px;
  animation-duration: 15s;
  animation-delay: 1s;
}

.particle-6 {
  top: 20%;
  right: 25%;
  width: 70px;
  height: 70px;
  animation-duration: 19s;
  animation-delay: 3s;
}

@keyframes float {
  0% {
    transform: translateY(0) translateX(0) rotate(0deg);
    opacity: 0.5;
  }

  50% {
    transform: translateY(100px) translateX(100px) rotate(180deg);
    opacity: 1;
  }

  100% {
    transform: translateY(0) translateX(0) rotate(360deg);
    opacity: 0.5;
  }
}

/* Blockly 区域特殊样式 */
.blockly-section {
  background: linear-gradient(to bottom, var(--el-bg-color), var(--el-bg-color-overlay));
  padding: 50px 0;
  border-radius: 16px;
  margin: 80px 0;
}

.dark-theme .blockly-section {
  background: linear-gradient(to bottom, var(--el-bg-color-darker), var(--el-bg-color));
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .technology-container {
    flex-direction: column;
    gap: 0;
  }

  .technology-container.reverse {
    flex-direction: column;
  }

  .technology-content {
    padding: 30px;
  }

  .tech-features {
    grid-template-columns: 1fr;
  }

  .section-title {
    font-size: 2.5rem;
  }

  .showcase-header h3,
  .stats-header h3 {
    font-size: 1.8rem;
  }

  .cta-section {
    padding: 60px 30px;
  }

  .cta-section h3 {
    font-size: 2rem;
  }
}

@media (max-width: 768px) {
  .solutions-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .section-title {
    font-size: 2rem;
  }

  .section-subtitle,
  .showcase-header p,
  .stats-header p {
    font-size: 1rem;
  }

  .cta-section h3 {
    font-size: 1.8rem;
  }

  .cta-section p {
    font-size: 1rem;
  }

  .cta-button {
    padding: 12px 30px;
    font-size: 1rem;
  }
}
</style>