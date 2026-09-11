<template>
  <div class="verse-code">
    <el-container>
      <el-main>
        <el-card class="box-card">
          <el-container>
            <div class="script-tabs-wrapper">
              <div class="script-editor-toolbar">
                <div
                  class="script-mode-tabs"
                  role="tablist"
                  :aria-label="$t('meta.script.title')"
                >
                  <button
                    type="button"
                    class="script-mode-tab"
                    :class="{ 'is-active': activeName === 'blockly' }"
                    role="tab"
                    :aria-selected="activeName === 'blockly'"
                    @click="activeName = 'blockly'"
                  >
                    {{ $t("verse.view.script.edit") }}
                  </button>
                  <button
                    type="button"
                    class="script-mode-tab"
                    :class="{ 'is-active': activeName === 'script' }"
                    role="tab"
                    :aria-selected="activeName === 'script'"
                    @click="activeName = 'script'"
                  >
                    {{ $t("verse.view.script.code") }}
                  </button>
                </div>

                <div v-if="meta" class="script-tabs-actions">
                  <el-select
                    v-model="selectedUsedSceneId"
                    class="script-used-scenes-select"
                    size="small"
                    :placeholder="usedSceneSelectPlaceholder"
                    :disabled="usedSceneOptions.length === 0"
                    popper-class="script-used-scenes-popper"
                    @change="handleUsedSceneChange"
                  >
                    <el-option
                      v-for="scene in usedSceneOptions"
                      :key="scene.id"
                      :label="scene.name"
                      :value="scene.id"
                    ></el-option>
                  </el-select>
                  <el-button
                    class="script-action-button"
                    type="primary"
                    size="small"
                    :title="$t('meta.script.entityEditor')"
                    :aria-label="$t('meta.script.entityEditor')"
                    @click="goBackToSceneEditor"
                  >
                    <font-awesome-icon
                      class="script-action-icon"
                      :icon="['fas', 'cube']"
                    ></font-awesome-icon>
                    <span class="secondary-action-label">
                      {{ $t("meta.script.entityEditor") }}
                    </span>
                  </el-button>
                  <el-button
                    class="script-action-button script-save-button"
                    type="primary"
                    size="small"
                    :title="$t('meta.script.save')"
                    :aria-label="$t('meta.script.save')"
                    @click="save"
                  >
                    <font-awesome-icon
                      class="script-action-icon"
                      icon="save"
                    ></font-awesome-icon>
                    <span>{{ $t("meta.script.save") }}</span>
                  </el-button>
                </div>
              </div>
              <el-tabs
                v-model="activeName"
                class="script-main-tabs"
                type="card"
                style="width: 100%"
              >
                <el-tab-pane
                  :label="$t('verse.view.script.edit')"
                  name="blockly"
                >
                  <el-main class="blockly-editor-main">
                    <div
                      v-if="editorContentLoading"
                      class="script-editor-loading-indicator"
                    >
                      <el-icon class="script-editor-loading-spinner is-loading">
                        <Loading></Loading>
                      </el-icon>
                    </div>
                    <iframe
                      :key="editorFrameKey"
                      style="width: 100%; height: 100%; padding: 0; margin: 0"
                      class="blockly-editor-frame"
                      scrolling="no"
                      id="editor"
                      ref="editor"
                      :src="src"
                      @load="handleEditorFrameLoad"
                    ></iframe>
                  </el-main>
                </el-tab-pane>
                <el-tab-pane
                  :label="$t('verse.view.script.code') || 'Script Code'"
                  name="script"
                >
                  <el-card
                    v-if="activeName === 'script'"
                    class="box-card"
                    :class="isDark ? 'dark-theme' : 'light-theme'"
                  >
                    <div v-highlight>
                      <el-tabs v-model="languageName">
                        <el-tab-pane label="Lua" name="lua">
                          <template #label>
                            <span style="display: flex; align-items: center">
                              <img
                                src="/lua.png"
                                style="width: 25px; margin-right: 5px"
                                alt=""
                              />
                              <span>Lua</span>
                            </span>
                          </template>
                          <div class="code-container">
                            <el-button
                              class="copy-button"
                              text
                              @click="copyCode(LuaCode)"
                              ><el-icon class="icon">
                                <CopyDocument></CopyDocument> </el-icon
                              >{{ $t("copy.title") || "Copy" }}</el-button
                            >
                            <pre>
                  <code class="lua">{{ LuaCode }}</code>
                </pre>
                          </div>
                        </el-tab-pane>
                        <el-tab-pane label="JavaScript" name="javascript">
                          <template #label>
                            <span style="display: flex; align-items: center">
                              <img
                                src="/javascript.png"
                                style="width: 25px; margin-right: 5px"
                                alt=""
                              />
                              <span>JavaScript</span>
                            </span>
                          </template>
                          <div class="code-container">
                            <el-button
                              class="copy-button"
                              text
                              @click="copyCode(JavaScriptCode)"
                              ><el-icon class="icon">
                                <CopyDocument></CopyDocument> </el-icon
                              >{{ $t("copy.title") }}</el-button
                            >
                            <pre>
                  <code class="javascript">{{ JavaScriptCode }}</code>
                </pre>
                          </div>
                        </el-tab-pane>
                      </el-tabs>
                    </div>
                  </el-card>
                </el-tab-pane>
              </el-tabs>
            </div>
          </el-container>
        </el-card>
        <ScriptDraftDialog
          :model-value="versionDialogVisible"
          :versions="draftVersions"
          :auto-save-enabled="autoSaveEnabled"
          :auto-save-interval-seconds="autoSaveIntervalSeconds"
          @update:model-value="versionDialogVisible = $event"
          @update:auto-save-enabled="autoSaveEnabled = $event"
          @update:auto-save-interval-seconds="autoSaveIntervalSeconds = $event"
          @clear-history="clearDraftHistory"
          @restore="restoreDraftVersion"
        ></ScriptDraftDialog>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import {
  computed,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  watch,
} from "vue";
import { CopyDocument, Loading } from "@element-plus/icons-vue";
import { logger } from "@/utils/logger";
import { onBeforeRouteUpdate, useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { getMeta, metaInfo, putMetaCode } from "@/api/v1/meta";
import { getVerses } from "@/api/v1/verse";
import { Message } from "@/components/Dialog";
import pako from "pako";
import { getConfiguredGLTFLoader } from "@/lib/three/loaders";
import { convertToHttps } from "@/assets/js/helper";
import {
  buildMetaResourceIndex,
  type MetaResourceIndex,
} from "@/components/Meta/useMetaResourceParser";
import {
  useScriptEditorBase,
  type EditorPostPayload,
  type ScriptSaveTrigger,
} from "@/composables/useScriptEditorBase";
import ScriptDraftDialog from "@/components/ScriptDraftDialog.vue";
import {
  useEditorVersionToolbar,
  type EditorToolbarStatus,
} from "@/composables/useEditorVersionToolbar";
import { useUserStore } from "@/store/modules/user";

import {
  registerMetaScriptWebMcpTools,
  type MetaScriptReplaceCompletion,
  type MetaScriptReplacePreview,
  type MetaScriptSnapshot,
} from "@/services/webmcp/meta-script-tools";
import {
  registerScriptBlockWebMcpTools,
  type ScriptBlockBatchCompletion,
  type ScriptBlockBatchPreview,
} from "@/services/webmcp/script-block-tools";
let webMcpLifecycle: AbortController | null = null;
let scriptBlockWebMcpLifecycle: AbortController | null = null;
import {
  formatBlockOperationResults,
  formatScriptWarnings,
} from "@/utils/webMcpConfirmation";
import { WebMcpCompletionError } from "@/services/webmcp/completion-result";
import { createIframeRpc } from "@/utils/iframeRpc";

// ---------- Meta 专有状态 ----------
const loading = ref(false);
const meta = ref<metaInfo | null>(null);
const route = useRoute();
const router = useRouter();
const id = computed(() => parseInt(route.query.id as string));
const loader = getConfiguredGLTFLoader();
let metaLoadSequence = 0;
let isScriptViewActive = true;

const test = ref<MetaResourceIndex | null>(null);

// ---------- 资源解析 ----------
const getResource = (m: metaInfo) => {
  try {
    return buildMetaResourceIndex(m);
  } catch (e) {
    logger.error("buildMetaResourceIndex error", e);
    return {
      action: [],
      trigger: [],
      polygen: [],
      picture: [],
      video: [],
      voxel: [],
      phototype: [],
      text: [],
      sound: [],
      entity: [],
      events: { inputs: [], outputs: [] },
    };
  }
};

// ---------- Meta 专有类型 ----------
type EntityNode = {
  parameters?: { resource?: string | number; animations?: string[] };
  children?: { entities?: EntityNode[] };
};

const readSavedEditorSnapshot = () => {
  if (!meta.value) return null;
  let blocklyData = meta.value.metaCode?.blockly || "{}";
  blocklyData = decompressBlockly(blocklyData);
  return {
    blocklyData: JSON.parse(blocklyData),
    js: meta.value.metaCode?.js || "",
    lua: meta.value.metaCode?.lua || "",
  };
};

// ---------- initEditor（Meta 版）----------
const initEditor = (overrideData?: unknown) => {
  if (!meta.value) return;
  if (!isReady()) return;

  let blocklyData = meta.value.metaCode?.blockly || "{}";
  try {
    blocklyData = decompressBlockly(blocklyData);
    const savedData = JSON.parse(blocklyData);
    const savedCode = {
      js: meta.value.metaCode?.js || "",
      lua: meta.value.metaCode?.lua || "",
    };
    initializeSavedSnapshot(
      {
        js: savedCode.js,
        lua: savedCode.lua,
        blocklyData: savedData,
      },
      `meta:${meta.value.id}`
    );
    const initState = getEditorInitState();
    if (!initState) return;
    test.value = getResource(meta.value);
    postMessage("INIT", {
      token: null,
      config: {
        style: ["base", "meta"],
        parameters: {
          index: meta.value.id,
          resource: getResource(meta.value),
        },
        data: overrideData ?? initState.data,
        code: initState.code,
        persisted: initState.persisted,
        hostSessionId: initState.hostSessionId,
        userInfo: {
          id: userStore.userInfo?.id || null,
          role: userStore.getRole(),
        },
      },
    });
  } catch (error) {
    logger.error("Failed to decompress or parse data:", error);
  }
};

// ---------- postScript（Meta 版：保存到服务端，无发布流程）----------
const postScript = async (
  message: EditorPostPayload,
  context: { trigger: ScriptSaveTrigger }
) => {
  if (meta.value === null) {
    const errorMessage = t("meta.script.error1");
    ElMessage.error(errorMessage);
    throw new Error(errorMessage);
  }
  if (!meta.value.editable) {
    const errorMessage = t("meta.script.error2");
    ElMessage.error(errorMessage);
    throw new Error(errorMessage);
  }

  let blocklyData = JSON.stringify(message.data);
  if (blocklyData.length > 1024 * 2) {
    const uint8Array = pako.deflate(blocklyData);
    const base64Str = btoa(String.fromCharCode.apply(null, uint8Array));
    blocklyData = `compressed:${base64Str}`;
  }

  await putMetaCode(meta.value.id, {
    blockly: blocklyData,
    lua: message.lua,
    js: message.js,
  });

  if (context.trigger === "manual") {
    Message.success(t("meta.script.success"));
  }
};

const draftStorageKey = computed(() =>
  Number.isFinite(id.value) ? `script-draft:meta:${id.value}` : null
);

// ---------- 共享编辑器 composable ----------
const {
  activeName,
  languageName,
  LuaCode,
  JavaScriptCode,
  resolveUnsavedChangesBeforeLeave,
  hasUnsavedChanges,
  draftVersions,
  versionDialogVisible,
  autoSaveEnabled,
  autoSaveIntervalSeconds,
  isSaving,
  lastSaveTrigger,
  lastSavedAt,
  editorFrameKey,
  editor,
  src,
  editorContentReady,
  isDark,
  postMessage,
  beginEditorSession,
  initializeSavedSnapshot,
  getEditorInitState,
  save: persistScript,
  openVersionDialog,
  clearDraftHistory,
  restoreDraftVersion,
  reloadEditorFrame,
  handleEditorFrameLoad,
  decompressBlockly,
  isReady,
  copyCode,
} = useScriptEditorBase({
  luaLocalVar: "meta",
  i18nKeys: {
    error1: "meta.script.error1",
    error3: "meta.script.error3",
    info: "meta.script.info",
    leaveMessage1: "meta.script.leave.message1",
    leaveMessage2: "meta.script.leave.message2",
    leaveConfirm: "meta.script.leave.confirm",
    leaveCancel: "meta.script.leave.cancel",
    leaveError: "meta.script.leave.error",
    leaveInfo: "meta.script.leave.info",
  },
  onPost: postScript,
  onReady: initEditor,
  getDraftStorageKey: () => draftStorageKey.value,
  canSave: () => Boolean(meta.value?.editable),
  onRestoreDraft: () => reloadEditorFrame(),
});

const save = persistScript;

const toolbarOwner = "meta-script-editor";
const { registerToolbar, updateToolbarStatus, unregisterToolbar } =
  useEditorVersionToolbar();
const toolbarStatus = computed<EditorToolbarStatus>(() => {
  if (isSaving.value) return "saving";
  if (hasUnsavedChanges.value) return "dirty";
  if (lastSaveTrigger.value === "auto" && lastSavedAt.value) {
    return "autosaved";
  }
  return "saved";
});
const editorContentLoading = computed(
  () => loading.value || !editorContentReady.value
);

const requireSuccessfulWebMcpResponse = (response: Record<string, unknown>) => {
  if (response.ok !== true) {
    throw new Error(
      typeof response.error === "string"
        ? response.error
        : "Blockly 编辑器操作失败"
    );
  }
  return response;
};

const webMcpRpc = createIframeRpc({
  frame: () => editor.value,
  session: () => getEditorInitState()?.hostSessionId,
  send: (action, data) => postMessage("REQUEST", { action, ...data }),
});
const handleWebMcpEditorMessage = webMcpRpc.handleMessage;

const formatMetaScriptReplaceConfirmation = (
  preview: MetaScriptReplacePreview
) =>
  [
    `确认替换实体“${preview.entityTitle}”的 Blockly 脚本吗？`,
    `块数量：${preview.current.blockCount} → ${preview.proposed.blockCount}`,
    `顶层流程：${preview.current.topLevelBlockCount} → ${preview.proposed.topLevelBlockCount}`,
    `变量数量：${preview.current.variableCount} → ${preview.proposed.variableCount}`,
    `JavaScript：${preview.current.generatedJavaScriptBytes} → ${preview.proposed.generatedJavaScriptBytes} 字节`,
    `Lua：${preview.current.generatedLuaBytes} → ${preview.proposed.generatedLuaBytes} 字节`,
    "候选工作区已完成 Blockly 反序列化与双语言代码生成检查",
    ...formatScriptWarnings(preview.warnings),
    "确认后将更新可见工作区，并调用平台原有保存流程",
  ].join("\n");

const registerMetaScriptTools = () => {
  const ownerId = id.value;
  const ownerSession = getEditorInitState()?.hostSessionId;
  let registration: AbortController | null = null;
  const assertActive = () => {
    if (
      registration?.signal.aborted ||
      !isScriptViewActive ||
      ownerId !== id.value ||
      ownerSession !== getEditorInitState()?.hostSessionId
    ) {
      throw new Error("Blockly 会话已经切换，请重新预览");
    }
  };
  const requestBlocklyEditor = (
    ...args: Parameters<typeof webMcpRpc.request>
  ) => {
    assertActive();
    return webMcpRpc.request(...args);
  };
  const save = (...args: Parameters<typeof persistScript>) => {
    assertActive();
    return persistScript(...args);
  };

  webMcpLifecycle?.abort();
  registration = webMcpLifecycle = registerMetaScriptWebMcpTools({
    getContext: () => ({
      entityId: Number.isFinite(id.value) ? id.value : null,
      entityTitle: meta.value?.title ?? "未命名实体",
      editable: Boolean(meta.value?.editable),
      ready: isScriptViewActive && editorContentReady.value,
      dirty: hasUnsavedChanges.value,
      saving: isSaving.value,
    }),
    getMetaScript: async ({ includeWorkspace, includeGeneratedCode }) => {
      if (!meta.value || !Number.isFinite(meta.value.id)) {
        throw new Error("实体脚本尚未加载完成");
      }
      const response = requireSuccessfulWebMcpResponse(
        await requestBlocklyEditor("webmcp-get-meta-script", {
          includeWorkspace,
          includeGeneratedCode,
        })
      );
      return {
        entityId: meta.value.id,
        entityTitle: meta.value.title,
        workspaceVersion: String(response.workspaceVersion),
        summary: response.summary,
        valid: Boolean(response.valid),
        issue: response.issue,
        warnings: response.warnings,
        canSave: response.canSave,
        validationScope: response.validationScope,
        workspace: response.workspace,
        generatedCode: response.generatedCode,
      } as MetaScriptSnapshot;
    },
    validateMetaScript: async (focusIssue) => {
      if (!meta.value || !Number.isFinite(meta.value.id)) {
        throw new Error("实体脚本尚未加载完成");
      }
      const response = requireSuccessfulWebMcpResponse(
        await requestBlocklyEditor("webmcp-validate-meta-script", {
          focusIssue,
        })
      );
      return {
        entityId: meta.value.id,
        entityTitle: meta.value.title,
        workspaceVersion: String(response.workspaceVersion),
        summary: response.summary,
        valid: Boolean(response.valid),
        issue: response.issue,
        warnings: response.warnings,
        canSave: response.canSave,
        validationScope: response.validationScope,
      } as MetaScriptSnapshot;
    },
    stageMetaScriptReplace: async (workspace) => {
      if (!meta.value || !Number.isFinite(meta.value.id)) {
        throw new Error("实体脚本尚未加载完成");
      }
      if (!meta.value.editable) {
        throw new Error("当前账号没有修改此实体脚本的权限");
      }
      if (!editorContentReady.value) {
        throw new Error("Blockly 工作区尚未准备完成");
      }
      if (isSaving.value) throw new Error("脚本正在保存，请稍后重试");
      if (hasUnsavedChanges.value) {
        throw new Error("当前脚本存在未保存修改，请先保存后再创建替换预览");
      }

      const response = requireSuccessfulWebMcpResponse(
        await requestBlocklyEditor(
          "webmcp-stage-meta-script-replace",
          { workspace },
          30000
        )
      );
      return {
        entityId: meta.value.id,
        entityTitle: meta.value.title,
        workspaceVersion: String(response.workspaceVersion),
        current: response.current,
        proposed: response.proposed,
        proposedWorkspace: response.proposedWorkspace,
        changed: Boolean(response.changed),
        warnings: response.warnings,
        canSave: response.canSave,
        validationScope: response.validationScope,
      } as MetaScriptReplacePreview;
    },
    confirmMetaScriptReplace: async (preview) => {
      try {
        await ElMessageBox.confirm(
          formatMetaScriptReplaceConfirmation(preview),
          "WebMCP Blockly 脚本替换",
          {
            confirmButtonText: t("meta.script.save"),
            cancelButtonText: t("common.cancel"),
            distinguishCancelAndClose: true,
            closeOnClickModal: false,
            closeOnPressEscape: true,
            showCancelButton: true,
            customClass: "script-save-confirm-box",
          }
        );
        return true;
      } catch {
        return false;
      }
    },
    completeMetaScriptReplace: async (preview) => {
      if (!meta.value || meta.value.id !== preview.entityId) {
        throw new Error("当前实体已经切换，请重新创建脚本预览");
      }
      if (!meta.value.editable) {
        throw new Error("当前账号没有修改此实体脚本的权限");
      }
      if (isSaving.value) throw new Error("脚本正在保存，请稍后重试");

      const response = requireSuccessfulWebMcpResponse(
        await requestBlocklyEditor(
          "webmcp-complete-meta-script-replace",
          {
            workspaceVersion: preview.workspaceVersion,
            workspace: preview.proposedWorkspace,
          },
          30000
        )
      );
      if (!response.noChange) {
        try {
          await save("manual", { suppressNoChangeInfo: true });
        } catch {
          throw new WebMcpCompletionError(
            {
              status: "partial",
              editorApplied: true,
              persistence: "unverified",
              retry: "read_state_before_retry",
              ownerId,
              workspaceVersion: response.workspaceVersion,
            },
            "Blockly 工作区已应用修改，保存结果未确认，请先读取状态"
          );
        }
      }
      return {
        editorApplied: !response.noChange,
        persistence: response.noChange ? "unchanged" : "server_acknowledged",
        editorAcknowledged: false,
        noChange: Boolean(response.noChange),
        entityId: meta.value.id,
        workspaceVersion: String(response.workspaceVersion),
        summary: response.summary,
      } as MetaScriptReplaceCompletion;
    },
    onRegistrationError: (toolName, error) => {
      logger.warn(`WebMCP tool registration failed: ${toolName}`, error);
    },
  });
};

const formatScriptBlockBatchConfirmation = (preview: ScriptBlockBatchPreview) =>
  [
    `确认修改实体“${preview.ownerTitle}”的 Blockly 积木吗？`,
    `批量操作：${preview.operationCount} 项`,
    ...formatBlockOperationResults(preview.results),
    `块数量：${preview.current.blockCount} → ${preview.proposed.blockCount}`,
    `顶层流程：${preview.current.topLevelBlockCount} → ${preview.proposed.topLevelBlockCount}`,
    `JavaScript：${preview.current.generatedJavaScriptBytes} → ${preview.proposed.generatedJavaScriptBytes} 字节`,
    `Lua：${preview.current.generatedLuaBytes} → ${preview.proposed.generatedLuaBytes} 字节`,
    "全部操作已在临时 Blockly 工作区执行并完成代码生成检查",
    ...formatScriptWarnings(preview.warnings),
    "确认后将作为一个撤销步骤更新可见工作区并保存",
  ].join("\n");

const registerScriptBlockTools = () => {
  const ownerId = id.value;
  const ownerSession = getEditorInitState()?.hostSessionId;
  let registration: AbortController | null = null;
  const assertActive = () => {
    if (
      registration?.signal.aborted ||
      !isScriptViewActive ||
      ownerId !== id.value ||
      ownerSession !== getEditorInitState()?.hostSessionId
    ) {
      throw new Error("Blockly 会话已经切换，请重新预览");
    }
  };
  const requestBlocklyEditor = (
    ...args: Parameters<typeof webMcpRpc.request>
  ) => {
    assertActive();
    return webMcpRpc.request(...args);
  };
  const save = (...args: Parameters<typeof persistScript>) => {
    assertActive();
    return persistScript(...args);
  };

  scriptBlockWebMcpLifecycle?.abort();
  registration = scriptBlockWebMcpLifecycle = registerScriptBlockWebMcpTools({
    getContext: () => ({
      ownerKind: "entity",
      ownerId: Number.isFinite(id.value) ? id.value : null,
      ownerTitle: meta.value?.title ?? "未命名实体",
      editable: Boolean(meta.value?.editable),
      ready: isScriptViewActive && editorContentReady.value,
      dirty: hasUnsavedChanges.value,
      saving: isSaving.value,
    }),
    getBlockCatalog: async (filters) =>
      requireSuccessfulWebMcpResponse(
        await requestBlocklyEditor("webmcp-get-script-block-catalog", filters)
      ),
    getBlockStructure: async (filters) =>
      requireSuccessfulWebMcpResponse(
        await requestBlocklyEditor("webmcp-get-script-block-structure", filters)
      ),
    stageBlockBatch: async (operations) => {
      if (!meta.value || !Number.isFinite(meta.value.id)) {
        throw new Error("实体脚本尚未加载完成");
      }
      if (!meta.value.editable) {
        throw new Error("当前账号没有修改此实体脚本的权限");
      }
      if (!editorContentReady.value) {
        throw new Error("Blockly 工作区尚未准备完成");
      }
      if (isSaving.value) throw new Error("脚本正在保存，请稍后重试");
      if (hasUnsavedChanges.value) {
        throw new Error("当前脚本存在未保存修改，请先保存后再创建积木预览");
      }
      const response = requireSuccessfulWebMcpResponse(
        await requestBlocklyEditor(
          "webmcp-stage-script-block-batch",
          { operations },
          30000
        )
      );
      return {
        ownerKind: "entity",
        ownerId: meta.value.id,
        ownerTitle: meta.value.title,
        workspaceVersion: String(response.workspaceVersion),
        current: response.current,
        proposed: response.proposed,
        proposedWorkspace: response.proposedWorkspace,
        changed: Boolean(response.changed),
        warnings: response.warnings,
        canSave: response.canSave,
        validationScope: response.validationScope,
        operationCount: Number(response.operationCount),
        results: response.results,
      } as ScriptBlockBatchPreview;
    },
    confirmBlockBatch: async (preview) => {
      try {
        await ElMessageBox.confirm(
          formatScriptBlockBatchConfirmation(preview),
          "WebMCP Blockly 积木批量修改",
          {
            confirmButtonText: t("meta.script.save"),
            cancelButtonText: t("common.cancel"),
            distinguishCancelAndClose: true,
            closeOnClickModal: false,
            closeOnPressEscape: true,
            showCancelButton: true,
            customClass: "script-save-confirm-box",
          }
        );
        return true;
      } catch {
        return false;
      }
    },
    completeBlockBatch: async (preview) => {
      if (!meta.value || meta.value.id !== preview.ownerId) {
        throw new Error("当前实体已经切换，请重新创建积木预览");
      }
      if (!meta.value.editable) {
        throw new Error("当前账号没有修改此实体脚本的权限");
      }
      if (isSaving.value) throw new Error("脚本正在保存，请稍后重试");
      const response = requireSuccessfulWebMcpResponse(
        await requestBlocklyEditor(
          "webmcp-complete-script-block-batch",
          {
            workspaceVersion: preview.workspaceVersion,
            workspace: preview.proposedWorkspace,
          },
          30000
        )
      );
      if (!response.noChange) {
        try {
          await save("manual", { suppressNoChangeInfo: true });
        } catch {
          throw new WebMcpCompletionError(
            {
              status: "partial",
              editorApplied: true,
              persistence: "unverified",
              retry: "read_state_before_retry",
              ownerId,
              workspaceVersion: response.workspaceVersion,
            },
            "Blockly 工作区已应用修改，保存结果未确认，请先读取状态"
          );
        }
      }
      return {
        editorApplied: !response.noChange,
        persistence: response.noChange ? "unchanged" : "server_acknowledged",
        editorAcknowledged: false,
        noChange: Boolean(response.noChange),
        ownerKind: "entity",
        ownerId: meta.value.id,
        workspaceVersion: String(response.workspaceVersion),
        summary: response.summary,
      } as ScriptBlockBatchCompletion;
    },
    onRegistrationError: (toolName, error) => {
      logger.warn(`WebMCP tool registration failed: ${toolName}`, error);
    },
  });
};

const activateToolbar = () => {
  isScriptViewActive = true;
  registerToolbar(toolbarOwner, {
    status: toolbarStatus.value,
    onOpen: openVersionDialog,
  });
};

onMounted(activateToolbar);
onActivated(activateToolbar);
onDeactivated(() => {
  isScriptViewActive = false;
  metaLoadSequence += 1;
  unregisterToolbar(toolbarOwner);
});

watch(toolbarStatus, (status) => {
  updateToolbarStatus(toolbarOwner, status);
});

onBeforeUnmount(() => {
  unregisterToolbar(toolbarOwner);
});

const { t } = useI18n();
const userStore = useUserStore();

type SceneOption = {
  id: number;
  name: string;
};

const selectedUsedSceneId = ref<number | null>(null);
const sceneNameMap = ref<Map<number, string>>(new Map());

const usedSceneOptions = computed<SceneOption[]>(() => {
  const verseMetas = Array.isArray(meta.value?.verseMetas)
    ? meta.value.verseMetas
    : [];
  if (verseMetas.length === 0) return [];

  const options: SceneOption[] = [];
  const seen = new Set<number>();

  verseMetas.forEach((relation) => {
    const verseId = relation?.verse_id;
    if (typeof verseId !== "number" || seen.has(verseId)) return;
    seen.add(verseId);
    options.push({
      id: verseId,
      name:
        sceneNameMap.value.get(verseId) ||
        `${t("meta.list.properties.sceneFallback")}${verseId}`,
    });
  });

  return options;
});

const usedSceneSelectPlaceholder = computed(() =>
  t("meta.script.usedScenesPlaceholder")
);

const sceneEditorLink = computed(() => {
  const editorLabel = t("route.meta.sceneEditor");
  const titleText = meta.value?.title
    ? `${editorLabel}【${meta.value.title}】`
    : editorLabel;
  return `/meta/scene?id=${id.value}&title=${encodeURIComponent(titleText)}`;
});

const goBackToSceneEditor = async () => {
  const canLeave = await resolveUnsavedChangesBeforeLeave({
    showDiscardInfo: false,
  });
  if (!canLeave) return;
  router.push(sceneEditorLink.value);
};

const goToUsedSceneEditor = async (sceneId: number, sceneName?: string) => {
  const canLeave = await resolveUnsavedChangesBeforeLeave({
    showDiscardInfo: false,
  });
  if (!canLeave) return;

  const title = encodeURIComponent(
    t("verse.listPage.editorTitle", {
      name: sceneName || t("verse.listPage.unnamed"),
    })
  );
  router.push({ path: "/verse/scene", query: { id: sceneId, title } });
};

const handleUsedSceneChange = async (sceneId: number) => {
  const selected = usedSceneOptions.value.find((scene) => scene.id === sceneId);
  await goToUsedSceneEditor(sceneId, selected?.name);
};

const loadSceneNameMap = async () => {
  try {
    const scenes: Array<{ id: number; name?: string }> = [];
    let page = 1;
    let pageCount = 1;

    do {
      const response = await getVerses({
        sort: "-updated_at",
        page,
        perPage: 100,
      });
      scenes.push(
        ...response.data.map((scene) => ({ id: scene.id, name: scene.name }))
      );
      pageCount = parseInt(
        String(response.headers["x-pagination-page-count"] || "1")
      );
      page += 1;
    } while (page <= pageCount);

    const map = new Map<number, string>();
    scenes.forEach((scene) => {
      map.set(
        scene.id,
        String(
          scene.name || `${t("meta.list.properties.sceneFallback")}${scene.id}`
        )
      );
    });
    sceneNameMap.value = map;
  } catch (error) {
    logger.error("loadSceneNameMap error", error);
  }
};

// ---------- 加载 Meta 脚本会话 ----------
const loadMetaScriptSession = async () => {
  if (!isScriptViewActive || route.name !== "MetaScript") return;
  if (!Number.isFinite(id.value)) return;
  const requestedId = id.value;
  const loadSequence = ++metaLoadSequence;
  try {
    loading.value = true;
    await loadSceneNameMap();
    const response = await getMeta(id.value, {
      expand: "cyber,event,share,metaCode,verseMetas",
    });
    if (loadSequence !== metaLoadSequence || requestedId !== id.value) return;
    logger.log("response数据", response);

    const assignAnimations = (
      entities: EntityNode[],
      modelId: number,
      animationNames: string[]
    ) => {
      entities.forEach((item) => {
        if (
          item.parameters?.resource != null &&
          item.parameters.resource.toString() === modelId.toString()
        ) {
          item.parameters.animations = animationNames;
        }
        if (item.children?.entities) {
          assignAnimations(item.children.entities, modelId, animationNames);
        }
      });
    };

    if (response.data.resources.length > 0) {
      try {
        for (const model of response.data.resources) {
          if (model.type !== "polygen") {
            meta.value = response.data;
            continue;
          }
          const modelUrl = convertToHttps(model.file.url);
          const modelId = model.id;
          await new Promise<void>((resolve, reject) => {
            loader.load(
              modelUrl,
              (gltf) => {
                const animationNames = gltf.animations.map((clip) => clip.name);
                const data = response.data.data as {
                  children?: { entities?: EntityNode[] };
                };
                if (data?.children?.entities) {
                  assignAnimations(
                    data.children.entities,
                    modelId,
                    animationNames
                  );
                }
                response.data.data = data;
                resolve();
              },
              undefined,
              (error) => {
                logger.error(
                  "An error occurred while loading the model:",
                  error
                );
                reject(error);
              }
            );
          });
          if (loadSequence !== metaLoadSequence || requestedId !== id.value) {
            return;
          }
        }
      } catch (error) {
        logger.warn("Failed to load model animations", error);
      }
    }

    if (loadSequence !== metaLoadSequence || requestedId !== id.value) return;
    meta.value = response.data;
    const savedSnapshot = readSavedEditorSnapshot();
    if (savedSnapshot) {
      beginEditorSession(savedSnapshot, `meta:${meta.value!.id}`);
    }
    initEditor();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    if (loadSequence === metaLoadSequence) {
      loading.value = false;
    }
  }
};

onMounted(loadMetaScriptSession);
onActivated(() => {
  if (!meta.value || meta.value.id !== id.value) {
    void loadMetaScriptSession();
  }
});

onBeforeRouteUpdate(async (to, from, next) => {
  if (to.path !== from.path || to.query.id === from.query.id) {
    next();
    return;
  }
  const canLeave = await resolveUnsavedChangesBeforeLeave({
    showDiscardInfo: true,
  });
  next(canLeave ? undefined : false);
});

watch(id, (nextId, previousId) => {
  if (
    isScriptViewActive &&
    route.name === "MetaScript" &&
    Number.isFinite(nextId) &&
    nextId !== previousId
  ) {
    void loadMetaScriptSession();
  }
});

const stopWebMcpTools = () => {
  webMcpLifecycle?.abort();
  scriptBlockWebMcpLifecycle?.abort();
  webMcpRpc.cancel();
};
onMounted(() => window.addEventListener("message", handleWebMcpEditorMessage));
onActivated(() => {
  isScriptViewActive = true;
  registerMetaScriptTools();
  registerScriptBlockTools();
});
onDeactivated(stopWebMcpTools);
onBeforeUnmount(() => {
  stopWebMcpTools();
  window.removeEventListener("message", handleWebMcpEditorMessage);
});
watch([id, editorFrameKey, editorContentReady], () => {
  stopWebMcpTools();
  if (isScriptViewActive && editorContentReady.value) {
    registerMetaScriptTools();
    registerScriptBlockTools();
  }
});
</script>

<style scoped>
.icon {
  margin-right: 5px;
}

.code-container {
  position: relative;
}

.copy-button {
  position: absolute;
  top: 20px;
  right: 0;
  z-index: 1;
}

.dark-theme .hljs {
  background-color: rgb(24 24 24) !important;
}

.light-theme .hljs {
  background-color: #fafafa !important;
}

.script-tabs-wrapper {
  container-name: script-editor;
  container-type: inline-size;
  position: relative;
  flex: 1;
  width: 100%;
  min-width: 0;
}

.script-editor-toolbar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  min-height: 40px;
  margin-bottom: 8px;
}

.script-mode-tabs {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.script-mode-tab {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 92px;
  height: 32px;
  padding: 0 12px;
  font-size: 12px;
  line-height: 1.1;
  color: var(--text-secondary, #64748b);
  white-space: nowrap;
  cursor: pointer;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #d6deea);
  border-radius: 8px;
}

.script-mode-tab:hover,
.script-mode-tab:focus-visible,
.script-mode-tab.is-active {
  color: var(--primary-color, #06a7ee);
  border-color: var(--primary-color, #06a7ee);
}

.script-mode-tab:focus-visible {
  outline: 2px solid
    color-mix(in srgb, var(--primary-color, #06a7ee) 30%, transparent);
  outline-offset: 2px;
}

.script-tabs-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-self: end;
  min-width: 0;
  max-width: 100%;
}

.script-action-button {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  min-height: 32px;
  margin-left: 0 !important;
}

.script-action-icon {
  margin-right: 4px;
  font-size: 14px;
  color: inherit;
}

.script-used-scenes-select {
  width: 180px;
}

.script-used-scenes-select :deep(.el-select__wrapper) {
  align-items: center;
  min-height: 32px;
}

.script-used-scenes-select :deep(.el-select__placeholder),
.script-used-scenes-select :deep(.el-select__selected-item) {
  line-height: 20px;
  text-align: center;
}

:global(.script-used-scenes-popper .el-select-dropdown__item) {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 34px;
}

:global(.script-used-scenes-popper) {
  --script-select-hover-bg: rgb(3 169 244 / 18%);
  --script-select-hover-ring: rgb(3 169 244 / 24%);
  --bg-hover: var(--script-select-hover-bg);
  --el-fill-color-light: var(--script-select-hover-bg);
}

:global(
  .script-used-scenes-popper .el-select-dropdown__item.hover,
  .script-used-scenes-popper .el-select-dropdown__item:hover,
  .script-used-scenes-popper .el-select-dropdown__item.is-hovering,
  .script-used-scenes-popper.el-select-dropdown .el-select-dropdown__item.hover,
  .script-used-scenes-popper.el-select-dropdown .el-select-dropdown__item:hover,
  .script-used-scenes-popper.el-select-dropdown
    .el-select-dropdown__item.is-hovering,
  .script-used-scenes-popper.el-select__popper .el-select-dropdown__item.hover,
  .script-used-scenes-popper.el-select__popper .el-select-dropdown__item:hover,
  .script-used-scenes-popper.el-select__popper
    .el-select-dropdown__item.is-hovering
) {
  font-weight: var(--font-weight-medium, 500) !important;
  color: var(--primary-color, var(--ar-primary, #03a9f4)) !important;
  background-color: var(--script-select-hover-bg) !important;
  background-image: none !important;
  box-shadow: inset 0 0 0 1px var(--script-select-hover-ring) !important;
}

.script-tabs-wrapper :deep(.el-tabs__header) {
  display: none !important;
}

.script-tabs-wrapper :deep(.el-tabs__content) {
  padding-top: 0;
  margin-top: 0;
}

.blockly-editor-main {
  position: relative;
  height: calc(100vh - 185px);
  min-height: 520px;
  padding: 0;
  margin: 0;
  margin-top: 0;
  overflow: hidden;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #d6deea);
  border-radius: 12px;
}

.blockly-editor-frame {
  display: block;
  background: var(--bg-card, #fff);
  border: 0;
  border-radius: inherit;
}

.script-editor-loading-indicator {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.script-editor-loading-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  font-size: 22px;
  color: var(--primary-color, #06a7ee);
}

@container script-editor (width <= 1100px) {
  .script-editor-toolbar {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }

  .script-tabs-actions {
    justify-content: flex-end;
    justify-self: stretch;
    width: 100%;
    max-width: none;
  }

  .script-used-scenes-select {
    flex: 1 1 220px;
    width: auto;
    min-width: 180px;
  }

  .blockly-editor-main {
    height: calc(100dvh - 225px);
  }
}

@container script-editor (width <= 620px) {
  .script-mode-tabs {
    width: 100%;
  }

  .script-mode-tab {
    flex: 1 1 50%;
    min-width: 0;
    min-height: 40px;
  }

  .script-tabs-actions {
    display: grid;
    grid-template-columns: 44px minmax(88px, auto);
    justify-content: end;
  }

  .script-used-scenes-select {
    grid-column: 1 / -1;
    width: 100%;
    min-width: 0;
  }

  .script-action-button {
    min-width: 44px;
    min-height: 44px;
    padding: 0 12px;
  }

  .script-tabs-actions
    .script-action-button:not(.script-save-button)
    .script-action-icon {
    margin-right: 0;
  }

  .secondary-action-label {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .blockly-editor-main {
    height: calc(100dvh - 285px);
    min-height: 360px;
  }
}

.dark-theme :deep(.hljs) {
  background-color: rgb(24 24 24) !important;
}

.light-theme :deep(.hljs) {
  background-color: #fafafa !important;
}
</style>
