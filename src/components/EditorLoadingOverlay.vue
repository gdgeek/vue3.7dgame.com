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
      <p class="editor-loading-work">{{ currentWork }}</p>
      <template v-if="!failed">
        <progress
          class="editor-loading-progress"
          :value="percentage ?? undefined"
          max="100"
          :aria-label="t('common.editorLoading.progressLabel')"
        ></progress>
        <p v-if="percentage !== null" class="editor-loading-count">
          {{
            t("common.editorLoading.count", {
              completed: progress?.completed,
              total: progress?.total,
            })
          }}
          · {{ percentage }}%
        </p>
      </template>
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
import type { EditorLoadProgress } from "@/utils/editorLoadProgress";
const props = defineProps<{
  blocked: boolean;
  failed: boolean;
  progress?: EditorLoadProgress;
}>();
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
const percentage = computed(() => {
  const p = props.progress;
  return p?.phase === "assets" &&
    p.total !== null &&
    p.total > 0 &&
    p.completed !== null
    ? Math.floor((p.completed / p.total) * 100)
    : null;
});
const currentWork = computed(() => {
  const p = props.progress;
  if (props.failed) return t("common.editorLoading.workFailed");
  const phase = p?.phase ?? "connecting";
  const key = phase === "assets" && p?.currentKind ? p.currentKind : phase;
  const work = t(`common.editorLoading.stages.${key}`);
  return phase === "assets" && p?.currentItem
    ? `${work}：${p.currentItem}`
    : work;
});
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

.editor-loading-work {
  margin: 12px 0;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.editor-loading-progress {
  display: block;
  width: 100%;
  height: 8px;
  accent-color: var(--el-color-primary);
}

.editor-loading-count {
  margin: 8px 0;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
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
