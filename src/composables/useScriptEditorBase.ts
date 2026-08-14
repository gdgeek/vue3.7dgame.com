/**
 * 共享编辑器基础 composable，供 meta/script.vue 和 verse/script.vue 共用。
 * 包含所有与领域无关的状态管理、消息通信、全屏控制、代码格式化、
 * 未保存变更守卫等逻辑。
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { useI18n } from "vue-i18n";
import pako from "pako";
import jsBeautify from "js-beautify";
import { useSettingsStore } from "@/store/modules/settings";
import { useAppStore } from "@/store/modules/app";
// useUserStore removed — callers now pass userInfo via initEditor
import { ThemeEnum } from "@/enums/ThemeEnum";
import { ElMessageBox } from "element-plus";
import { Message } from "@/components/Dialog";
import { logger } from "@/utils/logger";
import { safeAtob } from "@/utils/base64";
import env from "@/environment";
import a11yDarkStyleUrl from "highlight.js/styles/a11y-dark.css?url";
import a11yLightStyleUrl from "highlight.js/styles/a11y-light.css?url";

// ---------- 共享类型 ----------

export type EditorPostPayload = {
  data: unknown;
  lua: string;
  js: string;
};

type EditorSaveResponsePayload = EditorPostPayload & {
  saveId?: unknown;
  warnings?: unknown;
};

export type EditorUpdatePayload = {
  lua: string;
  js: string;
  blocklyData: unknown;
  dirty?: boolean;
  workspaceRevision?: number;
};

export type ScriptEditorSavedSnapshot = {
  lua: string;
  js: string;
  blocklyData: unknown;
};

export type ScriptEditorInitState = {
  data: unknown;
  code: { lua: string; js: string };
  persisted: {
    data: unknown;
    code: { lua: string; js: string };
  };
  hostSessionId: string;
};

export type EditorEventPayload = {
  action?: string;
  data?: unknown;
};

export type ScriptSaveTrigger = "manual" | "auto";

export type ScriptDraftVersion = {
  id: string;
  savedAt: string;
  trigger: ScriptSaveTrigger;
  summary: string;
  summaryI18nKey?: string;
  summaryI18nParams?: Record<string, string>;
  blocklyData: unknown;
  lua: string;
  js: string;
};

/** 两个页面中需要区分的 i18n 键 */
export type ScriptEditorI18nKeys = {
  error1: string;
  error3: string;
  info: string;
  leaveMessage1: string;
  leaveMessage2: string;
  leaveConfirm: string;
  leaveCancel: string;
  leaveError: string;
  leaveInfo: string;
};

export type UseScriptEditorBaseOptions = {
  /** Lua 前缀变量名，"meta" 或 "verse" */
  luaLocalVar: string;
  /** i18n 键映射 */
  i18nKeys: ScriptEditorI18nKeys;
  /** 保存到服务端的回调（meta/verse 各自实现） */
  onPost: (
    data: EditorPostPayload,
    context: { trigger: ScriptSaveTrigger }
  ) => Promise<void>;
  /**
   * 编辑器就绪 / 语言切换时的回调（meta/verse 各自实现 initEditor）。
   * initEditor 内部应自行检查 data 是否已加载。
   */
  onReady: () => void;
  /** 草稿存储 key（按脚本区分） */
  getDraftStorageKey?: () => string | null;
  /** 当前脚本是否允许保存 */
  canSave?: () => boolean;
  /** 回滚到历史版本时，由页面负责重新初始化 iframe */
  onRestoreDraft?: (blocklyData: unknown) => void;
};

type ResolveUnsavedChangesOptions = {
  showDiscardInfo?: boolean;
};

export type SaveRequestOptions = {
  suppressNoChangeInfo?: boolean;
};

const DEFAULT_AUTO_SAVE_INTERVAL_SECONDS = 300;
const DRAFT_SETTINGS_VERSION = 2;
const SAVE_WARNING_PREVIEW_LENGTH = 160;
const SAVE_NOT_ALLOWED_ERROR = "current script cannot be saved";
const SNAPSHOT_CHANGED_ERROR = "script changed while save was pending";

// ---------- composable 主体 ----------

export function useScriptEditorBase(options: UseScriptEditorBaseOptions) {
  const { t } = useI18n();
  const settingsStore = useSettingsStore();
  const appStore = useAppStore();

  // ---- 状态 ----
  const activeName = ref<string>("blockly");
  const languageName = ref<string>("lua");
  const LuaCode = ref("");
  const JavaScriptCode = ref("");
  const isFullscreen = ref(false);
  const showCodeDialog = ref(false);
  const currentCode = ref("");
  const currentCodeType = ref("");
  const codeDialogTitle = ref("");
  const unsavedBlocklyData = ref<unknown>(null);
  const hasUnsavedChanges = ref<boolean>(false);
  const draftVersions = ref<ScriptDraftVersion[]>([]);
  const versionDialogVisible = ref(false);
  const autoSaveEnabled = ref(true);
  const autoSaveIntervalSeconds = ref(DEFAULT_AUTO_SAVE_INTERVAL_SECONDS);
  const isSaving = ref(false);
  const lastSaveTrigger = ref<ScriptSaveTrigger | null>(null);
  const lastSavedAt = ref<string | null>(null);
  const editorFrameKey = ref(0);
  const editor = ref<HTMLIFrameElement | null>(null);
  let hostSessionId = genSessionId();
  const src = ref(buildEditorSrc(appStore.language));
  const editorContentReady = ref(false);
  const isDark = computed<boolean>(
    () => settingsStore.theme === ThemeEnum.DARK
  );

  let ready = false;
  let saveResolve: (() => void) | null = null;
  let saveReject: ((reason?: unknown) => void) | null = null;
  let saveTimer: number | null = null;
  let currentSaveTrigger: ScriptSaveTrigger = "manual";
  let currentSaveOptions: SaveRequestOptions = {};
  let hasInitializedSavedSnapshot = false;
  let initializedSavedSnapshotKey: string | null = null;
  let lastSavedSignature = "";
  let latestEditorSignature = "";
  let latestEditorPayload: ScriptEditorSavedSnapshot | null = null;
  let snapshotRevision = 0;
  let pendingSavePromise: Promise<void> | null = null;
  let pendingSaveSnapshotRevision: number | null = null;
  let pendingSaveRequestId: string | null = null;
  let pendingSaveEditorSignature = "";
  let pendingSaveEditorPayload: ScriptEditorSavedSnapshot | null = null;
  let legacyDirectSaveInFlight = false;
  let persistenceInFlight = false;
  let pendingRestorePayload: EditorPostPayload | null = null;
  let savedSnapshotPayload: ScriptEditorSavedSnapshot | null = null;
  let latestWorkspaceRevision = -1;
  let sessionProtocolConfirmed = false;

  const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  function genSessionId() {
    return `script-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  function buildEditorSrc(language: string) {
    return (
      env.blockly +
      "?language=" +
      encodeURIComponent(language) +
      "&v=" +
      encodeURIComponent(env.buildVersion) +
      "&hostSessionId=" +
      encodeURIComponent(hostSessionId)
    );
  }

  const canSaveCurrentScript = () =>
    typeof options.canSave === "function" ? options.canSave() : true;

  const persistEditorPayload = async (
    data: EditorPostPayload,
    trigger: ScriptSaveTrigger
  ) => {
    if (persistenceInFlight) {
      throw new Error("script persistence is already in progress");
    }
    persistenceInFlight = true;
    try {
      await options.onPost(data, { trigger });
    } finally {
      persistenceInFlight = false;
    }
  };

  const getDraftStorageKey = () => options.getDraftStorageKey?.() || null;

  const getDraftSettingsKey = () => {
    const key = getDraftStorageKey();
    return key ? `${key}:settings` : null;
  };

  const safeStringify = (value: unknown) => {
    try {
      return JSON.stringify(value ?? null, (_key, currentValue) => {
        if (
          currentValue &&
          typeof currentValue === "object" &&
          !Array.isArray(currentValue)
        ) {
          return Object.keys(currentValue)
            .sort()
            .reduce<Record<string, unknown>>((sorted, key) => {
              sorted[key] = (currentValue as Record<string, unknown>)[key];
              return sorted;
            }, {});
        }
        return currentValue;
      });
    } catch {
      return "null";
    }
  };

  const buildSnapshotSignature = (payload: {
    lua: string;
    js: string;
    blocklyData: unknown;
  }) => safeStringify(payload);

  const buildRuntimeLua = (lua: string) =>
    `local ${options.luaLocalVar} = {}\nlocal index = ''\n${lua}`;

  const clearPendingSaveSession = (reason?: Error) => {
    const pendingPromise = pendingSavePromise;
    const reject = saveReject;

    saveResolve = null;
    saveReject = null;
    pendingSavePromise = null;
    pendingSaveSnapshotRevision = null;
    pendingSaveRequestId = null;
    pendingSaveEditorSignature = "";
    pendingSaveEditorPayload = null;
    if (!persistenceInFlight) {
      legacyDirectSaveInFlight = false;
    }
    isSaving.value = false;

    if (reason && reject) {
      // Keep route/key changes from producing an unhandled rejection while still
      // letting callers awaiting the original save observe the cancellation.
      void pendingPromise?.catch(() => undefined);
      reject(reason);
    }
  };

  const applyEditorCodes = (payload: EditorUpdatePayload) => {
    const clonedBlocklyData = safeClone(payload.blocklyData);
    unsavedBlocklyData.value = clonedBlocklyData;
    LuaCode.value = buildRuntimeLua(payload.lua);
    JavaScriptCode.value = formatJavaScript(payload.js);
    const nextSignature = buildSnapshotSignature({
      lua: payload.lua,
      js: payload.js,
      blocklyData: payload.blocklyData,
    });
    latestEditorSignature = nextSignature;
    latestEditorPayload = {
      lua: payload.lua,
      js: payload.js,
      blocklyData: clonedBlocklyData,
    };
    hasUnsavedChanges.value =
      typeof payload.dirty === "boolean"
        ? payload.dirty
        : nextSignature !== lastSavedSignature;
  };

  const markCurrentPayloadAsSaved = (payload: {
    lua: string;
    js: string;
    blocklyData: unknown;
  }) => {
    lastSavedSignature = buildSnapshotSignature(payload);
    savedSnapshotPayload = {
      lua: payload.lua,
      js: payload.js,
      blocklyData: safeClone(payload.blocklyData),
    };
    if (!latestEditorSignature) {
      latestEditorSignature = lastSavedSignature;
    }
    hasInitializedSavedSnapshot = true;
    hasUnsavedChanges.value = latestEditorSignature !== lastSavedSignature;
  };

  const resetEditorSessionState = (payload: ScriptEditorSavedSnapshot) => {
    snapshotRevision += 1;
    clearPendingSaveSession(new Error(SNAPSHOT_CHANGED_ERROR));
    pendingRestorePayload = null;
    unsavedBlocklyData.value = null;
    LuaCode.value = "";
    JavaScriptCode.value = "";
    editorContentReady.value = false;
    latestWorkspaceRevision = -1;
    sessionProtocolConfirmed = false;
    hostSessionId = genSessionId();
    lastSavedSignature = buildSnapshotSignature(payload);
    latestEditorSignature = lastSavedSignature;
    latestEditorPayload = {
      lua: payload.lua,
      js: payload.js,
      blocklyData: safeClone(payload.blocklyData),
    };
    hasInitializedSavedSnapshot = true;
    hasUnsavedChanges.value = false;
    savedSnapshotPayload = {
      lua: payload.lua,
      js: payload.js,
      blocklyData: safeClone(payload.blocklyData),
    };
  };

  /** Start a new logical script session. This always drops stale KeepAlive data. */
  const beginEditorSession = (
    payload: ScriptEditorSavedSnapshot,
    snapshotKey = "default"
  ) => {
    resetEditorSessionState(payload);
    initializedSavedSnapshotKey = snapshotKey;
    // resetEditorSessionState rotates hostSessionId. Always rebuild the iframe
    // URL in the same operation so Blockly's repeated PLUGIN_READY token and
    // the INIT session token cannot diverge during the first page load or a
    // KeepAlive session restart.
    reloadEditorFrame();
  };

  /**
   * Backward-compatible baseline initializer. Repeated calls for the same script
   * are intentionally non-destructive; new loads should call beginEditorSession.
   */
  const initializeSavedSnapshot = (
    payload: ScriptEditorSavedSnapshot,
    snapshotKey = "default"
  ) => {
    if (
      hasInitializedSavedSnapshot &&
      initializedSavedSnapshotKey === snapshotKey
    ) {
      return;
    }
    beginEditorSession(payload, snapshotKey);
  };

  const getEditorInitState = (): ScriptEditorInitState | null => {
    if (!savedSnapshotPayload) return null;
    const currentData =
      pendingRestorePayload?.data ??
      unsavedBlocklyData.value ??
      savedSnapshotPayload.blocklyData;
    return {
      data: safeClone(currentData),
      code: {
        lua: savedSnapshotPayload.lua,
        js: savedSnapshotPayload.js,
      },
      persisted: {
        data: safeClone(savedSnapshotPayload.blocklyData),
        code: {
          lua: savedSnapshotPayload.lua,
          js: savedSnapshotPayload.js,
        },
      },
      hostSessionId,
    };
  };

  const discardEditorChanges = () => {
    if (!savedSnapshotPayload) {
      hasUnsavedChanges.value = false;
      return;
    }
    const saved = {
      ...savedSnapshotPayload,
      blocklyData: safeClone(savedSnapshotPayload.blocklyData),
    };
    resetEditorSessionState(saved);
    applyEditorCodes({ ...saved, dirty: false });
    reloadEditorFrame();
  };

  const formatDraftSummary = (
    payload: { lua: string; js: string },
    previousVersion?: ScriptDraftVersion
  ): {
    summary: string;
    summaryI18nKey?: string;
    summaryI18nParams?: Record<string, string>;
  } => {
    const getChangedLine = (currentContent: string, previousContent = "") => {
      const currentLines = currentContent
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const previousLines = previousContent
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const maxLength = Math.max(currentLines.length, previousLines.length);
      for (let index = 0; index < maxLength; index += 1) {
        if (currentLines[index] !== previousLines[index]) {
          if (currentLines[index]) {
            return {
              summary: currentLines[index],
            };
          }
          if (previousLines[index]) {
            return {
              summary: t("common.scriptDraft.summaryRemoved", {
                items: previousLines[index],
              }),
              summaryI18nKey: "common.scriptDraft.summaryRemoved",
              summaryI18nParams: {
                items: previousLines[index],
              },
            };
          }
        }
      }
      return null;
    };

    if (previousVersion) {
      const changedLuaLine = getChangedLine(payload.lua, previousVersion.lua);
      if (changedLuaLine) {
        return {
          ...changedLuaLine,
          summary: changedLuaLine.summary.replace(/\s+/g, " ").slice(0, 72),
          summaryI18nParams: changedLuaLine.summaryI18nParams
            ? Object.fromEntries(
                Object.entries(changedLuaLine.summaryI18nParams).map(
                  ([key, value]) => [
                    key,
                    value.replace(/\s+/g, " ").slice(0, 72),
                  ]
                )
              )
            : undefined,
        };
      }
      const changedJsLine = getChangedLine(payload.js, previousVersion.js);
      if (changedJsLine) {
        return {
          ...changedJsLine,
          summary: changedJsLine.summary.replace(/\s+/g, " ").slice(0, 72),
          summaryI18nParams: changedJsLine.summaryI18nParams
            ? Object.fromEntries(
                Object.entries(changedJsLine.summaryI18nParams).map(
                  ([key, value]) => [
                    key,
                    value.replace(/\s+/g, " ").slice(0, 72),
                  ]
                )
              )
            : undefined,
        };
      }
    }

    const candidate = [payload.lua, payload.js]
      .flatMap((content) => content.split("\n"))
      .map((line) => line.trim())
      .find((line) => line.length > 0);
    if (!candidate) {
      return {
        summary: t("common.scriptDraft.emptySummary"),
        summaryI18nKey: "common.scriptDraft.emptySummary",
      };
    }
    return {
      summary: candidate.replace(/\s+/g, " ").slice(0, 72),
    };
  };

  const persistDraftVersions = () => {
    const key = getDraftStorageKey();
    if (!key) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(draftVersions.value));
    } catch (error) {
      logger.error("persistDraftVersions error", error);
    }
  };

  const persistDraftSettings = () => {
    const key = getDraftSettingsKey();
    if (!key) return;
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          settingsVersion: DRAFT_SETTINGS_VERSION,
          autoSaveEnabled: autoSaveEnabled.value,
          autoSaveIntervalSeconds: autoSaveIntervalSeconds.value,
        })
      );
    } catch (error) {
      logger.error("persistDraftSettings error", error);
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

  const loadDraftState = () => {
    const draftKey = getDraftStorageKey();
    const settingsKey = getDraftSettingsKey();

    draftVersions.value = [];
    autoSaveEnabled.value = true;
    autoSaveIntervalSeconds.value = DEFAULT_AUTO_SAVE_INTERVAL_SECONDS;

    if (!draftKey || !settingsKey) return;

    try {
      const rawVersions = window.localStorage.getItem(draftKey);
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
      logger.error("loadDraftState versions error", error);
    }

    try {
      const rawSettings = window.localStorage.getItem(settingsKey);
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
      logger.error("loadDraftState settings error", error);
    }
  };

  const addDraftVersion = (
    payload: EditorPostPayload,
    trigger: ScriptSaveTrigger
  ): string | null => {
    const latestVersion = draftVersions.value[0];
    const nextSummary = formatDraftSummary(payload, latestVersion);
    const nextVersion: ScriptDraftVersion = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      savedAt: new Date().toISOString(),
      trigger,
      summary: nextSummary.summary,
      summaryI18nKey: nextSummary.summaryI18nKey,
      summaryI18nParams: nextSummary.summaryI18nParams,
      blocklyData: safeClone(payload.data),
      lua: payload.lua,
      js: payload.js,
    };

    const nextSignature = buildSnapshotSignature({
      lua: payload.lua,
      js: payload.js,
      blocklyData: payload.data,
    });
    const latestSignature = latestVersion
      ? buildSnapshotSignature({
          lua: latestVersion.lua,
          js: latestVersion.js,
          blocklyData: latestVersion.blocklyData,
        })
      : "";

    if (latestSignature === nextSignature) {
      return null;
    }

    draftVersions.value = [nextVersion, ...draftVersions.value].slice(0, 20);
    persistDraftVersions();
    return nextVersion.savedAt;
  };

  const openVersionDialog = () => {
    versionDialogVisible.value = true;
  };

  const closeVersionDialog = () => {
    versionDialogVisible.value = false;
  };

  const clearDraftHistory = () => {
    draftVersions.value = [];
    pendingRestorePayload = null;
    const key = getDraftStorageKey();
    if (!key) return;
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      logger.error("clearDraftHistory error", error);
    }
  };

  const restoreDraftVersion = (draftId: string) => {
    const target = draftVersions.value.find((draft) => draft.id === draftId);
    if (!target) return;
    pendingRestorePayload = {
      data: safeClone(target.blocklyData),
      lua: target.lua,
      js: target.js,
    };

    applyEditorCodes({
      lua: target.lua,
      js: target.js,
      blocklyData: target.blocklyData,
    });
    activeName.value = "blockly";
    options.onRestoreDraft?.(safeClone(target.blocklyData));
    Message.success(t("common.scriptDraft.restoreSuccess"));
    versionDialogVisible.value = false;
  };

  const clearAutoSaveTimer = () => {
    if (saveTimer !== null) {
      window.clearInterval(saveTimer);
      saveTimer = null;
    }
  };

  const reloadEditorFrame = () => {
    snapshotRevision += 1;
    clearPendingSaveSession(new Error(SNAPSHOT_CHANGED_ERROR));
    ready = false;
    editorContentReady.value = false;
    latestWorkspaceRevision = -1;
    sessionProtocolConfirmed = false;
    hostSessionId = genSessionId();
    src.value = buildEditorSrc(appStore.language);
    editorFrameKey.value += 1;
  };

  const handleEditorFrameLoad = () => {
    if (ready) return;
    // The iframe load event is emitted only by the exact element rendered from
    // the trusted Blockly URL. Treat it as a lossless local READY fallback in
    // case the cross-window PLUGIN_READY event is missed by the host runtime.
    ready = true;
    options.onReady();
  };

  const restartAutoSaveTimer = () => {
    clearAutoSaveTimer();
    if (!autoSaveEnabled.value) return;
    if (!getDraftStorageKey()) return;

    saveTimer = window.setInterval(async () => {
      if (!hasUnsavedChanges.value) return;
      if (!canSaveCurrentScript()) return;
      if (isSaving.value) return;
      try {
        await save("auto", { suppressNoChangeInfo: true });
      } catch (error) {
        logger.error("auto save failed", error);
      }
    }, autoSaveIntervalSeconds.value * 1000);
  };

  // ---- 编辑器全屏 ----
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const container = editor.value?.parentElement;
      if (container) {
        container.requestFullscreen();
        isFullscreen.value = true;
      }
    } else {
      document.exitFullscreen();
      isFullscreen.value = false;
    }
  };

  // ---- 全屏代码对话框 ----
  const showFullscreenCode = (type: "lua" | "javascript") => {
    currentCodeType.value = type;
    currentCode.value = type === "lua" ? LuaCode.value : JavaScriptCode.value;
    codeDialogTitle.value = type === "lua" ? "Lua Code" : "JavaScript Code";
    showCodeDialog.value = true;
  };

  // ---- Blockly 变更记录 ----
  const handleBlocklyChange = (data: unknown) => {
    unsavedBlocklyData.value = data;
  };

  // ---- 动态加载 highlight.js 主题 ----
  const loadHighlightStyle = (dark: boolean) => {
    const existingLink = document.querySelector(
      "#highlight-style"
    ) as HTMLLinkElement;
    logger.log("existingLink", existingLink);
    const href =
      env.deploymentMode() === "local"
        ? dark
          ? a11yDarkStyleUrl
          : a11yLightStyleUrl
        : dark
          ? "https://cdn.jsdelivr.net/npm/highlight.js/styles/a11y-dark.css"
          : "https://cdn.jsdelivr.net/npm/highlight.js/styles/a11y-light.css";
    if (existingLink) {
      existingLink.href = href;
    } else {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.id = "highlight-style";
      link.href = href;
      document.head.appendChild(link);
    }
  };

  // ---- 复制代码 ----
  const resolveCopyText = (code: unknown) => {
    if (typeof code === "string") return code;
    if (isRecord(code) && "value" in code) {
      const value = code.value;
      return typeof value === "string" ? value : String(value ?? "");
    }
    return String(code ?? "");
  };

  const copyTextWithFallback = (text: string) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    try {
      return document.execCommand("copy");
    } finally {
      document.body.removeChild(textarea);
    }
  };

  const copyCode = async (code: unknown) => {
    const text = resolveCopyText(code);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (!copyTextWithFallback(text)) {
        throw new Error("Fallback copy failed");
      }
      Message.success(t("copy.success"));
    } catch (_error) {
      try {
        if (!copyTextWithFallback(text)) {
          throw new Error("Fallback copy failed");
        }
        Message.success(t("copy.success"));
      } catch (_fallbackError) {
        Message.error(t("copy.error"));
      }
    }
  };

  // ---- JavaScript 代码格式化 ----
  const formatJavaScript = (code: string) => {
    try {
      return jsBeautify(code, {
        indent_size: 2,
        indent_char: " ",
        preserve_newlines: true,
        max_preserve_newlines: 2,
        space_in_empty_paren: false,
        jslint_happy: false,
        space_after_anon_function: true,
        brace_style: "collapse",
        break_chained_methods: false,
        keep_array_indentation: false,
        unescape_strings: false,
        wrap_line_length: 0,
        end_with_newline: true,
        comma_first: false,
      });
    } catch (error) {
      logger.error("代码格式化失败:", error);
      return code;
    }
  };

  // ---- 安全深拷贝（structuredClone 无法处理 Vue 响应式代理等对象） ----
  const safeClone = (value: unknown): unknown => {
    try {
      return structuredClone(value);
    } catch {
      return JSON.parse(JSON.stringify(value));
    }
  };

  // ---- 向 Blockly iframe 发送消息 ----
  const postMessage = (type: string, payload?: unknown) => {
    if (editor.value && editor.value.contentWindow) {
      const id = genId();
      const sessionPayloadTypes = new Set(["REQUEST", "SAVE_ACK", "SAVE_NACK"]);
      const nextPayload =
        sessionPayloadTypes.has(type) && isRecord(payload)
          ? { ...payload, hostSessionId }
          : payload;
      let targetOrigin: string;
      try {
        targetOrigin = new URL(env.blockly, window.location.href).origin;
      } catch (error) {
        logger.error("Invalid Blockly URL; message was not sent", error);
        Message.error(t(options.i18nKeys.error3));
        return undefined;
      }
      editor.value.contentWindow.postMessage(
        {
          type,
          id,
          payload:
            nextPayload !== undefined ? safeClone(nextPayload) : undefined,
        },
        targetOrigin
      );
      return id;
    } else {
      Message.error(t(options.i18nKeys.error3));
      return undefined;
    }
  };

  // ---- 类型守卫 ----
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

  const normalizeSaveWarnings = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];

    try {
      const messages = value
        .map((warning) => {
          if (typeof warning === "string") return warning.trim();
          if (!isRecord(warning) || typeof warning.message !== "string") {
            return "";
          }
          return warning.message.trim();
        })
        .filter((message): message is string => message.length > 0);

      return [...new Set(messages)];
    } catch (error) {
      logger.warn("忽略格式不正确的 Blockly 保存警告:", error);
      return [];
    }
  };

  const showSaveWarnings = (value: unknown): boolean => {
    try {
      const warnings = normalizeSaveWarnings(value);
      if (warnings.length === 0) return false;

      const firstWarning = warnings[0]!;
      const preview =
        firstWarning.length > SAVE_WARNING_PREVIEW_LENGTH
          ? `${firstWarning.slice(0, SAVE_WARNING_PREVIEW_LENGTH - 3)}...`
          : firstWarning;
      const remaining =
        warnings.length > 1 ? `（另有 ${warnings.length - 1} 项）` : "";
      Message.warning(
        `脚本已保留，但存在 ${warnings.length} 项警告：${preview}${remaining}`
      );
      return true;
    } catch (error) {
      // 警告展示失败不能反向影响已经完成的保存流程。
      logger.warn("显示 Blockly 保存警告失败:", error);
      return false;
    }
  };

  const isEditorPostPayload = (
    value: unknown
  ): value is EditorSaveResponsePayload => {
    if (!isRecord(value)) return false;
    return typeof value.lua === "string" && typeof value.js === "string";
  };

  const isEditorUpdatePayload = (
    value: unknown
  ): value is EditorUpdatePayload => {
    if (!isRecord(value)) return false;
    return typeof value.lua === "string" && typeof value.js === "string";
  };

  // ---- 保存 ----
  const save = (
    triggerOrEvent?: ScriptSaveTrigger | MouseEvent,
    saveOptions: SaveRequestOptions = {}
  ): Promise<void> => {
    if (!canSaveCurrentScript()) {
      return Promise.reject(new Error(SAVE_NOT_ALLOWED_ERROR));
    }

    if (isSaving.value && pendingSavePromise) {
      return pendingSavePromise;
    }

    if (legacyDirectSaveInFlight || persistenceInFlight) {
      return Promise.reject(
        new Error("script persistence is already in progress")
      );
    }

    currentSaveTrigger =
      typeof triggerOrEvent === "string" ? triggerOrEvent : "manual";
    currentSaveOptions = saveOptions;
    isSaving.value = true;
    pendingSaveEditorSignature = latestEditorSignature;
    pendingSaveEditorPayload = latestEditorPayload
      ? {
          ...latestEditorPayload,
          blocklyData: safeClone(latestEditorPayload.blocklyData),
        }
      : null;

    pendingSavePromise = new Promise<void>((resolve, reject) => {
      saveResolve = resolve;
      saveReject = reject;
      pendingSaveSnapshotRevision = snapshotRevision;
      pendingSaveRequestId =
        postMessage("REQUEST", {
          action: "save",
          workspaceRevision:
            latestWorkspaceRevision >= 0 ? latestWorkspaceRevision : undefined,
        }) ?? null;
    });
    return pendingSavePromise;
  };

  const confirmSaveScript = () => {
    return ElMessageBox.confirm(t(options.i18nKeys.leaveMessage1), "", {
      showClose: true,
      center: true,
      distinguishCancelAndClose: true,
      closeOnClickModal: false,
      closeOnPressEscape: true,
      showCancelButton: true,
      customClass: "script-save-confirm-box",
      confirmButtonText: t(options.i18nKeys.leaveConfirm),
      cancelButtonText: t(options.i18nKeys.leaveCancel),
    });
  };

  const resolveUnsavedChangesBeforeLeave = async (
    leaveOptions: ResolveUnsavedChangesOptions = {}
  ): Promise<boolean> => {
    if (!hasUnsavedChanges.value) {
      return true;
    }

    const showDiscardInfo = leaveOptions.showDiscardInfo ?? true;

    try {
      await confirmSaveScript();
    } catch (action) {
      if (action === "cancel") {
        discardEditorChanges();
        if (showDiscardInfo) {
          Message.info(t(options.i18nKeys.leaveInfo));
        }
        return true;
      }

      if (action === "close") {
        return false;
      }

      return false;
    }

    try {
      await save();
      return true;
    } catch (_error) {
      Message.error(t(options.i18nKeys.leaveError));
      return false;
    }
  };

  // ---- 页面关闭拦截 ----
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (hasUnsavedChanges.value) {
      event.preventDefault();
      event.returnValue = "";
    }
  };

  // ---- iframe 消息处理（标准协议） ----
  const handleMessage = async (e: MessageEvent) => {
    let messageSnapshotRevision = snapshotRevision;

    try {
      const msg = e.data;
      if (!msg || typeof msg.type !== "string") return;

      const payload = (msg.payload ?? {}) as Record<string, unknown>;
      const currentEditorWindow = editor.value?.contentWindow;
      const isDirectUnitTestCall =
        import.meta.env.MODE === "test" && e.source == null;

      try {
        const expectedOrigin = new URL(env.blockly, window.location.href)
          .origin;
        if (!isDirectUnitTestCall && e.origin !== expectedOrigin) return;
      } catch (error) {
        logger.error(
          "Invalid Blockly URL; incoming message was ignored",
          error
        );
        return;
      }

      const isSessionBoundReady =
        msg.type === "PLUGIN_READY" &&
        typeof payload.hostSessionId === "string" &&
        payload.hostSessionId === hostSessionId;
      if (
        !isDirectUnitTestCall &&
        (!currentEditorWindow || e.source !== currentEditorWindow) &&
        !isSessionBoundReady
      ) {
        return;
      }

      const incomingSessionId = payload.hostSessionId;
      if (typeof incomingSessionId === "string") {
        if (incomingSessionId !== hostSessionId) return;
        sessionProtocolConfirmed = true;
      } else if (
        sessionProtocolConfirmed &&
        (msg.type === "EVENT" || msg.type === "RESPONSE")
      ) {
        return;
      }

      if (msg.type === "PLUGIN_READY") {
        if (ready) return;
        ready = true;
        options.onReady();
      } else if (msg.type === "RESPONSE") {
        const isLegacyDirectSave =
          !pendingSavePromise &&
          !legacyDirectSaveInFlight &&
          !sessionProtocolConfirmed &&
          typeof msg.requestId !== "string" &&
          (payload.action === "save" ||
            payload.action === "save-error" ||
            payload.noChange === true);
        if (!pendingSavePromise && !isLegacyDirectSave) return;
        if (isLegacyDirectSave) {
          legacyDirectSaveInFlight = true;
          isSaving.value = true;
          currentSaveTrigger = "manual";
          currentSaveOptions = {};
          pendingSaveSnapshotRevision = snapshotRevision;
          pendingSaveEditorSignature = latestEditorSignature;
          pendingSaveEditorPayload = latestEditorPayload
            ? {
                ...latestEditorPayload,
                blocklyData: safeClone(latestEditorPayload.blocklyData),
              }
            : null;
        }
        if (
          sessionProtocolConfirmed &&
          (typeof msg.requestId !== "string" ||
            msg.requestId !== pendingSaveRequestId)
        ) {
          return;
        }
        if (
          pendingSavePromise &&
          (typeof msg.requestId !== "string" ||
            msg.requestId !== pendingSaveRequestId)
        ) {
          return;
        }

        messageSnapshotRevision =
          pendingSaveSnapshotRevision ?? snapshotRevision;

        if (payload.action === "save-error") {
          const message =
            typeof payload.message === "string"
              ? payload.message
              : t(options.i18nKeys.error1);
          Message.error(message);
          clearPendingSaveSession(new Error(message));
          return;
        }

        if (payload.action === "save" && !payload.noChange) {
          // --- 有变更的保存响应 ---
          if (!isEditorPostPayload(payload)) {
            Message.error(t(options.i18nKeys.error1));
            clearPendingSaveSession(new Error("invalid save payload"));
            return;
          }
          if (!canSaveCurrentScript()) {
            if (typeof payload.saveId === "string") {
              postMessage("SAVE_NACK", { saveId: payload.saveId });
            }
            throw new Error(SAVE_NOT_ALLOWED_ERROR);
          }

          const postData: EditorPostPayload = {
            data: payload.data,
            lua: payload.lua as string,
            js: payload.js as string,
          };
          const responseTrigger = currentSaveTrigger;
          try {
            await persistEditorPayload(postData, responseTrigger);
          } catch (error) {
            if (
              messageSnapshotRevision === snapshotRevision &&
              typeof payload.saveId === "string"
            ) {
              postMessage("SAVE_NACK", { saveId: payload.saveId });
            }
            throw error;
          }

          if (messageSnapshotRevision !== snapshotRevision) {
            return;
          }

          pendingRestorePayload = null;
          const savedAt = addDraftVersion(postData, responseTrigger);
          markCurrentPayloadAsSaved({
            lua: postData.lua,
            js: postData.js,
            blocklyData: postData.data,
          });
          if (typeof payload.saveId === "string") {
            postMessage("SAVE_ACK", { saveId: payload.saveId });
          }
          lastSaveTrigger.value = responseTrigger;
          lastSavedAt.value = savedAt || new Date().toISOString();
          if (responseTrigger === "auto") {
            Message.success(t("common.scriptDraft.autoSavedNotice"));
          }
          showSaveWarnings(payload.warnings);
          const resolve = saveResolve;
          clearPendingSaveSession();
          resolve?.();
        } else if (payload.noChange === true) {
          // --- 无变更的保存响应 ---
          const noChangeSnapshot =
            isEditorPostPayload(payload) &&
            Object.prototype.hasOwnProperty.call(payload, "data")
              ? {
                  lua: payload.lua,
                  js: payload.js,
                  blocklyData: payload.data,
                }
              : null;

          if (
            pendingRestorePayload &&
            hasUnsavedChanges.value &&
            !noChangeSnapshot
          ) {
            if (!canSaveCurrentScript()) {
              if (typeof payload.saveId === "string") {
                postMessage("SAVE_NACK", { saveId: payload.saveId });
              }
              throw new Error(SAVE_NOT_ALLOWED_ERROR);
            }

            const restorePayload = pendingRestorePayload;
            const responseTrigger = currentSaveTrigger;
            try {
              await persistEditorPayload(restorePayload, responseTrigger);
            } catch (error) {
              if (
                messageSnapshotRevision === snapshotRevision &&
                typeof payload.saveId === "string"
              ) {
                postMessage("SAVE_NACK", { saveId: payload.saveId });
              }
              throw error;
            }

            if (messageSnapshotRevision !== snapshotRevision) {
              return;
            }

            const savedAt = addDraftVersion(restorePayload, responseTrigger);
            markCurrentPayloadAsSaved({
              lua: restorePayload.lua,
              js: restorePayload.js,
              blocklyData: restorePayload.data,
            });
            lastSaveTrigger.value = responseTrigger;
            lastSavedAt.value = savedAt || new Date().toISOString();
            if (responseTrigger === "auto") {
              Message.success(t("common.scriptDraft.autoSavedNotice"));
            }
            showSaveWarnings(payload.warnings);
            if (pendingRestorePayload === restorePayload) {
              pendingRestorePayload = null;
            }
            const resolve = saveResolve;
            clearPendingSaveSession();
            resolve?.();
            return;
          }

          const requestedSignature = pendingSaveEditorSignature;
          const requestedPayload = pendingSaveEditorPayload;
          if (
            !noChangeSnapshot &&
            requestedPayload &&
            requestedSignature !== lastSavedSignature
          ) {
            const responseTrigger = currentSaveTrigger;
            const postData: EditorPostPayload = {
              data: requestedPayload.blocklyData,
              lua: requestedPayload.lua,
              js: requestedPayload.js,
            };
            await persistEditorPayload(postData, responseTrigger);
            if (messageSnapshotRevision !== snapshotRevision) return;
            const savedAt = addDraftVersion(postData, responseTrigger);
            markCurrentPayloadAsSaved(requestedPayload);
            lastSaveTrigger.value = responseTrigger;
            lastSavedAt.value = savedAt || new Date().toISOString();
          } else if (noChangeSnapshot) {
            markCurrentPayloadAsSaved(noChangeSnapshot);
          }
          lastSaveTrigger.value = currentSaveTrigger;
          lastSavedAt.value = new Date().toISOString();
          const hasWarnings = showSaveWarnings(payload.warnings);
          if (!hasWarnings && !currentSaveOptions.suppressNoChangeInfo) {
            Message.info(t(options.i18nKeys.info));
          }
          const resolve = saveResolve;
          clearPendingSaveSession();
          resolve?.();
        }
      } else if (msg.type === "EVENT") {
        if (payload.event === "save-request") {
          void save().catch((error) => {
            logger.error("Blockly keyboard save failed", error);
          });
        } else if (payload.event === "update") {
          // --- 工作区实时更新 ---
          if (!isEditorUpdatePayload(payload)) return;
          const workspaceRevision =
            typeof payload.workspaceRevision === "number" &&
            Number.isFinite(payload.workspaceRevision)
              ? payload.workspaceRevision
              : null;
          if (
            workspaceRevision !== null &&
            workspaceRevision < latestWorkspaceRevision
          ) {
            return;
          }
          if (workspaceRevision !== null) {
            latestWorkspaceRevision = workspaceRevision;
          }
          editorContentReady.value = true;
          const updateData: EditorUpdatePayload = {
            lua: payload.lua as string,
            js: payload.js as string,
            blocklyData: payload.blocklyData,
            dirty:
              typeof payload.dirty === "boolean" ? payload.dirty : undefined,
            workspaceRevision: workspaceRevision ?? undefined,
          };
          if (pendingRestorePayload) {
            const nextSignature = buildSnapshotSignature({
              lua: updateData.lua,
              js: updateData.js,
              blocklyData: updateData.blocklyData,
            });
            const restoreSignature = buildSnapshotSignature({
              lua: pendingRestorePayload.lua,
              js: pendingRestorePayload.js,
              blocklyData: pendingRestorePayload.data,
            });
            if (nextSignature !== restoreSignature) {
              pendingRestorePayload = null;
            }
          }
          applyEditorCodes(updateData);
          if (!hasInitializedSavedSnapshot) {
            markCurrentPayloadAsSaved(updateData);
          }
        } else if (payload.event === "error") {
          // --- 错误通知 ---
          const errorMessage =
            typeof payload.message === "string"
              ? payload.message
              : "Unknown editor error";
          Message.error(errorMessage);
        }
      }
    } catch (error) {
      if (messageSnapshotRevision === snapshotRevision) {
        hasUnsavedChanges.value = true;
        clearPendingSaveSession(
          error instanceof Error ? error : new Error(String(error))
        );
      }
      logger.log("ex:" + String(error));
    } finally {
      if (!persistenceInFlight) {
        legacyDirectSaveInFlight = false;
        if (!pendingSavePromise) {
          isSaving.value = false;
        }
      }
    }
  };

  // ---- 解压 blockly 数据（pako） ----
  const decompressBlockly = (blocklyData: string): string => {
    if (blocklyData.startsWith("compressed:")) {
      const base64Str = blocklyData.substring(11);
      const binaryString = safeAtob(base64Str);
      if (!binaryString) {
        logger.warn("[decompressBlockly] Invalid base64 data, returning raw");
        return blocklyData;
      }
      const uint8Array = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }
      return pako.inflate(uint8Array, { to: "string" });
    }
    return blocklyData;
  };

  // ---- 获取 ready 状态（供 initEditor 检查） ----
  const isReady = () => ready;
  const setReady = (v: boolean) => {
    ready = v;
  };

  // ---- Watchers ----
  watch(isDark, (newValue) => {
    loadHighlightStyle(newValue);
    postMessage("THEME_CHANGE", {
      theme: newValue ? "dark" : "light",
      dark: newValue,
    });
  });

  watch(
    () => appStore.language,
    (newValue) => {
      // Preserve the current draft, but rotate the iframe/session boundary.
      // INIT must wait for PLUGIN_READY from the newly loaded frame.
      reloadEditorFrame();
      src.value = buildEditorSrc(newValue);
    }
  );

  watch(
    () => options.getDraftStorageKey?.(),
    () => {
      loadDraftState();
      restartAutoSaveTimer();
    },
    { immediate: true }
  );

  watch([autoSaveEnabled, autoSaveIntervalSeconds], () => {
    persistDraftSettings();
    restartAutoSaveTimer();
  });

  // ---- 离开路由守卫（未保存变更提示） ----
  onBeforeRouteLeave(async (to, from, next) => {
    const canLeave = await resolveUnsavedChangesBeforeLeave({
      showDiscardInfo: true,
    });
    if (canLeave) {
      next();
      return;
    }
    next(false);
  });

  // Register the iframe bridge during setup, before Vue mounts the iframe.
  // A cached plugin can emit PLUGIN_READY before the parent's onMounted hook;
  // installing this listener here makes the READY → INIT handshake lossless.
  window.addEventListener("message", handleMessage);

  // ---- onMounted：注册其余共享事件监听 ----
  onMounted(() => {
    loadHighlightStyle(isDark.value);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && showCodeDialog.value) {
        showCodeDialog.value = false;
      }
    });
    document.addEventListener("fullscreenchange", () => {
      isFullscreen.value = !!document.fullscreenElement;
    });
  });

  // ---- onBeforeUnmount：注销事件监听 ----
  onBeforeUnmount(() => {
    postMessage("DESTROY");
    clearAutoSaveTimer();
    window.removeEventListener("message", handleMessage);
    window.removeEventListener("beforeunload", handleBeforeUnload);
    document.removeEventListener("keydown", (e) => {
      if (e.key === "Escape" && showCodeDialog.value) {
        showCodeDialog.value = false;
      }
    });
    document.removeEventListener("fullscreenchange", () => {
      isFullscreen.value = !!document.fullscreenElement;
    });
  });

  return {
    // 状态
    activeName,
    languageName,
    LuaCode,
    JavaScriptCode,
    isFullscreen,
    showCodeDialog,
    currentCode,
    currentCodeType,
    codeDialogTitle,
    unsavedBlocklyData,
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
    // 函数
    handleBlocklyChange,
    toggleFullscreen,
    showFullscreenCode,
    loadHighlightStyle,
    copyCode,
    formatJavaScript,
    postMessage,
    beginEditorSession,
    initializeSavedSnapshot,
    getEditorInitState,
    discardEditorChanges,
    save,
    openVersionDialog,
    closeVersionDialog,
    restoreDraftVersion,
    clearDraftHistory,
    reloadEditorFrame,
    handleEditorFrameLoad,
    handleBeforeUnload,
    handleMessage,
    decompressBlockly,
    resolveUnsavedChangesBeforeLeave,
    // ready 状态访问
    isReady,
    setReady,
  };
}
