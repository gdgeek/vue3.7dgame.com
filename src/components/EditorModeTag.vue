<template>
  <span class="editor-mode-tag" aria-current="page">
    <span class="editor-mode-tag__icon" aria-hidden="true">{{ icon }}</span>
    <span class="editor-mode-tag__label">{{ label }}</span>
    <span v-if="dirty" class="editor-mode-tag__dirty" aria-hidden="true"></span>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

type EditorMode = "script" | "scene" | "entity";

const props = withDefaults(
  defineProps<{
    label: string;
    mode: EditorMode;
    dirty?: boolean;
  }>(),
  {
    dirty: false,
  }
);

const icon = computed(() => (props.mode === "script" ? "</>" : "◇"));
</script>

<style scoped>
.editor-mode-tag {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 6px;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 650;
  line-height: 1;
  color: var(--primary-color, #409eff);
  white-space: nowrap;
  background: color-mix(
    in srgb,
    var(--primary-color, #409eff) 10%,
    transparent
  );
  border: 1px solid
    color-mix(in srgb, var(--primary-color, #409eff) 30%, transparent);
  border-radius: 999px;
}

.editor-mode-tag__icon {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.editor-mode-tag__label {
  line-height: 1;
}

.editor-mode-tag__dirty {
  width: 7px;
  height: 7px;
  background: #f59a23;
  border-radius: 50%;
}

@media (width <= 480px) {
  .editor-mode-tag {
    height: 26px;
    padding: 0 8px;
    font-size: 12px;
  }
}
</style>
