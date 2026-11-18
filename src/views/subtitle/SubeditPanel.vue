<template>
  <div ref="container" class="subedit-panel"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  createSubtitleEditor,
  type SubtitleEditorHandle,
} from "../../../vendor/subedit/editor";

const props = defineProps<{ initialSrt: string }>();
const { locale } = useI18n();
const container = ref<HTMLElement>();
let editor: SubtitleEditorHandle | undefined;

onMounted(() => {
  editor = createSubtitleEditor(
    container.value!,
    { text: props.initialSrt, filename: "asset.srt" },
    {
      locale: locale.value,
      standaloneSrt: true,
      showSave: false,
    }
  );
});
onBeforeUnmount(() => editor?.destroy());

function invalidTime() {
  return container.value?.querySelector<HTMLInputElement>("input:invalid");
}
function getText() {
  // Commit the focused time field on browsers where a button click keeps input focus.
  const active = document.activeElement;
  if (active instanceof HTMLInputElement && container.value?.contains(active))
    active.blur();
  return editor?.getText() ?? props.initialSrt;
}
function reportValidity() {
  return invalidTime()?.reportValidity() ?? true;
}
function hasChanges() {
  return getText() !== props.initialSrt || Boolean(invalidTime());
}
defineExpose({ getText, reportValidity, hasChanges });
</script>

<style scoped>
.subedit-panel {
  height: clamp(300px, 50vh, 580px);
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  overflow: hidden;
}
.subedit-panel :deep(.se-field input:invalid) {
  border-color: var(--el-color-danger);
}
@media (max-width: 600px) {
  .subedit-panel :deep(.se-row),
  .subedit-panel :deep(.se-listhead) {
    grid-template-columns: 28px 83px 83px minmax(40px, 1fr);
    gap: 3px;
    padding-inline: 4px;
  }
  .subedit-panel :deep(.se-row > :nth-child(4)),
  .subedit-panel :deep(.se-row > :nth-child(5)),
  .subedit-panel :deep(.se-listhead > :nth-child(4)),
  .subedit-panel :deep(.se-listhead > :nth-child(5)) {
    display: none;
  }
}
</style>
