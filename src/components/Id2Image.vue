<template>
  <LazyImg :url="url" style="width: 100%; height: auto" fit="contain" />
</template>
<script setup lang="ts">
import { computed } from 'vue';
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


const url = computed(() => {
  if (props.image != null) {
    return props.image;
  }
  // 使用 Vite 的 new URL 方式解析静态资源路径
  return new URL(`../assets/images/items/${props.id % 100}.webp`, import.meta.url).href;
});
</script>
