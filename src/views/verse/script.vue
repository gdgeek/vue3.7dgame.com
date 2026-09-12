<template>
  <div class="script" :class="{ 'script--embedded': embedded }">
    <el-container>
      <el-main>
        <el-card class="box-card">
          <el-container>
            <div class="script-tabs-wrapper">
              <div v-if="!embedded" class="script-editor-toolbar">
                <div
                  class="script-mode-tabs"
                  role="tablist"
                  :aria-label="$t('verse.view.script.title')"
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

                <div v-if="verse" class="script-tabs-actions">
                  <el-select
                    v-model="selectedLoadedMetaId"
                    class="script-context-select script-loaded-metas-select"
                    size="small"
                    :placeholder="
                      $t('verse.view.script.loadedEntitiesPlaceholder')
                    "
                    :disabled="loadedMetaOptions.length === 0"
                    popper-class="script-loaded-metas-popper"
                    @change="handleLoadedMetaChange"
                  >
                    <el-option
                      v-for="metaOption in loadedMetaOptions"
                      :key="metaOption.id"
                      :label="metaOption.name"
                      :value="metaOption.id"
                    ></el-option>
                  </el-select>
                  <div class="script-primary-actions">
                    <el-button
                      class="script-action-button"
                      type="primary"
                      size="small"
                      :title="$t('route.project.sceneEditor')"
                      :aria-label="$t('route.project.sceneEditor')"
                      @click="goBackToSceneEditor"
                    >
                      <font-awesome-icon
                        class="script-action-icon"
                        :icon="['fas', 'cube']"
                      ></font-awesome-icon>
                      <span class="secondary-action-label">
                        {{ $t("route.project.sceneEditor") }}
                      </span>
                    </el-button>
                    <el-button
                      v-if="saveable"
                      class="script-action-button script-save-button"
                      type="primary"
                      size="small"
                      :title="$t('verse.view.script.save')"
                      :aria-label="$t('verse.view.script.save')"
                      @click="save"
                    >
                      <font-awesome-icon
                        class="script-action-icon"
                        icon="save"
                      ></font-awesome-icon>
                      <span>{{ $t("verse.view.script.save") }}</span>
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
                      :id="embedded ? 'verse-script-editor' : 'editor'"
                      ref="editor"
                      :src="src"
                      @load="handleEditorFrameLoad"
                    ></iframe>
                  </el-main>
                </el-tab-pane>
                <el-tab-pane
                  :label="$t('verse.view.script.code')"
                  name="script"
                >
                  <el-card v-if="activeName === 'script'" class="box-card">
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
                              >{{ $t("copy.title") }}</el-button
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
        <UnityPreviewDialog
          ref="unityPreviewDialog"
          v-model="unityPreviewVisible"
          :frame-visible="unityPreviewFrameVisible"
          :frame-key="unityPreviewFrameKey"
          :src="unityPreviewSrc"
          @close="handleUnityPreviewClosed"
          :state="unityPreviewState"
          @retry="runSceneRuntimePreview"
          @frame-load="handleUnityPreviewLoad"
        ></UnityPreviewDialog>
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
import { logger } from "@/utils/logger";
import { hasPublishableSceneContent } from "@/utils/versePublish";
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  onActivated,
  onDeactivated,
} from "vue";
import {
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
  useRoute,
  useRouter,
} from "vue-router";
import {
  getVerse,
  putVerseCode,
  type meta,
  type VerseData,
  type VerseMetasWithJsCode,
} from "@/api/v1/verse";
import { getMeta } from "@/api/v1/meta";
import { useI18n } from "vue-i18n";
import { ElMessage, ElMessageBox } from "element-plus";
import { takePhoto } from "@/api/v1/verse";
import { Message } from "@/components/Dialog";
import pako from "pako";
import {
  useScriptEditorBase,
  type EditorPostPayload,
  type ScriptSaveTrigger,
} from "@/composables/useScriptEditorBase";
import { CopyDocument, Loading } from "@element-plus/icons-vue";
import ScriptDraftDialog from "@/components/ScriptDraftDialog.vue";
import {
  useEditorVersionToolbar,
  type EditorToolbarStatus,
} from "@/composables/useEditorVersionToolbar";
import { useUserStore } from "@/store/modules/user";
import { translateRouteTitle } from "@/utils/i18n";
import { registerWebMcpTools } from "@/services/webmcp/model-context";
import { createSceneRuntimePreviewTools } from "@/services/webmcp/scene-runtime-preview-tools";
import UnityPreviewDialog from "@/components/UnityPreviewDialog.vue";
import { useUnityPreviewBridge } from "@/composables/useUnityPreviewBridge";
import { normalizeUnityPreviewVerseLua } from "@/utils/unityPreviewLua";
import {
  cloneForUnityPreview,
  normalizeUnityPreviewData,
  normalizeUnityPreviewMetas,
  UNITY_PREVIEW_VERSE_EXPAND,
} from "@/utils/unityPreviewPayload";

import {
  registerVerseScriptWebMcpTools,
  type VerseScriptReplaceCompletion,
  type VerseScriptReplacePreview,
  type VerseScriptSnapshot,
} from "@/services/webmcp/verse-script-tools";
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
  hasGeneratedScriptErrors,
} from "@/utils/webMcpConfirmation";
import { sceneWriteFailure } from "@/services/webmcp/scene-write-failure";
import { createIframeRpc } from "@/utils/iframeRpc";

const props = withDefaults(
  defineProps<{
    embedded?: boolean;
    verseId?: number;
    sceneData?: unknown;
    beforePublish?: () => Promise<void>;
  }>(),
  { embedded: false }
);
const emit = defineEmits<{ close: []; saved: [] }>();

// ---------- Verse 专有状态 ----------
const loading = ref(false);
const verse = ref<VerseData>();
const verseMetasWithJsCodeData = ref<VerseMetasWithJsCode>();
const verseMetasWithLuaCodeData = ref<VerseMetasWithJsCode>();
const route = useRoute();
const router = useRouter();
const id = computed(() => props.verseId ?? parseInt(route.query.id as string));
const metasJavaScriptCode = ref("");
let unityPreviewRuntimeVerseId: number | null = null;
// map 用于记录每个 meta_id 在场景中对应的实体列表
let map = new Map<string, Array<{ uuid: string; title: string }>>();
let verseLoadSequence = 0;
let isScriptViewActive = true;

const { t } = useI18n();
const userStore = useUserStore();

const sceneEditorLink = computed(() => {
  const editorLabel = t("route.project.sceneEditor");
  const titleText = verse.value?.name
    ? `${editorLabel}【${verse.value.name}】`
    : editorLabel;
  return `/verse/scene?id=${id.value}&title=${encodeURIComponent(titleText)}`;
});

type LoadedMetaOption = {
  id: number;
  name: string;
};

const selectedLoadedMetaId = ref<number | null>(null);
const loadedMetaOptions = computed<LoadedMetaOption[]>(() => {
  const metas = Array.isArray(verse.value?.metas) ? verse.value!.metas : [];
  if (metas.length === 0) return [];

  const options: LoadedMetaOption[] = [];
  const seen = new Set<number>();

  metas.forEach((meta) => {
    const metaId = Number(meta?.id);
    if (!Number.isFinite(metaId) || seen.has(metaId)) return;
    seen.add(metaId);
    options.push({
      id: metaId,
      name:
        (meta.title && String(meta.title).trim()) ||
        (meta.name && String(meta.name).trim()) ||
        `${t("verse.listPage.entityFallback")}${metaId}`,
    });
  });

  return options;
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

const goToLoadedMetaEditor = async (metaId: number, metaName?: string) => {
  const canLeave = await resolveUnsavedChangesBeforeLeave({
    showDiscardInfo: false,
  });
  if (!canLeave) return;

  const sceneRoute = router
    .getRoutes()
    .find((route) => route.path === "/meta/scene");
  const sceneEditorTitle =
    sceneRoute && typeof sceneRoute.meta?.title === "string"
      ? translateRouteTitle(sceneRoute.meta.title)
      : t("route.meta.sceneEditor");
  const fallbackName = `${t("verse.listPage.entityFallback")}${metaId}`;
  const title = encodeURIComponent(
    `${sceneEditorTitle}【${metaName || fallbackName}】`
  );

  const target = { path: "/meta/scene", query: { id: metaId, title } };
  if (props.embedded) {
    window.open(router.resolve(target).href, "_blank", "noopener");
  } else {
    router.push(target);
  }
};

const handleLoadedMetaChange = async (metaId: number) => {
  const selected = loadedMetaOptions.value.find(
    (metaOption) => metaOption.id === metaId
  );
  await goToLoadedMetaEditor(metaId, selected?.name);
};

const saveable = computed(() => Boolean(verse.value?.editable));

// ---------- Verse 专有类型 ----------
type VerseEntityNode = {
  parameters?: { uuid?: string; title?: string; meta_id?: string | number };
  children?: {
    modules?: VerseEntityNode[];
    entities?: VerseEntityNode[];
  };
};

type VerseMetaEventItem = { title: string; uuid: string };
type VerseMeta = {
  id: number | string;
  name?: string;
  title?: string;
  script?: string;
  code?: string | { js?: string };
  js?: string;
  metaCode?: { js?: string };
  events?: {
    inputs?: VerseMetaEventItem[];
    outputs?: VerseMetaEventItem[];
  };
};

const readSavedEditorSnapshot = () => {
  if (!verse.value) return null;
  let blocklyData = verse.value.verseCode?.blockly || "{}";
  blocklyData = decompressBlockly(blocklyData);
  return {
    blocklyData: JSON.parse(blocklyData),
    js: verse.value.verseCode?.js || "",
    lua: verse.value.verseCode?.lua || "",
  };
};

const getMetaJavaScriptCode = (meta: VerseMeta | meta): string => {
  const candidate = meta as VerseMeta;
  if (typeof candidate.script === "string") return candidate.script;
  if (typeof candidate.js === "string") return candidate.js;
  if (typeof candidate.metaCode?.js === "string") return candidate.metaCode.js;
  if (typeof candidate.code === "string") return candidate.code;
  if (
    candidate.code &&
    typeof candidate.code === "object" &&
    typeof candidate.code.js === "string"
  ) {
    return candidate.code.js;
  }
  return "";
};

const loadMetaJavaScriptCode = async (
  metas: Array<VerseMeta | meta>,
  signal?: AbortSignal
) => {
  const directScripts = metas.map((metaItem) => ({
    id: metaItem.id,
    script: getMetaJavaScriptCode(metaItem),
  }));
  const missingMetaIds = directScripts
    .filter((item) => !item.script.trim())
    .map((item) => item.id)
    .filter(
      (metaId, index, array) => metaId && array.indexOf(metaId) === index
    );

  if (missingMetaIds.length === 0) {
    return directScripts
      .map((item) => item.script)
      .filter((script) => script.trim());
  }

  const fetchedScripts = await Promise.all(
    missingMetaIds.map(async (metaId) => {
      try {
        const response = await getMeta(metaId, { expand: "metaCode" }, signal);
        return { id: metaId, script: response.data.metaCode?.js || "" };
      } catch (error) {
        logger.error("实体脚本补充加载失败:", { metaId, error });
        return { id: metaId, script: "" };
      }
    })
  );
  const fetchedScriptById = new Map(
    fetchedScripts.map((item) => [item.id?.toString(), item.script])
  );

  return directScripts
    .map(
      (item) => item.script || fetchedScriptById.get(item.id?.toString()) || ""
    )
    .filter((script) => script.trim());
};

// ---------- initEditor（Verse 版）----------
const initEditor = (overrideData?: unknown) => {
  if (!verse.value) return;
  if (!isReady()) return;

  try {
    let blocklyData = verse.value.verseCode?.blockly || "{}";
    blocklyData = decompressBlockly(blocklyData);
    const savedData = JSON.parse(blocklyData);
    const savedCode = {
      js: verse.value.verseCode?.js || "",
      lua: verse.value.verseCode?.lua || "",
    };
    initializeSavedSnapshot(
      {
        js: savedCode.js,
        lua: savedCode.lua,
        blocklyData: savedData,
      },
      `verse:${verse.value.id}`
    );
    const initState = getEditorInitState();
    if (!initState) return;
    postMessage("INIT", {
      token: null,
      config: {
        style: ["base", "verse"],
        parameters: {
          index: verse.value!.id,
          resource: resource.value,
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
    logger.error("Fail to decompress or parse data:", error);
  }
};

// ---------- postScript（Verse 版：保存 + 发布流程）----------
const postScript = async (
  message: EditorPostPayload,
  context: { trigger: ScriptSaveTrigger; write?: WriteOptions }
) => {
  if (verse.value === null) {
    const errorMessage = t("verse.view.script.error1");
    ElMessage.error(errorMessage);
    throw new Error(errorMessage);
  }
  if (!verse.value!.editable) {
    const errorMessage = t("verse.view.script.error2");
    ElMessage.error(errorMessage);
    throw new Error(errorMessage);
  }

  let blocklyData = JSON.stringify(message.data);
  if (blocklyData.length > 1024 * 2) {
    const uint8Array = pako.deflate(blocklyData);
    const base64Str = btoa(String.fromCharCode.apply(null, uint8Array));
    blocklyData = `compressed:${base64Str}`;
  }

  const savedOwner = verse.value;
  const savedResponse = await putVerseCode(
    verse.value!.id,
    {
      blockly: blocklyData,
      js: message.js,
      lua: message.lua,
    },
    context.write ?? createWriteOptions(savedOwner?.serverRevision)
  );
  if (verse.value === savedOwner) applyWriteRevision(savedOwner, savedResponse);

  emit("saved");
  if (context.trigger === "manual") {
    Message.success(t("verse.view.script.success"));
    if (!hasPublishableSceneContent(verse.value)) {
      ElMessage.warning(t("verse.view.sceneEditor.emptySceneCannotPublish"));
      return;
    }

    ElMessageBox.confirm(
      t("verse.view.sceneEditor.saveAndPublishConfirm"),
      t("verse.view.sceneEditor.publishScene"),
      {
        showClose: true,
        distinguishCancelAndClose: true,
        closeOnClickModal: false,
        confirmButtonText: t("verse.view.sceneEditor.confirm"),
        cancelButtonText: t("verse.view.sceneEditor.cancel"),
        type: "warning",
      }
    )
      .then(async () => {
        await props.beforePublish?.();
        await takePhoto(
          id.value,
          createWriteOptions(verse.value?.serverRevision)
        );
        ElMessage.success(t("verse.view.sceneEditor.publishSuccess"));
      })
      .catch(() => {
        ElMessage.info(t("verse.view.sceneEditor.publishCanceled"));
      });
  }
};

const draftStorageKey = computed(() =>
  Number.isFinite(id.value) ? `script-draft:verse:${id.value}` : null
);

// ---------- 共享编辑器 composable ----------
const {
  activeName,
  languageName,
  LuaCode,
  JavaScriptCode,
  unsavedBlocklyData,
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
  luaLocalVar: "verse",
  i18nKeys: {
    error1: "verse.view.script.error1",
    error3: "verse.view.script.error3",
    info: "verse.view.script.info",
    leaveMessage1: "verse.view.script.leave.message1",
    leaveMessage2: "verse.view.script.leave.message2",
    leaveConfirm: "verse.view.script.leave.confirm",
    leaveCancel: "verse.view.script.leave.cancel",
    leaveError: "verse.view.script.leave.error",
    leaveInfo: "verse.view.script.leave.info",
  },
  onPost: postScript,
  onReady: initEditor,
  getDraftStorageKey: () => draftStorageKey.value,
  canSave: () => Boolean(verse.value?.editable),
  onRestoreDraft: () => reloadEditorFrame(),
});

const save = persistScript;

const toolbarOwner = "verse-script-editor";
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
const requestBlocklyEditor = webMcpRpc.request;
const handleWebMcpEditorMessage = webMcpRpc.handleMessage;

const formatVerseScriptReplaceConfirmation = (
  preview: VerseScriptReplacePreview
) =>
  [
    `确认替换场景“${preview.sceneTitle}”的 Blockly 脚本吗？`,
    `块数量：${preview.current.blockCount} → ${preview.proposed.blockCount}`,
    `顶层流程：${preview.current.topLevelBlockCount} → ${preview.proposed.topLevelBlockCount}`,
    `变量数量：${preview.current.variableCount} → ${preview.proposed.variableCount}`,
    `JavaScript：${preview.current.generatedJavaScriptBytes} → ${preview.proposed.generatedJavaScriptBytes} 字节`,
    `Lua：${preview.current.generatedLuaBytes} → ${preview.proposed.generatedLuaBytes} 字节`,
    "候选工作区已完成 Blockly 反序列化与双语言代码生成检查",
    ...formatScriptWarnings(preview.warnings),
    "确认后将更新可见工作区并保存脚本；平台仍会单独询问是否发布场景",
  ].join("\n");

const registerVerseScriptTools = () => {
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
  registration = webMcpLifecycle = registerVerseScriptWebMcpTools({
    operations: {
      registerStatusTools: true,
      getScope: () => ({
        actorId: String(userStore.userInfo?.id ?? ""),
        targetType: "verse",
        targetId: id.value,
        serverRevision: verse.value?.serverRevision ?? "",
      }),
    },
    getContext: () => ({
      sceneId: Number.isFinite(id.value) ? id.value : null,
      sceneTitle: verse.value?.name ?? "未命名场景",
      editable: Boolean(verse.value?.editable),
      ready: isScriptViewActive && editorContentReady.value,
      dirty: hasUnsavedChanges.value,
      saving: isSaving.value,
    }),
    getVerseScript: async ({ includeWorkspace, includeGeneratedCode }) => {
      if (!verse.value || !Number.isFinite(verse.value.id)) {
        throw new Error("场景脚本尚未加载完成");
      }
      const response = requireSuccessfulWebMcpResponse(
        await requestBlocklyEditor("webmcp-get-scene-script", {
          includeWorkspace,
          includeGeneratedCode,
        })
      );
      return {
        sceneId: verse.value.id,
        sceneTitle: verse.value.name,
        workspaceVersion: String(response.workspaceVersion),
        summary: response.summary,
        valid: Boolean(response.valid),
        issue: response.issue,
        warnings: response.warnings,
        canSave: response.canSave,
        validationScope: response.validationScope,
        workspace: response.workspace,
        generatedCode: response.generatedCode,
      } as VerseScriptSnapshot;
    },
    validateVerseScript: async (focusIssue) => {
      if (!verse.value || !Number.isFinite(verse.value.id)) {
        throw new Error("场景脚本尚未加载完成");
      }
      const response = requireSuccessfulWebMcpResponse(
        await requestBlocklyEditor("webmcp-validate-scene-script", {
          focusIssue,
        })
      );
      return {
        sceneId: verse.value.id,
        sceneTitle: verse.value.name,
        workspaceVersion: String(response.workspaceVersion),
        summary: response.summary,
        valid: Boolean(response.valid),
        issue: response.issue,
        warnings: response.warnings,
        canSave: response.canSave,
        validationScope: response.validationScope,
      } as VerseScriptSnapshot;
    },
    stageVerseScriptReplace: async (workspace) => {
      if (!verse.value || !Number.isFinite(verse.value.id)) {
        throw new Error("场景脚本尚未加载完成");
      }
      if (!verse.value.editable) {
        throw new Error("当前账号没有修改此场景脚本的权限");
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
          "webmcp-stage-scene-script-replace",
          { workspace },
          30000
        )
      );
      return {
        sceneId: verse.value.id,
        sceneTitle: verse.value.name,
        workspaceVersion: String(response.workspaceVersion),
        current: response.current,
        proposed: response.proposed,
        proposedWorkspace: response.proposedWorkspace,
        changed: Boolean(response.changed),
        warnings: response.warnings,
        canSave: response.canSave,
        validationScope: response.validationScope,
      } as VerseScriptReplacePreview;
    },
    confirmVerseScriptReplace: async (preview) => {
      try {
        await ElMessageBox.confirm(
          formatVerseScriptReplaceConfirmation(preview),
          "WebMCP Blockly 场景脚本替换",
          {
            confirmButtonText: t("verse.view.script.save"),
            cancelButtonText: t("verse.view.script.leave.cancel"),
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
    completeVerseScriptReplace: async (preview) => {
      if (!verse.value || verse.value.id !== preview.sceneId) {
        throw new Error("当前场景已经切换，请重新创建脚本预览");
      }
      if (!verse.value.editable) {
        throw new Error("当前账号没有修改此场景脚本的权限");
      }
      if (isSaving.value) throw new Error("脚本正在保存，请稍后重试");

      const response = requireSuccessfulWebMcpResponse(
        await requestBlocklyEditor(
          "webmcp-complete-scene-script-replace",
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
            write: writeOptionsForPreview(preview, verse.value?.serverRevision),
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
        sceneId: verse.value.id,
        workspaceVersion: String(response.workspaceVersion),
        summary: response.summary,
      } as VerseScriptReplaceCompletion;
    },
    onRegistrationError: (toolName, error) => {
      logger.warn(`WebMCP tool registration failed: ${toolName}`, error);
    },
  });
};

const formatScriptBlockBatchConfirmation = (preview: ScriptBlockBatchPreview) =>
  [
    `确认修改场景“${preview.ownerTitle}”的 Blockly 积木吗？`,
    `批量操作：${preview.operationCount} 项`,
    ...formatBlockOperationResults(preview.results),
    `块数量：${preview.current.blockCount} → ${preview.proposed.blockCount}`,
    `顶层流程：${preview.current.topLevelBlockCount} → ${preview.proposed.topLevelBlockCount}`,
    `JavaScript：${preview.current.generatedJavaScriptBytes} → ${preview.proposed.generatedJavaScriptBytes} 字节`,
    `Lua：${preview.current.generatedLuaBytes} → ${preview.proposed.generatedLuaBytes} 字节`,
    "全部操作已在临时 Blockly 工作区执行并完成代码生成检查",
    ...formatScriptWarnings(preview.warnings),
    "确认后将更新可见工作区并保存脚本；平台仍会单独询问是否发布场景",
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
        targetType: "verse",
        targetId: id.value,
        serverRevision: verse.value?.serverRevision ?? "",
      }),
    },
    getContext: () => ({
      ownerKind: "scene",
      ownerId: Number.isFinite(id.value) ? id.value : null,
      ownerTitle: verse.value?.name ?? "未命名场景",
      editable: Boolean(verse.value?.editable),
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
      if (!verse.value || !Number.isFinite(verse.value.id)) {
        throw new Error("场景脚本尚未加载完成");
      }
      if (!verse.value.editable) {
        throw new Error("当前账号没有修改此场景脚本的权限");
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
        ownerKind: "scene",
        ownerId: verse.value.id,
        ownerTitle: verse.value.name,
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
            confirmButtonText: t("verse.view.script.save"),
            cancelButtonText: t("verse.view.script.leave.cancel"),
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
      if (!verse.value || verse.value.id !== preview.ownerId) {
        throw new Error("当前场景已经切换，请重新创建积木预览");
      }
      if (!verse.value.editable) {
        throw new Error("当前账号没有修改此场景脚本的权限");
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
            write: writeOptionsForPreview(preview, verse.value?.serverRevision),
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
        ownerKind: "scene",
        ownerId: verse.value.id,
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
    onOpen: openVersionDialog,
  });
};

onMounted(activateToolbar);
onActivated(activateToolbar);
onDeactivated(() => {
  isScriptViewActive = false;
  verseLoadSequence += 1;
  unregisterToolbar(toolbarOwner);
});

watch(toolbarStatus, (status) => {
  updateToolbarStatus(toolbarOwner, status);
});

onBeforeUnmount(() => {
  unregisterToolbar(toolbarOwner);
});

// ---------- resource computed（Verse 专有：构建事件 inputs/outputs）----------
const resource = computed(() => {
  const inputs: Array<{ title: string; index: string; uuid: string }> = [];
  const outputs: Array<{ title: string; index: string; uuid: string }> = [];
  const metas = (verse.value?.metas || []) as VerseMeta[];
  metas.forEach((meta) => {
    const events = meta.events || {};
    const inputsList = events.inputs || [];
    const outputsList = events.outputs || [];
    const instances: Array<{ uuid: string; title: string }> =
      map.get(meta.id.toString()) || [];
    const effectiveInstances = instances.length
      ? instances
      : [
          {
            uuid: meta.id?.toString() || "",
            title: meta.name || meta.title || "meta",
          },
        ];
    effectiveInstances.forEach((instance) => {
      outputsList.forEach((input) => {
        inputs.push({
          title: `${instance.title}:${input.title}`,
          index: instance.uuid,
          uuid: input.uuid,
        });
      });
      inputsList.forEach((output) => {
        outputs.push({
          title: `${instance.title}:${output.title}`,
          index: instance.uuid,
          uuid: output.uuid,
        });
      });
    });
  });
  return { events: { inputs, outputs } };
});

const ensureUnityPreviewRuntimeData = async (signal?: AbortSignal) => {
  if (!Number.isFinite(id.value)) return;
  const requestedId = id.value;
  if (
    unityPreviewRuntimeVerseId === requestedId &&
    verseMetasWithLuaCodeData.value &&
    verseMetasWithJsCodeData.value
  ) {
    return;
  }

  const [responseLua, responseJs] = await Promise.all([
    getVerse(requestedId, UNITY_PREVIEW_VERSE_EXPAND, "lua", signal),
    getVerse(requestedId, UNITY_PREVIEW_VERSE_EXPAND, "js", signal),
  ]);
  if (signal?.aborted || !isScriptViewActive || requestedId !== id.value)
    return;

  verseMetasWithLuaCodeData.value =
    responseLua.data as unknown as VerseMetasWithJsCode;
  verseMetasWithJsCodeData.value =
    responseJs.data as unknown as VerseMetasWithJsCode;
  if (props.embedded && props.sceneData) {
    // Include newly placed instances and exclude deleted ones without saving/reloading the scene.
    for (const runtime of [
      verseMetasWithLuaCodeData.value,
      verseMetasWithJsCodeData.value,
    ]) {
      const savedMetas = new Map(
        (runtime.metas ?? []).map((meta) => [Number(meta.id), meta])
      );
      runtime.metas = (verse.value?.metas ?? []).map(
        (meta) => savedMetas.get(Number(meta.id)) ?? meta
      );
    }
  }
  const previewMetas = Array.isArray(verseMetasWithJsCodeData.value.metas)
    ? verseMetasWithJsCodeData.value.metas
    : [];
  const metaScripts = await loadMetaJavaScriptCode(previewMetas, signal);
  if (signal?.aborted || requestedId !== id.value) return;

  metasJavaScriptCode.value = metaScripts.join("\n");
  unityPreviewRuntimeVerseId = requestedId;
};

const buildUnityPreviewPayload = () => {
  const runtimeData =
    verseMetasWithLuaCodeData.value ?? verseMetasWithJsCodeData.value;

  return {
    protocolVersion: 1,
    source: "xrugc-web-script-page",
    sceneType: "verse",
    scene: {
      id: verse.value?.id ?? id.value,
      uuid: verse.value?.uuid ?? null,
      name: verse.value?.name ?? "",
      description: verse.value?.description ?? "",
      data: normalizeUnityPreviewData(
        props.sceneData ?? runtimeData?.data ?? verse.value?.data ?? null
      ),
    },
    resources: cloneForUnityPreview(runtimeData?.resources ?? []),
    metas: normalizeUnityPreviewMetas(runtimeData?.metas ?? []),
    script: {
      blockly: cloneForUnityPreview(unsavedBlocklyData.value),
      lua: normalizeUnityPreviewVerseLua(LuaCode.value),
      javascript: JavaScriptCode.value,
      metasJavaScript: metasJavaScriptCode.value,
    },
  };
};

const unityPreview = useUnityPreviewBridge({
  ensureRuntimeData: ensureUnityPreviewRuntimeData,
  buildPayload: buildUnityPreviewPayload,
  canOpen: () => (verse.value ? true : "场景数据尚未加载完成"),
  notifyError: (message) => ElMessage.error(message),
});
const unityPreviewDialog = unityPreview.dialogRef;
const unityPreviewVisible = unityPreview.visible;
const unityPreviewFrameVisible = unityPreview.frameVisible;
const unityPreviewFrameKey = unityPreview.frameKey;
const unityPreviewSrc = unityPreview.src;
const unityPreviewState = unityPreview.runtimeState;
const handleUnityPreviewLoad = unityPreview.handleLoad;
const handleUnityPreviewClosed = unityPreview.handleClosed;

// ---------- 加载 Verse 脚本会话 ----------
const loadVerseScriptSession = async () => {
  if (!isScriptViewActive || (!props.embedded && route.name !== "Script"))
    return;
  if (!Number.isFinite(id.value)) return;
  const requestedId = id.value;
  const loadSequence = ++verseLoadSequence;
  try {
    loading.value = true;
    map.clear();
    verseMetasWithLuaCodeData.value = undefined;
    verseMetasWithJsCodeData.value = undefined;
    metasJavaScriptCode.value = "";
    unityPreviewRuntimeVerseId = null;
    const response = await getVerse(
      id.value,
      "metas, module, share, verseCode"
    );
    if (loadSequence !== verseLoadSequence || requestedId !== id.value) return;
    verse.value = response.data;
    if (props.embedded && props.sceneData) {
      verse.value = { ...verse.value, data: props.sceneData };
      const modules =
        (props.sceneData as VerseEntityNode).children?.modules ?? [];
      const metaIds = [
        ...new Set(
          modules
            .map((item) => Number(item.parameters?.meta_id))
            .filter((value) => value > 0)
        ),
      ];
      const knownMetas = new Map(
        (verse.value.metas ?? []).map((meta) => [Number(meta.id), meta])
      );
      const metas = await Promise.all(
        metaIds.map(
          async (metaId) =>
            knownMetas.get(metaId) ??
            (await getMeta(metaId, { expand: "events,metaCode,resources" }))
              .data
        )
      );
      if (loadSequence !== verseLoadSequence || requestedId !== id.value)
        return;
      verse.value = { ...verse.value, metas };
    }
    logger.error(verse.value);
    logger.log("Verse", verse.value);
    if (verse.value && verse.value.data) {
      const data = verse.value.data;
      (data as VerseEntityNode).children?.modules?.forEach((module) => {
        if (!module.parameters?.meta_id || !module.parameters?.uuid) return;
        const key = module.parameters.meta_id.toString();
        const entry = {
          uuid: module.parameters.uuid,
          title: module.parameters.title || "",
        };
        const arr = map.get(key) || [];
        arr.push(entry);
        map.set(key, arr);
      });
    }
    const savedSnapshot = readSavedEditorSnapshot();
    if (savedSnapshot) {
      beginEditorSession(savedSnapshot, `verse:${verse.value!.id}`);
    }
    initEditor();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    if (loadSequence === verseLoadSequence) {
      loading.value = false;
    }
  }
};

onMounted(loadVerseScriptSession);
onActivated(() => {
  if (!verse.value || verse.value.id !== id.value) {
    void loadVerseScriptSession();
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
    if (canLeave) await unityPreview.close();
    next(canLeave ? undefined : false);
  });
  onBeforeRouteLeave(async () => {
    await unityPreview.close();
  });
}

watch(id, (nextId, previousId) => {
  if (
    isScriptViewActive &&
    (props.embedded || route.name === "Script") &&
    Number.isFinite(nextId) &&
    nextId !== previousId
  ) {
    void loadVerseScriptSession();
  }
});

let runtimeWebMcpLifecycle: AbortController | null = null;
const getSceneRuntimePreviewStatus = () => ({
  sceneId: verse.value?.id ?? null,
  sceneName: verse.value?.name ?? null,
  ...unityPreview.runtimeState.value,
});

const startSceneRuntimePreview = async () => {
  if (props.embedded)
    throw new Error("请先关闭脚本编辑抽屉，再从场景编辑器运行场景");
  const session = getEditorInitState()?.hostSessionId;
  if (!isScriptViewActive || !editorContentReady.value || !verse.value)
    throw new Error("场景脚本尚未准备完成");
  if (hasUnsavedChanges.value || isSaving.value)
    throw new Error("请先保存当前 Blockly 工作区，再启动场景运行预览");
  const response = requireSuccessfulWebMcpResponse(
    await requestBlocklyEditor("webmcp-validate-scene-script", {
      focusIssue: false,
    })
  );
  if (response.canSave === false || hasGeneratedScriptErrors(response.warnings))
    throw new Error("脚本包含阻塞错误，请先修复");
  if (!isScriptViewActive || session !== getEditorInitState()?.hostSessionId)
    throw new Error("编辑器会话已经切换");
  await unityPreview.open();
  return getSceneRuntimePreviewStatus();
};
const runSceneRuntimePreview = () => {
  void startSceneRuntimePreview().catch((error) => {
    ElMessage.error(
      error instanceof Error ? error.message : "无法启动场景运行"
    );
  });
};

const registerRuntimeTools = () => {
  runtimeWebMcpLifecycle?.abort();
  runtimeWebMcpLifecycle = null;
  if (props.embedded) return;
  runtimeWebMcpLifecycle = registerWebMcpTools(
    createSceneRuntimePreviewTools({
      getPreviewStatus: getSceneRuntimePreviewStatus,
      startPreview: startSceneRuntimePreview,
      stopPreview: async () => {
        await unityPreview.close();
        return getSceneRuntimePreviewStatus();
      },
    })
  );
};
const stopWebMcpTools = () => {
  runtimeWebMcpLifecycle?.abort();
  unityPreview.close();
  webMcpLifecycle?.abort();
  scriptBlockWebMcpLifecycle?.abort();
  webMcpRpc.cancel();
};
onMounted(() => window.addEventListener("message", handleWebMcpEditorMessage));
onActivated(() => {
  isScriptViewActive = true;
  registerVerseScriptTools();
  registerScriptBlockTools();
  registerRuntimeTools();
});
onDeactivated(stopWebMcpTools);
onBeforeUnmount(() => {
  isScriptViewActive = false;
  verseLoadSequence += 1;
  stopWebMcpTools();
  window.removeEventListener("message", handleWebMcpEditorMessage);
});
watch([id, editorFrameKey, editorContentReady], () => {
  stopWebMcpTools();
  if (isScriptViewActive && editorContentReady.value) {
    registerVerseScriptTools();
    registerScriptBlockTools();
    registerRuntimeTools();
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

:global(.script-loaded-metas-popper.el-select__popper) {
  padding: 0 !important;
}

:global(.script-loaded-metas-popper .el-select-dropdown__item) {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  min-height: 34px;
  text-align: left;
}

:global(.script-loaded-metas-popper) {
  --script-select-hover-bg: rgb(3 169 244 / 18%);
  --script-select-hover-ring: rgb(3 169 244 / 24%);
  --bg-hover: var(--script-select-hover-bg);
  --el-fill-color-light: var(--script-select-hover-bg);
}

:global(
  .script-loaded-metas-popper .el-select-dropdown__item.hover,
  .script-loaded-metas-popper .el-select-dropdown__item:hover,
  .script-loaded-metas-popper .el-select-dropdown__item.is-hovering,
  .script-loaded-metas-popper.el-select-dropdown
    .el-select-dropdown__item.hover,
  .script-loaded-metas-popper.el-select-dropdown
    .el-select-dropdown__item:hover,
  .script-loaded-metas-popper.el-select-dropdown
    .el-select-dropdown__item.is-hovering,
  .script-loaded-metas-popper.el-select__popper .el-select-dropdown__item.hover,
  .script-loaded-metas-popper.el-select__popper .el-select-dropdown__item:hover,
  .script-loaded-metas-popper.el-select__popper
    .el-select-dropdown__item.is-hovering
) {
  color: var(--primary-color, #03a9f4) !important;
  background-color: var(--script-select-hover-bg) !important;
  background-image: none !important;
  box-shadow: inset 0 0 0 1px var(--script-select-hover-ring) !important;
}

:global(
  .script-loaded-metas-popper.el-select__popper
    .el-select-dropdown__item.selected:not(.hover, .is-hovering, :hover),
  .script-loaded-metas-popper.el-select__popper
    .el-select-dropdown__item.is-selected:not(.hover, .is-hovering, :hover)
) {
  font-weight: 500 !important;
  color: var(--primary-color, #03a9f4) !important;
  background: transparent !important;
}

.script:not(.script--embedded) .script-tabs-wrapper :deep(.el-tabs__header) {
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

.dark-theme :deep(.hljs) {
  background-color: rgb(24 24 24) !important;
}

.light-theme :deep(.hljs) {
  background-color: #fafafa !important;
}
</style>

<style scoped src="@/styles/script-editor-toolbar.css"></style>
