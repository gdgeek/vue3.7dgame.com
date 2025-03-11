<template>
  <div class="decorative-background">
    <!-- 左上角渐变圆形 -->
    <div class="gradient-circle gradient-circle-left"></div>
    <!-- 右下角渐变圆形 -->
    <div class="gradient-circle gradient-circle-right"></div>
    <!-- 随机位置的绿色渐变圆形 -->
    <div class="gradient-circle gradient-circle-random" :style="{ left: randomPosition.left, top: randomPosition.top }">
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineOptions({
  name: 'DecorativeBackground'
})

//随机位置
const getRandomPosition = () => {
  // 在30%-70%的范围内生成随机位置，避免靠近边缘
  const randomLeft = 30 + Math.random() * 40
  const randomTop = 30 + Math.random() * 40
  return {
    left: `${randomLeft}%`,
    top: `${randomTop}%`
  }
}

const randomPosition = ref(getRandomPosition())
</script>

<style lang="scss" scoped>
.decorative-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.gradient-circle {
  position: absolute;
  border-radius: 50%;
  box-shadow: inset 0 0 50px rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(5px);

  &.gradient-circle-left {
    width: 500px;
    height: 500px;
    background: linear-gradient(45deg,
        rgba(24, 144, 255, 0.6) 0%,
        rgba(24, 144, 255, 0.4) 33%,
        rgba(24, 144, 255, 0.2) 67%,
        rgba(24, 144, 255, 0.1) 100%);
    top: -200px;
    left: -200px;
    animation: floatGradientLeft 20s ease-in-out infinite;
  }

  &.gradient-circle-right {
    width: 500px;
    height: 500px;
    background: linear-gradient(225deg,
        rgba(255, 105, 20, 0.6) 0%,
        rgba(255, 105, 20, 0.4) 33%,
        rgba(255, 105, 20, 0.2) 67%,
        rgba(255, 105, 20, 0.1) 100%);
    bottom: -200px;
    right: -200px;
    animation: floatGradientRight 20s ease-in-out infinite;
  }

  &.gradient-circle-random {
    width: 400px;
    height: 400px;
    background: linear-gradient(135deg,
        rgba(82, 196, 26, 0.6) 0%,
        rgba(82, 196, 26, 0.4) 33%,
        rgba(82, 196, 26, 0.2) 67%,
        rgba(82, 196, 26, 0.1) 100%);
    transform: translate(-50%, -50%);
    animation: floatGradientRandom 20s ease-in-out infinite;
  }
}

@keyframes floatGradientLeft { 
  0% {
    transform: translate(0, 0) rotate(0deg) scale(1);
    opacity: 1;
  }

  25% {
    transform: translate(30px, 20px) rotate(5deg) scale(1.05);
    opacity: 0.75;
  }

  50% {
    transform: translate(-10px, 40px) rotate(-2deg) scale(0.95);
    opacity: 0.5;
  }

  75% {
    transform: translate(-20px, 10px) rotate(3deg) scale(1.02);
    opacity: 0.25;
  }

  100% {
    transform: translate(0, 0) rotate(0deg) scale(1);
    opacity: 1;
  }
}

@keyframes floatGradientRight {
  0% {
    transform: translate(0, 0) rotate(0deg) scale(1);
    opacity: 1;
  }

  25% {
    transform: translate(-40px, -30px) rotate(-3deg) scale(0.98);
    opacity: 0.75;
  }

  50% {
    transform: translate(20px, -50px) rotate(4deg) scale(1.03);
    opacity: 0.5;
  }

  75% {
    transform: translate(30px, -20px) rotate(-2deg) scale(0.97);
    opacity: 0.25;
  }

  100% {
    transform: translate(0, 0) rotate(0deg) scale(1);
    opacity: 1;
  }
}

@keyframes floatGradientRandom {
  0% {
    transform: translate(-50%, -50%) rotate(0deg) scale(1);
    opacity: 1;
  }

  25% {
    transform: translate(-50%, -50%) rotate(-5deg) scale(1.08);
    opacity: 0.75;
  }

  50% {
    transform: translate(-50%, -50%) rotate(3deg) scale(0.92);
    opacity: 0.5;
  }

  75% {
    transform: translate(-50%, -50%) rotate(-2deg) scale(1.05);
    opacity: 0.25;
  }

  100% {
    transform: translate(-50%, -50%) rotate(0deg) scale(1);
    opacity: 1;
  }
}
</style>