<template>
  <div v-if="editorVersionToolbarState.active" class="editor-version-toolbar">
    <el-tooltip
      v-if="editorVersionToolbarState.onRunPreview"
      :content="t('common.unityPreview.entry')"
      placement="bottom"
    >
      <el-button
        class="toolbar-entry-btn toolbar-entry-btn--run"
        size="small"
        v-bind="{ 'aria-label': t('common.unityPreview.entry') }"
        @click="runPreview"
      >
        <font-awesome-icon
          class="entry-icon"
          :icon="['fas', 'play']"
        ></font-awesome-icon>
        <span class="entry-label">{{ t("common.unityPreview.entry") }}</span>
      </el-button>
    </el-tooltip>
    <el-tooltip :content="t('common.scriptDraft.entry')" placement="bottom">
      <el-button
        class="toolbar-entry-btn"
        size="small"
        v-bind="{ 'aria-label': t('common.scriptDraft.entry') }"
        @click="openDialog"
      >
        <font-awesome-icon
          class="entry-icon"
          :icon="['fas', 'clock-rotate-left']"
        ></font-awesome-icon>
        <span class="entry-label">{{ t("common.scriptDraft.entry") }}</span>
      </el-button>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useEditorVersionToolbar } from "@/composables/useEditorVersionToolbar";

const { t } = useI18n();
const { editorVersionToolbarState, openDialog, runPreview } =
  useEditorVersionToolbar();
</script>

<style lang="scss" scoped>
.editor-version-toolbar {
  --toolbar-run-color: var(--primary-dark);

  display: flex;
  align-items: center;
  margin-left: 4px;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;

  .dark & {
    --toolbar-run-color: color-mix(
      in srgb,
      var(--primary-color) 70%,
      var(--text-primary)
    );
  }
}

.editor-version-toolbar .toolbar-entry-btn {
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

  & + .toolbar-entry-btn {
    border-left: 1px solid var(--border-color);
  }

  &:hover {
    color: var(--primary-color);
    background: var(--bg-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -3px;
  }

  &--run {
    font-weight: 600;
    color: var(--toolbar-run-color);
    background: var(--primary-light);

    &:hover {
      color: var(--toolbar-run-color);
      background: color-mix(in srgb, var(--primary-color) 18%, transparent);
    }
  }
}

.entry-icon {
  margin-right: 6px;
  font-size: 14px;
}

@container app-navbar (width <= 900px) {
  .editor-version-toolbar {
    margin-left: 0;
  }

  .editor-version-toolbar .toolbar-entry-btn {
    width: 40px;
    padding: 0;
  }

  .entry-icon {
    margin-right: 0;
  }

  .entry-label {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
}
</style>
