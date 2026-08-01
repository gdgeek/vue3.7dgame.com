<template>
  <div v-if="editorVersionToolbarState.active" class="editor-version-toolbar">
    <el-button
      v-if="editorVersionToolbarState.onRunPreview"
      class="toolbar-entry-btn"
      size="small"
      @click="runPreview"
    >
      <el-icon class="entry-icon">
        <VideoPlay></VideoPlay>
      </el-icon>
      <span class="entry-label">{{ t("common.unityPreview.entry") }}</span>
    </el-button>
    <el-button class="toolbar-entry-btn" size="small" @click="openDialog">
      <font-awesome-icon
        class="entry-icon"
        :icon="['fas', 'clock-rotate-left']"
      ></font-awesome-icon>
      <span class="entry-label">{{ t("common.scriptDraft.entry") }}</span>
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useEditorVersionToolbar } from "@/composables/useEditorVersionToolbar";
import { VideoPlay } from "@element-plus/icons-vue";

const { t } = useI18n();
const { editorVersionToolbarState, openDialog, runPreview } =
  useEditorVersionToolbar();
</script>

<style lang="scss" scoped>
.editor-version-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-left: 4px;
}

.toolbar-entry-btn {
  height: 32px;
  padding: 0 14px;
  border-radius: 999px;
}

.entry-icon {
  margin-right: 6px;
}

.toolbar-entry-btn :deep(.el-icon.entry-icon) {
  margin-right: 6px;
}

@container app-navbar (width <= 1200px) {
  .editor-version-toolbar {
    gap: 4px;
    margin-left: 0;
  }

  .toolbar-entry-btn {
    width: 40px;
    min-width: 40px;
    height: 40px;
    padding: 0;
  }

  .entry-icon,
  .toolbar-entry-btn :deep(.el-icon.entry-icon) {
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
