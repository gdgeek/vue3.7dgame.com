<template>
  <!-- Thin wrapper: 将 meta 数据委托给通用 ScenePlayer 组件 -->
  <SharedScenePlayer
    ref="playerRef"
    :meta="meta"
    :is-scene-fullscreen="isSceneFullscreen"
  />
</template>

<script setup lang="ts">
import { ref } from "vue";
import SharedScenePlayer from "@/components/ScenePlayer/index.vue";
import type { MetaInfo } from "@/api/v1/types/meta";

defineProps<{
  meta: MetaInfo;
  isSceneFullscreen?: boolean;
}>();

// 转发 defineExpose 的 ref，保持向后兼容
const playerRef = ref<InstanceType<typeof SharedScenePlayer> | null>(null);

defineExpose({
  get sources() {
    return playerRef.value?.sources;
  },
  playAnimation(uuid: string, animationName: string) {
    return playerRef.value?.playAnimation(uuid, animationName);
  },
  getAudioUrl(uuid: string) {
    return playerRef.value?.getAudioUrl(uuid);
  },
  playQueuedAudio(audio: HTMLAudioElement, skipQueue?: boolean) {
    return playerRef.value?.playQueuedAudio(audio, skipQueue);
  },
});
</script>
