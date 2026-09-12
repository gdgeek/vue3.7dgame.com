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
      <div
        class="script-drawer-actions"
        role="group"
        :aria-label="$t(editorLabelKey)"
      >
        <el-tooltip :content="$t(saveLabelKey)" placement="bottom">
          <el-button
            class="script-drawer-action script-drawer-action--save"
            v-bind="{ 'aria-label': $t(saveLabelKey) }"
            :disabled="
              !scriptEditor?.saveable ||
              scriptEditor.editorContentLoading ||
              scriptEditor.isSaving
            "
            :loading="scriptEditor?.isSaving"
            @click="scriptEditor?.save()"
          >
            <font-awesome-icon
              v-if="!scriptEditor?.isSaving"
              :icon="faFloppyDisk"
            ></font-awesome-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip :content="$t(versionsLabelKey)" placement="bottom">
          <el-button
            class="script-drawer-action"
            v-bind="{ 'aria-label': $t(versionsLabelKey) }"
            :disabled="
              !scriptEditor ||
              scriptEditor.editorContentLoading ||
              scriptEditor.isSaving
            "
            @click="scriptEditor?.openVersionDialog()"
          >
            <font-awesome-icon :icon="faClockRotateLeft"></font-awesome-icon>
          </el-button>
        </el-tooltip>
      </div>
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
  versionsLabelKey: string;
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
  --script-save-color: var(--primary-dark);

  max-width: 1800px;
  height: calc(100% - 16px);
  margin-top: 8px;
  color: var(--text-primary, #1e293b);
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 20px 0 0 20px;

  .dark & {
    --script-save-color: color-mix(
      in srgb,
      var(--primary-color) 70%,
      var(--text-primary)
    );
  }

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

  .script-drawer-actions {
    display: flex;
    flex: 0 0 auto;
    overflow: hidden;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 10px;
  }

  .script-drawer-action.el-button {
    width: 40px;
    height: 38px;
    padding: 0;
    margin: 0;
    font-size: 14px;
    color: var(--text-secondary);
    background: transparent;
    border: 0;
    border-radius: 0;
    box-shadow: none;

    & + .script-drawer-action {
      border-left: 1px solid var(--border-color);
    }

    &:hover:not(:disabled) {
      color: var(--primary-color);
      background: var(--bg-hover);
    }

    &:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: -3px;
    }

    &.script-drawer-action--save {
      color: var(--script-save-color);
      background: var(--primary-light);
    }

    &.is-disabled {
      opacity: 0.45;
    }

    .el-icon.is-loading {
      margin: 0;
    }
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
