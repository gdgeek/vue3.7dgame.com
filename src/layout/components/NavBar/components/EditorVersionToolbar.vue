<template>
  <EditorActionGroup
    v-if="editorVersionToolbarState.active"
    class="editor-version-toolbar"
    :actions="actions"
  ></EditorActionGroup>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  faCode,
  faPlay,
  faClockRotateLeft,
  faBoxArchive,
} from "@fortawesome/free-solid-svg-icons";
import EditorActionGroup, {
  type EditorAction,
} from "@/components/EditorActionGroup.vue";
import { useEditorVersionToolbar } from "@/composables/useEditorVersionToolbar";

const { t } = useI18n();
const {
  editorVersionToolbarState,
  openDialog,
  runPreview,
  openScript,
  openPublications,
} = useEditorVersionToolbar();
const loadingState = computed(
  () =>
    editorVersionToolbarState.getLoadingState?.() ?? {
      loading: false,
      blocked: false,
    }
);
const actions = computed<EditorAction[]>(() => [
  ...(editorVersionToolbarState.onRunPreview
    ? [
        {
          id: "run",
          label: t("common.unityPreview.entry"),
          icon: faPlay,
          primary: true,
          class: "toolbar-entry-btn toolbar-entry-btn--run",
          onClick: runPreview,
          loading: loadingState.value.loading,
          disabled: loadingState.value.blocked,
        },
      ]
    : []),
  ...(editorVersionToolbarState.onOpenPublications
    ? [
        {
          id: "publications",
          label: t("common.publicationHistory.title"),
          icon: faBoxArchive,
          class: "toolbar-entry-btn",
          onClick: openPublications,
        },
      ]
    : []),
  {
    id: "versions",
    label: t("common.scriptDraft.entry"),
    icon: faClockRotateLeft,
    class: "toolbar-entry-btn",
    onClick: openDialog,
    loading: loadingState.value.loading,
    disabled: loadingState.value.blocked,
  },
  ...(editorVersionToolbarState.onOpenScript
    ? [
        {
          id: "script",
          label: t("route.project.scriptEditor"),
          icon: faCode,
          class: "toolbar-entry-btn",
          onClick: openScript,
          loading: loadingState.value.loading,
          disabled: loadingState.value.blocked,
        },
      ]
    : []),
]);
</script>

<style lang="scss" scoped>
.editor-version-toolbar {
  margin-left: 4px;
}

@container app-navbar (width <= 900px) {
  .editor-version-toolbar {
    margin-left: 0;
  }
}
</style>
