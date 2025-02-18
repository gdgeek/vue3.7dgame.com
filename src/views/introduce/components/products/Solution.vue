<template>
  <div>
    <!-- 震撼沙盘板块 -->
    <section class="sandtable-section section-bgc-gray">
      <br />
      <div align="center">
        <h1 class="section-title-size section-title-dark title-lighter">
          应用场景
        </h1>
        <h4>强大的技术支持，适用广泛应用场景</h4>
        <p class="section-underline-blue"></p>
      </div>
      <el-row :gutter="30" class="section-card-padding">
        <el-col v-for="(item, index) in items.slice(0, videoSlice)" :key="index" align="center" :xs="24" :sm="12"
          :md="12" :lg="24 / videoSlice" :xl="24 / videoSlice">
          <basic-video :item="item" :video-padding="videoPadding"></basic-video>
        </el-col>
      </el-row>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import BasicVideo from "@/views/introduce/components/products/BasicVideo.vue";
import { data } from "@/views/introduce/data/examples";

interface VideoItem {
  url: string;
  image: string;
  title: string;
  describe?: string;
}

const videoSlice = ref<number>(4);
const videoPadding = ref<string>("0");

const items = computed<VideoItem[]>(() => data);
</script>

<style lang="scss" scoped>
@use "@/styles/screenstyle.scss";
@use "@/styles/sandtable.scss";
</style>
