<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="overlay"
      class="editor-loading-overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="message"
      :aria-busy="!failed"
      tabindex="-1"
      @keydown.tab.prevent="retryButton?.focus()"
      @keydown.esc.stop.prevent
    >
      <div class="editor-loading-card" role="status" aria-live="polite">
        <el-icon v-if="!failed" class="editor-loading-spinner" :size="36"
          ><Loading></Loading
        ></el-icon>
        <p>{{ message }}</p>
        <p class="editor-loading-hint">{{ t("common.editorLoading.hint") }}</p>
        <button
          v-if="failed"
          ref="retryButton"
          type="button"
          @click="$emit('retry')"
        >
          {{ t("common.editorLoading.retry") }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onActivated,
  onDeactivated,
  onBeforeUnmount,
  ref,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import { Loading } from "@element-plus/icons-vue";
const props = defineProps<{ blocked: boolean; failed: boolean }>();
defineEmits<{ retry: [] }>();
const { t } = useI18n();
const active = ref(true);
const visible = computed(() => props.blocked && active.value);
const message = computed(() =>
  t(
    props.failed
      ? "common.editorLoading.failed"
      : "common.editorLoading.message"
  )
);
const overlay = ref<HTMLElement>();
const retryButton = ref<HTMLButtonElement>();
let previousFocus: HTMLElement | null = null;
let background: HTMLElement | null = null;
let previouslyInert = false;
const release = () => {
  if (background) background.inert = previouslyInert;
  background = null;
  if (previousFocus?.isConnected) previousFocus.focus();
  previousFocus = null;
};
watch(
  visible,
  async (show) => {
    if (!show) {
      release();
      return;
    }
    previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    background = document.getElementById("app");
    if (background) {
      previouslyInert = background.inert;
      background.inert = true;
    }
    await nextTick();
    if (visible.value) overlay.value?.focus();
  },
  { immediate: true }
);
onActivated(() => {
  active.value = true;
});
onDeactivated(() => {
  active.value = false;
  release();
});
onBeforeUnmount(release);
</script>

<style scoped>
.editor-loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  place-items: center;
  cursor: wait;
  background: var(--el-mask-color, rgb(255 255 255 / 90%));
  backdrop-filter: blur(3px);
  outline: none;
}

.editor-loading-card {
  padding: 32px;
  color: var(--el-text-color-primary);
  text-align: center;
}

.editor-loading-spinner {
  color: var(--el-color-primary);
  animation: editor-loading-spin 1s linear infinite;
}

.editor-loading-hint {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

button {
  padding: 10px 24px;
  color: var(--el-color-white);
  cursor: pointer;
  background: var(--el-color-primary);
  border: 0;
  border-radius: var(--el-border-radius-base);
}

@keyframes editor-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .editor-loading-spinner {
    animation: none;
  }
}
</style>
