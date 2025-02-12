<template>
  <div class="app-container">
    <!-- 导航栏 -->
    <nav class="nav-container">
      <div class="nav-left">
        <img src="/public/media/image/logo.gif" alt="Logo" class="logo" />
        <span class="company-name">上海不加班科技有限公司</span>
      </div>
      <div class="nav-right">
        <div v-for="item in navItems" :key="item.key" :class="['nav-item', { active: currentTab === item.key }]"
          @click="switchTab(item.key)">
          {{ item.label }}
        </div>
      </div>
    </nav>

    <!-- 内容区域 -->
    <div class="content-container">
      <div v-if="currentTab === 'about'" class="content-section">
        <el-carousel height="800px" :autoplay="true" :interval="4000" direction="vertical" class="custom-carousel"
          @change="handleSlideChange">
          <el-carousel-item v-for="(slide, index) in slides" :key="index">
            <div class="carousel-content">
              <img :src="slide.image" :alt="slide.title" />
              <div class="text-overlay" :class="[
                {
                  'text-enter': currentSlide === index,
                  'text-leave': currentSlide !== index,
                },
                getCurrentAnimation(index),
              ]">
                <h2>{{ slide.title }}</h2>
                <p>{{ slide.description }}</p>
              </div>
            </div>
          </el-carousel-item>
        </el-carousel>
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
import { ref, onMounted } from "vue";

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

// 初始化时设置第一张幻灯片为当前显示并分配动画
onMounted(() => {
  currentSlide.value = 0;
  // 初始化时为所有幻灯片分配随机动画
  slideAnimations.value = slides.map(() => {
    const types = Object.values(AnimationTypes);
    return types[Math.floor(Math.random() * types.length)];
  });
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
  z-index: 1;
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
  margin-top: 64px;
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
        animation: fadeSlideEnter 1s cubic-bezier(0.215, 0.61, 0.355, 1) forwards;

        h2 {
          animation: fadeSlideTextEnter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: 0.2s;
        }

        p {
          animation: fadeSlideTextEnter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
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
          animation: scaleTextEnter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
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
          animation: rotateTextEnter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
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
          animation: waveTextEnter 0.8s cubic-bezier(0.215, 0.61, 0.355, 1) forwards;
          animation-delay: 0.2s;
        }

        p {
          animation: waveTextEnter 0.8s cubic-bezier(0.215, 0.61, 0.355, 1) forwards;
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
          animation: revealTextEnter 0.8s cubic-bezier(0.77, 0, 0.175, 1) forwards;
          animation-delay: 0.2s;
        }

        p {
          animation: revealTextEnter 0.8s cubic-bezier(0.77, 0, 0.175, 1) forwards;
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
          animation: floatTextEnter 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: 0.2s;
        }

        p {
          animation: floatTextEnter 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
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
</style>
