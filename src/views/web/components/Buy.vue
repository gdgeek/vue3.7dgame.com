<template>
  <div class="stats-section" :class="{ 'dark-theme': isDark }">
    <div class="stats-background">
      <div class="parallax-bg" :style="parallaxStyle"></div>
      <div class="overlay"></div>
    </div>

    <div class="container">
      <div class="section-header" data-aos="fade-up">
        <h2 class="section-title">{{ $t('web.buy.title') }}</h2>
        <p class="section-subtitle">{{ $t('web.buy.subtitle') }}</p>
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
  <el-dialog v-if="buyItem" v-model="dialogVisible" :title="$t('web.buy.scanToBuy')" width="300">
    <ElCard class="buy-card">
      <div class="card-content">
        <el-image style="width: 100%; height: 100%" :src="buyItem.qrcode" fit="cover" />
        <div class="card-details">
          <h3><b>{{ buyItem.title }}</b></h3>
          <p>{{ buyItem.annotate }}</p>
          <p class="price">{{ buyItem.price }}</p>
          <p>{{ $t('web.buy.contactUnlock') }}</p>
        </div>
      </div>
      <div class="card-footer">
        <el-button type="primary" @click="open">{{ $t('web.buy.buyNow') }}</el-button>
        <el-button @click="dialogVisible = false">{{ $t('web.buy.cancel') }}</el-button>
      </div>
    </ElCard>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '@/store/modules/settings';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { DataAnalysis, User, Cellphone, Star } from '@element-plus/icons-vue';
import { ElMessageBox } from 'element-plus'
import type { Action } from 'element-plus'

const { t } = useI18n();

const dialogVisible = ref(false);
const open = () => {
  ElMessageBox.alert(t('web.buy.scanQrCode'), t('web.buy.purchase'), {
    confirmButtonText: t('web.buy.confirm'),
    callback: (action: Action) => { }
  });
};

const buyItem = ref<any>(null);
const buy = (item: any) => {
  buyItem.value = item;
  dialogVisible.value = true;
};

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
const stats = computed(() => [
  {
    label: t('web.buy.freeVersion'),
    message: t('web.buy.freeVersionDesc'),
    icon: DataAnalysis
  },
  {
    label: t('web.buy.deviceUnlock'),
    message: t('web.buy.deviceUnlockDesc'),
    icon: User
  },
  {
    label: t('web.buy.customDev'),
    message: t('web.buy.customDevDesc'),
    icon: Cellphone
  },
  {
    label: t('web.buy.unlockCode'),
    message: t('web.buy.unlockCodeDesc'),
    icon: Star
  }
]);

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

onMounted(() => {
  // 初始化AOS动画
  AOS.init({
    duration: 1000,
    once: false
  });

  // 添加鼠标移动监听
  window.addEventListener('mousemove', handleMouseMove);
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

    .case-title {
      color: #252b3a;
    }

    .case-description {
      color: #677288;
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
      color: #3b82f6;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
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
      color: #fff;
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
  text-align: center;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 30px 20px;
  width: 100%;
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
  cursor: pointer;

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
    }

    .case-description {
      font-size: 0.95rem;
      color: #677288;
      line-height: 1.6;
      margin-bottom: 16px;
    }
  }
}

.price {
  color: #3b82f6;
  font-size: 1rem;
  margin: 10px 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
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
