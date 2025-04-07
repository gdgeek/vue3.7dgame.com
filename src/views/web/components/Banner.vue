<template>
  <div class="portal-main-background">
    <el-carousel :height="carouselHeight" :interval="5000">
      <el-carousel-item v-for="(image, index) in bannerImages" :key="index">
        <div class="carousel-content" :style="{ backgroundImage: `url(${image.url})` }">
          <div class="content">
            <span class="font-title">{{ image.title }}</span>
            <b class="subtitle">{{ image.subtitle }}</b>
          </div>
        </div>
      </el-carousel-item>
    </el-carousel>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import "@/assets/font/font.css";

interface BannerImage {
  url: string;
  title: string;
  subtitle: string;
}

// 轮播图数据
const bannerImages = ref<BannerImage[]>([
  {
    url: "/media/bg/hololens.jpg",
    title: "AR混合现实编程平台",
    subtitle: "让每个人都能轻松创造混合现实世界",
  },
  {
    url: "/media/bg/03.jpg",
    title: "沉浸式多人协作体验",
    subtitle: "多设备实时互动,激发创造力",
  },
  {
    url: "/media/bg/05.jpg",
    title: "可视化编程环境",
    subtitle: "零门槛入门,快速实现创意",
  },
]);

const router = useRouter();

const goto = (path: string): void => {
  router.push(path);
};

// 响应式轮播图高度
const carouselHeight = ref("40vw");

// 更新轮播图高度
const updateCarouselHeight = () => {
  if (window.innerWidth <= 768) {
    carouselHeight.value = "60vw";
  } else {
    carouselHeight.value = "40vw";
  }
};

// 监听窗口大小变化
onMounted(() => {
  updateCarouselHeight();
  window.addEventListener("resize", updateCarouselHeight);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateCarouselHeight);
});
</script>

<style lang="scss" scoped>
.portal-main-background {
  width: 100%;
}

.carousel-content {
  width: 100%;
  height: 100%;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  display: flex;
  align-items: center;
}

.content {
  padding-left: 10%;
  // max-width: 50%;
}

.font-title {
  font-size: 40px;
  color: whitesmoke;
  word-wrap: break-word;
  display: block;
  margin-bottom: 10px;
}

.subtitle {
  font-weight: lighter;
  font-size: 25px;
  color: whitesmoke;
  word-wrap: break-word;
  display: block;
  margin-bottom: 10px;
}

// 添加移动端适配
@media screen and (max-width: 768px) {
  .font-title {
    font-size: 24px;
  }

  .subtitle {
    font-size: 16px;
  }

  .content {
    padding-left: 5%;
  }
}
</style>
