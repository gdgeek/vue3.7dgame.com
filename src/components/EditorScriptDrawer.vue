<template>
  <el-drawer
    v-model="visible"
    direction="rtl"
    size="92%"
    class="editor-script-drawer"
    :title="`${$t(editorLabelKey)}${title ? ` · ${title}` : ''}`"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :before-close="beforeClose"
    append-to-body
    destroy-on-close
    @closed="handleClosed"
  >
    <template #header="{ titleId, titleClass }">
      <h2 :id="titleId" :class="titleClass">
        {{ $t(editorLabelKey) }}{{ title ? ` · ${title}` : "" }}
      </h2>
      <EditorActionGroup
        class="script-drawer-actions"
        :label="$t(editorLabelKey)"
        :actions="[
          {
            id: 'save',
            label: $t(saveLabelKey),
            icon: faFloppyDisk,
            class: 'script-drawer-action script-drawer-action--save',
            primary: true,
            disabled:
              !scriptEditor?.saveable ||
              scriptEditor.editorContentLoading ||
              scriptEditor.isSaving,
            loading:
              !scriptEditor ||
              scriptEditor.editorContentLoading ||
              scriptEditor.isSaving,
            onClick: () => scriptEditor?.save(),
          },
          {
            id: 'versions',
            label: $t('common.scriptDraft.entry'),
            icon: faClockRotateLeft,
            class: 'script-drawer-action',
            disabled:
              !scriptEditor ||
              scriptEditor.editorContentLoading ||
              scriptEditor.isSaving,
            loading: !scriptEditor || scriptEditor.editorContentLoading,
            onClick: () => scriptEditor?.openVersionDialog(),
          },
        ]"
      ></EditorActionGroup>
    </template>
    <component
      :is="editorComponent"
      v-if="visible"
      :key="editorKey"
      ref="scriptEditor"
      v-bind="editorProps"
      @close="requestClose()"
      @saved="$emit('saved', $event)"
    ></component>
  </el-drawer>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, type Component } from "vue";
import EditorActionGroup from "./EditorActionGroup.vue";
import type {
  ScriptDrawerEditor,
  ScriptDrawerState,
} from "./script-drawer-types";
import {
  faClockRotateLeft,
  faFloppyDisk,
} from "@fortawesome/free-solid-svg-icons";

defineProps<{
  editorComponent: Component;
  editorKey: number;
  editorProps: Record<string, unknown>;
  title: string;
  editorLabelKey: string;
  saveLabelKey: string;
}>();
const emit = defineEmits<{ closed: []; saved: [payload: unknown] }>();
const visible = ref(false);
const scriptEditor = ref<ScriptDrawerEditor>();
let pendingClose: Promise<boolean> | null = null;
let closing: Promise<boolean> | null = null;
let finishClosing: ((closed: boolean) => void) | null = null;
let session = 0;
let sessionLifecycle = new AbortController();
const invalidateSession = () => {
  session += 1;
  sessionLifecycle.abort();
  sessionLifecycle = new AbortController();
  pendingClose = null;
};

const beginClosing = () => {
  if (!closing) {
    closing = new Promise<boolean>((resolve) => {
      finishClosing = resolve;
    });
  }
  return closing;
};

const resolveBeforeLeave = (): Promise<boolean> => {
  if (!visible.value || !scriptEditor.value) return Promise.resolve(true);
  // Closing the drawer and navigating share one save/discard decision.
  if (!pendingClose) {
    const controller = sessionLifecycle;
    const editor = scriptEditor.value;
    let cancelDecision: () => void;
    const decision = new Promise<boolean>((resolve, reject) => {
      cancelDecision = () => resolve(false);
      controller.signal.addEventListener("abort", cancelDecision, {
        once: true,
      });
      editor.resolveBeforeClose().then(resolve, reject);
    }).finally(() => {
      controller.signal.removeEventListener("abort", cancelDecision);
      if (pendingClose === decision) pendingClose = null;
    });
    pendingClose = decision;
  }
  return pendingClose;
};
const beforeClose = async (done: () => void) => {
  const currentSession = session;
  if (await resolveBeforeLeave()) {
    if (currentSession !== session) return;
    beginClosing();
    done();
  }
};
const requestClose = async (assertActive: () => void = () => {}) => {
  assertActive();
  if (closing) return closing;
  if (!visible.value) return true;
  const currentSession = session;
  if (!(await resolveBeforeLeave())) return false;
  assertActive();
  if (currentSession !== session) return false;
  if (!visible.value) return closing ?? true;
  const completed = beginClosing();
  visible.value = false;
  return completed;
};
const handleClosed = () => {
  // The host restores its editor tools before the close tool reports success.
  emit("closed");
  finishClosing?.(true);
  finishClosing = null;
  closing = null;
};
const getState = (): ScriptDrawerState => ({
  open: visible.value || Boolean(closing),
  ready:
    visible.value &&
    !closing &&
    Boolean(scriptEditor.value) &&
    !scriptEditor.value!.editorContentLoading,
  dirty: Boolean(scriptEditor.value?.hasUnsavedChanges),
  saving: Boolean(scriptEditor.value?.isSaving),
  tab: visible.value ? (scriptEditor.value?.activeName ?? null) : null,
});
onBeforeUnmount(() => {
  invalidateSession();
  finishClosing?.(false);
  finishClosing = null;
  closing = null;
});

defineExpose({
  open: () => {
    if (closing) throw new Error("脚本编辑正在关闭，请稍后重试");
    if (!visible.value) invalidateSession();
    visible.value = true;
  },
  close: requestClose,
  getState,
  resolveBeforeLeave,
  closeAfterNavigation: () => {
    invalidateSession();
    if (!visible.value) return closing ?? Promise.resolve(true);
    const completed = beginClosing();
    visible.value = false;
    return completed;
  },
});
</script>

<style lang="scss">
.editor-script-drawer.el-drawer {
  container: script-drawer / inline-size;
  max-width: 1800px;
  height: calc(100% - 16px);
  margin-top: 8px;
  color: var(--text-primary, #1e293b);
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 20px 0 0 20px;

  .el-drawer__header {
    gap: 16px;
    padding: 16px 24px;
    margin-bottom: 0;
    border-bottom: 1px solid var(--border-color, #e2e8f0);
  }

  .el-drawer__title {
    min-width: 0;
    margin: 0;
    overflow: hidden;
    font-size: 20px;
    font-weight: 650;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .el-drawer__body {
    min-height: 0;
    padding: 0;
  }

  @media (width <= 767px) {
    width: 100% !important;
    height: 100%;
    margin-top: 0;
    border-radius: 0;

    .el-drawer__header {
      padding: 16px;
    }

    .el-drawer__title {
      font-size: 17px;
    }
  }
}
</style>
