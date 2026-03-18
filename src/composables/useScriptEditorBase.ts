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
import { useUserStore } from "@/store/modules/user";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { ElMessageBox } from "element-plus";
import { Message } from "@/components/Dialog";
import { logger } from "@/utils/logger";
import { safeAtob } from "@/utils/base64";
import env from "@/environment";

// ---------- 共享类型 ----------

export type EditorPostPayload = {
  data: unknown;
  lua: string;
  js: string;
};

export type EditorUpdatePayload = {
  lua: string;
  js: string;
  blocklyData: unknown;
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
  /** postMessage 中的 from 字段，区分 meta / verse */
  from: string;
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

// ---------- composable 主体 ----------

export function useScriptEditorBase(options: UseScriptEditorBaseOptions) {
  const { t } = useI18n();
  const settingsStore = useSettingsStore();
  const appStore = useAppStore();
  const userStore = useUserStore();

  // ---- 状态 ----
  const activeName = ref<string>("blockly");
  const languageName = ref<string>("lua");
  const LuaCode = ref("");
  const JavaScriptCode = ref("");
  const disabled = ref<boolean>(false);
  const isSceneFullscreen = ref(false);
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
  const src = ref(env.blockly + "?language=" + appStore.language);
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
  let lastSavedSignature = "";
  let pendingSavePromise: Promise<void> | null = null;
  let pendingRestorePayload: EditorPostPayload | null = null;

  const canSaveCurrentScript = () =>
    typeof options.canSave === "function" ? options.canSave() : true;

  const getDraftStorageKey = () => options.getDraftStorageKey?.() || null;

  const getDraftSettingsKey = () => {
    const key = getDraftStorageKey();
    return key ? `${key}:settings` : null;
  };

  const safeStringify = (value: unknown) => {
    try {
      return JSON.stringify(value ?? null);
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

  const applyEditorCodes = (payload: {
    lua: string;
    js: string;
    blocklyData: unknown;
  }) => {
    unsavedBlocklyData.value = safeClone(payload.blocklyData);
    LuaCode.value = buildRuntimeLua(payload.lua);
    JavaScriptCode.value = formatJavaScript(payload.js);
    const nextSignature = buildSnapshotSignature(payload);
    hasUnsavedChanges.value = nextSignature !== lastSavedSignature;
  };

  const markCurrentPayloadAsSaved = (payload: {
    lua: string;
    js: string;
    blocklyData: unknown;
  }) => {
    lastSavedSignature = buildSnapshotSignature(payload);
    hasInitializedSavedSnapshot = true;
    hasUnsavedChanges.value = false;
  };

  const formatDraftSummary = (
    payload: { lua: string; js: string },
    previousVersion?: ScriptDraftVersion
  ) => {
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
          if (currentLines[index]) return currentLines[index];
          if (previousLines[index]) {
            return `删除 ${previousLines[index]}`;
          }
        }
      }
      return "";
    };

    if (previousVersion) {
      const changedLuaLine = getChangedLine(payload.lua, previousVersion.lua);
      if (changedLuaLine) {
        return changedLuaLine.replace(/\s+/g, " ").slice(0, 72);
      }
      const changedJsLine = getChangedLine(payload.js, previousVersion.js);
      if (changedJsLine) {
        return changedJsLine.replace(/\s+/g, " ").slice(0, 72);
      }
    }

    const candidate = [payload.lua, payload.js]
      .flatMap((content) => content.split("\n"))
      .map((line) => line.trim())
      .find((line) => line.length > 0);
    if (!candidate) return t("common.scriptDraft.emptySummary");
    return candidate.replace(/\s+/g, " ").slice(0, 72);
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
    const nextVersion: ScriptDraftVersion = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      savedAt: new Date().toISOString(),
      trigger,
      summary: formatDraftSummary(payload, latestVersion),
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
    ready = false;
    editorFrameKey.value += 1;
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

  // ---- 场景全屏 ----
  const toggleSceneFullscreen = () => {
    if (!document.fullscreenElement) {
      const container = document.querySelector(".runArea");
      if (container) {
        container.requestFullscreen();
        isSceneFullscreen.value = true;
      }
    } else {
      document.exitFullscreen();
      isSceneFullscreen.value = false;
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
    const href = dark
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
  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      Message.success(t("copy.success"));
    } catch (_error) {
      Message.error(t("copy.error"));
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
  const postMessage = (action: string, data: unknown = {}) => {
    if (editor.value && editor.value.contentWindow) {
      editor.value.contentWindow.postMessage(
        {
          from: options.from,
          action,
          data: safeClone(data),
        },
        "*"
      );
    } else {
      Message.error(t(options.i18nKeys.error3));
    }
  };

  // ---- 类型守卫 ----
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

  const isEditorPostPayload = (value: unknown): value is EditorPostPayload => {
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
    if (isSaving.value && pendingSavePromise) {
      return pendingSavePromise;
    }

    currentSaveTrigger =
      typeof triggerOrEvent === "string" ? triggerOrEvent : "manual";
    currentSaveOptions = saveOptions;
    isSaving.value = true;

    pendingSavePromise = new Promise<void>((resolve, reject) => {
      saveResolve = resolve;
      saveReject = reject;
      postMessage("save", { language: ["lua", "js"], data: {} });
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
        hasUnsavedChanges.value = false;
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

  // ---- iframe 消息处理 ----
  const handleMessage = async (e: MessageEvent) => {
    try {
      const payload = e.data as EditorEventPayload;
      if (!payload || !payload.action) return;
      const params = payload;

      if (params.action === "ready") {
        ready = true;
        options.onReady();
        postMessage("user-info", {
          id: userStore.userInfo?.id || null,
          role: userStore.getRole(),
        });
      } else if (params.action === "post") {
        if (!isEditorPostPayload(params.data)) {
          Message.error(t(options.i18nKeys.error1));
          isSaving.value = false;
          if (saveReject) {
            saveReject(new Error("invalid save payload"));
            saveReject = null;
          }
          pendingSavePromise = null;
          return;
        }
        await options.onPost(params.data, { trigger: currentSaveTrigger });
        pendingRestorePayload = null;
        const savedAt = addDraftVersion(params.data, currentSaveTrigger);
        markCurrentPayloadAsSaved({
          lua: params.data.lua,
          js: params.data.js,
          blocklyData: params.data.data,
        });
        lastSaveTrigger.value = currentSaveTrigger;
        lastSavedAt.value = savedAt || new Date().toISOString();
        isSaving.value = false;
        if (currentSaveTrigger === "auto") {
          Message.success(t("common.scriptDraft.autoSavedNotice"));
        }
        if (saveResolve) {
          saveResolve();
          saveResolve = null;
        }
        saveReject = null;
        pendingSavePromise = null;
      } else if (params.action === "post:no-change") {
        if (pendingRestorePayload && hasUnsavedChanges.value) {
          await options.onPost(pendingRestorePayload, {
            trigger: currentSaveTrigger,
          });
          const savedAt = addDraftVersion(
            pendingRestorePayload,
            currentSaveTrigger
          );
          markCurrentPayloadAsSaved({
            lua: pendingRestorePayload.lua,
            js: pendingRestorePayload.js,
            blocklyData: pendingRestorePayload.data,
          });
          lastSaveTrigger.value = currentSaveTrigger;
          lastSavedAt.value = savedAt || new Date().toISOString();
          if (currentSaveTrigger === "auto") {
            Message.success(t("common.scriptDraft.autoSavedNotice"));
          }
          pendingRestorePayload = null;
          isSaving.value = false;
          if (saveResolve) {
            saveResolve();
            saveResolve = null;
          }
          saveReject = null;
          pendingSavePromise = null;
          return;
        }
        isSaving.value = false;
        lastSaveTrigger.value = currentSaveTrigger;
        lastSavedAt.value = new Date().toISOString();
        if (!currentSaveOptions.suppressNoChangeInfo) {
          Message.info(t(options.i18nKeys.info));
        }
        if (saveResolve) {
          saveResolve();
          saveResolve = null;
        }
        saveReject = null;
        pendingSavePromise = null;
      } else if (params.action === "update") {
        if (!isEditorUpdatePayload(params.data)) return;
        if (pendingRestorePayload) {
          const nextSignature = buildSnapshotSignature({
            lua: params.data.lua,
            js: params.data.js,
            blocklyData: params.data.blocklyData,
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
        applyEditorCodes(params.data);
        if (!hasInitializedSavedSnapshot) {
          markCurrentPayloadAsSaved(params.data);
        }
      }
    } catch (_e) {
      isSaving.value = false;
      hasUnsavedChanges.value = true;
      if (saveReject) {
        saveReject(_e);
        saveReject = null;
      }
      saveResolve = null;
      pendingSavePromise = null;
      logger.log("ex:" + String(_e));
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
  });

  watch(
    () => appStore.language,
    (newValue) => {
      src.value = env.blockly + "?language=" + newValue;
      options.onReady(); // 语言切换时重新初始化编辑器
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

  watch(
    () => userStore.userInfo,
    () => {
      postMessage("user-info", {
        id: userStore.userInfo?.id || null,
        role: userStore.getRole(),
      });
    },
    { deep: true }
  );

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

  // ---- onMounted：注册共享事件监听 ----
  onMounted(() => {
    window.addEventListener("message", handleMessage);
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
    document.addEventListener("fullscreenchange", () => {
      isSceneFullscreen.value = !!document.fullscreenElement;
    });
  });

  // ---- onBeforeUnmount：注销事件监听 ----
  onBeforeUnmount(() => {
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
    document.removeEventListener("fullscreenchange", () => {
      isSceneFullscreen.value = !!document.fullscreenElement;
    });
  });

  return {
    // 状态
    activeName,
    languageName,
    LuaCode,
    JavaScriptCode,
    disabled,
    isSceneFullscreen,
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
    isDark,
    // 函数
    handleBlocklyChange,
    toggleFullscreen,
    showFullscreenCode,
    toggleSceneFullscreen,
    loadHighlightStyle,
    copyCode,
    formatJavaScript,
    postMessage,
    save,
    openVersionDialog,
    closeVersionDialog,
    restoreDraftVersion,
    clearDraftHistory,
    reloadEditorFrame,
    handleBeforeUnload,
    handleMessage,
    decompressBlockly,
    resolveUnsavedChangesBeforeLeave,
    // ready 状态访问
    isReady,
    setReady,
  };
}
