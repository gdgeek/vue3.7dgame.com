<template>
  <EditorScriptDrawer
    ref="drawer"
    class="meta-script-drawer"
    :editor-component="MetaScriptEditor"
    :editor-key="metaId"
    :editor-props="{ embedded: true, metaId, metaData }"
    :title="title"
    editor-label-key="route.meta.scriptEditor"
    save-label-key="meta.script.save"
    @closed="$emit('closed')"
    @saved="$emit('saved', $event)"
  ></EditorScriptDrawer>
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref } from "vue";
import EditorScriptDrawer from "./EditorScriptDrawer.vue";
import type { ScriptDrawerHandle } from "./script-drawer-types";

const MetaScriptEditor = defineAsyncComponent(() =>
  import("@/views/meta/script.vue").then((module) => module.default)
);

defineProps<{
  metaId: number;
  title: string;
  metaData?: unknown;
}>();
defineEmits<{ closed: []; saved: [payload: unknown] }>();
const drawer = ref<ScriptDrawerHandle>();

defineExpose({
  open: () => drawer.value!.open(),
  close: (assertActive?: () => void) => drawer.value!.close(assertActive),
  getState: () => drawer.value!.getState(),
  resolveBeforeLeave: () => drawer.value!.resolveBeforeLeave(),
  closeAfterNavigation: () => drawer.value!.closeAfterNavigation(),
} satisfies ScriptDrawerHandle);
</script>
