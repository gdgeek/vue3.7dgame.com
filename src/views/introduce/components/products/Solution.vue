<template>
  <div>
    <video-gallery
      title="应用场景"
      subtitle="强大的技术支持，适用广泛应用场景"
      :items="videoItems"
    />
  </div>
</template>

<script setup lang="ts">
import VideoGallery from "@/views/introduce/components/common/VideoGallery.vue";
import { data } from "@/views/introduce/data/examples";
import { computed } from "vue";

const videoItems = computed(() => data);
</script>

<style lang="scss" scoped>
@use "@/styles/screenstyle.scss";
@use "@/styles/sandtable.scss";
</style>
