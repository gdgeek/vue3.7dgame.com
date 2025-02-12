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
        <div
          class="carousel-container"
          @mouseenter="isCarouselHovered = true"
          @mouseleave="isCarouselHovered = false"
        >
          <el-carousel
            ref="carousel"
            height="900px"
            :autoplay="false"
            :interval="4000"
            direction="vertical"
            class="custom-carousel"
            @change="handleSlideChange"
          >
            <el-carousel-item v-for="(slide, index) in slides" :key="index">
              <div class="carousel-content">
                <img :src="slide.image" :alt="slide.title" />
                <div
                  class="text-overlay"
                  :class="[
                    {
                      'text-enter': currentSlide === index,
                      'text-leave': currentSlide !== index,
                    },
                    getCurrentAnimation(index),
                  ]"
                >
                  <h2>{{ slide.title }}</h2>
                  <p>{{ slide.description }}</p>
                </div>
              </div>
            </el-carousel-item>
          </el-carousel>
        </div>
        <div class="culture-section">
          <div class="random-gradient"></div>
          <div
            v-for="(culture, index) in cultures"
            :key="index"
            class="culture-item"
            :class="culture.position"
          >
            <div class="culture-content">
              <h2>{{ culture.title }}</h2>
              <p>{{ culture.description }}</p>
            </div>
            <div class="culture-image">
              <img :src="culture.image" :alt="culture.title" />
            </div>
          </div>
        </div>
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
    image: "/media/bg/05.jpg",
    title: "And the technologies that",
    description: "make it possible",
  },
  {
    image: "/media/bg/03.jpg",
    title: "Innovation drives growth",
    description: "Discover our journey",
  },
  {
    image: "/media/bg/04.jpg",
    title: "Building the future",
    description: "Together with our partners",
  },
];

// 添加当前显示的幻灯片索引
const currentSlide = ref(0);

// 处理幻灯片切换事件
const handleSlideChange = (index: number) => {
  currentSlide.value = index;
  // 为当前幻灯片随机分配一个新的动画效果
  const types = Object.values(AnimationTypes);
  slideAnimations.value[index] =
    types[Math.floor(Math.random() * types.length)];
};

const carousel = ref();

// 添加轮播图悬停状态
const isCarouselHovered = ref(false);

// 添加页面滚动位置检查
const isPageScrolled = ref(false);

// 添加滚动事件处理函数
const handleScroll = () => {
  isPageScrolled.value = window.scrollY > 0;
};

// 修改键盘事件处理函数
const handleKeydown = (event: KeyboardEvent) => {
  if (
    currentTab.value !== "about" ||
    !isCarouselHovered.value ||
    isPageScrolled.value
  )
    return;

  switch (event.key) {
    case "ArrowUp":
      if (currentSlide.value > 0) {
        event.preventDefault();
        carousel.value?.prev();
      }
      break;
    case "ArrowDown":
      if (currentSlide.value < slides.length - 1) {
        event.preventDefault();
        carousel.value?.next();
      }
      break;
  }
};

// 在组件挂载时添加事件监听
onMounted(() => {
  currentSlide.value = 0;
  // 初始化时为所有幻灯片分配随机动画
  slideAnimations.value = slides.map(() => {
    const types = Object.values(AnimationTypes);
    return types[Math.floor(Math.random() * types.length)];
  });

  // 添加键盘事件监听
  window.addEventListener("keydown", handleKeydown);
  // 添加滚动事件监听
  window.addEventListener("scroll", handleScroll);
});

// 在组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("scroll", handleScroll);
});

// 定义动画类型枚举
const AnimationTypes = {
  FADE_SLIDE: "fade-slide",
  SCALE: "scale",
  ROTATE: "rotate",
  SPLIT: "split",
  WAVE: "wave", // 波浪效果
  GLITCH: "glitch", // 故障效果
  REVEAL: "reveal", // 揭示效果
  FLOAT: "float", // 漂浮效果
} as const;

type AnimationType = (typeof AnimationTypes)[keyof typeof AnimationTypes];

// 为每个幻灯片分配随机动画类型
const slideAnimations = ref(
  slides.map(() => {
    const types = Object.values(AnimationTypes);
    return types[Math.floor(Math.random() * types.length)];
  })
);

// 获取当前幻灯片的动画类型
const getCurrentAnimation = (index: number) => {
  return slideAnimations.value[index];
};

// 在 script setup 中添加企业文化数据
const cultures = [
  {
    title: "企业文化",
    description:
      "字节范是字节跳动企业文化的重要组成部分，是我们共同认可的行为准则。",
    image: "/media/bg/05.jpg",
    position: "right", // 图片在右
  },
  {
    title: "始终创业",
    description: "保持创业心态，始终开创而不守成，创新而非依赖资源",
    image: "/media/bg/03.jpg",
    position: "left", // 图片在左
  },
  {
    title: "敏捷有效",
    description: "最简化流程，避免简单事情复杂化",
    image: "/media/bg/04.jpg",
    position: "right",
  },
];
</script>

<style lang="scss" scoped>
.app-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  width: 100%;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
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
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
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
  position: absolute;
  width: 100%;
  flex: 1;
  background-color: #fff;
  box-sizing: border-box;
  overflow: hidden;

  .content-section {
    height: 100%;

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

.custom-carousel {
  position: relative;
  height: 100%;

  .carousel-content {
    height: 100%;
    width: 100%;
    position: relative;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.6s ease;
    }
  }

  .text-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: white;
    z-index: 2;
    width: 100%;
    opacity: 0;
    transition: all 0.8s ease;

    // 优化淡入滑动动画
    &.fade-slide {
      &.text-enter {
        animation: fadeSlideEnter 1s cubic-bezier(0.215, 0.61, 0.355, 1)
          forwards;

        h2 {
          animation: fadeSlideTextEnter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)
            forwards;
          animation-delay: 0.2s;
        }

        p {
          animation: fadeSlideTextEnter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)
            forwards;
          animation-delay: 0.4s;
        }
      }

      &.text-leave {
        animation: fadeSlideLeave 0.6s forwards;
      }
    }

    // 缩放动画
    &.scale {
      &.text-enter {
        animation: scaleEnter 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;

        h2,
        p {
          animation: scaleTextEnter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)
            forwards;
        }
      }

      &.text-leave {
        animation: scaleLeave 0.6s forwards;
      }
    }

    // 优化旋转动画
    &.rotate {
      &.text-enter {
        animation: rotateEnter 1s cubic-bezier(0.215, 0.61, 0.355, 1) forwards;

        h2,
        p {
          animation: rotateTextEnter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)
            forwards;
        }
      }

      &.text-leave {
        animation: rotateLeave 0.6s forwards;
      }
    }

    // 分离动画
    &.split {
      &.text-enter {
        animation: splitEnter 0.8s forwards;

        h2 {
          animation: splitTextEnter 0.6s forwards;
          animation-delay: 0.2s;
        }

        p {
          animation: splitTextEnter 0.6s forwards;
          animation-delay: 0.4s;
        }
      }

      &.text-leave {
        animation: splitLeave 0.6s forwards;
      }
    }

    // 波浪动画
    &.wave {
      &.text-enter {
        animation: waveEnter 0.8s forwards;

        h2 {
          animation: waveTextEnter 0.8s cubic-bezier(0.215, 0.61, 0.355, 1)
            forwards;
          animation-delay: 0.2s;
        }

        p {
          animation: waveTextEnter 0.8s cubic-bezier(0.215, 0.61, 0.355, 1)
            forwards;
          animation-delay: 0.4s;
        }
      }

      &.text-leave {
        animation: waveLeave 0.6s forwards;
      }
    }

    // 故障效果动画
    &.glitch {
      &.text-enter {
        animation: glitchEnter 0.8s forwards;

        h2 {
          animation: glitchTextEnter 0.6s forwards;
          animation-delay: 0.2s;
        }

        p {
          animation: glitchTextEnter 0.6s forwards;
          animation-delay: 0.4s;
        }
      }

      &.text-leave {
        animation: glitchLeave 0.6s forwards;
      }
    }

    // 揭示效果动画
    &.reveal {
      &.text-enter {
        animation: revealEnter 0.8s forwards;

        h2 {
          animation: revealTextEnter 0.8s cubic-bezier(0.77, 0, 0.175, 1)
            forwards;
          animation-delay: 0.2s;
        }

        p {
          animation: revealTextEnter 0.8s cubic-bezier(0.77, 0, 0.175, 1)
            forwards;
          animation-delay: 0.4s;
        }
      }

      &.text-leave {
        animation: revealLeave 0.6s forwards;
      }
    }

    // 漂浮效果动画
    &.float {
      &.text-enter {
        animation: floatEnter 0.8s forwards;

        h2 {
          animation: floatTextEnter 1s cubic-bezier(0.34, 1.56, 0.64, 1)
            forwards;
          animation-delay: 0.2s;
        }

        p {
          animation: floatTextEnter 1s cubic-bezier(0.34, 1.56, 0.64, 1)
            forwards;
          animation-delay: 0.4s;
        }
      }

      &.text-leave {
        animation: floatLeave 0.6s forwards;
      }
    }

    h2 {
      font-size: 56px;
      font-weight: bold;
      margin-bottom: 25px;
      text-shadow: 2px 2px 6px rgba(0, 0, 0, 0.5);
    }

    p {
      font-size: 28px;
      line-height: 1.5;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    }

    h2,
    p {
      opacity: 0;
    }
  }
}

// 优化关键帧动画
@keyframes fadeSlideEnter {
  0% {
    opacity: 0;
    transform: translate(-50%, 50px);
  }

  60% {
    transform: translate(-50%, -60%);
  }

  100% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}

@keyframes fadeSlideLeave {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -30px);
  }
}

@keyframes fadeSlideTextEnter {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleEnter {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.7);
  }

  60% {
    transform: translate(-50%, -50%) scale(1.1);
  }

  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes scaleLeave {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.2);
  }
}

@keyframes scaleTextEnter {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes rotateEnter {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(-15deg) scale(0.8);
  }

  60% {
    transform: translate(-50%, -50%) rotate(5deg) scale(1.1);
  }

  100% {
    opacity: 1;
    transform: translate(-50%, -50%) rotate(0) scale(1);
  }
}

@keyframes rotateLeave {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) rotate(0);
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(10deg);
  }
}

@keyframes rotateTextEnter {
  0% {
    opacity: 0;
    transform: rotate(-10deg);
  }

  100% {
    opacity: 1;
    transform: rotate(0);
  }
}

@keyframes splitEnter {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
    filter: blur(10px);
  }

  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
    filter: blur(0);
  }
}

@keyframes splitLeave {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%);
    filter: blur(0);
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -50%);
    filter: blur(10px);
  }
}

@keyframes splitTextEnter {
  0% {
    opacity: 0;
    transform: translateX(-20px);
    filter: blur(5px);
  }

  100% {
    opacity: 1;
    transform: translateX(0);
    filter: blur(0);
  }
}

@keyframes waveEnter {
  0% {
    opacity: 0;
    transform: translate(-50%, -30%) scale(0.9);
  }

  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes waveTextEnter {
  0% {
    opacity: 0;
    transform: translateY(60px) rotate(-3deg);
  }

  60% {
    transform: translateY(-12px) rotate(2deg);
  }

  100% {
    opacity: 1;
    transform: translateY(0) rotate(0);
  }
}

@keyframes waveLeave {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -70%) scale(0.9);
  }
}

@keyframes glitchEnter {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) skew(10deg, 10deg);
    filter: blur(10px);
  }

  30% {
    transform: translate(-52%, -48%) skew(-5deg, -5deg);
    filter: blur(0px);
  }

  60% {
    transform: translate(-48%, -52%) skew(5deg, 5deg);
  }

  100% {
    opacity: 1;
    transform: translate(-50%, -50%) skew(0, 0);
  }
}

@keyframes glitchTextEnter {
  0% {
    opacity: 0;
    transform: skew(10deg, 10deg);
    filter: blur(5px);
  }

  30% {
    transform: skew(-5deg, -5deg);
  }

  60% {
    transform: skew(5deg, 5deg);
  }

  100% {
    opacity: 1;
    transform: skew(0, 0);
    filter: blur(0);
  }
}

@keyframes glitchLeave {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }

  30% {
    transform: translate(-52%, -48%) skew(5deg, 5deg);
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -50%) skew(-10deg, -10deg);
    filter: blur(10px);
  }
}

@keyframes revealEnter {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%);
    clip-path: inset(0 100% 0 0);
  }

  100% {
    opacity: 1;
    transform: translate(-50%, -50%);
    clip-path: inset(0 0 0 0);
  }
}

@keyframes revealTextEnter {
  0% {
    opacity: 0;
    transform: translateX(-100%);
  }

  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes revealLeave {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%);
    clip-path: inset(0 0 0 0);
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -50%);
    clip-path: inset(0 0 0 100%);
  }
}

@keyframes floatEnter {
  0% {
    opacity: 0;
    transform: translate(-50%, 20%) scale(0.8);
  }

  50% {
    transform: translate(-50%, -60%) scale(1.1);
  }

  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes floatTextEnter {
  0% {
    opacity: 0;
    transform: translateY(40px) scale(0.8);
  }

  50% {
    transform: translateY(-15px) scale(1.1);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes floatLeave {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -120%) scale(0.8);
  }
}

:deep(.el-carousel__item) {
  overflow: hidden;
  position: absolute;
  width: 100%;
  height: 100%;

  &.is-active {
    .carousel-content img {
      transform: scale(1.05);
    }
  }
}

:deep(.el-carousel__indicators--vertical) {
  right: 30px;
  top: 50%;
  transform: translateY(-50%);

  .el-carousel__button {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.5);
    border: 2px solid white;
    transition: all 0.3s ease;

    &:hover {
      background-color: white;
      transform: scale(1.1);
    }
  }

  .el-carousel__indicator.is-active .el-carousel__button {
    background-color: white;
    transform: scale(1.2);
  }
}

.culture-section {
  position: relative;
  top: 20px;
  padding: 60px 0;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  overflow: hidden;

  // 左上角渐变圆形
  &::before {
    content: "";
    position: absolute;
    z-index: 0;
    border-radius: 50%;
    box-shadow: inset 0 0 50px rgba(255, 255, 255, 0.5);
    width: 500px;
    height: 500px;
    background: linear-gradient(
      45deg,
      rgba(24, 144, 255, 0.6) 0%,
      rgba(24, 144, 255, 0.4) 33%,
      rgba(24, 144, 255, 0.2) 67%,
      rgba(24, 144, 255, 0.1) 100%
    );
    top: -200px;
    left: -200px;
    backdrop-filter: blur(5px);
    animation: floatGradientLeft 20s ease-in-out infinite;
  }

  // 右下角渐变圆形
  &::after {
    content: "";
    position: absolute;
    z-index: 0;
    border-radius: 50%;
    box-shadow: inset 0 0 50px rgba(255, 255, 255, 0.5);
    width: 500px;
    height: 500px;
    background: linear-gradient(
      225deg,
      rgba(255, 105, 20, 0.6) 0%,
      rgba(255, 105, 20, 0.4) 33%,
      rgba(255, 105, 20, 0.2) 67%,
      rgba(255, 105, 20, 0.1) 100%
    );
    bottom: -200px;
    right: -200px;
    backdrop-filter: blur(5px);
    animation: floatGradientRight 20s ease-in-out infinite;
  }

  // 添加随机位置的绿色渐变圆形
  .random-gradient {
    content: "";
    position: absolute;
    z-index: 0;
    border-radius: 50%;
    box-shadow: inset 0 0 50px rgba(255, 255, 255, 0.5);
    width: 400px;
    height: 400px;
    background: linear-gradient(
      135deg,
      rgba(82, 196, 26, 0.6) 0%,
      rgba(82, 196, 26, 0.4) 33%,
      rgba(82, 196, 26, 0.2) 67%,
      rgba(82, 196, 26, 0.1) 100%
    );
    position: absolute;
    left: var(--random-x, 50%);
    top: var(--random-y, 50%);
    transform: translate(-50%, -50%);
    backdrop-filter: blur(5px);
    animation: floatGradientCenter 20s ease-in-out infinite;
  }

  .culture-item {
    position: relative; // 确保内容在装饰背景之上
    z-index: 1;
    display: flex;
    align-items: center;
    max-width: 1400px;
    margin: 0 auto;
    padding: 40px 20px;
    gap: 60px;

    &.right {
      flex-direction: row;
    }

    &.left {
      flex-direction: row-reverse;
    }

    .culture-content {
      flex: 1;
      padding: 20px;
      opacity: 0;
      transform: translateY(20px);
      animation: fadeInUp 0.8s forwards;

      h2 {
        font-size: 36px;
        color: #333;
        margin-bottom: 20px;
        position: relative;

        &::after {
          content: "";
          position: absolute;
          bottom: -10px;
          left: 0;
          width: 40px;
          height: 3px;
          background: #1890ff;
        }
      }

      p {
        font-size: 18px;
        color: #666;
        line-height: 1.8;
        margin-top: 20px;
      }
    }

    .culture-image {
      flex: 1;
      height: 400px;
      overflow: hidden;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      opacity: 0;
      transform: translateX(20px);
      animation: fadeInSide 0.8s forwards;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s ease;

        &:hover {
          transform: scale(1.05);
        }
      }
    }

    // 为左右布局设置不同的动画延迟
    &.right {
      .culture-content {
        animation-delay: 0.2s;
      }

      .culture-image {
        animation-delay: 0.4s;
      }
    }

    &.left {
      .culture-content {
        animation-delay: 0.4s;
      }

      .culture-image {
        transform: translateX(-20px);
        animation-delay: 0.2s;
      }
    }
  }
}

// 添加动画关键帧
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInSide {
  from {
    opacity: 0;
    transform: translateX(20px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .culture-section {
    .culture-item {
      flex-direction: column !important;
      padding: 20px;

      .culture-content,
      .culture-image {
        width: 100%;
      }

      .culture-image {
        height: 300px;
      }
    }
  }
}

.carousel-container {
  width: 100%;
  height: 100%;
  position: relative;
  cursor: s-resize;
  overflow: hidden;

  :deep(.el-carousel__container) {
    .el-carousel__item {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      transition: opacity 0.8s ease-in-out;
      transform: none !important;

      &.is-active {
        opacity: 1;
        z-index: 2;
      }
    }
  }
}

.custom-carousel {
  .carousel-content {
    height: 100%;
    width: 100%;
    position: relative;
    position: relative;
    cursor: default;
    position: relative;
    cursor: default;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scale(1.05);
      transition: transform 6s ease-out;
    }
  }
}

// 覆盖 Element Plus 的默认动画
:deep(.el-carousel__container) {
  .el-carousel__item--card {
    transform: none !important;
  }

  .el-carousel__item.is-animating {
    transition: opacity 0.1s ease-in-out !important;
  }
}

:deep(.el-carousel__container) {
  transition: transform 0.5s ease-in-out;
}

// 添加新的动画关键帧
@keyframes floatGradientLeft {
  0% {
    transform: translate(0, 0) rotate(0deg) scale(1);
  }

  25% {
    transform: translate(30px, 20px) rotate(5deg) scale(1.05);
  }

  50% {
    transform: translate(-10px, 40px) rotate(-2deg) scale(0.95);
  }

  75% {
    transform: translate(-20px, 10px) rotate(3deg) scale(1.02);
  }

  100% {
    transform: translate(0, 0) rotate(0deg) scale(1);
  }
}

@keyframes floatGradientRight {
  0% {
    transform: translate(0, 0) rotate(0deg) scale(1);
  }

  25% {
    transform: translate(-40px, -30px) rotate(-3deg) scale(0.98);
  }

  50% {
    transform: translate(20px, -50px) rotate(4deg) scale(1.03);
  }

  75% {
    transform: translate(30px, -20px) rotate(-2deg) scale(0.97);
  }

  100% {
    transform: translate(0, 0) rotate(0deg) scale(1);
  }
}

@keyframes floatGradientCenter {
  0% {
    transform: translate(-50%, -50%) rotate(0deg) scale(1);
  }

  25% {
    transform: translate(-50%, -50%) rotate(-5deg) scale(1.08);
  }

  50% {
    transform: translate(-50%, -50%) rotate(3deg) scale(0.92);
  }

  75% {
    transform: translate(-50%, -50%) rotate(-2deg) scale(1.05);
  }

  100% {
    transform: translate(-50%, -50%) rotate(0deg) scale(1);
  }
}
</style>
