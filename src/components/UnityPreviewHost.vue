<template>
  <UnityPreviewDialog
    ref="unityPreviewDialog"
    v-model="unityPreviewVisible"
    :frame-visible="unityPreviewFrameVisible"
    :frame-key="unityPreviewFrameKey"
    :src="unityPreviewSrc"
    @closed="handleUnityPreviewClosed"
    @frame-load="handleUnityPreviewLoad"
  ></UnityPreviewDialog>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import UnityPreviewDialog from "@/components/UnityPreviewDialog.vue";
import { useUnityPreviewHost } from "@/composables/useUnityPreviewBridge";

const props = defineProps<{
  routePath?: string;
}>();

const unityPreview = useUnityPreviewHost();
const unityPreviewDialog = unityPreview.dialogRef;
const unityPreviewVisible = unityPreview.visible;
const unityPreviewFrameVisible = unityPreview.frameVisible;
const unityPreviewFrameKey = unityPreview.frameKey;
const unityPreviewSrc = unityPreview.src;
const handleUnityPreviewLoad = unityPreview.handleLoad;
const handleUnityPreviewClosed = unityPreview.handleClosed;

const shouldPreloadRunner = computed(() => {
  return ["/verse/scene", "/verse/script", "/meta/scene", "/meta/script"].some(
    (path) => props.routePath === path
  );
});

watch(
  shouldPreloadRunner,
  (shouldPreload) => {
    if (shouldPreload) {
      unityPreviewFrameVisible.value = true;
    }
  },
  { immediate: true }
);
</script>
