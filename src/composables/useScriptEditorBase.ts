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
import { Message, MessageBox } from "@/components/Dialog";
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
  onPost: (data: EditorPostPayload) => Promise<void>;
  /**
   * 编辑器就绪 / 语言切换时的回调（meta/verse 各自实现 initEditor）。
   * initEditor 内部应自行检查 data 是否已加载。
   */
  onReady: () => void;
};

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
  const editor = ref<HTMLIFrameElement | null>(null);
  const src = ref(env.blockly + "?language=" + appStore.language);
  const isDark = computed<boolean>(
    () => settingsStore.theme === ThemeEnum.DARK
  );

  let ready = false;
  let saveResolve: (() => void) | null = null;

  // ---- 单次赋值工具（用于记录初始 LuaCode 以检测变更） ----
  const defineSingleAssignment = <T>(initialValue: T) => {
    let value = initialValue;
    let isAssigned = false;
    return {
      get() {
        return value;
      },
      set(newValue: T) {
        if (!isAssigned) {
          value = newValue;
          isAssigned = true;
        } else {
          logger.log("cannot be assigned again");
        }
      },
    };
  };
  const initLuaCode = defineSingleAssignment("");

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

  // ---- 向 Blockly iframe 发送消息 ----
  const postMessage = (action: string, data: unknown = {}) => {
    if (editor.value && editor.value.contentWindow) {
      editor.value.contentWindow.postMessage(
        {
          from: options.from,
          action,
          data: structuredClone(data),
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
  const save = (): Promise<void> => {
    hasUnsavedChanges.value = false;
    return new Promise<void>((resolve) => {
      saveResolve = resolve;
      postMessage("save", { language: ["lua", "js"], data: {} });
    });
  };

  // ---- 页面关闭拦截 ----
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (hasUnsavedChanges.value) {
      event.preventDefault();
      event.returnValue = "";
    }
  };

  // ---- Ctrl+S 快捷保存 ----
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      save();
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
          return;
        }
        await options.onPost(params.data);
        if (saveResolve) {
          saveResolve();
          saveResolve = null;
        }
      } else if (params.action === "post:no-change") {
        Message.info(t(options.i18nKeys.info));
      } else if (params.action === "update") {
        if (!isEditorUpdatePayload(params.data)) return;
        LuaCode.value =
          `local ${options.luaLocalVar} = {}\nlocal index = ''\n` +
          params.data.lua;
        JavaScriptCode.value = formatJavaScript(params.data.js);
        initLuaCode.set(LuaCode.value);
        handleBlocklyChange(params.data.blocklyData);
      }
    } catch (_e) {
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

  watch(LuaCode, (newValue) => {
    hasUnsavedChanges.value = newValue !== initLuaCode.get();
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
    if (hasUnsavedChanges.value) {
      try {
        await MessageBox.confirm(
          t(options.i18nKeys.leaveMessage1),
          t(options.i18nKeys.leaveMessage2),
          {
            confirmButtonText: t(options.i18nKeys.leaveConfirm),
            cancelButtonText: t(options.i18nKeys.leaveCancel),
            type: "warning",
          }
        );
        try {
          await save();
          next();
        } catch (error) {
          Message.error(t(options.i18nKeys.leaveError));
          next(false);
        }
      } catch (action) {
        if (action === "cancel") {
          hasUnsavedChanges.value = false;
          Message.info(t(options.i18nKeys.leaveInfo));
          next();
        } else {
          next(false);
        }
      }
    } else {
      next();
    }
  });

  // ---- onMounted：注册共享事件监听 ----
  onMounted(() => {
    window.addEventListener("message", handleMessage);
    window.addEventListener("keydown", handleKeyDown);
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
    window.removeEventListener("message", handleMessage);
    window.removeEventListener("beforeunload", handleBeforeUnload);
    window.removeEventListener("keydown", handleKeyDown);
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
    handleBeforeUnload,
    handleKeyDown,
    handleMessage,
    decompressBlockly,
    // ready 状态访问
    isReady,
    setReady,
  };
}
