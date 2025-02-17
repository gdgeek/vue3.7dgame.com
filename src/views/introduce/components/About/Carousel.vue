<template>
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
          <video
            :src="slide.url"
            class="carousel-video"
            loop
            muted
            :ref="(el) => setVideoRef(el, index)"
          ></video>
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
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";

// 轮播图数据
const slides = [
  {
    url: "https://1251022382.vod2.myqcloud.com/3ebf9041vodtransgzp1251022382/cc632dca5285890802616619504/v.f20.mp4",
    title: "第三人称视角",
    description:
      "可以实现多个HoloLens2和iPad设备互动和展示，也可以实现投屏功能。",
  },
  {
    url: "https://1251022382.vod2.myqcloud.com/3ebf9041vodtransgzp1251022382/6487c9fd5285890809258783935/v.f30.mp4",
    title: "多设备无延时互动",
    description: "处理多人所有权的分配，让用户可以分别操作物体。",
  },
  {
    url: "https://1251022382.vod2.myqcloud.com/3ebf9041vodtransgzp1251022382/664f5f755285890809258809343/v.f30.mp4",
    title: "联机真实物理场景",
    description: "让多台设备和物理空间可以联动，碰撞到墙壁和桌面进行反弹",
  },
  {
    url: "https://1251022382.vod2.myqcloud.com/3ebf9041vodtransgzp1251022382/8d947abb4564972818757571628/v.f20.mp4",
    title: "HoloLens电柜装配",
    description:
      "通过HoloLens 实现的电柜装配引导，一个比较实用的元宇宙实景程序。",
  },
];

const currentSlide = ref(0);
const videoRefs = ref<Array<HTMLVideoElement | null>>([]);
const carousel = ref();
const isCarouselHovered = ref(false);

// 动画类型枚举
const AnimationTypes = {
  FADE_SLIDE: "fade-slide",
  SCALE: "scale",
  ROTATE: "rotate",
  SPLIT: "split",
  WAVE: "wave",
  GLITCH: "glitch",
  REVEAL: "reveal",
  FLOAT: "float",
} as const;

// 为每个幻灯片分配随机动画类型
const slideAnimations = ref(
  slides.map(() => {
    const types = Object.values(AnimationTypes);
    return types[Math.floor(Math.random() * types.length)];
  })
);

const setVideoRef = (el: HTMLVideoElement | null, index: number) => {
  videoRefs.value[index] = el;
};

const handleSlideChange = (index: number) => {
  currentSlide.value = index;

  videoRefs.value.forEach((video: HTMLVideoElement | null, i: number) => {
    if (video) {
      video.pause();
      if (i !== index) {
        video.currentTime = 0;
      }
    }
  });

  if (videoRefs.value[index]) {
    videoRefs.value[index]!.play();
  }

  const types = Object.values(AnimationTypes);
  slideAnimations.value[index] =
    types[Math.floor(Math.random() * types.length)];
};

const getCurrentAnimation = (index: number) => {
  return slideAnimations.value[index];
};

// 键盘事件处理
const handleKeydown = (event: KeyboardEvent) => {
  if (!isCarouselHovered.value) return;

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

onMounted(() => {
  currentSlide.value = 0;
  window.addEventListener("keydown", handleKeydown);

  nextTick(() => {
    if (videoRefs.value[0]) {
      videoRefs.value[0].play();
    }
  });
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<style lang="scss" scoped>
// ... 保持原有的所有样式不变
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
  position: relative;
  height: 100%;

  .carousel-content {
    height: 100%;
    width: 100%;
    position: relative;

    .carousel-video {
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

// 所有动画关键帧定义
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
    .carousel-content .carousel-video {
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
