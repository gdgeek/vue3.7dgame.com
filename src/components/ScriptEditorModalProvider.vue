<template>
  <ScriptEditorModal
    v-if="currentType === 'verse'"
    v-model="isModalOpen"
    :verse-id="currentVerseId"
    :title="currentTitle"
    @saved="handleSaved"
  ></ScriptEditorModal>
  <MetaScriptEditorModal
    v-if="currentType === 'meta'"
    v-model="isModalOpen"
    :meta-id="currentMetaId"
    :title="currentTitle"
    @saved="handleSaved"
  ></MetaScriptEditorModal>
</template>

<script setup lang="ts">
import ScriptEditorModal from "./ScriptEditorModal.vue";
import MetaScriptEditorModal from "./MetaScriptEditorModal.vue";
import { useScriptEditorModal } from "@/composables/useScriptEditorModal";

const {
  isModalOpen,
  currentVerseId,
  currentMetaId,
  currentType,
  currentTitle,
  handleSaved,
} = useScriptEditorModal();
</script>
