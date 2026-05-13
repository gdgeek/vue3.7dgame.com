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
      {{ t("common.unityPreview.entry") }}
    </el-button>
    <el-button class="toolbar-entry-btn" size="small" @click="openDialog">
      <font-awesome-icon
        class="entry-icon"
        :icon="['fas', 'clock-rotate-left']"
      ></font-awesome-icon>
      {{ t("common.scriptDraft.entry") }}
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
</style>
