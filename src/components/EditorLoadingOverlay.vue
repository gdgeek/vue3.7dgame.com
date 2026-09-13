<template>
  <div
    v-if="visible"
    class="editor-loading-overlay"
    role="status"
    aria-live="polite"
    :aria-label="message"
    :aria-busy="!failed"
  >
    <div class="editor-loading-card">
      <el-icon v-if="!failed" class="editor-loading-spinner" :size="28"
        ><Loading></Loading
      ></el-icon>
      <p>{{ message }}</p>
      <p class="editor-loading-hint">{{ t("common.editorLoading.hint") }}</p>
      <button v-if="failed" type="button" @click="$emit('retry')">
        {{ t("common.editorLoading.retry") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onDeactivated, ref } from "vue";
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
onActivated(() => {
  active.value = true;
});
onDeactivated(() => {
  active.value = false;
});
</script>

<style scoped>
.editor-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-items: center;
  cursor: wait;
  background: var(--el-mask-color, rgb(255 255 255 / 90%));
  border-radius: inherit;
}

.editor-loading-card {
  max-width: min(320px, 100%);
  padding: 16px;
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
  padding: 8px 16px;
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
