<template>
  <div class="portal-main-background">
    <el-carousel height="600px" :interval="5000">
      <el-carousel-item v-for="(image, index) in bannerImages" :key="index">
        <div class="carousel-content" :style="{ backgroundImage: `url(${image.url})` }">
          <div class="content">
            <span class="font-title">{{ image.title }}</span>
            <br /><br />
            <b class="subtitle">{{ image.subtitle }}</b>
            <br /><br />
            <el-button class="font-text" @click="goto('/site/index')" type="primary">
              登入平台
            </el-button>
            <el-button class="font-text" @click="goto('/site/download')">
              相关下载
            </el-button>
          </div>
        </div>
      </el-carousel-item>
    </el-carousel>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
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
    title: "元宇宙实景编程平台",
    subtitle: "让每个人都可以快乐地创造世界",
  },
  {
    url: "/media/bg/04.jpg",
    title: "沉浸式学习体验",
    subtitle: "激发创造力与学习热情",
  },
  {
    url: "/media/bg/05.jpg",
    title: "互动编程环境",
    subtitle: "边学边做，快乐编程",
  },
]);

const router = useRouter();

const goto = (path: string): void => {
  router.push(path);
};
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
  max-width: 60%;
}

.font-title {
  font-size: 40px;
  color: whitesmoke;
  word-wrap: break-word;
  display: block;
  margin-bottom: 20px;
}

.subtitle {
  font-weight: lighter;
  font-size: 25px;
  color: whitesmoke;
  word-wrap: break-word;
  display: block;
  margin-bottom: 20px;
}
</style>
