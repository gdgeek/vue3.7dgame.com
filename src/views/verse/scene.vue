<template>
  <div class="verse-scene">
    <KnightDataDialog ref="knightDataRef"></KnightDataDialog>
    <MetaDialog @selected="selected" ref="metaDialogRef"></MetaDialog>
    <!--<PrefabDialog @selected="selected" ref="prefabDialogRef"></PrefabDialog>-->
    <el-container>
      <el-main style="padding: 0; overflow: hidden">
        <iframe
          :key="editorFrameKey"
          id="editor"
          ref="editor"
          :src="src"
          class="content"
          height="100%"
          width="100%"
          allow="xr-spatial-tracking; fullscreen; autoplay; clipboard-read; clipboard-write;"
        ></iframe>
      </el-main>
    </el-container>
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
  </div>
</template>

<script setup lang="ts">
import {
  createWriteOptions,
  applyWriteRevision,
  type WriteOptions,
} from "@/api/v1/write-contract";
import { getScenePublication } from "@/api/v1/write-protocol";
import { writeOptionsForPreview } from "@/services/webmcp/operation-context";
import { readBackScenePublication } from "@/utils/scenePublicationAcknowledgement";
import { WebMcpCompletionError } from "@/services/webmcp/completion-result";
import { sceneWriteFailure } from "@/services/webmcp/scene-write-failure";
import { createIframeRpc } from "@/utils/iframeRpc";
import {
  useIframeInitialization,
  type IframeInitializationTicket,
} from "@/composables/useIframeInitialization";
import { logger } from "@/utils/logger";
import { hasPublishableSceneContent } from "@/utils/versePublish";
import { saveThenPublishScene } from "@/utils/scenePublish";
import { takePhoto } from "@/api/v1/verse";
import {
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
  useRoute,
  useRouter,
} from "vue-router";
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
//import PrefabDialog from "@/components/MrPP/PrefabDialog.vue";
import MetaDialog from "@/components/MrPP/MetaDialog.vue";
import KnightDataDialog from "@/components/MrPP/KnightDataDialog.vue";
import ScriptDraftDialog from "@/components/ScriptDraftDialog.vue";
import { Message } from "@/components/Dialog";
import {
  putVerse,
  getVerse,
  type meta,
  type VerseData,
  type VerseMetasWithJsCode,
} from "@/api/v1/verse";
import { getMeta, getMetas } from "@/api/v1/meta";
import type { JsonValue } from "@/api/v1/types/common";
import { getPrefab } from "@/api/v1/prefab";
import { useAppStore } from "@/store/modules/app";
import { useUserStore } from "@/store/modules/user";
import { useSettingsStore } from "@/store/modules/settings";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { translateRouteTitle } from "@/utils/i18n";
import env from "@/environment";
import { useFileStore } from "@/store/modules/config";
import {
  useEditorVersionToolbar,
  type EditorToolbarStatus,
} from "@/composables/useEditorVersionToolbar";
import type {
  ScriptDraftVersion,
  ScriptSaveTrigger,
} from "@/composables/useScriptEditorBase";
import type { MetaInfo } from "@/api/v1/types/meta";
import { useIframeMessaging } from "@/composables/useIframeMessaging";
import { useSceneSaveGuard } from "@/composables/useSceneSaveGuard";
import { VERSE_SCENE_EXPAND, buildVerseEditorInitConfig } from "./sceneSpace";
import UnityPreviewDialog from "@/components/UnityPreviewDialog.vue";
import { useUnityPreviewBridge } from "@/composables/useUnityPreviewBridge";
import {
  normalizeUnityPreviewVerseLua,
  readUnityPreviewMetaJavaScriptCode,
} from "@/utils/unityPreviewLua";
import {
  cloneForUnityPreview,
  normalizeUnityPreviewData,
  normalizeUnityPreviewMetas,
  readUnityPreviewVerseCode,
  UNITY_PREVIEW_VERSE_EXPAND,
} from "@/utils/unityPreviewPayload";
import {
  buildSceneModuleList,
  registerSceneEditorWebMcpTools,
  validateScene,
  type SceneEditorLiveState,
} from "@/services/webmcp/scene-editor-tools";
import type {
  SceneEntityPlacementPreview,
  SceneModuleTransform,
} from "@/services/webmcp/scene-entity-placement-tools";
import type {
  SceneModuleTransformPatch,
  SceneModuleTransformPreview,
  SceneModuleTransformSnapshot,
} from "@/services/webmcp/scene-module-transform-tools";
import type {
  SceneModulePropertyPatch,
  SceneModulePropertyPreview,
  SceneModulePropertySnapshot,
} from "@/services/webmcp/scene-module-property-tools";
import type { SceneModuleDeletionPreview } from "@/services/webmcp/scene-module-deletion-tools";
import { checkSceneReadiness } from "@/services/webmcp/scene-reliability-tools";
import type { ScenePublicationPreview } from "@/services/webmcp/scene-publication-tools";

// 组件状态
const userStore = useUserStore();
const appStore = useAppStore();
const settingsStore = useSettingsStore();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const editor = ref<HTMLIFrameElement>();
import qs from "querystringify";
const saveable = ref(false);
let unsavedCheckPollingTimer: number | null = null;
const editorFrameKey = ref(0);
let webMcpLifecycle: AbortController | null = null;
const isRestoringDraft = ref(false);
const versionDialogVisible = ref(false);
const draftVersions = ref<ScriptDraftVersion[]>([]);
const autoSaveEnabled = ref(true);
const DEFAULT_AUTO_SAVE_INTERVAL_SECONDS = 300;
const DRAFT_SETTINGS_VERSION = 2;
const autoSaveIntervalSeconds = ref(DEFAULT_AUTO_SAVE_INTERVAL_SECONDS);
const isSavingVersion = ref(false);
const isPublishingVerse = ref(false);
const lastSaveTrigger = ref<ScriptSaveTrigger | null>(null);
const lastSavedAt = ref<string | null>(null);
const pendingRestorePayload = ref<VerseEditorPayload | null>(null);
let currentSaveTrigger: ScriptSaveTrigger = "manual";
let autoSaveTimer: number | null = null;

const toolbarOwner = "verse-scene-editor";
const { registerToolbar, updateToolbarStatus, unregisterToolbar } =
  useEditorVersionToolbar();

const activateToolbar = () => {
  registerToolbar(toolbarOwner, {
    status: toolbarStatus.value,
    onOpen: openVersionDialog,
    onRunPreview: runSceneRuntimePreview,
  });
};
const toolbarStatus = computed<EditorToolbarStatus>(() => {
  if (isSavingVersion.value) return "saving";
  if (pendingRestorePayload.value || hasUnsavedChangesBeforeUnload.value) {
    return "dirty";
  }
  if (lastSaveTrigger.value === "auto" && lastSavedAt.value) {
    return "autosaved";
  }
  return "saved";
});

const safeClone = <T,>(value: T): T => {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
};

const buildSceneDraftStorageKey = computed(() =>
  Number.isFinite(id.value) ? `scene-draft:verse:${id.value}` : null
);

const buildSceneDraftSettingsKey = computed(() =>
  buildSceneDraftStorageKey.value
    ? `${buildSceneDraftStorageKey.value}:settings`
    : null
);

// 对话框引用
const knightDataRef = ref<InstanceType<typeof KnightDataDialog>>();
//const prefabDialogRef = ref<InstanceType<typeof PrefabDialog>>();
const metaDialogRef = ref<InstanceType<typeof MetaDialog>>();

const decodeRouteText = (value: string): string => {
  let decoded = value;
  for (let i = 0; i < 2; i += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
};

// 计算属性
const title = computed(() => {
  const decodedTitle = decodeRouteText((route.query.title as string) || "");
  const match = decodedTitle.match(/【(.*?)】/);
  return match ? match[0] : "";
});

const id = computed(() => parseInt(route.query.id as string));

const src = computed(() => {
  const query: Record<string, string | number> = {
    language: appStore.language,
    v: env.buildVersion,
    api: env.api,
  };

  const url =
    `${env.editor}/three.js/editor/verse-editor.html` +
    qs.stringify(query, true);

  return url;
});

const verseMetasWithLuaCodeData = ref<VerseMetasWithJsCode>();
const verseMetasWithJsCodeData = ref<VerseMetasWithJsCode>();

const ensureUnityPreviewRuntimeData = async (signal?: AbortSignal) => {
  if (verseMetasWithLuaCodeData.value && verseMetasWithJsCodeData.value) return;
  if (!Number.isFinite(id.value)) return;

  const requestedId = id.value;
  const [responseLua, responseJs] = await Promise.all([
    getVerse(requestedId, UNITY_PREVIEW_VERSE_EXPAND, "lua", signal),
    getVerse(requestedId, UNITY_PREVIEW_VERSE_EXPAND, "js", signal),
  ]);
  if (signal?.aborted || requestedId !== id.value) return;
  verseMetasWithLuaCodeData.value =
    responseLua.data as unknown as VerseMetasWithJsCode;
  verseMetasWithJsCodeData.value =
    responseJs.data as unknown as VerseMetasWithJsCode;
};

const buildUnityPreviewPayload = () => {
  const runtimeData =
    verseMetasWithLuaCodeData.value ?? verseMetasWithJsCodeData.value;
  const scriptJsRuntimeData =
    verseMetasWithJsCodeData.value ?? verseMetasWithLuaCodeData.value;
  const luaCode = readUnityPreviewVerseCode(runtimeData, "lua");
  const jsCode = readUnityPreviewVerseCode(scriptJsRuntimeData, "javascript");
  const metasJavaScriptCode = (
    (scriptJsRuntimeData?.metas ?? []) as unknown as meta[]
  )
    .map((item) => readUnityPreviewMetaJavaScriptCode(item))
    .join("\n");

  return {
    protocolVersion: 1,
    source: "xrugc-web-scene-editor",
    sceneType: "verse",
    scene: {
      id: verse.value?.id ?? id.value,
      uuid: verse.value?.uuid ?? runtimeData?.uuid ?? null,
      name: verse.value?.name ?? runtimeData?.name ?? "",
      description: verse.value?.description ?? runtimeData?.description ?? "",
      data: normalizeUnityPreviewData(
        runtimeData?.data ?? verse.value?.data ?? null
      ),
    },
    resources: cloneForUnityPreview(runtimeData?.resources ?? []),
    metas: normalizeUnityPreviewMetas(runtimeData?.metas ?? []),
    script: {
      blockly: null,
      lua: normalizeUnityPreviewVerseLua(luaCode),
      javascript: jsCode,
      metasJavaScript: metasJavaScriptCode,
    },
  };
};

const unityPreview = useUnityPreviewBridge({
  ensureRuntimeData: ensureUnityPreviewRuntimeData,
  buildPayload: buildUnityPreviewPayload,
  canOpen: () =>
    verse.value || Number.isFinite(id.value) ? true : "场景数据尚未加载完成",
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

const checkPublicationResources = async () => {
  const report = await checkSceneReadiness({
    getContext: () => ({
      scene: verse.value,
      dirty:
        hasUnsavedChangesBeforeUnload.value ||
        Boolean(pendingRestorePayload.value),
      loading: verse.value === null,
      ready: editorContentReady.value,
    }),
    getLiveState: getLiveSceneState,
    readEntityForReadiness: async (entityId: number) =>
      (await getMeta(entityId, { expand: "resources,metaCode" })).data,
  });
  if (!report.metadataReady)
    throw new Error(`资源发布前检查未通过：${report.blockers.join("；")}`);
  return report;
};

const getSceneRuntimePreviewStatus = () => ({
  sceneId: Number.isFinite(id.value) ? id.value : null,
  sceneName: verse.value?.name ?? null,
  ...unityPreview.runtimeState.value,
});

const verse = ref<VerseData | null>(null);
const pushVerseToEditor = (
  nextVerse: VerseData,
  ticket: IframeInitializationTicket | null = editorInitialization.begin()
) => {
  if (!ticket || !editorInitialization.isCurrent(ticket)) return;
  webMcpRpc.cancel("编辑器正在重新初始化");
  editorInitialization.send(ticket, {
    token: null,
    config: buildVerseEditorInitConfig({
      id: id.value,
      verse: nextVerse,
      saveable: saveable.value,
      user: {
        id: userStore.userInfo?.id || null,
        role: userStore.getRole(),
      },
    }),
  });
  registerPageWebMcpTools();
};

// 刷新场景数据
const refresh = async () => {
  const ticket = editorInitialization.begin();
  if (!ticket) return;
  webMcpRpc.cancel("编辑器正在重新初始化");
  try {
    const response = await getVerse(ticket.owner, VERSE_SCENE_EXPAND);
    if (!editorInitialization.isCurrent(ticket)) return;
    verse.value = response.data;
    saveable.value = verse.value ? verse.value.editable : false;
    if (verse.value) pushVerseToEditor(verse.value, ticket);
  } catch (error) {
    editorInitialization.fail(ticket);
    if (editorInitialization.isCurrent(ticket)) logger.error(error);
  }
};

// 向编辑器发送消息
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toMetaId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const pickMetaNameFromPayload = (payload: Record<string, unknown>): string => {
  const candidates = [
    payload.meta_title,
    payload.meta_name,
    payload.title,
    payload.name,
    payload.metaTitle,
    payload.metaName,
  ];
  const found = candidates.find(
    (value) => typeof value === "string" && value.trim().length > 0
  );
  return typeof found === "string" ? found.trim() : "";
};

const buildMetaSceneTitle = (
  metaId: number,
  payload: Record<string, unknown>
): string => {
  const payloadName = pickMetaNameFromPayload(payload);
  const matchedMeta = Array.isArray(verse.value?.metas)
    ? verse.value?.metas.find((item) => item.id === metaId)
    : undefined;
  const metaName =
    payloadName ||
    String(matchedMeta?.title || matchedMeta?.name || "").trim() ||
    String(t("meta.list.unnamed"));

  return encodeURIComponent(
    t("meta.list.editorTitle", {
      name: metaName,
    })
  );
};

type PrefabSetupPayload = {
  meta_id: number | string;
  data: string;
  uuid: string;
};

type SelectedMetaPayload = {
  data: MetaInfo;
  setup?: unknown;
  title?: string;
};

type VerseModule = {
  parameters: {
    title: string;
  } & Record<string, unknown>;
};

type VerseEditorData = {
  children?: {
    modules?: VerseModule[];
  };
} & Record<string, unknown>;

type VerseEditorPayload = {
  verse?: VerseEditorData;
};

type CoverUploadPayload = {
  imageData: string;
};

type UnsavedChangesResultPayload = {
  requestId: string;
  changed: boolean;
};

const collectVerseModuleTitles = (
  modules: VerseModule[] | undefined,
  titles: string[] = []
) => {
  (modules || []).forEach((module) => {
    const title =
      typeof module?.parameters?.title === "string"
        ? module.parameters.title.trim()
        : "";
    if (title) {
      titles.push(title);
    }
  });
  return titles;
};

const formatVerseDraftSummary = (payload: VerseEditorPayload) => {
  const titles = collectVerseModuleTitles(payload.verse?.children?.modules);
  if (titles.length === 0) {
    return t("common.scriptDraft.emptySummary");
  }
  const preview = titles.slice(0, 3).join("、");
  const extra = titles.length > 3 ? ` +${titles.length - 3}` : "";
  return `${preview}${extra}`;
};

const formatVerseDraftChangeSummary = (
  payload: VerseEditorPayload,
  previousVersion?: ScriptDraftVersion
): {
  summary: string;
  summaryI18nKey?: string;
  summaryI18nParams?: Record<string, string>;
} => {
  const fallbackSummary = formatVerseDraftSummary(payload);
  if (!previousVersion) {
    return {
      summary: fallbackSummary,
      summaryI18nKey:
        fallbackSummary === t("common.scriptDraft.emptySummary")
          ? "common.scriptDraft.emptySummary"
          : undefined,
    };
  }
  const currentTitles = collectVerseModuleTitles(
    payload.verse?.children?.modules
  );
  const previousPayload = isRecord(previousVersion.blocklyData)
    ? (previousVersion.blocklyData as VerseEditorPayload)
    : {};
  const previousTitles = collectVerseModuleTitles(
    previousPayload.verse?.children?.modules
  );
  const addedTitles = currentTitles.filter(
    (title) => !previousTitles.includes(title)
  );
  if (addedTitles.length > 0) {
    const items = addedTitles.slice(0, 3).join("、");
    return {
      summary: t("common.scriptDraft.summaryAdded", { items }),
      summaryI18nKey: "common.scriptDraft.summaryAdded",
      summaryI18nParams: { items },
    };
  }
  const removedTitles = previousTitles.filter(
    (title) => !currentTitles.includes(title)
  );
  if (removedTitles.length > 0) {
    const items = removedTitles.slice(0, 3).join("、");
    return {
      summary: t("common.scriptDraft.summaryRemoved", { items }),
      summaryI18nKey: "common.scriptDraft.summaryRemoved",
      summaryI18nParams: { items },
    };
  }
  for (let index = 0; index < currentTitles.length; index += 1) {
    if (currentTitles[index] !== previousTitles[index]) {
      const items = currentTitles[index] || previousTitles[index];
      return {
        summary: t("common.scriptDraft.summaryModified", { items }),
        summaryI18nKey: "common.scriptDraft.summaryModified",
        summaryI18nParams: { items },
      };
    }
  }
  return {
    summary: fallbackSummary,
    summaryI18nKey:
      fallbackSummary === t("common.scriptDraft.emptySummary")
        ? "common.scriptDraft.emptySummary"
        : undefined,
  };
};

const persistSceneDraftVersions = () => {
  if (!buildSceneDraftStorageKey.value) return;
  try {
    window.localStorage.setItem(
      buildSceneDraftStorageKey.value,
      JSON.stringify(draftVersions.value)
    );
  } catch (error) {
    logger.error("persistVerseSceneDraftVersions error", error);
  }
};

const persistSceneDraftSettings = () => {
  if (!buildSceneDraftSettingsKey.value) return;
  try {
    window.localStorage.setItem(
      buildSceneDraftSettingsKey.value,
      JSON.stringify({
        settingsVersion: DRAFT_SETTINGS_VERSION,
        autoSaveEnabled: autoSaveEnabled.value,
        autoSaveIntervalSeconds: autoSaveIntervalSeconds.value,
      })
    );
  } catch (error) {
    logger.error("persistVerseSceneDraftSettings error", error);
  }
};

const normalizeAutoSaveInterval = (parsed: Record<string, unknown>) => {
  const interval = Number(parsed.autoSaveIntervalSeconds);
  if (!Number.isFinite(interval) || interval < 60) {
    return DEFAULT_AUTO_SAVE_INTERVAL_SECONDS;
  }
  const settingsVersion = Number(parsed.settingsVersion || 0);
  if (settingsVersion < DRAFT_SETTINGS_VERSION && interval === 60) {
    return DEFAULT_AUTO_SAVE_INTERVAL_SECONDS;
  }
  return interval;
};

const loadSceneDraftState = () => {
  draftVersions.value = [];
  autoSaveEnabled.value = true;
  autoSaveIntervalSeconds.value = DEFAULT_AUTO_SAVE_INTERVAL_SECONDS;

  if (!buildSceneDraftStorageKey.value || !buildSceneDraftSettingsKey.value) {
    return;
  }

  try {
    const rawVersions = window.localStorage.getItem(
      buildSceneDraftStorageKey.value
    );
    if (rawVersions) {
      const parsed = JSON.parse(rawVersions);
      if (Array.isArray(parsed)) {
        draftVersions.value = parsed;
        const latestVersion = parsed[0] as ScriptDraftVersion | undefined;
        if (latestVersion) {
          lastSaveTrigger.value = latestVersion.trigger;
          lastSavedAt.value = latestVersion.savedAt;
        }
      }
    }
  } catch (error) {
    logger.error("loadVerseSceneDraftState versions error", error);
  }

  try {
    const rawSettings = window.localStorage.getItem(
      buildSceneDraftSettingsKey.value
    );
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      autoSaveEnabled.value = parsed.autoSaveEnabled !== false;
      if (parsed && typeof parsed === "object") {
        autoSaveIntervalSeconds.value = normalizeAutoSaveInterval(
          parsed as Record<string, unknown>
        );
      }
    }
  } catch (error) {
    logger.error("loadVerseSceneDraftState settings error", error);
  }
};

const addSceneDraftVersion = (
  payload: VerseEditorPayload,
  trigger: ScriptSaveTrigger
) => {
  const latestVersion = draftVersions.value[0];
  const nextSummary = formatVerseDraftChangeSummary(payload, latestVersion);
  const nextVersion: ScriptDraftVersion = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
    trigger,
    summary: nextSummary.summary,
    summaryI18nKey: nextSummary.summaryI18nKey,
    summaryI18nParams: nextSummary.summaryI18nParams,
    blocklyData: safeClone(payload),
    lua: "",
    js: "",
  };
  const nextSignature = JSON.stringify(nextVersion.blocklyData ?? null);
  const latestSignature = latestVersion
    ? JSON.stringify(latestVersion.blocklyData ?? null)
    : "";
  if (latestSignature === nextSignature) {
    return null;
  }
  draftVersions.value = [nextVersion, ...draftVersions.value].slice(0, 20);
  persistSceneDraftVersions();
  return nextVersion.savedAt;
};

const openVersionDialog = () => {
  versionDialogVisible.value = true;
};

const clearDraftHistory = () => {
  draftVersions.value = [];
  pendingRestorePayload.value = null;
  if (!buildSceneDraftStorageKey.value) return;
  try {
    window.localStorage.removeItem(buildSceneDraftStorageKey.value);
  } catch (error) {
    logger.error("clearVerseSceneDraftHistory error", error);
  }
};

const restoreDraftVersion = (draftId: string) => {
  const target = draftVersions.value.find((draft) => draft.id === draftId);
  if (!target || !verse.value) return;
  const payload = isRecord(target.blocklyData)
    ? (target.blocklyData as VerseEditorPayload)
    : {};
  verse.value = {
    ...verse.value,
    data: safeClone(payload.verse ?? verse.value.data),
  };
  pendingRestorePayload.value = safeClone(payload);
  isRestoringDraft.value = true;
  editorContentReady.value = false;
  webMcpRpc.cancel();
  webMcpLifecycle?.abort();
  editorFrameKey.value += 1;
  registerPageWebMcpTools();
  hasUnsavedChangesBeforeUnload.value = true;
  Message.success(t("common.scriptDraft.restoreSuccess"));
  versionDialogVisible.value = false;
};

const clearAutoSaveTimer = () => {
  if (autoSaveTimer !== null) {
    window.clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
};

const restartAutoSaveTimer = () => {
  clearAutoSaveTimer();
  if (!autoSaveEnabled.value || !buildSceneDraftStorageKey.value) return;

  autoSaveTimer = window.setInterval(async () => {
    if (!pendingRestorePayload.value && !hasUnsavedChangesBeforeUnload.value) {
      return;
    }
    if (isSavingVersion.value) return;
    if (!verse.value?.editable) return;
    try {
      await requestSceneSave("auto");
    } catch (error) {
      logger.error("verse scene auto save failed", error);
    }
  }, autoSaveIntervalSeconds.value * 1000);
};

const isPrefabSetupPayload = (value: unknown): value is PrefabSetupPayload =>
  isRecord(value) && "meta_id" in value && "data" in value && "uuid" in value;

const isCoverUploadPayload = (value: unknown): value is CoverUploadPayload =>
  isRecord(value) && typeof value.imageData === "string";

const _isUnsavedChangesResultPayload = (
  value: unknown
): value is UnsavedChangesResultPayload =>
  isRecord(value) &&
  typeof value.requestId === "string" &&
  typeof value.changed === "boolean";

// 消息发送基础设施
const { postStandardMessage, sendRequest, pendingRequests, getHostSessionId } =
  useIframeMessaging(editor, {
    onError: () => ElMessage.error(t("verse.view.sceneEditor.error1")),
  });

const editorInitialization = useIframeInitialization({
  frame: () => editor.value,
  owner: () => id.value,
  src: () => src.value,
  frameKey: () => editorFrameKey.value,
  sendInit: (payload) => postStandardMessage("INIT", payload),
});
const editorContentReady = editorInitialization.ready;

const webMcpRpc = createIframeRpc({
  frame: () => editor.value,
  session: getHostSessionId,
  ready: editorInitialization.isReady,
  send: sendRequest,
});
const requestEditor = webMcpRpc.request;

const requireSuccessfulEditorResponse = (response: Record<string, unknown>) => {
  if (response.ok !== true) {
    throw new Error(
      typeof response.error === "string" ? response.error : "场景编辑器操作失败"
    );
  }
  return response;
};

const getLiveSceneState = async (): Promise<SceneEditorLiveState> => {
  if (!editorContentReady.value) {
    throw new Error("场景编辑器尚未加载完成");
  }
  const response = requireSuccessfulEditorResponse(
    await requestEditor("webmcp-get-scene-state")
  );
  return {
    verse: response.verse,
    sceneVersion: String(response.sceneVersion || ""),
    changed: Boolean(response.changed),
    loading: Boolean(response.loading),
    selectedModuleIds: Array.isArray(response.selectedModuleIds)
      ? response.selectedModuleIds.map(String)
      : [],
  };
};

const confirmSaveCurrentScene = () =>
  ElMessageBox.confirm(t("common.sceneSaveConfirm.message"), "", {
    showClose: true,
    center: true,
    distinguishCancelAndClose: true,
    closeOnClickModal: false,
    closeOnPressEscape: true,
    showCancelButton: true,
    customClass: "script-save-confirm-box",
    confirmButtonText: t("common.sceneSaveConfirm.confirm"),
    cancelButtonText: t("common.sceneSaveConfirm.cancel"),
  });

const {
  hasUnsavedChangesBeforeUnload,
  hasUnconfirmedPersistence,
  markPersistenceUnverified,
  markPersistenceAcknowledged,
  resetUnsavedState,
  syncUnsavedChangesForBeforeUnload,
  resolveLeaveSave,
  requestSceneSave,
  resolveUnsavedBeforeLeave,
  handleBeforeUnload,
  cleanupPendingResolver,
} = useSceneSaveGuard({
  sendRequest,
  pendingRequests,
  pendingRestorePayload,
  isSavingVersion,
  confirmDialog: confirmSaveCurrentScene,
  onBeforeSave: (trigger) => {
    currentSaveTrigger = trigger;
  },
});

// 设置预制件属性
const setupPrefab = async ({ meta_id, data, uuid }: PrefabSetupPayload) => {
  const response = await getPrefab(Number(meta_id));
  knightDataRef.value?.open({
    schema: JSON.parse(response.data.data!),
    data: JSON.parse(data),
    callback: (setup: unknown) => {
      sendRequest("setup-module", { uuid, setup } as Record<string, unknown>);
    },
  });
};

// 添加预制件
//const addPrefab = () => {
//  prefabDialogRef.value?.open(id.value);
//};

// 添加实体
const addMeta = () => {
  metaDialogRef.value?.open(id.value);
};

// 选择元素后的回调
const selected = async ({ data, setup, title }: SelectedMetaPayload) => {
  sendRequest("add-module", { data, setup, title } as Record<string, unknown>);
};

// 保存场景数据
const saveVerse = async (
  data: unknown,
  trigger: ScriptSaveTrigger = "manual"
) => {
  const payload = data as VerseEditorPayload;
  if (!payload.verse) {
    return;
  }

  const verse = payload.verse;

  if (!saveable.value) {
    ElMessage.info(t("verse.view.sceneEditor.info3"));
    return;
  }

  // 处理重复标题，确保标题唯一
  const retitleVerses = (verses: VerseModule[]) => {
    const titleCount: Record<string, number> = {};

    verses.forEach((verse) => {
      let title = verse.parameters.title;

      // 提取基础标题和计数
      const match = title.match(/^(.*?)(?: \((\d+)\))?$/);
      const baseTitle = match?.[1]?.trim() || title;
      const currentCount = match?.[2] ? parseInt(match[2], 10) : 0;

      if (!titleCount[baseTitle]) {
        titleCount[baseTitle] = currentCount > 0 ? currentCount : 1;
      } else {
        titleCount[baseTitle]++;
      }

      // 生成唯一标题
      const newCount = titleCount[baseTitle];
      verse.parameters.title =
        newCount > 1 ? `${baseTitle} (${newCount})` : baseTitle;
    });
  };

  if (verse?.children?.modules) {
    retitleVerses(verse.children.modules);
  }
  await saveScenePayload(verse as unknown as JsonValue);

  if (trigger === "manual") {
    if (!hasPublishableSceneContent(verse)) {
      ElMessage.warning(t("verse.view.sceneEditor.emptySceneCannotPublish"));
      return;
    }

    ElMessageBox.confirm(
      t("verse.view.sceneEditor.saveAndPublishConfirm"),
      t("verse.view.sceneEditor.publishScene"),
      {
        confirmButtonText: t("verse.view.sceneEditor.confirm"),
        cancelButtonText: t("verse.view.sceneEditor.cancel"),
        type: "warning",
      }
    )
      .then(async () => {
        await takePhoto(
          id.value,
          createWriteOptions(getSceneServerModel()?.serverRevision)
        );
        ElMessage({
          type: "success",
          message: t("verse.view.sceneEditor.publishSuccess"),
        });
      })
      .catch(() => {
        ElMessage({
          type: "info",
          message: t("verse.view.sceneEditor.publishCanceled"),
        });
      });
  }
};

const saveVerseBeforeLeave = async (
  data: unknown,
  trigger: ScriptSaveTrigger = currentSaveTrigger,
  showSuccess = true
): Promise<boolean> => {
  const payload = data as VerseEditorPayload;
  if (!payload.verse) {
    return false;
  }

  const verse = payload.verse;

  if (!saveable.value) {
    ElMessage.info(t("verse.view.sceneEditor.info3"));
    return true;
  }

  const retitleVerses = (verses: VerseModule[]) => {
    const titleCount: Record<string, number> = {};

    verses.forEach((item) => {
      const title = item.parameters.title;
      const match = title.match(/^(.*?)(?: \((\d+)\))?$/);
      const baseTitle = match?.[1]?.trim() || title;
      const currentCount = match?.[2] ? parseInt(match[2], 10) : 0;

      if (!titleCount[baseTitle]) {
        titleCount[baseTitle] = currentCount > 0 ? currentCount : 1;
      } else {
        titleCount[baseTitle]++;
      }

      const newCount = titleCount[baseTitle];
      item.parameters.title =
        newCount > 1 ? `${baseTitle} (${newCount})` : baseTitle;
    });
  };

  if (verse?.children?.modules) {
    retitleVerses(verse.children.modules);
  }

  try {
    await saveScenePayload(verse as unknown as JsonValue);
    if (trigger === "manual" && showSuccess) {
      ElMessage.success(t("verse.view.sceneEditor.saveCompleted"));
    }
    return true;
  } catch {
    ElMessage.error(t("verse.view.sceneEditor.error1"));
    return false;
  }
};

const formatSceneVector = (value: { x: number; y: number; z: number }) =>
  `${value.x.toFixed(3)} / ${value.y.toFixed(3)} / ${value.z.toFixed(3)}`;

const formatEntityPlacementConfirmation = (
  preview: SceneEntityPlacementPreview
) =>
  [
    `确认把实体“${preview.entityTitle}”放入当前场景吗？`,
    `实例名称：${preview.proposedTitle}`,
    `位置：${formatSceneVector(preview.transform.position)}`,
    `旋转：${formatSceneVector(preview.transform.rotate)}`,
    `缩放：${formatSceneVector(preview.transform.scale)}`,
    preview.emptyEntity ? "提醒：这个实体目前没有内容" : "",
    "此操作会保存场景，但不会发布",
  ]
    .filter(Boolean)
    .join("\n");

const formatSceneModuleTransformConfirmation = (
  preview: SceneModuleTransformPreview
) => {
  const lines = [`确认修改实体实例“${preview.moduleTitle}”吗？`];
  const appendChange = (
    label: string,
    current: { x: number; y: number; z: number },
    proposed: { x: number; y: number; z: number }
  ) => {
    if (formatSceneVector(current) !== formatSceneVector(proposed)) {
      lines.push(
        `${label}：${formatSceneVector(current)} → ${formatSceneVector(proposed)}`
      );
    }
  };
  appendChange("位置", preview.current.position, preview.proposed.position);
  appendChange(
    "旋转",
    preview.current.rotationDegrees,
    preview.proposed.rotationDegrees
  );
  appendChange("缩放", preview.current.scale, preview.proposed.scale);
  lines.push("此操作会保存场景，但不会发布");
  return lines.join("\n");
};

const formatSceneModulePropertyConfirmation = (
  preview: SceneModulePropertyPreview
) => {
  const lines = [`确认修改实体实例“${preview.moduleTitle}”的属性吗？`];
  if (preview.current.title !== preview.proposed.title) {
    lines.push(`名称：${preview.current.title} → ${preview.proposed.title}`);
  }
  if (preview.current.visible !== preview.proposed.visible) {
    lines.push(
      `可见性：${preview.current.visible ? "显示" : "隐藏"} → ${
        preview.proposed.visible ? "显示" : "隐藏"
      }`
    );
  }
  lines.push("此操作会保存场景，但不会发布");
  return lines.join("\n");
};

const formatSceneModuleDeletionConfirmation = (
  preview: SceneModuleDeletionPreview
) =>
  [
    `确认删除实体实例“${preview.moduleTitle}”吗？`,
    preview.entityId === null ? "" : `来源实体 ID：${preview.entityId}`,
    `删除范围：实例本身及其 ${preview.descendantCount} 个内部对象`,
    "删除后会立即保存场景，但不会发布；仍可在编辑器中撤销后重新保存",
  ]
    .filter(Boolean)
    .join("\n");

const formatScenePublicationConfirmation = (preview: ScenePublicationPreview) =>
  [
    `确认${preview.alreadyPublished ? "重新" : ""}发布场景“${preview.sceneName}”吗？`,
    `发布内容：${preview.moduleCount} 个实体实例`,
    preview.warningCount > 0
      ? `发布前检查有 ${preview.warningCount} 条警告：${preview.warnings.join(
          "；"
        )}`
      : "发布前检查没有警告",
    "发布将创建当前已保存版本的运行快照",
  ].join("\n");

const uniqueSceneModuleTitle = (baseTitle: string, liveVerse: unknown) => {
  const existing = new Set(
    buildSceneModuleList(liveVerse, { limit: 500 }).modules.map(
      (module) => module.title
    )
  );
  if (!existing.has(baseTitle)) return baseTitle;
  let suffix = 2;
  while (existing.has(`${baseTitle} (${suffix})`)) suffix += 1;
  return `${baseTitle} (${suffix})`;
};

const countEntityRootNodes = (data: unknown) => {
  if (!isRecord(data)) return 0;
  const children = isRecord(data.children) ? data.children : null;
  return Array.isArray(children?.entities) ? children.entities.length : 0;
};

const getSceneServerModel = () => verse.value;
const saveScenePayload = async (sceneData: JsonValue, write?: WriteOptions) => {
  const scene = verse.value;
  const ownerId = id.value;
  const ownerSession = getHostSessionId();
  markPersistenceUnverified();
  const result = await putVerse(
    ownerId,
    { data: sceneData },
    write ?? createWriteOptions(scene?.serverRevision)
  );
  if (
    scene &&
    verse.value === scene &&
    id.value === ownerId &&
    ownerSession === getHostSessionId()
  ) {
    applyWriteRevision(scene, result);
    verse.value = { ...scene, data: safeClone(sceneData) };
    markPersistenceAcknowledged();
  }
  return result;
};

const persistWebMcpSceneMutation = async (
  response: Record<string, unknown>,
  messages: { success: string; failure: string },
  preview: object
) => {
  const ownerId = id.value;
  const ownerSession = getHostSessionId();
  const ownerModel = verse.value;
  markPersistenceUnverified();
  if (!isRecord(response.verse)) {
    throw new WebMcpCompletionError(
      {
        status: "partial",
        editorApplied: true,
        persistence: "unverified",
        retry: "read_state_before_retry",
        ownerId,
        moduleId: response.moduleId,
      },
      "编辑器没有返回可保存的场景数据"
    );
  }
  const sceneData = response.verse as VerseEditorData;
  const payload: VerseEditorPayload = { verse: sceneData };
  currentSaveTrigger = "manual";
  isSavingVersion.value = true;
  let serverSaved = false;
  let editorAcknowledged = false;
  try {
    const savedResponse = await putVerse(
      ownerId,
      { data: sceneData as unknown as JsonValue },
      writeOptionsForPreview(preview, verse.value?.serverRevision)
    );
    serverSaved = true;
    if (
      ownerId === id.value &&
      ownerSession === getHostSessionId() &&
      ownerModel === verse.value
    ) {
      applyWriteRevision(verse.value, savedResponse);
      verseMetasWithLuaCodeData.value = undefined;
      verseMetasWithJsCodeData.value = undefined;
      if (verse.value)
        verse.value = {
          ...verse.value,
          data: safeClone(sceneData) as unknown as JsonValue,
        };
      const savedAt = addSceneDraftVersion(payload, currentSaveTrigger);
      pendingRestorePayload.value = null;
      lastSaveTrigger.value = currentSaveTrigger;
      lastSavedAt.value = savedAt || new Date().toISOString();
      const savedModel = verse.value;
      try {
        requireSuccessfulEditorResponse(
          await requestEditor("webmcp-mark-scene-saved", {
            expectedSceneVersion: String(response.sceneVersion || ""),
          })
        );
        editorAcknowledged = true;
      } catch {
        /* Persistence succeeded; only the editor acknowledgement failed. */
      }
      if (
        editorAcknowledged &&
        ownerId === id.value &&
        ownerSession === getHostSessionId() &&
        savedModel === verse.value
      )
        markPersistenceAcknowledged();
    }
    Message.success(messages.success);
  } catch (error) {
    if (!serverSaved)
      throw sceneWriteFailure(
        error,
        {
          ownerId,
          moduleId: response.moduleId,
          sceneVersion: response.sceneVersion,
        },
        messages.failure
      );
  } finally {
    isSavingVersion.value = false;
  }
  return {
    editorApplied: true,
    persistence: "server_acknowledged",
    editorAcknowledged,
    ownerId,
  };
};

//发布场景
const releaseVerse = async (data: unknown) => {
  if (isPublishingVerse.value) return;

  const payload = data as VerseEditorPayload;
  if (!payload.verse) {
    ElMessage.error(t("verse.view.sceneEditor.noProjectToPublish"));
    return;
  }

  if (!hasPublishableSceneContent(payload.verse)) {
    ElMessage.warning(t("verse.view.sceneEditor.emptySceneCannotPublish"));
    return;
  }

  if (!saveable.value) {
    ElMessage.info(t("verse.view.sceneEditor.noPublishPermission"));
    return;
  }

  isPublishingVerse.value = true;
  try {
    await ElMessageBox.confirm(
      t("verse.view.sceneEditor.saveCurrentAndPublishConfirm"),
      t("verse.view.sceneEditor.publishScene"),
      {
        confirmButtonText: t("verse.view.sceneEditor.confirm"),
        cancelButtonText: t("verse.view.sceneEditor.cancel"),
        type: "warning",
      }
    );

    const published = await saveThenPublishScene(
      payload,
      (currentPayload) => saveVerseBeforeLeave(currentPayload, "manual", false),
      () =>
        takePhoto(
          id.value,
          createWriteOptions(getSceneServerModel()?.serverRevision)
        )
    );
    if (!published) return;

    ElMessage.success(t("verse.page.list.releaseConfirm.success"));
  } catch (error) {
    if (error === "cancel" || error === "close") {
      ElMessage.info(t("verse.view.sceneEditor.publishCanceled"));
    } else {
      logger.error("Failed to save and publish scene:", error);
      ElMessage.error(t("verse.view.sceneEditor.publishFailed"));
    }
  } finally {
    isPublishingVerse.value = false;
  }
};

// 处理来自编辑器的消息（标准协议：msg.type 路由）
const handleMessage = async (e: MessageEvent) => {
  if (e.source !== editor.value?.contentWindow) return;
  try {
    if (e.origin !== new URL(editor.value.src, window.location.href).origin)
      return;
  } catch {
    return;
  }
  webMcpRpc.handleMessage(e);
  const msg = e.data;
  if (!msg || typeof msg.type !== "string") return;

  const payload = (msg.payload ?? {}) as Record<string, unknown>;

  switch (msg.type) {
    case "PLUGIN_READY":
      if (!editorInitialization.acceptReady(payload)) break;
      webMcpRpc.cancel("编辑器文档已重新加载");
      webMcpLifecycle?.abort();
      registerPageWebMcpTools();
      hasUnsavedChangesBeforeUnload.value = false;
      if (isRestoringDraft.value && verse.value) {
        isRestoringDraft.value = false;
        pushVerseToEditor(verse.value);
        hasUnsavedChangesBeforeUnload.value = true;
      } else {
        await refresh();
      }
      break;

    case "RESPONSE": {
      const action = payload.action as string | undefined;
      const requestId =
        typeof msg.requestId === "string" ? msg.requestId : undefined;
      const requestResolver = requestId
        ? pendingRequests.get(requestId)
        : undefined;
      if (requestResolver) {
        requestResolver(payload);
      }

      if (action?.startsWith("webmcp-")) {
        break;
      }

      if (action === "save" && !payload.noChange) {
        // Original save-verse logic
        currentSaveTrigger = "manual";
        isSavingVersion.value = true;
        await saveVerse(payload, currentSaveTrigger);
        if (payload.verse) {
          const savedAt = addSceneDraftVersion(
            payload as VerseEditorPayload,
            currentSaveTrigger
          );
          pendingRestorePayload.value = null;
          lastSaveTrigger.value = currentSaveTrigger;
          lastSavedAt.value = savedAt || new Date().toISOString();
        }
        hasUnsavedChangesBeforeUnload.value = false;
        isSavingVersion.value = false;
        ElMessage.success(t("verse.view.sceneEditor.saveCompleted"));
      } else if (action === "save" && payload.noChange) {
        // Original save-verse-none logic
        if (hasUnconfirmedPersistence.value && !pendingRestorePayload.value) {
          isSavingVersion.value = false;
          resolveLeaveSave(false);
          ElMessage.error(
            "仍有未确认保存的修改，请先核对服务器版本；编辑器无新增修改不代表保存成功"
          );
          break;
        }
        if (pendingRestorePayload.value) {
          const restoredPayload = pendingRestorePayload.value;
          await saveVerse(restoredPayload, currentSaveTrigger);
          const savedAt = addSceneDraftVersion(
            restoredPayload,
            currentSaveTrigger
          );
          pendingRestorePayload.value = null;
          hasUnsavedChangesBeforeUnload.value = false;
          lastSaveTrigger.value = currentSaveTrigger;
          lastSavedAt.value = savedAt || new Date().toISOString();
          isSavingVersion.value = false;
          resolveLeaveSave(true);
        } else {
          lastSaveTrigger.value = currentSaveTrigger;
          lastSavedAt.value = new Date().toISOString();
          ElMessage.warning(t("verse.view.sceneEditor.noChanges"));
          hasUnsavedChangesBeforeUnload.value = false;
          isSavingVersion.value = false;
          resolveLeaveSave(true);
        }
      } else if (action === "save-before-leave" && !payload.noChange) {
        // Original save-verse-before-leave logic
        isSavingVersion.value = true;
        const result = await saveVerseBeforeLeave(payload, currentSaveTrigger);
        if (result && payload.verse) {
          const savedAt = addSceneDraftVersion(
            payload as VerseEditorPayload,
            currentSaveTrigger
          );
          pendingRestorePayload.value = null;
          lastSaveTrigger.value = currentSaveTrigger;
          lastSavedAt.value = savedAt || new Date().toISOString();
          hasUnsavedChangesBeforeUnload.value = false;
          if (currentSaveTrigger === "auto") {
            Message.success(t("common.scriptDraft.autoSavedNotice"));
          }
        }
        isSavingVersion.value = false;
        resolveLeaveSave(result);
      } else if (action === "save-before-leave" && payload.noChange) {
        // Original save-verse-before-leave-none logic
        if (hasUnconfirmedPersistence.value && !pendingRestorePayload.value) {
          isSavingVersion.value = false;
          resolveLeaveSave(false);
          ElMessage.error(
            "仍有未确认保存的修改，请先核对服务器版本；编辑器无新增修改不代表保存成功"
          );
          break;
        }
        if (pendingRestorePayload.value) {
          const restoredPayload = pendingRestorePayload.value;
          const result = await saveVerseBeforeLeave(
            restoredPayload,
            currentSaveTrigger
          );
          if (result) {
            const savedAt = addSceneDraftVersion(
              restoredPayload,
              currentSaveTrigger
            );
            pendingRestorePayload.value = null;
            hasUnsavedChangesBeforeUnload.value = false;
            lastSaveTrigger.value = currentSaveTrigger;
            lastSavedAt.value = savedAt || new Date().toISOString();
            if (currentSaveTrigger === "auto") {
              Message.success(t("common.scriptDraft.autoSavedNotice"));
            }
          }
          isSavingVersion.value = false;
          resolveLeaveSave(result);
        } else {
          lastSaveTrigger.value = currentSaveTrigger;
          lastSavedAt.value = new Date().toISOString();
          hasUnsavedChangesBeforeUnload.value = false;
          isSavingVersion.value = false;
          resolveLeaveSave(true);
        }
      } else if (action === "check-unsaved-changes") {
        // Match via msg.requestId against pendingRequests Map callback
        const resolver = pendingRequests.get(msg.requestId);
        if (resolver) {
          resolver(payload);
        } else {
          // Fallback: direct update of hasUnsavedChangesBeforeUnload
          hasUnsavedChangesBeforeUnload.value = pendingRestorePayload.value
            ? true
            : Boolean(payload.changed);
        }
      }
      break;
    }

    case "EVENT": {
      const event = payload.event as string | undefined;

      if (event === "edit-meta") {
        const metaId = toMetaId(payload.meta_id);
        if (metaId !== null) {
          const title = buildMetaSceneTitle(metaId, payload);
          router.push({
            path: "/meta/scene",
            query: { id: String(metaId), title },
          });
        }
      } else if (event === "setup-prefab") {
        if (isPrefabSetupPayload(payload)) {
          setupPrefab(payload);
        }
      } else if (event === "add-meta") {
        addMeta();
      } else if (event === "release-verse") {
        releaseVerse(payload);
      } else if (event === "goto") {
        if (payload.target === "blockly.js") {
          const scriptRoute = router
            .getRoutes()
            .find((route) => route.path === "/verse/script");

          if (scriptRoute && scriptRoute.meta.title) {
            const metaTitle = translateRouteTitle(scriptRoute.meta.title);

            router.push({
              path: "/verse/script",
              query: {
                id: id.value,
                title: metaTitle + title.value,
              },
            });
          }
        }
      } else if (event === "upload-cover") {
        handleUploadCover(payload);
      }
      break;
    }
  }
};

// 处理上传封面图片
const handleUploadCover = async (data: unknown) => {
  try {
    if (!isCoverUploadPayload(data)) {
      ElMessage.error(t("verse.view.sceneEditor.coverUploadError"));
      return;
    }

    // 将base64图片数据转换为Blob对象
    const imageData = data.imageData;
    const byteString = atob(imageData.split(",")[1]);
    const mimeType = imageData.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([ab], { type: mimeType });
    const extension = mimeType.split("/")[1];
    const fileName = `cover_verse_${id.value}_${Date.now()}.${extension}`;
    const file = new File([blob], fileName, { type: mimeType });

    // 处理文件上传
    const fileStore = useFileStore();
    const { postFile } = await import("@/api/v1/files");

    // 获取文件MD5和处理器
    const md5 = await fileStore.store.fileMD5(file);
    const handler = await fileStore.store.publicHandler();

    if (!handler) {
      ElMessage.error(t("verse.view.sceneEditor.handlerError"));
      return;
    }

    // 检查文件是否已存在
    const has = await fileStore.store.fileHas(
      md5,
      extension,
      handler,
      "backup"
    );

    // 如果文件不存在，上传文件
    if (!has) {
      await fileStore.store.fileUpload(
        md5,
        extension,
        file,
        (_progress: unknown) => {},
        handler,
        "backup"
      );
    }

    // 保存图片信息到服务器
    const fileData = {
      md5,
      key: md5 + `.${extension}`,
      filename: fileName,
      url: fileStore.store.fileUrl(md5, extension, handler, "backup"),
    };

    const response = await postFile(fileData);

    if (response && response.data) {
      // 更新Verse的image_id
      const verse = await getVerse(id.value);
      if (verse && verse.data) {
        verse.data.image_id = response.data.id;
        await putVerse(id.value, {
          image_id: response.data.id,
          name: verse.data.name,
          uuid: verse.data.uuid,
          description: verse.data.description ?? undefined,
        });
        ElMessage.success(t("verse.view.sceneEditor.coverUploadSuccess"));
        await refresh();
      }
    }
  } catch (error) {
    logger.error("上传封面图片失败:", error);
    ElMessage.error(t("verse.view.sceneEditor.coverUploadFailed"));
  }
};

watch(
  [id, src, editorFrameKey],
  () => {
    editorInitialization.reset();
    webMcpRpc.cancel("编辑器目标已改变");
    webMcpLifecycle?.abort();
    registerPageWebMcpTools();
  },
  { flush: "sync" }
);

watch(id, (nextId, previousId) => {
  if (!Number.isFinite(nextId) || nextId === previousId) return;
  webMcpRpc.cancel();
  webMcpLifecycle?.abort();
  unityPreview.close();
  verse.value = null;
  editorContentReady.value = false;
  pendingRestorePayload.value = null;
  isRestoringDraft.value = false;
  resetUnsavedState();
  verseMetasWithLuaCodeData.value = undefined;
  verseMetasWithJsCodeData.value = undefined;
  editorFrameKey.value += 1;
  loadSceneDraftState();
  restartAutoSaveTimer();
  registerPageWebMcpTools();
});

// 生命周期钩子
onMounted(() => {
  loadSceneDraftState();
  activateToolbar();
  restartAutoSaveTimer();
  window.addEventListener("message", handleMessage);
  window.addEventListener("beforeunload", handleBeforeUnload);
  void syncUnsavedChangesForBeforeUnload();
  unsavedCheckPollingTimer = window.setInterval(() => {
    void syncUnsavedChangesForBeforeUnload();
  }, 2000);

  registerPageWebMcpTools();
});

const startSceneRuntimePreview = async () => {
  const scene = verse.value;
  if (!scene || !Number.isFinite(scene.id)) {
    throw new Error("场景数据尚未加载完成");
  }
  if (!scene.viewable) {
    throw new Error("当前账号没有预览此场景的权限");
  }

  const liveState = await getLiveSceneState();
  const hasUnsavedChanges =
    liveState.changed ||
    hasUnsavedChangesBeforeUnload.value ||
    Boolean(pendingRestorePayload.value);
  hasUnsavedChangesBeforeUnload.value = hasUnsavedChanges;
  if (liveState.loading) {
    throw new Error("场景实体仍在加载，暂时不能启动运行预览");
  }
  if (hasUnsavedChanges) {
    throw new Error("运行预览读取已保存版本，请先保存当前场景修改");
  }
  const validation = validateScene(scene, liveState);
  if (!validation.valid) {
    throw new Error(`场景校验失败：${validation.errors.join("；")}`);
  }
  if (validation.moduleCount === 0) {
    throw new Error("空场景不能启动运行预览");
  }

  verseMetasWithLuaCodeData.value = undefined;
  verseMetasWithJsCodeData.value = undefined;
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

const registerPageWebMcpTools = () => {
  const ownerId = id.value;
  const ownerSession = getHostSessionId();
  let registration: AbortController | null = null;
  const assertActive = () => {
    if (
      registration?.signal.aborted ||
      ownerId !== id.value ||
      ownerSession !== getHostSessionId()
    ) {
      throw new Error("编辑器会话已经切换，请重新预览");
    }
  };
  const requestEditor = (...args: Parameters<typeof webMcpRpc.request>) => {
    assertActive();
    return webMcpRpc.request(...args);
  };
  const saveWebMcpSceneMutation = (
    ...args: Parameters<typeof persistWebMcpSceneMutation>
  ) => {
    try {
      assertActive();
    } catch {
      throw new WebMcpCompletionError(
        {
          status: "partial",
          editorApplied: true,
          persistence: "unverified",
          retry: "read_state_before_retry",
          ownerId,
          nodeId: args[0].nodeId,
          moduleId: args[0].moduleId,
        },
        "编辑器已应用修改，但会话已切换，请重新读取状态"
      );
    }
    return persistWebMcpSceneMutation(...args);
  };

  webMcpLifecycle?.abort();
  registration = webMcpLifecycle = registerSceneEditorWebMcpTools({
    readPublication: async () => {
      assertActive();
      return (await getScenePublication(ownerId)).data;
    },
    operations: {
      getScope: () => ({
        actorId: String(userStore.userInfo?.id ?? ""),
        targetType: "verse",
        targetId: id.value,
        serverRevision: verse.value?.serverRevision ?? "",
      }),
    },
    getContext: () => ({
      scene: verse.value,
      dirty:
        hasUnsavedChangesBeforeUnload.value ||
        Boolean(pendingRestorePayload.value),
      loading: verse.value === null,
      ready: editorContentReady.value,
    }),
    getLiveState: getLiveSceneState,
    searchEntities: async ({ query, page, pageSize }) => {
      const response = await getMetas(
        "-updated_at",
        query,
        page,
        "image,author,resources",
        "id,uuid,title,name,updated_at,image,events,resources,editable,viewable",
        pageSize
      );
      const totalHeader = response.headers?.["x-pagination-total-count"];
      const total = Number(totalHeader);
      return {
        items: response.data,
        page,
        pageSize,
        total: Number.isFinite(total) ? total : undefined,
      };
    },
    stageEntityPlacement: async ({ entityId, title, transform }) => {
      const scene = verse.value;
      if (!scene || !Number.isFinite(scene.id)) {
        throw new Error("场景数据尚未加载完成");
      }
      if (!scene.editable || !saveable.value) {
        throw new Error("当前账号没有修改此场景的权限");
      }

      const liveState = await getLiveSceneState();
      const hasUnsavedChanges =
        liveState.changed ||
        hasUnsavedChangesBeforeUnload.value ||
        Boolean(pendingRestorePayload.value);
      hasUnsavedChangesBeforeUnload.value = hasUnsavedChanges;
      if (liveState.loading) {
        throw new Error("场景实体仍在加载，请稍后重试");
      }
      if (hasUnsavedChanges) {
        throw new Error("当前场景存在未保存修改，请先保存后再创建放入预览");
      }
      if (!liveState.sceneVersion) {
        throw new Error("无法读取当前场景版本，请刷新编辑器后重试");
      }

      const entityResponse = await getMeta(entityId, {
        expand: "resources",
      });
      const entity = entityResponse.data;
      if (!entity || entity.viewable === false) {
        throw new Error("实体不存在或当前账号无权查看");
      }
      const entityTitle = entity.title || entity.name || `实体 ${entityId}`;
      const proposedTitle = uniqueSceneModuleTitle(
        title || entityTitle,
        liveState.verse
      );
      return {
        sceneId: scene.id,
        sceneVersion: liveState.sceneVersion,
        entityId: entity.id,
        entityUuid: entity.uuid,
        entityTitle,
        entityUpdatedAt: entity.updated_at,
        proposedTitle,
        transform,
        resourceCount: entity.resources?.length ?? 0,
        emptyEntity: countEntityRootNodes(entity.data) === 0,
      };
    },
    confirmEntityPlacement: async (preview) => {
      try {
        await ElMessageBox.confirm(
          formatEntityPlacementConfirmation(preview),
          "WebMCP",
          {
            confirmButtonText: t("common.entitySaveConfirm.confirm"),
            cancelButtonText: t("common.entitySaveConfirm.cancel"),
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
    completeEntityPlacement: async (preview) => {
      const scene = verse.value;
      if (!scene || scene.id !== preview.sceneId) {
        throw new Error("当前场景已经切换，请重新创建实体放入预览");
      }
      if (!scene.editable || !saveable.value) {
        throw new Error("当前账号没有修改此场景的权限");
      }

      const liveState = await getLiveSceneState();
      if (
        liveState.changed ||
        Boolean(pendingRestorePayload.value) ||
        liveState.sceneVersion !== preview.sceneVersion
      ) {
        throw new Error("场景在预览后已发生变化，请重新创建实体放入预览");
      }

      const entityResponse = await getMeta(preview.entityId, {
        expand: "resources",
      });
      const entity = entityResponse.data;
      if (!entity || entity.uuid !== preview.entityUuid) {
        throw new Error("实体不存在或标识已经变化，请重新预览");
      }
      if (
        preview.entityUpdatedAt &&
        entity.updated_at &&
        preview.entityUpdatedAt !== entity.updated_at
      ) {
        throw new Error("实体在预览后已被更新，请重新预览");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor(
          "webmcp-complete-scene-entity-placement",
          {
            expectedSceneVersion: preview.sceneVersion,
            operationId: preview.operationId,
            entity,
            title: preview.proposedTitle,
            transform: preview.transform as SceneModuleTransform,
          },
          120000
        )
      );
      const persistence = await saveWebMcpSceneMutation(
        response,
        {
          success: "实体已放入场景并保存，场景尚未发布",
          failure: "实体实例已放入编辑器",
        },
        preview
      );
      // Validation must include the entity just placed, before the next reload.
      if (verse.value?.id === preview.sceneId) {
        verse.value.metas = [
          ...(verse.value.metas ?? []).filter((item) => item.id !== entity.id),
          entity,
        ];
      }
      return {
        ...persistence,
        moduleId: String(response.moduleId),
        moduleTitle: String(response.moduleTitle || preview.proposedTitle),
        entityId: Number(response.entityId),
        transform: response.transform as SceneModuleTransform,
      };
    },
    stageModuleTransform: async (moduleId, transform) => {
      const scene = verse.value;
      if (!scene || !Number.isFinite(scene.id)) {
        throw new Error("场景数据尚未加载完成");
      }
      if (!scene.editable || !saveable.value) {
        throw new Error("当前账号没有修改此场景的权限");
      }

      const liveState = await getLiveSceneState();
      const hasUnsavedChanges =
        liveState.changed ||
        hasUnsavedChangesBeforeUnload.value ||
        Boolean(pendingRestorePayload.value);
      hasUnsavedChangesBeforeUnload.value = hasUnsavedChanges;
      if (liveState.loading) {
        throw new Error("场景实体仍在加载，请稍后重试");
      }
      if (hasUnsavedChanges) {
        throw new Error("当前场景存在未保存修改，请先保存后再创建变换预览");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor("webmcp-stage-scene-module-transform", {
          moduleId,
          transform: transform as SceneModuleTransformPatch,
        })
      );
      const sceneVersion = String(response.sceneVersion || "");
      if (!sceneVersion || sceneVersion !== liveState.sceneVersion) {
        throw new Error("场景在读取变换时发生变化，请重新预览");
      }
      return {
        sceneId: scene.id,
        sceneVersion,
        moduleId: String(response.moduleId),
        moduleTitle: String(response.moduleTitle || "未命名实体实例"),
        current: response.current as SceneModuleTransformSnapshot,
        proposed: response.proposed as SceneModuleTransformSnapshot,
        changed: Boolean(response.changed),
      };
    },
    confirmModuleTransform: async (preview) => {
      try {
        await ElMessageBox.confirm(
          formatSceneModuleTransformConfirmation(preview),
          "WebMCP",
          {
            confirmButtonText: t("common.entitySaveConfirm.confirm"),
            cancelButtonText: t("common.entitySaveConfirm.cancel"),
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
    completeModuleTransform: async (preview) => {
      const scene = verse.value;
      if (!scene || scene.id !== preview.sceneId) {
        throw new Error("当前场景已经切换，请重新创建实例变换预览");
      }
      if (!scene.editable || !saveable.value) {
        throw new Error("当前账号没有修改此场景的权限");
      }

      const liveState = await getLiveSceneState();
      if (
        liveState.changed ||
        Boolean(pendingRestorePayload.value) ||
        liveState.sceneVersion !== preview.sceneVersion
      ) {
        throw new Error("场景在预览后已发生变化，请重新创建实例变换预览");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor("webmcp-complete-scene-module-transform", {
          expectedSceneVersion: preview.sceneVersion,
          moduleId: preview.moduleId,
          expectedCurrent: preview.current,
          proposed: preview.proposed,
        })
      );
      const persistence = await saveWebMcpSceneMutation(
        response,
        {
          success: "实体实例变换已保存，场景尚未发布",
          failure: "实体实例变换已应用到编辑器",
        },
        preview
      );
      return {
        ...persistence,
        moduleId: String(response.moduleId),
        moduleTitle: String(response.moduleTitle || preview.moduleTitle),
        transform: response.transform as SceneModuleTransformSnapshot,
        noChange: Boolean(response.noChange),
      };
    },
    stageModuleProperties: async (moduleId, properties) => {
      const scene = verse.value;
      if (!scene || !Number.isFinite(scene.id)) {
        throw new Error("场景数据尚未加载完成");
      }
      if (!scene.editable || !saveable.value) {
        throw new Error("当前账号没有修改此场景的权限");
      }

      const liveState = await getLiveSceneState();
      const hasUnsavedChanges =
        liveState.changed ||
        hasUnsavedChangesBeforeUnload.value ||
        Boolean(pendingRestorePayload.value);
      hasUnsavedChangesBeforeUnload.value = hasUnsavedChanges;
      if (liveState.loading) {
        throw new Error("场景实体仍在加载，请稍后重试");
      }
      if (hasUnsavedChanges) {
        throw new Error("当前场景存在未保存修改，请先保存后再创建属性预览");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor("webmcp-stage-scene-module-properties", {
          moduleId,
          properties: properties as SceneModulePropertyPatch,
        })
      );
      const sceneVersion = String(response.sceneVersion || "");
      if (!sceneVersion || sceneVersion !== liveState.sceneVersion) {
        throw new Error("场景在读取实例属性时发生变化，请重新预览");
      }
      return {
        sceneId: scene.id,
        sceneVersion,
        moduleId: String(response.moduleId),
        moduleTitle: String(response.moduleTitle || "未命名实体实例"),
        current: response.current as SceneModulePropertySnapshot,
        proposed: response.proposed as SceneModulePropertySnapshot,
        changed: Boolean(response.changed),
      };
    },
    confirmModuleProperties: async (preview) => {
      try {
        await ElMessageBox.confirm(
          formatSceneModulePropertyConfirmation(preview),
          "WebMCP",
          {
            confirmButtonText: t("common.entitySaveConfirm.confirm"),
            cancelButtonText: t("common.entitySaveConfirm.cancel"),
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
    completeModuleProperties: async (preview) => {
      const scene = verse.value;
      if (!scene || scene.id !== preview.sceneId) {
        throw new Error("当前场景已经切换，请重新创建实例属性预览");
      }
      if (!scene.editable || !saveable.value) {
        throw new Error("当前账号没有修改此场景的权限");
      }

      const liveState = await getLiveSceneState();
      if (
        liveState.changed ||
        Boolean(pendingRestorePayload.value) ||
        liveState.sceneVersion !== preview.sceneVersion
      ) {
        throw new Error("场景在预览后已发生变化，请重新创建实例属性预览");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor("webmcp-complete-scene-module-properties", {
          expectedSceneVersion: preview.sceneVersion,
          moduleId: preview.moduleId,
          expectedCurrent: preview.current,
          proposed: preview.proposed,
        })
      );
      const persistence = await saveWebMcpSceneMutation(
        response,
        {
          success: "实体实例属性已保存，场景尚未发布",
          failure: "实体实例属性已应用到编辑器",
        },
        preview
      );
      return {
        ...persistence,
        moduleId: String(response.moduleId),
        moduleTitle: String(response.moduleTitle || preview.proposed.title),
        properties: response.properties as SceneModulePropertySnapshot,
        noChange: Boolean(response.noChange),
      };
    },
    stageModuleDeletion: async (moduleId) => {
      const scene = verse.value;
      if (!scene || !Number.isFinite(scene.id)) {
        throw new Error("场景数据尚未加载完成");
      }
      if (!scene.editable || !saveable.value) {
        throw new Error("当前账号没有修改此场景的权限");
      }

      const liveState = await getLiveSceneState();
      const hasUnsavedChanges =
        liveState.changed ||
        hasUnsavedChangesBeforeUnload.value ||
        Boolean(pendingRestorePayload.value);
      hasUnsavedChangesBeforeUnload.value = hasUnsavedChanges;
      if (liveState.loading) {
        throw new Error("场景实体仍在加载，请稍后重试");
      }
      if (hasUnsavedChanges) {
        throw new Error("当前场景存在未保存修改，请先保存后再创建删除预览");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor("webmcp-stage-scene-module-deletion", {
          moduleId,
        })
      );
      const sceneVersion = String(response.sceneVersion || "");
      if (!sceneVersion || sceneVersion !== liveState.sceneVersion) {
        throw new Error("场景在读取实例删除范围时发生变化，请重新预览");
      }
      const entityId = Number(response.entityId);
      return {
        sceneId: scene.id,
        sceneVersion,
        moduleId: String(response.moduleId),
        moduleTitle: String(response.moduleTitle || "未命名实体实例"),
        entityId:
          Number.isSafeInteger(entityId) && entityId > 0 ? entityId : null,
        visible: Boolean(response.visible),
        descendantCount: Number(response.descendantCount) || 0,
      };
    },
    confirmModuleDeletion: async (preview) => {
      try {
        await ElMessageBox.confirm(
          formatSceneModuleDeletionConfirmation(preview),
          "WebMCP 删除确认",
          {
            confirmButtonText: t("common.delete"),
            cancelButtonText: t("common.entitySaveConfirm.cancel"),
            distinguishCancelAndClose: true,
            closeOnClickModal: false,
            closeOnPressEscape: true,
            showCancelButton: true,
            type: "warning",
            customClass: "script-save-confirm-box",
          }
        );
        return true;
      } catch {
        return false;
      }
    },
    completeModuleDeletion: async (preview) => {
      const scene = verse.value;
      if (!scene || scene.id !== preview.sceneId) {
        throw new Error("当前场景已经切换，请重新创建实例删除预览");
      }
      if (!scene.editable || !saveable.value) {
        throw new Error("当前账号没有修改此场景的权限");
      }

      const liveState = await getLiveSceneState();
      if (
        liveState.changed ||
        Boolean(pendingRestorePayload.value) ||
        liveState.sceneVersion !== preview.sceneVersion
      ) {
        throw new Error("场景在预览后已发生变化，请重新创建实例删除预览");
      }

      const response = requireSuccessfulEditorResponse(
        await requestEditor("webmcp-complete-scene-module-deletion", {
          expectedSceneVersion: preview.sceneVersion,
          moduleId: preview.moduleId,
          expected: {
            moduleTitle: preview.moduleTitle,
            entityId: preview.entityId,
            visible: preview.visible,
            descendantCount: preview.descendantCount,
          },
        })
      );
      const persistence = await saveWebMcpSceneMutation(
        response,
        {
          success: "实体实例已删除并保存，场景尚未发布",
          failure: "实体实例已从编辑器删除",
        },
        preview
      );
      const entityId = Number(response.entityId);
      return {
        ...persistence,
        moduleId: String(response.moduleId),
        moduleTitle: String(response.moduleTitle || preview.moduleTitle),
        entityId:
          Number.isSafeInteger(entityId) && entityId > 0 ? entityId : null,
        removedObjectCount: Number(response.removedObjectCount) || 1,
      };
    },
    stageScenePublication: async () => {
      const scene = verse.value;
      if (!scene || !Number.isFinite(scene.id)) {
        throw new Error("场景数据尚未加载完成");
      }
      if (!scene.editable || !saveable.value) {
        throw new Error("当前账号没有发布此场景的权限");
      }

      const liveState = await getLiveSceneState();
      const hasUnsavedChanges =
        liveState.changed ||
        hasUnsavedChangesBeforeUnload.value ||
        Boolean(pendingRestorePayload.value);
      hasUnsavedChangesBeforeUnload.value = hasUnsavedChanges;
      if (liveState.loading) {
        throw new Error("场景实体仍在加载，暂时不能发布");
      }
      if (hasUnsavedChanges) {
        throw new Error("当前场景存在未保存修改，请先保存后再发布");
      }
      if (!liveState.sceneVersion) {
        throw new Error("无法读取当前场景版本，请刷新编辑器后重试");
      }

      const validation = validateScene(scene, liveState);
      if (!validation.valid) {
        throw new Error(`场景校验失败：${validation.errors.join("；")}`);
      }
      if (validation.moduleCount === 0) {
        throw new Error("空场景不能发布，请先放入至少一个实体");
      }
      await checkPublicationResources();
      return {
        sceneId: scene.id,
        sceneVersion: liveState.sceneVersion,
        sceneName: scene.name || "未命名场景",
        moduleCount: validation.moduleCount,
        warningCount: validation.warnings.length,
        warnings: validation.warnings.slice(0, 8),
        alreadyPublished: (await getScenePublication(scene.id)).data.published,
      };
    },
    confirmScenePublication: async (preview) => {
      try {
        await ElMessageBox.confirm(
          formatScenePublicationConfirmation(preview),
          "WebMCP 发布确认",
          {
            confirmButtonText: t("verse.page.list.releaseConfirm.confirm"),
            cancelButtonText: t("verse.page.list.releaseConfirm.cancel"),
            distinguishCancelAndClose: true,
            closeOnClickModal: false,
            closeOnPressEscape: true,
            showCancelButton: true,
            type: "warning",
            customClass: "script-save-confirm-box",
          }
        );
        return true;
      } catch {
        return false;
      }
    },
    completeScenePublication: async (preview) => {
      const scene = verse.value;
      if (!scene || scene.id !== preview.sceneId) {
        throw new Error("当前场景已经切换，请重新执行发布前检查");
      }
      if (!scene.editable || !saveable.value) {
        throw new Error("当前账号没有发布此场景的权限");
      }

      const liveState = await getLiveSceneState();
      if (
        liveState.loading ||
        liveState.changed ||
        hasUnsavedChangesBeforeUnload.value ||
        Boolean(pendingRestorePayload.value) ||
        liveState.sceneVersion !== preview.sceneVersion
      ) {
        throw new Error("场景在发布预览后发生了变化，请重新执行发布前检查");
      }
      const validation = validateScene(scene, liveState);
      if (!validation.valid || validation.moduleCount === 0) {
        throw new Error(
          validation.errors.length > 0
            ? `场景校验失败：${validation.errors.join("；")}`
            : "空场景不能发布"
        );
      }

      const readiness = await checkPublicationResources();
      if (
        readiness.sceneId !== preview.sceneId ||
        readiness.sceneVersion !== preview.sceneVersion
      ) {
        throw new Error("资源检查期间场景发生变化，请重新执行发布前检查");
      }
      assertActive();
      const snapshotResponse = await takePhoto(
        scene.id,
        writeOptionsForPreview(preview, scene.serverRevision)
      );
      const snapshot = isRecord(snapshotResponse.data)
        ? snapshotResponse.data
        : {};
      const result = await readBackScenePublication({
        sceneId: scene.id,
        snapshot,
        refresh: () => getVerse(scene.id, VERSE_SCENE_EXPAND),
        apply: (response) => {
          if (verse.value?.id === scene.id) verse.value = response.data;
        },
      });
      ElMessage.success(t("verse.page.list.releaseConfirm.success"));
      return result;
    },
    readEntityForReadiness: async (entityId) =>
      (await getMeta(entityId, { expand: "resources,metaCode" })).data,
    validateForReadiness: async () =>
      validateScene(verse.value, await getLiveSceneState()),
    getPreviewStatus: getSceneRuntimePreviewStatus,
    startPreview: startSceneRuntimePreview,
    stopPreview: async () => {
      await unityPreview.close();
      return getSceneRuntimePreviewStatus();
    },
    onRegistrationError: (toolName, error) => {
      logger.warn(`WebMCP tool registration failed: ${toolName}`, error);
    },
  });
};

onActivated(() => {
  activateToolbar();
  registerPageWebMcpTools();
});
onDeactivated(() => {
  unregisterToolbar(toolbarOwner);
  webMcpLifecycle?.abort();
  webMcpRpc.cancel();
});

onBeforeRouteLeave(async (_to, _from, next) => {
  const canLeave = await resolveUnsavedBeforeLeave();
  if (canLeave) await unityPreview.close();
  next(canLeave);
});
onBeforeRouteUpdate(async (to, from) => {
  if (to.query.id !== from.query.id) await unityPreview.close();
});

watch(toolbarStatus, (status) => {
  updateToolbarStatus(toolbarOwner, status);
});

watch([autoSaveEnabled, autoSaveIntervalSeconds], () => {
  persistSceneDraftSettings();
  restartAutoSaveTimer();
});

watch(
  () => settingsStore.theme,
  (newTheme) => {
    postStandardMessage("THEME_CHANGE", {
      theme: newTheme === ThemeEnum.DARK ? "dark" : "light",
      dark: newTheme === ThemeEnum.DARK,
    });
  }
);

onBeforeUnmount(() => {
  editorInitialization.reset();
  webMcpLifecycle?.abort();
  webMcpLifecycle = null;
  webMcpRpc.cancel();
  editorContentReady.value = false;
  postStandardMessage("DESTROY");
  unregisterToolbar(toolbarOwner);
  clearAutoSaveTimer();
  window.removeEventListener("message", handleMessage);
  window.removeEventListener("beforeunload", handleBeforeUnload);
  if (unsavedCheckPollingTimer !== null) {
    window.clearInterval(unsavedCheckPollingTimer);
    unsavedCheckPollingTimer = null;
  }
  pendingRequests.clear();
  cleanupPendingResolver();
});
</script>

<style lang="scss" scoped>
.verse-scene {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
  overflow: hidden;

  :deep(.el-container) {
    flex: 1 1 auto;
    min-height: 0;
  }

  :deep(.el-main) {
    position: relative;
  }
}

.content {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--bg-card, #fff);
  border: 0;
  outline: none;
}
</style>

<style lang="scss">
/* 隐藏当前页面的 footer */
.main-container:has(.verse-scene) > footer {
  display: none !important;
}
</style>
