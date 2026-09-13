<template>
  <EditorScriptDrawer
    ref="drawer"
    class="verse-script-drawer"
    :editor-component="VerseScriptEditor"
    :editor-key="verseId"
    :editor-props="{ embedded: true, verseId, sceneData, beforePublish }"
    :title="title"
    editor-label-key="route.project.scriptEditor"
    save-label-key="verse.view.script.save"
    @closed="$emit('closed')"
    @saved="$emit('saved')"
  ></EditorScriptDrawer>
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref } from "vue";
import EditorScriptDrawer from "./EditorScriptDrawer.vue";
import type { ScriptDrawerHandle } from "./script-drawer-types";

const VerseScriptEditor = defineAsyncComponent(() =>
  import("@/views/verse/script.vue").then((module) => module.default)
);

defineProps<{
  verseId: number;
  title: string;
  sceneData?: unknown;
  beforePublish?: () => Promise<void>;
}>();
defineEmits<{ closed: []; saved: [] }>();
const drawer = ref<ScriptDrawerHandle>();

defineExpose({
  open: () => drawer.value!.open(),
  close: (assertActive?: () => void) => drawer.value!.close(assertActive),
  getState: () => drawer.value!.getState(),
  resolveBeforeLeave: () => drawer.value!.resolveBeforeLeave(),
  closeAfterNavigation: () => drawer.value!.closeAfterNavigation(),
} satisfies ScriptDrawerHandle);
</script>
