<template>
  <div v-if="editorVersionToolbarState.active" class="editor-version-toolbar">
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

const { t } = useI18n();
const { editorVersionToolbarState, openDialog } = useEditorVersionToolbar();
</script>

<style lang="scss" scoped>
.editor-version-toolbar {
  display: flex;
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
</style>
