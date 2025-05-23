<template>
  <div class="content-section">
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

    <div class="business-container">
      <div class="random-gradient"></div>
      <div
        v-for="(business, index) in BusinessList"
        :key="index"
        class="business-item"
        :class="business.position"
      >
        <div class="business-content">
          <h2>{{ business.title }}</h2>
          <p>{{ business.description }}</p>
        </div>
        <div class="business-image">
          <img :src="business.image" :alt="business.title" />
        </div>
      </div>

      <div class="contact-section">
        <div class="contact-header">
          <h2 class="section-title">{{ contactInfo.title }}</h2>
          <h3 class="section-subtitle">{{ contactInfo.subtitle }}</h3>
        </div>

        <div class="contact-content">
          <div class="left-content">
            <h4 class="content-title">公司简介</h4>
            <p class="company-intro">{{ contactInfo.companyIntro }}</p>
          </div>

          <div class="right-content">
            <h4 class="content-title">联系方式</h4>
            <div class="contact-details">
              <div class="contact-item">
                <i class="location-icon"></i>
                <span>{{ contactInfo.address }}</span>
              </div>
              <div class="contact-item">
                <i class="phone-icon"></i>
                <span>{{ contactInfo.phone }}</span>
              </div>
              <div class="contact-item">
                <i class="email-icon"></i>
                <span>{{ contactInfo.email }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Partner></Partner>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  onMounted,
  onUnmounted,
  nextTick,
  ComponentPublicInstance,
} from "vue";

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

const setVideoRef = (
  el: Element | ComponentPublicInstance | null,
  index: number
) => {
  if (el instanceof HTMLVideoElement) {
    videoRefs.value[index] = el;
  }
};

const handleSlideChange = (index: number) => {
  currentSlide.value = index;

  videoRefs.value.forEach((video, i) => {
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

const BusinessList = [
  {
    title: "快速分析了解您的需求",
    description:
      "资深专业人员将对您的需求进行详细了解，发送我们的案例给您参考，为您的绝妙创意提供最适合的解决方案，并全程为项目的实现提供咨询。",
    image: "/media/bg/business1.jpg",
    position: "right",
  },
  {
    title: "定制开发demo，5000元直接赠送",
    description:
      "我们将为您选择的案例提供Demo和报价。为下一步开发打好基础。如果您对我们的demo满意，当我们达成合作进行开发，5000可抵扣工程款。",
    image: "/media/bg/business2.jpg",
    position: "left",
  },
  {
    title: "开发完成后的技术支持",
    description:
      "当开发完成验收后，您有任何疑问，我们都会有专家及时帮助您，如果您有需要，我们将会派出专业人员实地提供技术指导。",
    image: "/media/bg/business3.jpg",
    position: "right",
  },
];

const contactInfo = {
  title: "以用户为中心",
  subtitle: "欢迎联系我们",
  companyIntro:
    "上海不加班网络科技有限公司，作为国内制作元宇宙AR实景应用起步早的高新科技企业，团队项目开发经验丰富，技术方案灵活多样，与未来数字化生态相融合，不断进取。",
  address: "湖南省长沙市长沙县和悦城S1",
  phone: "15000159790",
  email: "dirui@bujiaban.com",
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

.business-container {
  position: relative;
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

  .business-item {
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

    .business-content {
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

    .business-image {
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
      .business-content {
        animation-delay: 0.2s;
      }

      .business-image {
        animation-delay: 0.4s;
      }
    }

    &.left {
      .business-content {
        animation-delay: 0.4s;
      }

      .business-image {
        transform: translateX(-20px);
        animation-delay: 0.2s;
      }
    }
  }

  .contact-section {
    position: relative; // 确保内容在装饰背景之上
    z-index: 1;
    align-items: center;
    max-width: 1400px;
    margin: 0 auto;
    padding: 40px 40px;

    .contact-header {
      text-align: left;
      margin-bottom: 30px;

      .section-title {
        font-size: 18px;
        font-weight: 400;
        color: #333;
        margin-bottom: 6px;
      }

      .section-subtitle {
        font-size: 36px;
        font-weight: 500;
        color: rgb(0, 204, 204);
        margin: 0;
      }
    }

    .contact-content {
      display: flex;
      justify-content: space-between;
      gap: 100px;

      .left-content,
      .right-content {
        flex: 1;
      }

      .content-title {
        font-size: 24px;
        color: #333;
        margin-bottom: 20px;
        font-weight: 500;
      }

      .company-intro {
        font-size: 16px;
        line-height: 1.8;
        color: #666;
        margin: 0;
        letter-spacing: 2px;
      }

      .contact-details {
        display: flex;
        flex-direction: column;
        gap: 24px;

        .contact-item {
          display: flex;
          align-items: center;
          gap: 12px;

          i {
            width: 24px;
            height: 24px;
            background-size: contain;
            background-repeat: no-repeat;
          }

          .location-icon {
            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2300CCCC"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>');
          }

          .phone-icon {
            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2300CCCC"><path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>');
          }

          .email-icon {
            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2300CCCC"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>');
          }

          span {
            font-size: 16px;
            color: #666;
          }
        }
      }
    }

    // 响应式设计
    @media (max-width: 768px) {
      padding: 40px 20px;

      .contact-header {
        text-align: center;
        margin-bottom: 40px;
      }

      .contact-content {
        flex-direction: column;
        gap: 40px;

        .content-title {
          text-align: center;
        }

        .company-intro {
          text-align: center;
        }

        .contact-details {
          align-items: center;
        }
      }
    }
  }

  // 确保Partner组件在装饰背景之上
  :deep(.partner-background) {
    position: relative;
    z-index: 1;
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
  .BusinessList {
    .business-item {
      flex-direction: column !important;
      padding: 20px;

      .business-content,
      .business-image {
        width: 100%;
      }

      .business-image {
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
