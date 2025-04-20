<template>
  <div>
    <slot></slot>
  </div>
  <!--
  <div class="transition-wrapper" :class="{ 'leaving': isLeaving, 'entering': isEntering }">
    <slot></slot>
  </div>-->
</template>

<script setup lang="ts">
/*
import { ref, onMounted } from 'vue';

const props = defineProps({
  delay: {
    type: Number,
    default: 300
  }
});

const isLeaving = ref(false);
const isEntering = ref(true);

onMounted(() => {
  setTimeout(() => {
    isEntering.value = false;
  }, props.delay);
});

defineExpose({
  isLeaving,
  isEntering
});
*/
</script>

<style scoped lang="scss">
.transition-wrapper {
  width: 100%;
  transition: all 0.3s ease;
  opacity: 1;
  transform: translateX(0);

  // 动画状态
  &.leaving {
    opacity: 0.5;
    transform: translateX(30px);
  }

  &.entering {
    opacity: 0;
    transform: translateX(-30px);
  }
}
</style>
