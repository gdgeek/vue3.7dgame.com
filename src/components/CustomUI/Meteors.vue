<template>
  <div class="meteors-wrapper">
    <span v-for="index in count" :key="'meteor ' + index" :class="cn(
      'animate-meteor absolute h-0.5 w-0.5 rounded-[9999px] bg-[var(--text-secondary)] shadow-[0_0_0_1px_#ffffff10] rotate-[215deg]',
      `before:content-[''] before:absolute before:top-1/2 before:transform before:-translate-y-[50%] before:w-[50px] before:h-[1px] before:bg-gradient-to-r before:from-[#64748b] before:to-transparent`,
      customClass
    )
      " :style="{
        top: Math.floor(Math.random() * windowHeight) + 'px',
        left: Math.floor(Math.random() * windowWidth - 400) + 'px',
        animationDelay: Math.random() * (0.8 - 0.2) + 0.2 + 's',
        animationDuration: Math.floor(Math.random() * (10 - 2) + 2) + 's',
      }"></span>
  </div>
</template>

<script lang="ts" setup>
import { cn } from "@/lib/utils";
import { ref, onMounted, onUnmounted } from "vue";

const windowWidth = ref(
  typeof window !== "undefined" ? window.innerWidth : 1200
);
const windowHeight = ref(
  typeof window !== "undefined" ? window.innerHeight : 800
);

const props = defineProps({
  count: {
    type: Number,
    default: 20,
  },
  customClass: {
    type: String,
    default: "",
  },
  speed: {
    type: Number,
    default: 5,
  },
  color: {
    type: String,
    default: "#64748b",
  },
});

// 响应式处理，窗口大小改变时重新计算
const handleResize = () => {
  windowWidth.value = window.innerWidth;
  windowHeight.value = window.innerHeight;
};

onMounted(() => {
  window.addEventListener("resize", handleResize);
  // 初始化窗口大小
  handleResize();
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});
</script>

<style scoped>
.meteors-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}

@keyframes meteor {
  0% {
    transform: rotate(215deg) translateX(0);
    opacity: 1;
  }

  70% {
    opacity: 1;
  }

  100% {
    transform: rotate(215deg) translateX(-500px);
    opacity: 0;
  }
}

.animate-meteor {
  animation: meteor v-bind('props.speed + "s"') linear infinite;
}
</style>
