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
  </div>
</template>

<script setup lang="ts">
import { logger } from "@/utils/logger";
import { takePhoto } from "@/api/v1/verse";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
//import PrefabDialog from "@/components/MrPP/PrefabDialog.vue";
import MetaDialog from "@/components/MrPP/MetaDialog.vue";
import KnightDataDialog from "@/components/MrPP/KnightDataDialog.vue";
import ScriptDraftDialog from "@/components/ScriptDraftDialog.vue";
import { Message } from "@/components/Dialog";
import { putVerse, getVerse, VerseData } from "@/api/v1/verse";
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
import { useIframeMessaging } from "@/composables/useIframeMessaging";
import { useSceneSaveGuard } from "@/composables/useSceneSaveGuard";

// 组件状态
const userStore = useUserStore();
const appStore = useAppStore();
const settingsStore = useSettingsStore();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const editor = ref<HTMLIFrameElement>();
import qs from "querystringify";
let init = false;
const saveable = ref(false);
let unsavedCheckPollingTimer: number | null = null;
const editorFrameKey = ref(0);
const isRestoringDraft = ref(false);
const versionDialogVisible = ref(false);
const draftVersions = ref<ScriptDraftVersion[]>([]);
const autoSaveEnabled = ref(true);
const DEFAULT_AUTO_SAVE_INTERVAL_SECONDS = 300;
const DRAFT_SETTINGS_VERSION = 2;
const autoSaveIntervalSeconds = ref(DEFAULT_AUTO_SAVE_INTERVAL_SECONDS);
const isSavingVersion = ref(false);
const lastSaveTrigger = ref<ScriptSaveTrigger | null>(null);
const lastSavedAt = ref<string | null>(null);
const pendingRestorePayload = ref<VerseEditorPayload | null>(null);
let currentSaveTrigger: ScriptSaveTrigger = "manual";
let autoSaveTimer: number | null = null;

const toolbarOwner = "verse-scene-editor";
const { registerToolbar, updateToolbarStatus, unregisterToolbar } =
  useEditorVersionToolbar();
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

// 监听语言变化
watch(
  () => appStore.language,
  async () => {
    await refresh();
  }
);
const verse = ref<VerseData | null>(null);
const pushVerseToEditor = (nextVerse: VerseData) => {
  postStandardMessage("INIT", {
    token: null,
    config: {
      id: id.value,
      data: nextVerse,
      saveable: saveable.value,
      user: {
        id: userStore.userInfo?.id || null,
        role: userStore.getRole(),
      },
    },
  });
};

// 刷新场景数据
const refresh = async () => {
  const response = await getVerse(id.value, "metas, resources");
  verse.value = response.data;
  saveable.value = verse.value ? verse.value.editable : false;
  if (verse.value) {
    pushVerseToEditor(verse.value);
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
  data: unknown;
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
  editorFrameKey.value += 1;
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

const isUnsavedChangesResultPayload = (
  value: unknown
): value is UnsavedChangesResultPayload =>
  isRecord(value) &&
  typeof value.requestId === "string" &&
  typeof value.changed === "boolean";

// 消息发送基础设施
const { postStandardMessage, sendRequest, pendingRequests } = useIframeMessaging(
  editor,
  { onError: () => ElMessage.error(t("verse.view.sceneEditor.error1")) }
);

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
  onBeforeSave: (trigger) => { currentSaveTrigger = trigger; },
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
  await putVerse(id.value, { data: verse as unknown as JsonValue });
  if (verse.value) {
    verse.value = {
      ...verse.value,
      data: safeClone(verse),
    };
  }

  if (trigger === "manual") {
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
        await takePhoto(id.value);
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
  trigger: ScriptSaveTrigger = currentSaveTrigger
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
    await putVerse(id.value, { data: verse as unknown as JsonValue });
    if (verse.value) {
      verse.value = {
        ...verse.value,
        data: safeClone(verse),
      };
    }
    if (trigger === "manual") {
      ElMessage.success(t("verse.view.sceneEditor.saveCompleted"));
    }
    return true;
  } catch {
    ElMessage.error(t("verse.view.sceneEditor.error1"));
    return false;
  }
};

//发布场景
const releaseVerse = async (data: unknown) => {
  const payload = data as VerseEditorPayload;
  if (!payload.verse) {
    ElMessage.error(t("verse.view.sceneEditor.noProjectToPublish"));
    return;
  }

  if (!saveable.value) {
    ElMessage.info(t("verse.view.sceneEditor.noPublishPermission"));
    return;
  }

  try {
    await ElMessageBox.confirm(
      t("verse.page.list.releaseConfirm.message1"),
      t("verse.page.list.releaseConfirm.message2"),
      {
        confirmButtonText: t("verse.page.list.releaseConfirm.confirm"),
        cancelButtonText: t("verse.page.list.releaseConfirm.cancel"),
        type: "warning",
      }
    );

    await takePhoto(id.value);

    ElMessage.success(t("verse.page.list.releaseConfirm.success"));
  } catch {
    ElMessage.info(t("verse.page.list.releaseConfirm.info"));
  }
};

// 处理来自编辑器的消息（标准协议：msg.type 路由）
const handleMessage = async (e: MessageEvent) => {
  const msg = e.data;
  if (!msg || typeof msg.type !== "string") return;

  const payload = (msg.payload ?? {}) as Record<string, unknown>;

  switch (msg.type) {
    case "PLUGIN_READY":
      hasUnsavedChangesBeforeUnload.value = false;
      if (isRestoringDraft.value && verse.value) {
        isRestoringDraft.value = false;
        pushVerseToEditor(verse.value);
        hasUnsavedChangesBeforeUnload.value = true;
      } else if (!init) {
        init = true;
        refresh();
      }
      break;

    case "RESPONSE": {
      const action = payload.action as string | undefined;

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

// 生命周期钩子
onMounted(() => {
  loadSceneDraftState();
  registerToolbar(toolbarOwner, {
    status: toolbarStatus.value,
    onOpen: openVersionDialog,
  });
  restartAutoSaveTimer();
  window.addEventListener("message", handleMessage);
  window.addEventListener("beforeunload", handleBeforeUnload);
  void syncUnsavedChangesForBeforeUnload();
  unsavedCheckPollingTimer = window.setInterval(() => {
    void syncUnsavedChangesForBeforeUnload();
  }, 2000);
});

onBeforeRouteLeave(async (_to, _from, next) => {
  const canLeave = await resolveUnsavedBeforeLeave();
  next(canLeave);
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
