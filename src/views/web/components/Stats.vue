<template>
  <div class="stats-section" :class="{ 'dark-theme': isDark }">
    <div class="stats-background">
      <div class="parallax-bg" :style="parallaxStyle"></div>
      <div class="overlay"></div>
    </div>

    <div class="container">
      <div class="section-header" data-aos="fade-up">
        <h2 class="section-title">成功案例与数据</h2>
        <p class="section-subtitle">不断成长的AR混合现实编程平台</p>
      </div>

      <div class="stats-grid">
        <div class="stat-item" v-for="(stat, index) in stats" :key="index" data-aos="zoom-in"
          :data-aos-delay="index * 100">
          <div class="stat-icon">
            <component :is="stat.icon" />
          </div>
          <div class="stat-number">
            <span class="counter">{{ stat.value }}</span>
            <span class="unit">{{ stat.unit }}</span>
          </div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>

      <div class="cases-grid" data-aos="fade-up">
        <div class="case-card" v-for="(caseItem, index) in cases" :key="index" data-aos="fade-up"
          :data-aos-delay="index * 100">
          <div class="case-image">
            <img :src="caseItem.image" :alt="caseItem.title" />
            <div class="case-overlay">
              <div class="case-tags">
                <span class="case-tag" v-for="(tag, tagIndex) in caseItem.tags" :key="tagIndex">
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
          <div class="case-content">
            <h3 class="case-title">{{ caseItem.title }}</h3>
            <p class="case-description">{{ caseItem.description }}</p>
            <el-button class="case-button" type="text">查看详情<el-icon>
                            <ArrowRight />
                          </el-icon></el-button>
          </div>
        </div>
      </div>

      <div class="testimonials" data-aos="fade-up">
        <el-carousel :interval="5000" type="card" height="300px">
          <el-carousel-item v-for="(testimonial, index) in testimonials" :key="index">
            <div class="testimonial-card">
              <div class="testimonial-content">
                <el-icon class="testimonial-quote">
                  <ChatDotSquare />
                </el-icon>
                <p class="testimonial-text">{{ testimonial.text }}</p>
                <div class="testimonial-author">
                  <img :src="testimonial.avatar" :alt="testimonial.name" class="testimonial-avatar" />
                  <div class="testimonial-info">
                    <h4 class="testimonial-name">{{ testimonial.name }}</h4>
                    <p class="testimonial-position">{{ testimonial.position }}</p>
                  </div>
                </div>
              </div>
            </div>
          </el-carousel-item>
        </el-carousel>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useSettingsStore } from '@/store/modules/settings';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { DataAnalysis, User, Cellphone, Star, ChatDotSquare } from '@element-plus/icons-vue';

const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === 'dark');

// 视差效果
const mouseX = ref(0);
const mouseY = ref(0);
const parallaxStyle = computed(() => {
  return {
    transform: `translate(${mouseX.value * -15}px, ${mouseY.value * -15}px) scale(1.1)`
  };
});

// 监听鼠标移动
const handleMouseMove = (e: MouseEvent) => {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  mouseX.value = (e.clientX / windowWidth - 0.5) * 2;
  mouseY.value = (e.clientY / windowHeight - 0.5) * 2;
};

// 统计数据
const stats = [
  {
    value: '500',
    unit: '+',
    label: '成功案例',
    icon: DataAnalysis
  },
  {
    value: '20,000',
    unit: '+',
    label: '活跃用户',
    icon: User
  },
  {
    value: '10',
    unit: '万+',
    label: 'AR应用开发',
    icon: Cellphone
  },
  {
    value: '98',
    unit: '%',
    label: '用户满意度',
    icon: Star
  }
];

// 启动数字递增动画
const animateCounters = () => {
  const counters = document.querySelectorAll('.counter');
  counters.forEach(counter => {
    const target = Number(counter.textContent?.replace(/,/g, '') || '0');
    const increment = target / 50;
    let count = 0;

    const updateCount = () => {
      if (count < target) {
        count += increment;
        if (count > target) count = target;
        counter.textContent = Math.floor(count).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        requestAnimationFrame(updateCount);
      }
    };

    updateCount();
  });
};

// 监听元素进入视口
const observeStats = () => {
  const statsSection = document.querySelector('.stats-grid');
  if (!statsSection) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounters();
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.3
  });

  observer.observe(statsSection);
};

// 案例数据
const cases = [
  {
    image: '/media/bg/education.jpg',
    title: '教育行业 AR 应用',
    description: '通过 AR 技术让抽象概念变得直观易懂，提升学生学习兴趣与效率',
    tags: ['教育', 'AR学习']
  },
  {
    image: '/media/bg/business2.jpg',
    title: '企业协作解决方案',
    description: '远程团队协作系统，打破地域限制，实现实时空间共享与交流',
    tags: ['企业', '协作']
  },
  {
    image: '/media/bg/exhibition1.jpg',
    title: '展览展示互动体验',
    description: '为博物馆与展览提供沉浸式 AR 导览与互动体验',
    tags: ['展览', '文化']
  }
];

// 用户评价
const testimonials = [
  {
    text: '不加班AR编程平台彻底改变了我们的工作方式。团队成员可以同时在虚拟环境中协作，无论身处何地。这大大提高了我们的工作效率和创意表达能力。',
    name: '张经理',
    position: '某科技公司产品总监',
    avatar: '/media/icon/avatar1.jpg'
  },
  {
    text: '作为一名教师，这个平台让我能够创建生动的教学内容，学生们对这种互动式学习方式非常投入。最重要的是，我不需要任何编程知识就能轻松使用。',
    name: '李老师',
    position: '高中物理教师',
    avatar: '/media/icon/avatar2.jpg'
  },
  {
    text: '我们博物馆使用这个平台开发了AR导览系统，访客反馈非常积极。数据显示我们的停留时间和参与度都有显著提升，这是传统展示方式无法比拟的。',
    name: '王馆长',
    position: '某科技博物馆馆长',
    avatar: '/media/icon/avatar3.jpg'
  }
];

onMounted(() => {
  // 初始化AOS动画
  AOS.init({
    duration: 1000,
    once: false
  });

  // 添加鼠标移动监听
  window.addEventListener('mousemove', handleMouseMove);

  // 设置观察者监听统计区域出现在视口
  observeStats();
});

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove);
});
</script>

<style lang="scss" scoped>
.stats-section {
  position: relative;
  padding: 120px 0;
  color: #fff;
  overflow: hidden;

  &:not(.dark-theme) {
    .section-title {
      color: #252b3a;
    }

    .section-subtitle {
      color: #677288;
    }

    .stat-number {
      color: #3b82f6;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .stat-label {
      color: #252b3a;
    }

    .stat-icon {
      color: #3b82f6;
      background-color: rgba(59, 130, 246, 0.1);
    }

    .stats-background .overlay {
      background: linear-gradient(to right, rgba(255, 255, 255, 0.9), rgba(240, 240, 240, 0.9));
    }
  }

  &.dark-theme {
    .section-title {
      color: #fff;
    }

    .section-subtitle {
      color: #a0a0a0;
    }

    .stat-number {
      color: #fff;
    }

    .stat-label {
      color: rgba(255, 255, 255, 0.8);
    }

    .stat-icon {
      color: #fff;
      background-color: rgba(255, 255, 255, 0.1);
    }

    .case-card {
      background-color: #1e1e1e;
    }

    .case-title {
      color: #fff;
    }

    .case-description {
      color: #a0a0a0;
    }

    .testimonial-card {
      background-color: #1e1e1e;

      .testimonial-text,
      .testimonial-name {
        color: #fff;
      }

      .testimonial-position {
        color: #a0a0a0;
      }
    }
  }
}

.stats-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;

  .parallax-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url('/media/bg/cloudbgc5.jpg');
    background-size: cover;
    background-position: center;
    transition: transform 0.2s ease-out;
  }

  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to right, rgba(52, 48, 149, 0.8), rgba(59, 178, 184, 0.8));
  }
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  position: relative;
  z-index: 1;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;

  .section-title {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 16px;
    color: #fff;
    position: relative;
    display: inline-block;

    &:after {
      content: '';
      position: absolute;
      bottom: -10px;
      left: 50%;
      transform: translateX(-50%);
      width: 80px;
      height: 4px;
      background: linear-gradient(90deg, #7367f0, #00cfe8);
      border-radius: 2px;
    }
  }

  .section-subtitle {
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.9);
    max-width: 700px;
    margin: 0 auto;
  }
}

// 统计数据样式
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30px;
  margin-bottom: 80px;
}

.stat-item {
  text-align: center;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 30px 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-10px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
  }

  .stat-icon {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 70px;
    height: 70px;
    margin: 0 auto 20px;
    font-size: 1.8rem;
    border-radius: 50%;
    transition: all 0.3s ease;

    svg {
      width: 35px;
      height: 35px;
    }
  }

  &:hover .stat-icon {
    transform: scale(1.1);
  }

  .stat-number {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 12px;
    display: flex;
    justify-content: center;
    align-items: baseline;

    .unit {
      font-size: 1.5rem;
      margin-left: 4px;
    }
  }

  .stat-label {
    font-size: 1.1rem;
    font-weight: 500;
  }
}

// 案例样式
.cases-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
  margin-bottom: 80px;
}

.case-card {
  background-color: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-10px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);

    .case-image img {
      transform: scale(1.05);
    }
  }

  .case-image {
    position: relative;
    height: 200px;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s ease;
    }

    .case-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 15px;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);

      .case-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;

        .case-tag {
          padding: 4px 10px;
          background-color: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(5px);
          border-radius: 50px;
          font-size: 0.75rem;
          color: #fff;
        }
      }
    }
  }

  .case-content {
    padding: 24px;

    .case-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 12px;
      color: #252b3a;
    }

    .case-description {
      font-size: 0.95rem;
      color: #677288;
      line-height: 1.6;
      margin-bottom: 16px;
    }
  }
}

// 用户评价样式
.testimonials {
  padding: 40px 0;

  .el-carousel__item {
    border-radius: 12px;
  }
}

.testimonial-card {
  height: 100%;
  background-color: #fff;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);

  .testimonial-content {
    height: 100%;
    display: flex;
    flex-direction: column;

    .testimonial-quote {
      font-size: 2rem;
      color: #3b82f6;
      margin-bottom: 16px;
    }

    .testimonial-text {
      font-size: 1.1rem;
      color: #4b5563;
      line-height: 1.6;
      flex-grow: 1;
      margin-bottom: 24px;
    }

    .testimonial-author {
      display: flex;
      align-items: center;

      .testimonial-avatar {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        object-fit: cover;
        margin-right: 16px;
        border: 2px solid #3b82f6;
      }

      .testimonial-info {
        .testimonial-name {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 4px;
          color: #111827;
        }

        .testimonial-position {
          font-size: 0.9rem;
          color: #6b7280;
        }
      }
    }
  }
}

// 响应式调整
@media screen and (max-width: 992px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }

  .stat-item {
    padding: 20px 15px;

    .stat-icon {
      width: 60px;
      height: 60px;
      font-size: 1.5rem;

      svg {
        width: 28px;
        height: 28px;
      }
    }

    .stat-number {
      font-size: 2.2rem;

      .unit {
        font-size: 1.3rem;
      }
    }

    .stat-label {
      font-size: 1rem;
    }
  }

  .cases-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media screen and (max-width: 768px) {
  .stats-section {
    padding: 80px 0;
  }

  .section-header {
    margin-bottom: 40px;

    .section-title {
      font-size: 2rem;
    }

    .section-subtitle {
      font-size: 1rem;
    }
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
  }

  .stat-item {
    padding: 15px 10px;

    .stat-icon {
      width: 50px;
      height: 50px;
      margin-bottom: 15px;

      svg {
        width: 24px;
        height: 24px;
      }
    }

    .stat-number {
      font-size: 1.8rem;

      .unit {
        font-size: 1.1rem;
      }
    }

    .stat-label {
      font-size: 0.9rem;
    }
  }

  .cases-grid {
    grid-template-columns: 1fr;
  }

  .testimonial-card {
    padding: 24px;

    .testimonial-text {
      font-size: 1rem;
    }
  }
}

@media screen and (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .stat-item {
    max-width: 280px;
    margin: 0 auto;
  }
}
</style>