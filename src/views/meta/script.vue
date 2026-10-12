<template>
  <div class="verse-code" :class="{ 'script--embedded': embedded }">
    <el-container>
      <el-main>
        <el-card class="box-card">
          <el-container>
            <div class="script-tabs-wrapper">
              <div v-if="!embedded" class="script-editor-toolbar">
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
                    :disabled="editorContentLoading"
                    :aria-busy="editorContentLoading"
                    :aria-selected="activeName === 'blockly'"
                    @click="activeName = 'blockly'"
                  >
                    <el-icon
                      v-if="editorContentLoading"
                      class="is-loading script-action-icon"
                    >
                      <Loading></Loading>
                    </el-icon>
                    {{ $t("verse.view.script.edit") }}
                  </button>
                  <button
                    type="button"
                    class="script-mode-tab"
                    :class="{ 'is-active': activeName === 'script' }"
                    role="tab"
                    :disabled="editorContentLoading"
                    :aria-busy="editorContentLoading"
                    :aria-selected="activeName === 'script'"
                    @click="activeName = 'script'"
                  >
                    <el-icon
                      v-if="editorContentLoading"
                      class="is-loading script-action-icon"
                    >
                      <Loading></Loading>
                    </el-icon>
                    {{ $t("verse.view.script.code") }}
                  </button>
                </div>

                <div v-if="meta" class="script-tabs-actions">
                  <el-select
                    v-model="selectedUsedSceneId"
                    class="script-context-select script-used-scenes-select"
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
                  <div class="script-primary-actions">
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
                      :loading="editorContentLoading || isSaving"
                      :disabled="!saveable || editorContentLoading || isSaving"
                      @click="save"
                    >
                      <font-awesome-icon
                        class="script-action-icon"
                        v-if="!editorContentLoading && !isSaving"
                        icon="save"
                      ></font-awesome-icon>
                      <span>{{ $t("meta.script.save") }}</span>
                    </el-button>
                  </div>
                </div>
              </div>
              <el-tabs
                v-model="activeName"
                class="script-main-tabs"
                :type="embedded ? '' : 'card'"
                style="width: 100%"
              >
                <el-tab-pane
                  :label="$t('verse.view.script.edit')"
                  name="blockly"
                >
                  <el-main
                    class="blockly-editor-main"
                    :aria-busy="editorContentLoading"
                  >
                    <div
                      v-if="editorContentLoading"
                      class="script-editor-loading-indicator"
                      role="status"
                      :aria-label="$t('common.editorLoading.message')"
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
                      :id="embedded ? 'meta-script-editor' : 'editor'"
                      ref="editor"
                      :inert="editorContentLoading"
                      :tabindex="editorContentLoading ? -1 : 0"
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
                              :loading="editorContentLoading"
                              :disabled="editorContentLoading"
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
                              :loading="editorContentLoading"
                              :disabled="editorContentLoading"
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
          :editor-loading="editorContentLoading"
          :editor-blocked="editorContentLoading || isSaving"
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
  createWriteOptions,
  applyWriteRevision,
  type WriteOptions,
} from "@/api/v1/write-contract";
import { writeOptionsForPreview } from "@/services/webmcp/operation-context";
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
import type { MetaCode } from "@/api/v1/types/meta";
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
import { sceneWriteFailure } from "@/services/webmcp/scene-write-failure";
import { createIframeRpc } from "@/utils/iframeRpc";

const props = withDefaults(
  defineProps<{
    embedded?: boolean;
    metaId?: number;
    metaData?: unknown;
  }>(),
  { embedded: false }
);
const emit = defineEmits<{
  close: [];
  saved: [
    payload: {
      entityId: number;
      previousRevision?: string;
      serverRevision?: string;
      metaCode: MetaCode;
    },
  ];
}>();

// ---------- Meta 专有状态 ----------
const loading = ref(false);
const meta = ref<metaInfo | null>(null);
const route = useRoute();
const router = useRouter();
const id = computed(() => props.metaId ?? parseInt(route.query.id as string));
const saveable = computed(() => Boolean(meta.value?.editable));
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
  context: { trigger: ScriptSaveTrigger; write?: WriteOptions }
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

  const savedOwner = meta.value;
  const previousRevision = savedOwner.serverRevision;
  const metaCode = {
    blockly: blocklyData,
    lua: message.lua,
    js: message.js,
  };
  const savedResponse = await putMetaCode(
    meta.value.id,
    metaCode,
    context.write ?? createWriteOptions(savedOwner?.serverRevision)
  );
  if (meta.value === savedOwner) applyWriteRevision(savedOwner, savedResponse);

  if (
    isScriptViewActive &&
    meta.value === savedOwner &&
    savedOwner.id === id.value
  ) {
    emit("saved", {
      entityId: savedOwner.id,
      previousRevision,
      serverRevision: savedOwner.serverRevision,
      metaCode,
    });
  }
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
  registerRouteGuard: !props.embedded,
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
    operations: {
      registerStatusTools: true,
      getScope: () => ({
        actorId: String(userStore.userInfo?.id ?? ""),
        targetType: "meta",
        targetId: id.value,
        serverRevision: meta.value?.serverRevision ?? "",
      }),
    },
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
          await save("manual", {
            suppressNoChangeInfo: true,
            write: writeOptionsForPreview(preview, meta.value?.serverRevision),
          });
        } catch (error) {
          throw sceneWriteFailure(
            error,
            {
              ownerId,
              workspaceVersion: response.workspaceVersion,
            },
            "Blockly 工作区已应用修改"
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
    operations: {
      registerStatusTools: false,
      getScope: () => ({
        actorId: String(userStore.userInfo?.id ?? ""),
        targetType: "meta",
        targetId: id.value,
        serverRevision: meta.value?.serverRevision ?? "",
      }),
    },
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
          await save("manual", {
            suppressNoChangeInfo: true,
            write: writeOptionsForPreview(preview, meta.value?.serverRevision),
          });
        } catch (error) {
          throw sceneWriteFailure(
            error,
            {
              ownerId,
              workspaceVersion: response.workspaceVersion,
            },
            "Blockly 工作区已应用修改"
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
  if (props.embedded) return;
  registerToolbar(toolbarOwner, {
    status: toolbarStatus.value,
    getLoadingState: () => ({
      loading: editorContentLoading.value,
      blocked: editorContentLoading.value,
    }),
    onOpen: openVersionDialog,
  });
};

onMounted(activateToolbar);
onActivated(activateToolbar);
onDeactivated(() => {
  isScriptViewActive = false;
  metaLoadSequence += 1;
  if (!props.embedded) unregisterToolbar(toolbarOwner);
});

watch(toolbarStatus, (status) => {
  if (!props.embedded) updateToolbarStatus(toolbarOwner, status);
});

onBeforeUnmount(() => {
  if (!props.embedded) unregisterToolbar(toolbarOwner);
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
  if (props.embedded) {
    emit("close");
    return;
  }
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
  if (!isScriptViewActive || (!props.embedded && route.name !== "MetaScript"))
    return;
  if (!Number.isFinite(id.value)) return;
  const requestedId = id.value;
  const loadSequence = ++metaLoadSequence;
  try {
    loading.value = true;
    if (!props.embedded) await loadSceneNameMap();
    const response = await getMeta(requestedId, {
      expand: "cyber,event,share,metaCode,verseMetas",
    });
    if (loadSequence !== metaLoadSequence || requestedId !== id.value) return;
    logger.log("response数据", response);
    const loadedMeta = { ...response.data };
    if (
      props.embedded &&
      props.metaData &&
      typeof props.metaData === "object" &&
      !Array.isArray(props.metaData)
    ) {
      // Live editing supplies structure; code, permissions and write revision
      // always come from the fresh server response.
      const liveMeta = props.metaData as Partial<metaInfo>;
      for (const key of ["data", "resources", "events"] as const) {
        if (
          Object.prototype.hasOwnProperty.call(liveMeta, key) &&
          liveMeta[key] !== undefined
        ) {
          loadedMeta[key] = JSON.parse(JSON.stringify(liveMeta[key]));
        }
      }
    }

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

    if (loadedMeta.resources.length > 0) {
      try {
        for (const model of loadedMeta.resources) {
          if (model.type !== "polygen") continue;
          const modelUrl = convertToHttps(model.file.url);
          const modelId = model.id;
          await new Promise<void>((resolve, reject) => {
            loader.load(
              modelUrl,
              (gltf) => {
                const animationNames = gltf.animations.map((clip) => clip.name);
                const data = loadedMeta.data as {
                  children?: { entities?: EntityNode[] };
                };
                if (data?.children?.entities) {
                  assignAnimations(
                    data.children.entities,
                    modelId,
                    animationNames
                  );
                }
                loadedMeta.data = data;
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
    meta.value = loadedMeta;
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

if (!props.embedded) {
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
}

watch(id, (nextId, previousId) => {
  if (
    isScriptViewActive &&
    (props.embedded || route.name === "MetaScript") &&
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
  isScriptViewActive = false;
  metaLoadSequence += 1;
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
defineExpose({
  save,
  openVersionDialog,
  saveable,
  isSaving,
  editorContentLoading,
  hasUnsavedChanges,
  activeName,
  resolveBeforeClose: () =>
    resolveUnsavedChangesBeforeLeave({ showDiscardInfo: true }),
});
</script>

<style scoped>
.script--embedded,
.script--embedded > .el-container,
.script--embedded > .el-container > .el-main > .box-card,
.script--embedded
  > .el-container
  > .el-main
  > .box-card
  :deep(> .el-card__body),
.script--embedded .script-tabs-wrapper,
.script--embedded .script-main-tabs {
  height: 100%;
  min-height: 0;
}

.script--embedded > .el-container > .el-main {
  padding: 0;
}

.script--embedded > .el-container > .el-main > .box-card {
  border: 0;
  box-shadow: none;
}

.script--embedded :deep(.el-card__body) {
  padding: 16px 24px;
}

.script--embedded
  > .el-container
  > .el-main
  > .box-card
  :deep(> .el-card__body > .el-container) {
  height: 100%;
}

.script--embedded .script-main-tabs {
  display: flex;
  flex-direction: column;
}

.script--embedded :deep(.script-main-tabs > .el-tabs__header) {
  flex-shrink: 0;
  order: -1;
  margin: 0 0 12px;
}

.script--embedded :deep(.script-main-tabs > .el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.script--embedded :deep(.script-main-tabs > .el-tabs__content > .el-tab-pane) {
  height: 100%;
}

.script--embedded .blockly-editor-main {
  height: 100%;
  min-height: 0;
}

@media (width <= 767px) {
  .script--embedded :deep(.el-card__body) {
    padding: 12px;
  }
}

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

.verse-code:not(.script--embedded)
  .script-tabs-wrapper
  :deep(.el-tabs__header) {
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
  cursor: wait;
  background: var(--el-mask-color, rgb(255 255 255 / 90%));
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

.dark-theme :deep(.hljs) {
  background-color: rgb(24 24 24) !important;
}

.light-theme :deep(.hljs) {
  background-color: #fafafa !important;
}
</style>

<style scoped src="@/styles/script-editor-toolbar.css"></style>
