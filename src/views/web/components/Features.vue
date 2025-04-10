<template>
  <div class="features-section" ref="featuresRef" :class="{ 'dark-theme': isDark }">
    <div class="container">
      <div class="section-header" data-aos="fade-up">
        <h2 class="section-title">平台特色优势</h2>
        <p class="section-subtitle">简单易用的AR编程平台，助您实现创意无限可能</p>
      </div>

      <div class="features-grid">
        <div class="feature-card" v-for="(feature, index) in features" :key="index" data-aos="fade-up"
          :data-aos-delay="index * 100">
          <div class="feature-icon" :style="{ backgroundColor: feature.color }">
            <el-icon class="feature-icon">
              <component :is="feature.icon" />
            </el-icon>
          </div>
          <h3 class="feature-title">{{ feature.title }}</h3>
          <p class="feature-description">{{ feature.description }}</p>
        </div>
      </div>

      <div class="feature-showcase" data-aos="fade-up">
        <div class="showcase-content">
          <h3 class="showcase-title">沉浸式多人协作体验</h3>
          <p class="showcase-description">
            通过混合现实技术，团队成员可以同时在虚拟环境中协作，无论身处何地。打破空间限制，提升团队协作效率。
          </p>
          <ul class="showcase-list">
            <li class="feature-item" v-for="(item, index) in collaborationFeatures" :key="index">
              <el-icon class="feature-icon">
                <component :is="item.icon" />
              </el-icon>
              <span>{{ item.text }}</span>
            </li>
          </ul>
          <el-button type="primary" class="showcase-button">了解更多</el-button>
        </div>
        <div class="showcase-image" data-aos="fade-left" data-aos-delay="200">
          <img src="/media/bg/exhibition3.jpg" alt="多人协作" />
          <div class="image-overlay"></div>
        </div>
      </div>

      <div class="feature-showcase reverse" data-aos="fade-up">
        <div class="showcase-image" data-aos="fade-right" data-aos-delay="200">
          <img src="/media/bg/sand-screen.jpg" alt="可视化编程" />
          <div class="image-overlay"></div>
        </div>
        <div class="showcase-content">
          <h3 class="showcase-title">零门槛可视化编程</h3>
          <p class="showcase-description">
            无需编程经验，通过拖拽式界面快速创建AR应用。简单易上手，让创意快速变为现实。
          </p>
          <ul class="showcase-list">
            <li class="feature-item" v-for="(item, index) in programmingFeatures" :key="index">
              <el-icon class="feature-icon">
                <component :is="item.icon" />
              </el-icon>
              <span>{{ item.text }}</span>
            </li>
          </ul>
          <el-button type="primary" class="showcase-button">立即尝试</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSettingsStore } from '@/store/modules/settings';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { Check, MagicStick, Cellphone, User, Collection, View, DataLine, Connection, Box, Cpu } from '@element-plus/icons-vue';

const featuresRef = ref(null);
const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === 'dark');

const features = [
  {
    title: '直观的可视化编辑器',
    description: '拖拽式界面设计，所见即所得，无需编写代码即可创建复杂AR场景',
    icon: MagicStick,
    color: '#4e7bec'
  },
  {
    title: '多平台部署',
    description: '一次创建，随处发布，支持iOS、Android、Web等多平台',
    icon: Cellphone,
    color: '#00b3b0'
  },
  {
    title: '丰富的模板库',
    description: '数百种精美模板和素材，帮助您快速开始项目',
    icon: Collection,
    color: '#ff6a00'
  },
  {
    title: '强大的资源管理',
    description: '高效组织和管理您的3D模型、音频、图片等资源',
    icon: Box,
    color: '#00b67a'
  },
  {
    title: '沉浸式体验',
    description: '创造身临其境的混合现实体验，增强用户互动参与感',
    icon: View,
    color: '#7b61ff'
  },
  {
    title: 'AI辅助创作',
    description: '利用人工智能技术，智能生成内容和优化用户体验',
    icon: Cpu,
    color: '#f43f5e'
  }
];

const collaborationFeatures = [
  { text: '多设备实时互动', icon: Connection },
  { text: '空间共享与操作', icon: User },
  { text: '语音视频实时通讯', icon: DataLine }
];

const programmingFeatures = [
  { text: '积木式编程界面', icon: Box },
  { text: '丰富模型与素材库', icon: Collection },
  { text: '实时预览与调试', icon: View }
];

onMounted(() => {
  AOS.init({
    duration: 800,
    easing: 'ease-in-out',
    once: false
  });
});
</script>

<style lang="scss" scoped>
.features-section {
  padding: 100px 0;
  background-color: #f8f9fa;
  position: relative;
  overflow: hidden;

  &.dark-theme {
    background-color: #121212;

    .section-title {
      color: #ffffff;
    }

    .section-subtitle {
      color: #a0a0a0;
    }

    .feature-card {
      background-color: #1e1e1e;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);

      .feature-title {
        color: #ffffff;
      }

      .feature-description {
        color: #a0a0a0;
      }
    }

    .showcase-title {
      color: #ffffff;
    }

    .showcase-description,
    .showcase-list li span {
      color: #a0a0a0;
    }
  }
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;

  .section-title {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 16px;
    color: #252b3a;
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
    color: #677288;
    max-width: 700px;
    margin: 0 auto;
  }
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 30px;
  margin-bottom: 80px;
}

.feature-card {
  background-color: #ffffff;
  border-radius: 10px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-10px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.12);

    .feature-icon {
      transform: rotateY(180deg);
    }
  }

  .feature-icon {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    transition: transform 0.6s ease;

    .feature-icon {
      font-size: 30px;
      color: #ffffff;
    }
  }

  .feature-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 12px;
    color: #252b3a;
  }

  .feature-description {
    font-size: 0.95rem;
    color: #677288;
    line-height: 1.6;
  }
}

.feature-showcase {
  display: flex;
  align-items: center;
  gap: 40px;
  margin-bottom: 80px;

  &.reverse {
    flex-direction: row-reverse;
  }

  .showcase-content {
    flex: 1;

    .showcase-title {
      font-size: 1.8rem;
      font-weight: 700;
      margin-bottom: 16px;
      color: #252b3a;
    }

    .showcase-description {
      font-size: 1rem;
      color: #677288;
      line-height: 1.6;
      margin-bottom: 24px;
    }

    .showcase-list {
      list-style: none;
      padding: 0;
      margin: 0 0 30px 0;

      .feature-item {
        display: flex;
        align-items: center;
        margin-bottom: 12px;

        .feature-icon {
          color: #28c76f;
          margin-right: 10px;
          font-size: 18px;
        }

        span {
          font-size: 1rem;
          color: #677288;
        }
      }
    }

    .showcase-button {
      padding: 12px 32px;
      font-weight: 600;
      border-radius: 50px;
    }
  }

  .showcase-image {
    flex: 1;
    position: relative;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);

    img {
      width: 100%;
      height: auto;
      display: block;
      transition: transform 0.5s ease;
    }

    &:hover img {
      transform: scale(1.05);
    }

    .image-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(to bottom, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.4));
    }
  }
}

@media screen and (max-width: 992px) {
  .feature-showcase {
    flex-direction: column;

    &.reverse {
      flex-direction: column;
    }

    .showcase-content,
    .showcase-image {
      width: 100%;
      max-width: 100%;
    }

    .showcase-image {
      margin-top: 30px;
    }

    &.reverse .showcase-image {
      margin-top: 0;
      margin-bottom: 30px;
    }
  }
}

@media screen and (max-width: 768px) {
  .features-section {
    padding: 60px 0;
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

  .features-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 60px;
  }

  .feature-showcase {
    margin-bottom: 60px;

    .showcase-content {
      .showcase-title {
        font-size: 1.5rem;
      }
    }
  }
}
</style>