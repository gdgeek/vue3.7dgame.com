<template>
  <div class="content-section">
    <div v-if="loading">
      <ProductsSkeletonLoader />
    </div>
    <div v-else class="products-container">
      <Screen :bgUrl="imageUrl" :item="screen"></Screen>
      <div id="solution">
        <Solution></Solution>
      </div>
      <div id="cloud">
        <Cloud></Cloud>
      </div>
      <Deploy></Deploy>
      <SubScreen></SubScreen>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch, ref } from "vue";
import { useRoute } from "vue-router";
import Screen from "./Screen.vue";
import Solution from "./Solution.vue";
import Cloud from "./Cloud.vue";
import Deploy from "./Deploy.vue";
import SubScreen from "./SubScreen.vue";
import ProductsSkeletonLoader from './ProductsSkeletonLoader.vue';

defineOptions({
  name: "Products",
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
  };
});

// 创建一个Promise数组来跟踪所有需要加载的资源
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

// 添加锚点偏移，防止被固定导航栏遮挡
#solution,
#cloud {
  scroll-margin-top: 64px;
}
</style>
