<template>
  <div class="app-container" :class="{ 'dark-theme': isDark }">
    <Buy></Buy>
  </div>
</template>

<script setup lang="ts">
import "@/assets/font/font.css";
import Buy from "./components/Buy.vue";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { useSettingsStore } from "@/store/modules/settings";
import { useAOS } from "@/composables/useAOS";

useAOS();

const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === ThemeEnum.DARK);
</script>

<style lang="scss" scoped>
.app-container {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  padding: 0;
  margin: 0;
  background-color: #fff;

  &.dark-theme {
    color: #fff;
    background-color: #121212;
  }
}
</style>
