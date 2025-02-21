<template>
  <div>
    <section class="gallery-section">
      <br />
      <div align="center">
        <h1 class="section-title-size section-title-dark title-lighter">
          {{ title }}
        </h1>
        <h4>{{ subtitle }}</h4>
        <p class="section-underline-blue"></p>
      </div>
      <el-row :gutter="30" class="section-card-padding">
        <el-col
          v-for="(item, index) in items.slice(0, videoSlice)"
          :key="index"
          align="center"
          :xs="24"
          :sm="12"
          :md="12"
          :lg="24 / videoSlice"
          :xl="24 / videoSlice"
        >
          <basic-video :item="item" :video-padding="videoPadding"></basic-video>
        </el-col>
      </el-row>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import BasicVideo from "@/views/introduce/components/common/BasicVideo.vue";

interface VideoItem {
  url: string;
  image: string;
  title: string;
  describe?: string;
}

interface Props {
  title: string;
  subtitle: string;
  items: VideoItem[];
  initialVideoSlice?: number;
  initialVideoPadding?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "视频展示",
  subtitle: "视频列表展示",
  initialVideoSlice: 4,
  initialVideoPadding: "0",
});

const videoSlice = ref<number>(props.initialVideoSlice);
const videoPadding = ref<string>(props.initialVideoPadding);
</script>

<style lang="scss" scoped>
@use "@/styles/screenstyle.scss";
@use "@/styles/sandtable.scss";

.gallery-section {
  padding: 20px 0;

  .section-title-size {
    font-size: 32px;
    margin-bottom: 16px;
  }

  .section-underline-blue {
    width: 40px;
    height: 3px;
    background: #1890ff;
    margin: 20px auto;
  }

  .section-card-padding {
    padding: 40px 5%;
  }
}
</style>
