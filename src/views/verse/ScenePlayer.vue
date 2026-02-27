<template>
  <!-- Thin wrapper: 将 verse 数据委托给通用 ScenePlayer 组件 -->
  <SharedScenePlayer
    ref="playerRef"
    :verse="verse"
    :is-scene-fullscreen="isSceneFullscreen"
  />
</template>

<script setup lang="ts">
import { ref } from "vue";
import SharedScenePlayer from "@/components/ScenePlayer/index.vue";
import type { Verse } from "@/types/verse";

const props = defineProps<{
  verse: Verse;
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
