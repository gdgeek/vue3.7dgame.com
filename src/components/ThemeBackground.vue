<template>
  <div class="theme-background">
    <Meteors v-if="isDarkTheme" :count="30" :speed="8" custom-class="meteor-effect" color="#42b883" />
  </div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent } from 'vue';
import { useSettingsStore } from '@/store';
import { ThemeEnum } from '@/enums/ThemeEnum';

// 使用异步组件正确导入
const Meteors = defineAsyncComponent(() =>
  import('@/components/CustomUI/Meteors.vue')
);

const settingsStore = useSettingsStore();

// 判断是否为深色主题
const isDarkTheme = computed(() => settingsStore.theme === ThemeEnum.DARK);
</script>

<style scoped>
.theme-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;
}

.meteor-effect {
  /* 可以添加自定义样式 */
}
</style>