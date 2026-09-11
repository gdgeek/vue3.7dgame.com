<template>
  <el-dialog
    :model-value="modelValue"
    :before-close="requestClose"
    width="min(1120px, calc(100vw - 64px))"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    class="unity-preview-dialog"
  >
    <template #header="{ titleId, titleClass }">
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
            :aria-label="t('common.unityPreview.close')"
            @click="requestClose"
          >
            <el-icon><Close></Close></el-icon>
          </button>
        </div>
      </div>
    </template>
    <div class="unity-preview-frame-wrap">
      <iframe
        v-if="frameVisible"
        :key="frameKey"
        ref="frame"
        class="unity-preview-frame"
        title="Unity 场景运行器"
        :src="src"
        allow="autoplay; gamepad; xr-spatial-tracking; fullscreen 'none'"
        @load="$emit('frameLoad')"
      ></iframe>
      <div
        v-if="!frameVisible || state?.failure"
        class="unity-preview-placeholder"
        role="status"
        aria-live="polite"
      >
        <p>
          {{
            state?.failure
              ? failureMessage
              : (state?.status ?? "正在准备运行器")
          }}
        </p>
        <button
          v-if="state?.failure"
          class="unity-preview-retry"
          type="button"
          @click="$emit('retry')"
        >
          重试
        </button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { UnityRuntimeViewState } from "@/services/unity/runtime";
import { useI18n } from "vue-i18n";
import { Close, QuestionFilled } from "@element-plus/icons-vue";

const props = defineProps<{
  modelValue: boolean;
  frameVisible: boolean;
  frameKey: number;
  src: string;
  state?: UnityRuntimeViewState;
}>();

const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void;
  (event: "close"): void;
  (event: "retry"): void;
  (event: "frameLoad"): void;
}>();

const { t } = useI18n();
const frame = ref<HTMLIFrameElement | null>(null);

const requestClose = () => emit("close");
const failureMessage = computed(() =>
  props.state?.failure?.code === "SCENE_ASSET_ORIGIN_DENIED"
    ? "当前场景资源来源暂不支持，请使用已支持的 CDN 资源。"
    : (props.state?.failure?.message ?? "场景运行失败，请重试")
);

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
  position: relative;
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
  min-height: 0;
  background: #2f3a4a;
  border: 0;
  outline: none;
}

.unity-preview-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #eef3f8;
  text-align: center;
  overflow-wrap: anywhere;
  background: #2f3a4a;
}

.unity-preview-placeholder p {
  margin: 0;
}

.unity-preview-retry {
  padding: 5px 10px;
  color: #fff;
  cursor: pointer;
  background: transparent;
  border: 1px solid #758294;
  border-radius: 6px;
}

.unity-preview-header-button:focus-visible,
.unity-preview-retry:focus-visible {
  outline: 2px solid #70b6ff;
  outline-offset: 2px;
}
</style>
