<template>
  <div v-loading="loading" class="image-wrapper">
    <LazyImg :url="url" style="width: 100%; height: auto" fit="contain" @success="loading = false"
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

  }>(),
  {
    id: 0,
    image: null,
  }
);

const loading = ref(true);

const url = computed(() => {
  // 使用 Vite 的 new URL 方式解析静态资源路径
  let imageUrl = props.image;
  if (!imageUrl) {
    imageUrl = new URL(`../assets/images/items/${props.id % 100}.webp`, import.meta.url).href;
  }

  // Check if it's a Tencent Cloud COS URL and append thumbnail parameter if needed
  if (imageUrl && imageUrl.includes('myqcloud.com') && !imageUrl.includes('imageMogr2') && !imageUrl.includes('imageView2')) {
    const separator = imageUrl.includes('?') ? '&' : '?';
    imageUrl += `${separator}imageMogr2/thumbnail/512x/format/webp`;
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
