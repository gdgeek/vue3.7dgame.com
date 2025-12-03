<template>
  <div v-loading="loading" class="image-wrapper">
    <LazyImg v-if="lazy" :url="url" style="width: 100%; height: auto" fit="contain" @success="loading = false"
      @error="loading = false" />
    <img v-else :src="url" style="width: 100%; height: auto; object-fit: contain;" @load="loading = false"
      @error="loading = false" />
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { LazyImg } from "vue-waterfall-plugin-next";


const props = withDefaults(
  defineProps<{
    id: number;
    image: string | null;
    lazy?: boolean; // 是否启用懒加载

  }>(),
  {
    id: 0,
    image: null,
    lazy: true, // 默认启用懒加载
  }
);

const loading = ref(true);

const url = computed(() => {
  // 使用 Vite 的 new URL 方式解析静态资源路径
  let imageUrl = props.image;
  if (!imageUrl) {
    imageUrl = `https://api.dicebear.com/7.x/shapes/svg?seed=${props.id}`;
  }

  // Check if it's a Tencent Cloud COS URL
  if (imageUrl && imageUrl.includes('myqcloud.com')) {
    const isVideo = /\.(mp4|mov|avi)$/i.test(imageUrl.split('?')[0]);

    if (isVideo) {
      if (!imageUrl.includes('ci-process=snapshot')) {
        const separator = imageUrl.includes('?') ? '&' : '?';
        imageUrl += `${separator}ci-process=snapshot&time=0.1&format=jpg&width=256`;
      }
    } else if (!imageUrl.includes('imageMogr2') && !imageUrl.includes('imageView2')) {
      const separator = imageUrl.includes('?') ? '&' : '?';
      imageUrl += `${separator}imageMogr2/thumbnail/256x/format/webp`;
    }
  }

  return imageUrl;
});
</script>

<style scoped>
.image-wrapper {
  min-height: 100px;
  /* Give it some height so the spinner is visible */
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
