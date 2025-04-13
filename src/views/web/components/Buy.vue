<template>
  <div class="stats-section" :class="{ 'dark-theme': isDark }">
    <div class="stats-background">
      <div class="parallax-bg" :style="parallaxStyle"></div>
      <div class="overlay"></div>
    </div>

    <div class="container">
      <div class="section-header" data-aos="fade-up">
        <h2 class="section-title">如何获得平台授权</h2>
        <p class="section-subtitle">只需从本渠道购买相应设备，即可终生使用平台。</p>
      </div>

      <div class="stats-grid">
        <div class="stat-item" v-for="(stat, index) in stats" :key="index" data-aos="zoom-in"
          :data-aos-delay="index * 100">
          <div class="stat-icon">
            <component :is="stat.icon" />
          </div>
          <div class="stat-number">

            <span class="unit">{{ stat.label }}</span>
          </div>
          <div class="stat-label">{{ stat.message }}</div>
        </div>
      </div>

      <div class="cases-grid" data-aos="fade-up">
        <div @click="buy(item)" class="case-card" v-for="(item, index) in cases" :key="index" data-aos="fade-up"
          :data-aos-delay="index * 100">
          <div class="case-image">
            <img :src="item.image" :alt="item.title" />
            <div class="case-overlay">
              <div class="case-tags">
                <span class="case-tag" v-for="(tag, tagIndex) in item.tags" :key="tagIndex">
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
          <div class="case-content">
            <h3 class="case-title">{{ item.title }} </h3>
            <p class="stat-number">{{ item.price }}</p>
            <p class="stat-label">{{ item.description }}</p>
            <p class="case-description">{{ item.annotate }}</p>

          </div>
        </div>
      </div>


    </div>
  </div>
  <el-dialog v-if="buyItem" v-model="dialogVisible" :title="'微信扫描购买'" width="300">

    <ElCard class="buy-card">
      <div class="card-content">

        <el-image style="width: 100%; height: 100%" :src="buyItem.qrcode" fit="cover" />

        <div class="card-details">
          <h3><b>{{ buyItem.title }}</b></h3>
          <p>{{ buyItem.annotate }}</p>
          <p class="price">{{ buyItem.price }}</p>
        </div>
      </div>
      <div class="card-footer">
        <el-button type="primary" @click="open">立即购买</el-button>
        <el-button @click="dialogVisible = false">取消</el-button>
      </div>
    </ElCard>


  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useSettingsStore } from '@/store/modules/settings';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { DataAnalysis, User, Cellphone, Star, ChatDotSquare } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Action } from 'element-plus'
const dialogVisible = ref(false)
const open = () => {
  ElMessageBox.alert('请扫小程序码进入商城', '购买', {
    // if you want to disable its autofocus
    // autofocus: false,
    confirmButtonText: '确认',
    callback: (action: Action) => {

    },
  })
}
const buyItem = ref<any>(null);
const buy = (item: any) => {
  buyItem.value = item;
  dialogVisible.value = true;

}

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
    label: '免费版本',
    message: '无需任何费用，即可使用！',
    icon: DataAnalysis
  },
  {
    value: '20,000',
    unit: '+',
    label: '设备绑定',
    message: '从本站渠道采购硬件设备，获得完全授权去除水印。',
    icon: User
  },
  {
    value: '10',
    unit: '免费解锁十台设备',
    label: '定制开发',
    message: '定制开发项目，可免费解锁十台设备',
    icon: Cellphone
  },
  {
    value: '98',
    unit: '%',
    label: '设备解锁',
    message: '可以单独购买设备解锁码，解锁设备',
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
    image: '/media/bg/rokid/studio.png',
    qrcode: '/media/bg/rokid/qr_studio.png',
    title: 'Rokid AR Studio',
    description: '6Dof 设备，完整AR体验，适合所有场景，可以完整使用三方视角。商业项目请优先选择这个。',
    price: '￥8,300 + ￥8,500',
    annotate: '注：完整体验需要购买Max Pro 眼镜和  Station Pro 计算单元。',
    tags: ['6Dof 设备', '手势识别', '语音控制', '图片追踪']
  },
  {
    image: '/media/bg/rokid/lite.png',
    qrcode: '/media/bg/rokid/qr_lite.png',
    title: 'Rokid AR Lite',
    description: '3Dof设备，简单灵活，适合简单的AR体验，适合教育和轻量级商业项目。',
    annotate: '注：Lite设备没有空间定位能力，无法完整实现三方视角，但可以实现多设备互动，购买前请确认是否适合您的项目。',
    price: '￥4,499',
    tags: ['Rokid AR Lite', '3Dof 设备']
  },
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

    .case-price {
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
  cursor: pointer;
  /* 添加手型光标 */
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
  cursor: pointer;
  /* 添加手型光标 */
  display: grid;
  grid-template-columns: repeat(2, 1fr);
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
