<template>
  <div v-if="editorVersionToolbarState.active" class="editor-version-toolbar">
    <EditorActionGroup :actions="actions"></EditorActionGroup>
    <EntityInfoDialog
      v-if="isEntityEditor"
      v-model="entityInfoVisible"
      :entity-id="entityId"
    ></EntityInfoDialog>
    <SceneInfoDialog
      v-if="isSceneEditor"
      v-model="sceneInfoVisible"
      :scene-id="entityId"
    ></SceneInfoDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import {
  faCode,
  faCube,
  faLayerGroup,
  faPlay,
  faClockRotateLeft,
  faBoxArchive,
} from "@fortawesome/free-solid-svg-icons";
import EditorActionGroup, {
  type EditorAction,
} from "@/components/EditorActionGroup.vue";
import { useEditorVersionToolbar } from "@/composables/useEditorVersionToolbar";

const EntityInfoDialog = defineAsyncComponent(
  () => import("@/components/Meta/EntityInfoDialog.vue")
);
const SceneInfoDialog = defineAsyncComponent(
  () => import("@/components/SceneInfoDialog.vue")
);
const { t } = useI18n();
const route = useRoute();
const routePath = computed(() => route?.path ?? "");
const isEntityEditor = computed(() => routePath.value === "/meta/scene");
const isSceneEditor = computed(() => routePath.value === "/verse/scene");
const entityId = computed(() => {
  const value = route?.query?.id;
  return Number(Array.isArray(value) ? value[0] : value);
});
const entityInfoVisible = ref(false);
const sceneInfoVisible = ref(false);
watch(
  routePath,
  () => {
    entityInfoVisible.value = false;
    sceneInfoVisible.value = false;
  }
);
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
  ...(isSceneEditor.value
    ? [
        {
          id: "scene-info",
          label: t("verse.toolbar.info"),
          icon: faLayerGroup,
          iconOnly: true,
          class: "toolbar-entry-btn toolbar-entry-btn--scene-info",
          onClick: () => {
            sceneInfoVisible.value = true;
          },
        },
      ]
    : []),
  ...(isEntityEditor.value
    ? [
        {
          id: "entity-info",
          label: t("meta.scene.editorInfo"),
          icon: faCube,
          iconOnly: true,
          class: "toolbar-entry-btn toolbar-entry-btn--entity-info",
          onClick: () => {
            entityInfoVisible.value = true;
          },
        },
      ]
    : []),
  ...(editorVersionToolbarState.onRunPreview
    ? [
        {
          id: "run",
          label: t(
            isSceneEditor.value
              ? "verse.toolbar.run"
              : "common.unityPreview.entry"
          ),
          tooltip: t("common.unityPreview.entry"),
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
          label: t(
            isSceneEditor.value
              ? "verse.toolbar.versions"
              : "common.publicationHistory.title"
          ),
          tooltip: t("common.publicationHistory.title"),
          icon: faBoxArchive,
          class: "toolbar-entry-btn",
          onClick: openPublications,
        },
      ]
    : []),
  {
    id: "versions",
    label: t(
      isSceneEditor.value ? "verse.toolbar.history" : "common.scriptDraft.entry"
    ),
    tooltip: t("common.scriptDraft.entry"),
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
          label: t(
            isSceneEditor.value
              ? "verse.toolbar.script"
              : "route.project.scriptEditor"
          ),
          tooltip: t("route.project.scriptEditor"),
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
  display: flex;
  align-items: center;
  margin-left: 4px;
}

@container app-navbar (width <= 900px) {
  .editor-version-toolbar {
    margin-left: 0;
  }
}
</style>
