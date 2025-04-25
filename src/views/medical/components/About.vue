<template>
  <div class="about-section" :class="{ 'dark-theme': isDark }">
    <div class="section-header" data-aos="fade-up">
      <h2 class="section-title">关于我们</h2>
      <p class="section-subtitle">专注于为医疗行业带来革命性AR技术解决方案</p>
      <div class="section-divider"></div>
    </div>

    <!-- 公司介绍 -->
    <div class="company-intro" data-aos="fade-up">
      <div class="intro-content">
        <h3>医疗AR科技领导者</h3>
        <p>我们是一家专注于医疗领域增强现实(AR)技术研发与应用的创新科技公司。凭借多年的技术积累和行业经验，我们致力于将最前沿的AR技术与医疗场景深度融合，为医疗机构和专业人士提供全方位的AR解决方案。</p>
        <p>公司拥有一支由医学专家、AR技术开发者和产品设计师组成的精英团队，我们始终以"技术创新，服务医疗"为核心理念，不断推动医疗AR领域的发展与突破。</p>
      </div>

      <div class="intro-image" data-aos="fade-left">
        <img src="https://img.freepik.com/free-photo/medical-workers-having-meeting_23-2149068523.jpg" alt="医疗AR科技团队" />
      </div>
    </div>

    <!-- 我们的使命和愿景 -->
    <div class="mission-vision" data-aos="fade-up">
      <div class="mission">
        <div class="icon-container">
          <el-icon>
            <Aim />
          </el-icon>
        </div>
        <h3>我们的使命</h3>
        <p>通过AR技术赋能医疗行业，提升医疗效率和精度，降低医疗风险，改善患者体验，推动医疗行业数字化转型。</p>
      </div>

      <div class="vision">
        <div class="icon-container">
          <el-icon>
            <View />
          </el-icon>
        </div>
        <h3>我们的愿景</h3>
        <p>成为医疗AR领域的全球领导者，让AR技术成为医疗行业的标准配置，为全球医疗健康事业贡献力量。</p>
      </div>
    </div>

    <!-- 核心价值观 -->
    <div class="core-values" data-aos="fade-up">
      <h3 class="values-title">核心价值观</h3>

      <div class="values-grid">
        <div class="value-card" data-aos="zoom-in" data-aos-delay="100">
          <div class="value-icon">
            <el-icon>
              <FirstAidKit />
            </el-icon>
          </div>
          <h4>患者至上</h4>
          <p>所有技术创新的出发点和落脚点都是为了患者的健康和福祉</p>
        </div>

        <div class="value-card" data-aos="zoom-in" data-aos-delay="200">
          <div class="value-icon">
            <el-icon>
              <Connection />
            </el-icon>
          </div>
          <h4>科技创新</h4>
          <p>不断突破技术边界，持续引领医疗AR技术的发展方向</p>
        </div>

        <div class="value-card" data-aos="zoom-in" data-aos-delay="300">
          <div class="value-icon">
            <el-icon>
              <CircleCheck />
            </el-icon>
          </div>
          <h4>精确可靠</h4>
          <p>追求亚毫米级的技术精度和99.9%的系统稳定性</p>
        </div>

        <div class="value-card" data-aos="zoom-in" data-aos-delay="400">
          <div class="value-icon">
            <el-icon>
              <Service />
            </el-icon>
          </div>
          <h4>专业服务</h4>
          <p>提供全方位的技术支持和培训，确保客户获得最佳使用体验</p>
        </div>
      </div>
    </div>

    <!-- 团队介绍 -->
    <div class="team-section" data-aos="fade-up">
      <h3 class="team-title">核心团队</h3>
      <p class="team-subtitle">由医疗专家和技术精英组成的专业团队</p>

      <div class="team-members">
        <div class="member-card" v-for="(member, index) in teamMembers" :key="index" data-aos="fade-up"
          :data-aos-delay="index * 100">
          <div class="member-photo">
            <img :src="member.photo" :alt="member.name" />
          </div>
          <div class="member-info">
            <h4 class="member-name">{{ member.name }}</h4>
            <p class="member-position">{{ member.position }}</p>
            <p class="member-bio">{{ member.bio }}</p>
            <div class="member-social">
              <el-icon v-for="social in member.social" :key="social.platform">
                <component :is="social.icon" />
              </el-icon>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 联系我们 -->
    <div class="contact-section" data-aos="fade-up">
      <div class="contact-card">
        <div class="contact-info">
          <h3>联系我们</h3>
          <p>如果您对我们的AR医疗解决方案感兴趣，或有任何问题需要咨询，请随时与我们联系。</p>

          <div class="contact-methods">
            <div class="contact-method">
              <el-icon>
                <Location />
              </el-icon>
              <span>北京市海淀区中关村科技园区</span>
            </div>
            <div class="contact-method">
              <el-icon>
                <Phone />
              </el-icon>
              <span>400-888-8888</span>
            </div>
            <div class="contact-method">
              <el-icon>
                <Message />
              </el-icon>
              <span>contact@armedical.com</span>
            </div>
          </div>

          <el-button type="primary" @click="openLoginDialog">预约咨询</el-button>
        </div>

        <div class="contact-map">
          <img src="https://img.freepik.com/free-vector/city-map_23-2147514701.jpg" alt="公司地图" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSettingsStore } from '@/store/modules/settings';
import {
  Aim,
  View,
  FirstAidKit,
  Connection,
  CircleCheck,
  Service,
  Location,
  Phone,
  Message,
  User,
  Link
} from '@element-plus/icons-vue';

// 获取主题设置
const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === 'dark');

// 发送打开登录对话框事件
const emit = defineEmits(['openLogin']);
const openLoginDialog = () => {
  emit('openLogin');
};

// 团队成员数据
const teamMembers = [
  {
    name: '张医生',
    position: '首席医疗顾问 / 口腔外科专家',
    bio: '北京大学口腔医学院教授，拥有20年口腔外科临床经验，带领团队将AR技术成功应用于口腔外科手术领域。',
    photo: 'https://img.freepik.com/free-photo/portrait-smiling-handsome-male-doctor-man_171337-5055.jpg',
    social: [
      { platform: 'wechat', icon: 'User' },
      { platform: 'website', icon: 'Link' }
    ]
  },
  {
    name: '李工程师',
    position: 'CTO / AR技术负责人',
    bio: '前微软AR研发核心工程师，拥有多项AR相关技术专利，在医疗AR领域有10年研发经验，专注于高精度AR算法开发。',
    photo: 'https://img.freepik.com/free-photo/portrait-white-man-isolated_53876-40306.jpg',
    social: [
      { platform: 'wechat', icon: 'User' },
      { platform: 'website', icon: 'Link' }
    ]
  },
  {
    name: '王总监',
    position: '产品总监',
    bio: '曾任职于顶尖医疗器械公司，对医疗行业有深入了解，擅长将医疗需求转化为产品功能，打造高满意度医疗AR产品。',
    photo: 'https://img.freepik.com/free-photo/woman-doctor-wearing-lab-coat-with-stethoscope-isolated_1303-29791.jpg',
    social: [
      { platform: 'wechat', icon: 'User' },
      { platform: 'website', icon: 'Link' }
    ]
  }
];
</script>

<style scoped>
.about-section {
  padding: 100px 0;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
}

.dark-theme.about-section {
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

/* 公司介绍部分 */
.company-intro {
  max-width: 1200px;
  margin: 0 auto 80px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 50px;
}

.intro-content {
  flex: 1;
}

.intro-content h3 {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: var(--el-text-color-primary);
}

.intro-content p {
  font-size: 1.1rem;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
  margin-bottom: 20px;
}

.intro-image {
  flex: 1;
  position: relative;
  height: 400px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
}

.intro-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.5s ease;
}

.intro-image:hover img {
  transform: scale(1.05);
}

/* 使命和愿景部分 */
.mission-vision {
  max-width: 1200px;
  margin: 0 auto 80px;
  padding: 0 20px;
  display: flex;
  gap: 40px;
}

.mission,
.vision {
  flex: 1;
  padding: 40px;
  border-radius: 16px;
  background-color: var(--el-bg-color-overlay);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.mission:hover,
.vision:hover {
  transform: translateY(-10px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.1);
}

.icon-container {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--el-color-primary-light-7), var(--el-color-primary));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 30px;
}

.mission h3,
.vision h3 {
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: var(--el-text-color-primary);
}

.mission p,
.vision p {
  font-size: 1.1rem;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

/* 核心价值观部分 */
.core-values {
  max-width: 1200px;
  margin: 0 auto 80px;
  padding: 0 20px;
}

.values-title {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 40px;
  text-align: center;
  color: var(--el-text-color-primary);
}

.values-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30px;
}

.value-card {
  padding: 30px;
  border-radius: 16px;
  background-color: var(--el-bg-color-overlay);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.value-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.1);
}

.value-icon {
  width: 70px;
  height: 70px;
  margin: 0 auto 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--el-color-primary-light-7), var(--el-color-primary));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 26px;
}

.value-card h4 {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 15px;
  color: var(--el-text-color-primary);
}

.value-card p {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

/* 团队部分 */
.team-section {
  max-width: 1200px;
  margin: 0 auto 80px;
  padding: 0 20px;
}

.team-title {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 10px;
  text-align: center;
  color: var(--el-text-color-primary);
}

.team-subtitle {
  font-size: 1.1rem;
  color: var(--el-text-color-secondary);
  text-align: center;
  margin-bottom: 50px;
}

.team-members {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 40px;
}

.member-card {
  flex: 0 0 calc(33.333% - 40px);
  max-width: 350px;
  border-radius: 16px;
  overflow: hidden;
  background-color: var(--el-bg-color-overlay);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.member-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.1);
}

.member-photo {
  height: 250px;
  overflow: hidden;
}

.member-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.5s ease;
}

.member-card:hover .member-photo img {
  transform: scale(1.05);
}

.member-info {
  padding: 25px;
}

.member-name {
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 5px;
  color: var(--el-text-color-primary);
}

.member-position {
  font-size: 0.9rem;
  color: var(--el-color-primary);
  margin-bottom: 15px;
  font-weight: 500;
}

.member-bio {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
  margin-bottom: 20px;
}

.member-social {
  display: flex;
  gap: 15px;
  color: var(--el-text-color-secondary);
  font-size: 18px;
}

.member-social .el-icon {
  cursor: pointer;
  transition: color 0.3s ease;
}

.member-social .el-icon:hover {
  color: var(--el-color-primary);
}

/* 联系我们部分 */
.contact-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.contact-card {
  display: flex;
  border-radius: 16px;
  overflow: hidden;
  background-color: var(--el-bg-color-overlay);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
}

.contact-info {
  flex: 1;
  padding: 40px;
}

.contact-info h3 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: var(--el-text-color-primary);
}

.contact-info p {
  font-size: 1.1rem;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
  margin-bottom: 30px;
}

.contact-methods {
  margin-bottom: 30px;
}

.contact-method {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  font-size: 1rem;
  color: var(--el-text-color-regular);
}

.contact-method .el-icon {
  margin-right: 15px;
  color: var(--el-color-primary);
  font-size: 20px;
}

.contact-map {
  flex: 1;
  min-height: 350px;
}

.contact-map img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 响应式样式 */
@media (max-width: 992px) {

  .company-intro,
  .contact-card {
    flex-direction: column;
    gap: 40px;
  }

  .intro-image {
    width: 100%;
    height: 350px;
  }

  .mission-vision {
    flex-direction: column;
  }

  .values-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .member-card {
    flex: 0 0 calc(50% - 20px);
  }
}

@media (max-width: 768px) {
  .about-section {
    padding: 70px 0;
  }

  .section-title {
    font-size: 2.2rem;
  }

  .section-subtitle {
    font-size: 1rem;
  }

  .intro-content h3 {
    font-size: 1.8rem;
  }

  .intro-content p {
    font-size: 1rem;
  }

  .mission h3,
  .vision h3 {
    font-size: 1.5rem;
  }

  .mission p,
  .vision p {
    font-size: 1rem;
  }

  .values-title {
    font-size: 1.8rem;
  }

  .team-title {
    font-size: 1.8rem;
  }

  .contact-info h3 {
    font-size: 1.7rem;
  }

  .contact-info p {
    font-size: 1rem;
  }
}

@media (max-width: 576px) {
  .values-grid {
    grid-template-columns: 1fr;
  }

  .member-card {
    flex: 0 0 100%;
  }

  .intro-image {
    height: 300px;
  }
}
</style>