<template>
  <div class="content-section">
      <Screen :bgUrl="imageUrl" :item="screen"></Screen>
      <div class="products-container">
        <DecorativeBackground />
        <div class="products-content">
          <div id="introduce">
            <Introduce></Introduce>
          </div>
          <div id="flow">
            <Flow></Flow>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch, ref } from "vue";
import { useRoute } from "vue-router";
import Screen from "../common/Screen.vue";
import DecorativeBackground from '../common/DecorativeBackground.vue';
import Introduce from './Introduce.vue';
import Flow from './Flow.vue';

defineOptions({
  name: "Develop",
});

const route = useRoute();
const loading = ref(true);

const imageUrl = computed(() => {
  return "/media/bg/education.jpg";
});

const screen = computed(() => {
  return {
    title: "为您私有部署",
    title2: "元宇宙数字化教育方案",
    color: "#1d1d1f",
    tel: "15000159790",
    align: "left",
    screenShow: 2,
  };
});

// 跟踪所有需要加载的资源
const loadResources = () => {
  const imageUrls = [
    '/media/bg/education.jpg',
    // 添加其他需要预加载的图片
  ];

  const imagePromises = imageUrls.map(url => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => reject(url);
      img.src = url;
    });
  });

  return Promise.all(imagePromises);
};

onMounted(() => {
  // 等待资源加载完成
  loadResources()
    .then(() => {
      loading.value = false;
    })
    .catch((error) => {
      console.error('资源加载失败:', error);
      loading.value = false;
    });

  if (window.location.hash) {
    setTimeout(() => {
      const element = document.querySelector(window.location.hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }
});

// 监听路由变化，处理锚点跳转
watch(() => route.hash, (newHash) => {
  if (newHash) {
    setTimeout(() => {
      const element = document.querySelector(newHash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }
});
</script>

<style scoped lang="scss">
@use "@/styles/sandtable.scss";
@use "@/styles/responsive-style.scss";

.content-section {
  height: 100%;

  @media (max-width: 768px) {
    margin-top: 50px;
  }
}

.products-container {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
}

.products-content {
  position: relative;
  z-index: 1;
}

// 添加锚点偏移，防止被固定导航栏遮挡
#solution,
#cloud {
  scroll-margin-top: 64px;
}
</style>
