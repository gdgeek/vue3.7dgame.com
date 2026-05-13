<template>
  <el-dialog
    v-model="visible"
    width="min(1120px, calc(100vw - 64px))"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    class="unity-preview-dialog"
    @closed="$emit('closed')"
  >
    <template #header="{ close, titleId, titleClass }">
      <div class="unity-preview-header">
        <div class="unity-preview-title-wrap">
          <span :id="titleId" :class="titleClass">
            {{ t("common.unityPreview.title") }}
          </span>
          <el-tooltip
            effect="dark"
            placement="bottom-start"
            popper-class="unity-preview-help-tooltip"
          >
            <template #content>
              <div class="unity-preview-help">
                <div>{{ t("common.unityPreview.helpClick") }}</div>
                <div>{{ t("common.unityPreview.helpRotate") }}</div>
                <div>{{ t("common.unityPreview.helpZoomPan") }}</div>
                <div>{{ t("common.unityPreview.helpFullscreen") }}</div>
              </div>
            </template>
            <el-icon class="unity-preview-help-icon">
              <QuestionFilled></QuestionFilled>
            </el-icon>
          </el-tooltip>
        </div>
        <div class="unity-preview-header-actions">
          <button
            class="unity-preview-header-button"
            type="button"
            :aria-label="t('common.unityPreview.fullscreen')"
            @click="toggleFullscreen"
          >
            <el-icon><FullScreen></FullScreen></el-icon>
          </button>
          <button
            class="unity-preview-header-button"
            type="button"
            :aria-label="t('common.unityPreview.close')"
            @click="close"
          >
            <el-icon><Close></Close></el-icon>
          </button>
        </div>
      </div>
    </template>
    <div ref="frameWrap" class="unity-preview-frame-wrap">
      <iframe
        v-if="frameVisible"
        :key="frameKey"
        ref="frame"
        class="unity-preview-frame"
        :src="src"
        allow="autoplay; fullscreen; gamepad; xr-spatial-tracking"
        @load="$emit('frameLoad')"
      ></iframe>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Close, FullScreen, QuestionFilled } from "@element-plus/icons-vue";

const props = defineProps<{
  modelValue: boolean;
  frameVisible: boolean;
  frameKey: number;
  src: string;
}>();

const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void;
  (event: "closed"): void;
  (event: "frameLoad"): void;
}>();

const { t } = useI18n();
const frame = ref<HTMLIFrameElement | null>(null);
const frameWrap = ref<HTMLElement | null>(null);

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const toggleFullscreen = () => {
  const target = frameWrap.value;
  if (!target) return;

  if (document.fullscreenElement === target) {
    document.exitFullscreen?.();
    return;
  }

  target.requestFullscreen?.();
};

defineExpose({
  isFrameSource(source: MessageEventSource | null): boolean {
    return !!source && source === frame.value?.contentWindow;
  },
  postMessage(message: unknown, targetOrigin: string): boolean {
    const targetWindow = frame.value?.contentWindow;
    if (!targetWindow) return false;

    targetWindow.postMessage(message, targetOrigin);
    return true;
  },
  toggleFullscreen,
});
</script>

<style scoped>
:global(.unity-preview-dialog.el-dialog) {
  --el-dialog-padding-primary: 0;

  padding: 0 !important;
  overflow: hidden;
  background: #2f3a4a;
  border: 0;
  border-radius: 8px;
  outline: none;
  box-shadow: 0 18px 44px rgb(15 23 42 / 28%);
}

:global(.unity-preview-dialog *) {
  outline: none;
}

:global(.unity-preview-dialog .el-dialog__header) {
  padding: 0;
  margin: 0;
  background: #263443;
  border-bottom: 1px solid rgb(255 255 255 / 8%);
}

.unity-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 12px 0 18px;
}

.unity-preview-title-wrap {
  display: inline-flex;
  gap: 7px;
  align-items: center;
}

.unity-preview-help-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 14px;
  color: rgb(255 255 255 / 58%);
  cursor: help;
}

.unity-preview-help-icon:hover {
  color: rgb(255 255 255 / 86%);
}

:global(.unity-preview-help-tooltip) {
  max-width: 220px;
  font-size: 12px;
  line-height: 1.6;
}

.unity-preview-help {
  display: grid;
  gap: 2px;
}

:global(.unity-preview-dialog .el-dialog__title) {
  font-size: 15px;
  font-weight: 600;
  color: rgb(255 255 255 / 92%);
}

.unity-preview-header-actions {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.unity-preview-header-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  color: rgb(255 255 255 / 88%);
  cursor: pointer;
  background: rgb(255 255 255 / 8%);
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 6px;
}

.unity-preview-header-button:hover {
  color: #fff;
  background: rgb(255 255 255 / 10%);
  border-color: rgb(255 255 255 / 12%);
}

:global(.unity-preview-dialog .el-dialog__body) {
  display: flex;
  flex-direction: column;
  height: min(630px, calc(100vh - 156px));
  padding: 0;
  overflow: hidden;
  background: #2f3a4a;
}

.unity-preview-frame-wrap {
  display: flex;
  flex: 1;
  align-items: flex-start;
  justify-content: center;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  background: #2f3a4a;
}

.unity-preview-frame {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 520px;
  background: #2f3a4a;
  border: 0;
  outline: none;
}

.unity-preview-frame-wrap:fullscreen {
  width: 100vw;
  height: 100vh;
}
</style>
