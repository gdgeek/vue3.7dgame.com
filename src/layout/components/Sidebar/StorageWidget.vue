<template>
  <div class="storage-widget">
    <div class="storage-header">
      <span class="storage-label">存储空间</span>
      <span class="storage-percent">{{ usagePercent }}%</span>
    </div>
    <div class="storage-bar">
      <div class="storage-bar-fill" :style="{ width: `${usagePercent}%` }"></div>
    </div>
    <p class="storage-text">已用 {{ usedFormatted }} / {{ totalFormatted }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

// In a real app, these would come from an API/store
const usedBytes = ref(7.5 * 1024 * 1024 * 1024); // 7.5GB
const totalBytes = ref(10 * 1024 * 1024 * 1024); // 10GB

const usagePercent = computed(() => {
  return Math.round((usedBytes.value / totalBytes.value) * 100);
});

const formatBytes = (bytes: number): string => {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(1)}GB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)}MB`;
};

const usedFormatted = computed(() => formatBytes(usedBytes.value));
const totalFormatted = computed(() => formatBytes(totalBytes.value));
</script>

<style lang="scss" scoped>
// Styles are defined in ar-platform.scss as .storage-widget
</style>
