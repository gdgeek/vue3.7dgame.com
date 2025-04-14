<template>
  <div class="app-container" :class="{ 'dark-theme': isDark }">
    <Buy />
  </div>
</template>

<script setup lang="ts">
import "@/assets/font/font.css";
import Buy from "./components/Buy.vue";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { useSettingsStore } from "@/store/modules/settings";
import 'aos/dist/aos.css';

const settingsStore = useSettingsStore();
const isDark = ref<boolean>(settingsStore.theme === ThemeEnum.DARK);

</script>

<style lang="scss" scoped>
.app-container {
  position: relative;
  min-height: 100vh;
  background-color: #ffffff;
  width: 100%;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;

  &.dark-theme {
    background-color: #121212;
    color: #fff;
  }
}
</style>
