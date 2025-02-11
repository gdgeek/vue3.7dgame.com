<template>
  <div class="app-container">
    <!-- 导航栏 -->
    <nav class="nav-container">
      <div class="nav-left">
        <img src="/public/media/image/logo.gif" alt="Logo" class="logo" />
        <span class="company-name">上海不加班科技有限公司</span>
      </div>
      <div class="nav-right">
        <div
          v-for="item in navItems"
          :key="item.key"
          :class="['nav-item', { active: currentTab === item.key }]"
          @click="switchTab(item.key)"
        >
          {{ item.label }}
        </div>
      </div>
    </nav>

    <!-- 内容区域 -->
    <div class="content-container">
      <div v-if="currentTab === 'about'" class="content-section">
        <div class="fullpage-container" @wheel="handleWheel">
          <div
            class="slides-container"
            :style="{ transform: `translateY(-${currentIndex * 100}%)` }"
          >
            <div v-for="(slide, index) in slides" :key="index" class="slide">
              <div class="slide-content">
                <img :src="slide.image" :alt="slide.title" />
                <div
                  class="text-overlay"
                  :class="{
                    'fade-out': isTextFading && currentIndex === index,
                  }"
                >
                  <h2>{{ slide.title }}</h2>
                  <p>{{ slide.description }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧滑块指示器 -->
          <div class="slide-indicators">
            <div
              v-for="(_, index) in slides"
              :key="index"
              :class="['indicator', { active: currentIndex === index }]"
              @click="goToSlide(index)"
            ></div>
          </div>
        </div>

        <!-- 新增的 Hello World 文本 -->
        <!-- <div class="hello-text">Hello World</div> -->
      </div>
      <div v-if="currentTab === 'products'" class="content-section">
        <h1>我们的产品</h1>
        <p>products</p>
      </div>
      <div v-if="currentTab === 'news'" class="content-section">
        <h1>新闻动态</h1>
        <p>news</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

defineOptions({
  name: "Introduce",
  inheritAttrs: false,
});

// 导航项配置
const navItems = [
  { key: "about", label: "关于我们" },
  { key: "products", label: "我们的产品" },
  { key: "news", label: "新闻动态" },
];

// 当前选中的标签
const currentTab = ref("about");

// 切换标签方法
const switchTab = (tab: string) => {
  currentTab.value = tab;
};

// 轮播图数据
const slides = [
  {
    image: "/public/media/bg/05.jpg",
    title: "And the technologies that",
    description: "make it possible",
  },
  {
    image: "/public/media/bg/03.jpg",
    title: "Innovation drives growth",
    description: "Discover our journey",
  },
  {
    image: "/public/media/bg/04.jpg",
    title: "Building the future",
    description: "Together with our partners",
  },
];

const currentIndex = ref(0);
const isTextFading = ref(false);
let scrollTimeout: any = null;
let isScrolling = false;

// 处理滚轮事件
const handleWheel = (e: WheelEvent) => {
  if (isScrolling) return;

  const direction = e.deltaY > 0 ? 1 : -1;

  if (direction > 0 && currentIndex.value < slides.length - 1) {
    isScrolling = true;
    isTextFading.value = true;

    setTimeout(() => {
      currentIndex.value++;
      isTextFading.value = false;

      setTimeout(() => {
        isScrolling = false;
      }, 1000);
    }, 500);
  } else if (direction < 0 && currentIndex.value > 0) {
    isScrolling = true;
    isTextFading.value = true;

    setTimeout(() => {
      currentIndex.value--;
      isTextFading.value = false;

      setTimeout(() => {
        isScrolling = false;
      }, 1000);
    }, 500);
  }
};

// 直接跳转到指定幻灯片
const goToSlide = (index: number) => {
  if (isScrolling) return;
  isTextFading.value = true;

  setTimeout(() => {
    currentIndex.value = index;
    isTextFading.value = false;
  }, 500);
};

// 清理定时器
onUnmounted(() => {
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
});
</script>

<style lang="scss" scoped>
.app-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  width: 100%;
  margin: 0;
  padding: 0;
  overflow-y: scroll;

  &::-webkit-scrollbar {
    width: 16px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
}

.nav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 60px;
  height: 64px;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  box-sizing: border-box;
  position: relative;
  left: 0;
  right: 0;
  margin: 0;

  .nav-left {
    display: flex;
    align-items: center;

    .logo {
      width: 40px;
      height: 40px;
      margin-right: 12px;
    }

    .company-name {
      font-size: 20px;
      font-weight: bold;
      color: #333;
    }
  }

  .nav-right {
    display: flex;
    gap: 48px;

    .nav-item {
      font-size: 16px;
      color: #666;
      cursor: pointer;
      padding: 8px 16px;
      border-radius: 4px;
      transition: all 0.3s ease;

      &:hover {
        color: #1890ff;
        background-color: rgba(24, 144, 255, 0.1);
      }

      &.active {
        color: #1890ff;
        background-color: rgba(24, 144, 255, 0.1);
      }
    }
  }
}

.content-container {
  width: 100%;
  // max-width: 1200px;
  // margin: 48px auto;
  padding: 32px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;

  .content-section {
    h1 {
      font-size: 28px;
      color: #333;
      margin-bottom: 24px;
    }

    p {
      font-size: 16px;
      color: #666;
      line-height: 1.6;
    }
  }
}

.fullpage-container {
  height: calc(100vh - 64px); // 减去导航栏高度
  position: relative;
  overflow: hidden;
}

.slides-container {
  height: 100%;
  transition: transform 1s ease-in-out;
}

.slide {
  height: 100%;
  width: 100%;
  position: relative;

  .slide-content {
    height: 100%;
    width: 100%;
    position: relative;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
}

.text-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
  transition: opacity 0.5s ease;

  h2 {
    font-size: 48px;
    font-weight: bold;
    margin-bottom: 20px;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  }

  p {
    font-size: 24px;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  }

  &.fade-out {
    opacity: 0;
  }
}

.slide-indicators {
  position: fixed;
  right: 30px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 10;

  .indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.5);
    border: 2px solid white;
    cursor: pointer;
    transition: all 0.3s ease;

    &.active {
      background-color: white;
      transform: scale(1.2);
    }

    &:hover {
      background-color: white;
      transform: scale(1.1);
    }
  }
}

.content-container {
  padding: 0;
  max-width: none;
  margin: 0;
  background: none;
  box-shadow: none;
}
</style>
