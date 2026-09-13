<template>
  <div class="editor-action-group" role="group" :aria-label="label">
    <el-tooltip
      v-for="action in actions"
      :key="action.id"
      :content="action.label"
      placement="bottom"
    >
      <el-button
        class="editor-action-button"
        :class="[action.class, { 'is-primary-action': action.primary }]"
        size="small"
        v-bind="{
          'aria-label': action.label,
          'aria-busy': Boolean(action.loading),
        }"
        :disabled="action.disabled"
        :loading="action.loading"
        @click="action.onClick()"
      >
        <font-awesome-icon
          v-if="!action.loading"
          class="editor-action-icon"
          :icon="action.icon"
        ></font-awesome-icon>
        <span class="editor-action-label">{{ action.label }}</span>
      </el-button>
    </el-tooltip>
  </div>
</template>

<script lang="ts">
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export interface EditorAction {
  id: string;
  label: string;
  icon: IconDefinition;
  class?: string;
  primary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => unknown;
}
</script>

<script setup lang="ts">
defineProps<{ label?: string; actions: EditorAction[] }>();
</script>

<style lang="scss" scoped>
.editor-action-group {
  --editor-action-primary-color: var(--primary-dark);

  display: flex;
  flex: 0 0 auto;
  align-items: center;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;

  .dark & {
    --editor-action-primary-color: color-mix(
      in srgb,
      var(--primary-color) 70%,
      var(--text-primary)
    );
  }
}

.editor-action-group .editor-action-button {
  min-width: 40px;
  height: 38px;
  padding: 0 12px;
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;

  & + .editor-action-button {
    border-left: 1px solid var(--border-color);
  }

  &:hover:not(:disabled) {
    color: var(--primary-color);
    background: var(--bg-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -3px;
  }

  &.is-primary-action {
    font-weight: 600;
    color: var(--editor-action-primary-color);
    background: var(--primary-light);

    &:hover:not(:disabled) {
      color: var(--editor-action-primary-color);
      background: color-mix(in srgb, var(--primary-color) 18%, transparent);
    }
  }

  &.is-disabled {
    opacity: 0.45;
  }

  &.is-loading {
    color: var(--editor-action-primary-color);
    cursor: wait;
    opacity: 1;
  }

  :deep(.el-icon.is-loading) {
    margin: 0;
    color: var(--editor-action-primary-color);
  }
}

.editor-action-icon {
  font-size: 14px;
}

.editor-action-label {
  margin-left: 6px;
}

// Uses the containing navbar or script drawer's available width.
@container (width <= 900px) {
  .editor-action-group .editor-action-button {
    width: 40px;
    padding: 0;
  }

  .editor-action-label {
    display: none;
  }
}
</style>
