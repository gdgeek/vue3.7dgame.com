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
import UnityPreviewDialog from "@/components/UnityPreviewDialog.vue";
import { useUnityPreviewHost } from "@/composables/useUnityPreviewBridge";

const unityPreview = useUnityPreviewHost();
const unityPreviewDialog = unityPreview.dialogRef;
const unityPreviewVisible = unityPreview.visible;
const unityPreviewFrameVisible = unityPreview.frameVisible;
const unityPreviewFrameKey = unityPreview.frameKey;
const unityPreviewSrc = unityPreview.src;
const handleUnityPreviewLoad = unityPreview.handleLoad;
const handleUnityPreviewClosed = unityPreview.handleClosed;
</script>
