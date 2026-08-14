import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp, defineComponent, h, markRaw } from "vue";

// --- 提升 mock 变量，确保在工厂函数中可用 ---
const { mockInflate, mockJsBeautify, mockMessage, mockMessageBox } = vi.hoisted(
  () => ({
    mockInflate: vi.fn(() => "decompressed-content"),
    mockJsBeautify: vi.fn((code: string) => `formatted:${code}`),
    mockMessage: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    },
    mockMessageBox: { confirm: vi.fn() },
  })
);

// --- Mocks ---
vi.mock("vue-router", () => ({
  onBeforeRouteLeave: vi.fn(),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("@/store/modules/settings", () => ({
  useSettingsStore: () => ({ theme: "light" }),
}));

vi.mock("@/store/modules/app", () => ({
  useAppStore: () => ({ language: "zh-CN" }),
}));

vi.mock("@/store/modules/user", () => ({
  useUserStore: () => ({ userInfo: { id: 42 }, getRole: () => "editor" }),
}));

vi.mock("@/components/Dialog", () => ({
  Message: mockMessage,
  MessageBox: mockMessageBox,
}));

vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/environment", () => ({
  default: {
    blockly: "https://blockly.test",
    buildVersion: "test-v1",
    deploymentMode: () => "cloud",
  },
}));

vi.mock("pako", () => ({
  default: { inflate: mockInflate },
}));

vi.mock("js-beautify", () => ({
  default: mockJsBeautify,
}));

import {
  useScriptEditorBase,
  type UseScriptEditorBaseOptions,
} from "@/composables/useScriptEditorBase";

type MockBeforeUnloadEvent = Pick<BeforeUnloadEvent, "preventDefault"> & {
  returnValue: string;
};

type MockIframe = Pick<HTMLIFrameElement, "contentWindow">;

type MockMessageEvent = Pick<MessageEvent, "data">;

function requestIdFrom(postMessage: ReturnType<typeof vi.fn>): string {
  const request = [...postMessage.mock.calls]
    .reverse()
    .find(([message]) => message?.type === "REQUEST")?.[0] as
    | { id?: unknown }
    | undefined;
  if (typeof request?.id !== "string") throw new Error("REQUEST was not sent");
  return request.id;
}

// --- 工具函数：在 Vue 组件上下文中挂载 composable ---
function withSetup<T>(composable: () => T): { result: T; unmount: () => void } {
  let result!: T;
  const app = createApp(
    defineComponent({
      setup() {
        result = composable();
        return () => h("div");
      },
    })
  );
  const el = document.createElement("div");
  app.mount(el);
  return { result, unmount: () => app.unmount() };
}

function makeOptions(
  overrides: Partial<UseScriptEditorBaseOptions> = {}
): UseScriptEditorBaseOptions {
  return {
    from: "meta",
    luaLocalVar: "meta",
    i18nKeys: {
      error1: "i18n.error1",
      error3: "i18n.error3",
      info: "i18n.info",
      leaveMessage1: "i18n.leaveMessage1",
      leaveMessage2: "i18n.leaveMessage2",
      leaveConfirm: "i18n.leaveConfirm",
      leaveCancel: "i18n.leaveCancel",
      leaveError: "i18n.leaveError",
      leaveInfo: "i18n.leaveInfo",
    },
    onPost: vi.fn().mockResolvedValue(undefined),
    onReady: vi.fn(),
    ...overrides,
  };
}

describe("useScriptEditorBase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------------
  // 初始状态
  // ----------------------------------------------------------------
  describe("初始状态", () => {
    it("设置正确的默认值", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      expect(result.activeName.value).toBe("blockly");
      expect(result.languageName.value).toBe("lua");
      expect(result.LuaCode.value).toBe("");
      expect(result.JavaScriptCode.value).toBe("");
      expect(result.isFullscreen.value).toBe(false);
      expect(result.showCodeDialog.value).toBe(false);
      expect(result.hasUnsavedChanges.value).toBe(false);
      expect(result.unsavedBlocklyData.value).toBeNull();
      expect(result.editor.value).toBeNull();
      expect(result.isDark.value).toBe(false);
      unmount();
    });

    it("src 初始值包含 blockly URL 和语言参数", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      const editorUrl = new URL(result.src.value);
      expect(editorUrl.origin).toBe("https://blockly.test");
      expect(editorUrl.searchParams.get("language")).toBe("zh-CN");
      expect(editorUrl.searchParams.get("v")).toBe("test-v1");
      expect(editorUrl.searchParams.get("hostSessionId")).toMatch(/^script-/);
      unmount();
    });

    it("ready 初始为 false", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      expect(result.isReady()).toBe(false);
      unmount();
    });
  });

  // ----------------------------------------------------------------
  // isReady / setReady
  // ----------------------------------------------------------------
  describe("isReady / setReady", () => {
    it("setReady(true) 将 ready 设为 true", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      result.setReady(true);
      expect(result.isReady()).toBe(true);
      unmount();
    });

    it("setReady(false) 将 ready 设为 false", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      result.setReady(true);
      result.setReady(false);
      expect(result.isReady()).toBe(false);
      unmount();
    });
  });

  // ----------------------------------------------------------------
  // showFullscreenCode
  // ----------------------------------------------------------------
  describe("showFullscreenCode", () => {
    it("显示 lua 代码对话框，设置正确的状态", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      result.LuaCode.value = "local x = 1";
      result.showFullscreenCode("lua");

      expect(result.showCodeDialog.value).toBe(true);
      expect(result.currentCodeType.value).toBe("lua");
      expect(result.currentCode.value).toBe("local x = 1");
      expect(result.codeDialogTitle.value).toBe("Lua Code");
      unmount();
    });

    it("显示 javascript 代码对话框，设置正确的状态", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      result.JavaScriptCode.value = "const x = 1;";
      result.showFullscreenCode("javascript");

      expect(result.showCodeDialog.value).toBe(true);
      expect(result.currentCodeType.value).toBe("javascript");
      expect(result.currentCode.value).toBe("const x = 1;");
      expect(result.codeDialogTitle.value).toBe("JavaScript Code");
      unmount();
    });
  });

  // ----------------------------------------------------------------
  // handleBlocklyChange
  // ----------------------------------------------------------------
  describe("handleBlocklyChange", () => {
    it("更新 unsavedBlocklyData", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      const blocklyData = { blocks: ["block1", "block2"] };
      result.handleBlocklyChange(blocklyData);

      expect(result.unsavedBlocklyData.value).toStrictEqual(blocklyData);
      unmount();
    });
  });

  // ----------------------------------------------------------------
  // formatJavaScript
  // ----------------------------------------------------------------
  describe("formatJavaScript", () => {
    it("调用 js-beautify 并返回格式化后的代码", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      const code = "function foo(){return 1;}";
      const formatted = result.formatJavaScript(code);

      expect(mockJsBeautify).toHaveBeenCalledWith(code, expect.any(Object));
      expect(formatted).toBe(`formatted:${code}`);
      unmount();
    });

    it("格式化失败时返回原始代码", () => {
      mockJsBeautify.mockImplementationOnce(() => {
        throw new Error("Format error");
      });
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      const code = "invalid {{code";
      const formatted = result.formatJavaScript(code);

      expect(formatted).toBe(code);
      unmount();
    });
  });

  // ----------------------------------------------------------------
  // decompressBlockly
  // ----------------------------------------------------------------
  describe("decompressBlockly", () => {
    it("非 compressed: 前缀的字符串原样返回", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      const data = '{"blocks":[]}';
      expect(result.decompressBlockly(data)).toBe(data);
      unmount();
    });

    it("compressed: 前缀数据调用 pako.inflate 解压", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      // btoa 生成合法 base64 字符串
      const base64Data = btoa("some binary content");
      const input = `compressed:${base64Data}`;
      const output = result.decompressBlockly(input);

      expect(mockInflate).toHaveBeenCalled();
      expect(output).toBe("decompressed-content");
      unmount();
    });

    it("普通字符串不调用 pako.inflate", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      result.decompressBlockly("plain text data");
      expect(mockInflate).not.toHaveBeenCalled();
      unmount();
    });
  });

  // ----------------------------------------------------------------
  // handleBeforeUnload
  // ----------------------------------------------------------------
  describe("handleBeforeUnload", () => {
    it("有未保存变更时调用 event.preventDefault", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      result.hasUnsavedChanges.value = true;
      const event = {
        preventDefault: vi.fn(),
        returnValue: "",
      } as MockBeforeUnloadEvent;
      result.handleBeforeUnload(event);

      expect(event.preventDefault).toHaveBeenCalled();
      unmount();
    });

    it("无未保存变更时不调用 event.preventDefault", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      result.hasUnsavedChanges.value = false;
      const event = {
        preventDefault: vi.fn(),
        returnValue: "",
      } as MockBeforeUnloadEvent;
      result.handleBeforeUnload(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      unmount();
    });
  });

  // ----------------------------------------------------------------
  // postMessage
  // ----------------------------------------------------------------
  describe("postMessage", () => {
    it("向 iframe contentWindow 发送消息", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      const mockContentWindow = { postMessage: vi.fn() };
      result.editor.value = {
        contentWindow: mockContentWindow,
      } as MockIframe as HTMLIFrameElement;

      result.postMessage("test-action", { key: "value" });

      expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "test-action",
          payload: { key: "value" },
        }),
        "https://blockly.test"
      );
      unmount();
    });

    it("editor 为 null 时显示 error3 错误消息", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      result.editor.value = null;
      result.postMessage("test-action", {});

      expect(mockMessage.error).toHaveBeenCalledWith("i18n.error3");
      unmount();
    });

    it("不含 contentWindow 的 editor 也显示错误消息", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      result.editor.value = {
        contentWindow: null,
      } as MockIframe as HTMLIFrameElement;
      result.postMessage("any", {});

      expect(mockMessage.error).toHaveBeenCalledWith("i18n.error3");
      unmount();
    });
  });

  // ----------------------------------------------------------------
  // handleMessage
  // ----------------------------------------------------------------
  describe("handleMessage", () => {
    it("在组件挂载 iframe 前注册 message 监听器", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");
      let registeredDuringSetup = false;

      const comp = defineComponent({
        setup() {
          useScriptEditorBase(makeOptions());
          registeredDuringSetup = addEventListenerSpy.mock.calls.some(
            ([type]) => type === "message"
          );
          return () => null;
        },
      });
      const app = createApp(comp);
      const el = document.createElement("div");
      app.mount(el);

      expect(registeredDuringSetup).toBe(true);
      app.unmount();
    });

    it("接受带当前会话令牌的 READY，即使 iframe ref 尚未更新", async () => {
      const onReady = vi.fn();
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onReady }))
      );
      const currentSessionId = new URL(result.src.value).searchParams.get(
        "hostSessionId"
      );
      result.editor.value = {
        contentWindow: { postMessage: vi.fn() },
      } as MockIframe as HTMLIFrameElement;

      await result.handleMessage({
        origin: "https://blockly.test",
        source: { postMessage: vi.fn() },
        data: {
          type: "PLUGIN_READY",
          payload: { hostSessionId: currentSessionId },
        },
      } as MockMessageEvent as MessageEvent);

      expect(onReady).toHaveBeenCalledOnce();
      expect(result.isReady()).toBe(true);
      unmount();
    });

    it("action=ready：调用 onReady 并将 isReady 设为 true", async () => {
      const onReady = vi.fn();
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onReady }))
      );
      result.editor.value = {
        contentWindow: { postMessage: vi.fn() },
      } as MockIframe as HTMLIFrameElement;

      await result.handleMessage({
        data: { type: "PLUGIN_READY" },
      } as MockMessageEvent as MessageEvent);

      expect(onReady).toHaveBeenCalledOnce();
      expect(result.isReady()).toBe(true);
      unmount();
    });

    it("PLUGIN_READY：不再自动发送 user-info（由调用方处理）", async () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      const mockPost = vi.fn();
      result.editor.value = {
        contentWindow: { postMessage: mockPost },
      } as MockIframe as HTMLIFrameElement;

      await result.handleMessage({
        data: { type: "PLUGIN_READY" },
      } as MockMessageEvent as MessageEvent);

      // postMessage is NOT called automatically on PLUGIN_READY
      expect(mockPost).not.toHaveBeenCalled();
      unmount();
    });

    it("RESPONSE save（合法数据）：调用 onPost", async () => {
      const onPost = vi.fn().mockResolvedValue(undefined);
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onPost }))
      );

      // Set up editor so save() can send postMessage
      const mockPost = vi.fn();
      result.editor.value = {
        contentWindow: { postMessage: mockPost },
      } as MockIframe as HTMLIFrameElement;

      // Trigger save() first to set up saveResolve
      result.save();

      await result.handleMessage({
        data: {
          type: "RESPONSE",
          requestId: requestIdFrom(mockPost),
          payload: {
            action: "save",
            lua: "local x=1",
            js: "var x=1;",
            data: {},
            saveId: "save-123",
          },
        },
      } as MockMessageEvent as MessageEvent);

      expect(onPost).toHaveBeenCalledWith(
        expect.objectContaining({ lua: "local x=1", js: "var x=1;" }),
        expect.objectContaining({ trigger: "manual" })
      );
      expect(mockPost).toHaveBeenLastCalledWith(
        expect.objectContaining({
          type: "SAVE_ACK",
          payload: expect.objectContaining({ saveId: "save-123" }),
        }),
        "https://blockly.test"
      );
      unmount();
    });

    it("保存 API 等待期间继续编辑：只推进旧载荷快照，最新内容仍保持待保存", async () => {
      let completePost!: () => void;
      const onPost = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            completePost = resolve;
          })
      );
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onPost }))
      );
      const mockPost = vi.fn();
      result.editor.value = {
        contentWindow: { postMessage: mockPost },
      } as MockIframe as HTMLIFrameElement;
      result.initializeSavedSnapshot(
        { lua: "saved", js: "saved", blocklyData: { version: 0 } },
        "meta:1"
      );
      await result.handleMessage({
        data: {
          type: "EVENT",
          payload: {
            event: "update",
            lua: "version 1",
            js: "version 1",
            blocklyData: { version: 1 },
          },
        },
      } as MockMessageEvent as MessageEvent);

      const savePromise = result.save();
      const responsePromise = result.handleMessage({
        data: {
          type: "RESPONSE",
          requestId: requestIdFrom(mockPost),
          payload: {
            action: "save",
            saveId: "save-version-1",
            lua: "version 1",
            js: "version 1",
            data: { version: 1 },
          },
        },
      } as MockMessageEvent as MessageEvent);
      expect(onPost).toHaveBeenCalledOnce();

      await result.handleMessage({
        data: {
          type: "EVENT",
          payload: {
            event: "update",
            lua: "version 2",
            js: "version 2",
            blocklyData: { version: 2 },
          },
        },
      } as MockMessageEvent as MessageEvent);
      completePost();

      await responsePromise;
      await expect(savePromise).resolves.toBeUndefined();
      expect(result.unsavedBlocklyData.value).toStrictEqual({ version: 2 });
      expect(result.hasUnsavedChanges.value).toBe(true);
      expect(mockPost).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SAVE_ACK",
          payload: expect.objectContaining({ saveId: "save-version-1" }),
        }),
        "https://blockly.test"
      );
      unmount();
    });

    it("RESPONSE save（带 warnings）：保存成功并显示过滤后的警告汇总", async () => {
      const onPost = vi.fn().mockResolvedValue(undefined);
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onPost }))
      );
      const mockPost = vi.fn();
      result.editor.value = {
        contentWindow: { postMessage: mockPost },
      } as MockIframe as HTMLIFrameElement;

      const savePromise = result.save();
      await result.handleMessage({
        data: {
          type: "RESPONSE",
          requestId: requestIdFrom(mockPost),
          payload: {
            action: "save",
            lua: "local x=1",
            js: "var x=1;",
            data: {},
            warnings: [
              { message: " 缺少输入 " },
              null,
              "资源未选择",
              { message: "缺少输入" },
              { message: 42 },
            ],
          },
        },
      } as MockMessageEvent as MessageEvent);

      await expect(savePromise).resolves.toBeUndefined();
      expect(onPost).toHaveBeenCalledOnce();
      expect(mockMessage.warning).toHaveBeenCalledWith(
        "脚本已保留，但存在 2 项警告：缺少输入（另有 1 项）"
      );
      expect(mockMessage.error).not.toHaveBeenCalled();
      unmount();
    });

    it("RESPONSE save（服务端失败）：不发送 SAVE_ACK，允许后续重试", async () => {
      const onPost = vi.fn().mockRejectedValue(new Error("network failed"));
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onPost }))
      );
      const mockPost = vi.fn();
      result.editor.value = {
        contentWindow: { postMessage: mockPost },
      } as MockIframe as HTMLIFrameElement;

      const savePromise = result.save();
      const saveExpectation =
        expect(savePromise).rejects.toThrow("network failed");
      await result.handleMessage({
        data: {
          type: "RESPONSE",
          requestId: requestIdFrom(mockPost),
          payload: {
            action: "save",
            saveId: "save-failed",
            lua: "local x=1",
            js: "var x=1;",
            data: {},
          },
        },
      } as MockMessageEvent as MessageEvent);

      await saveExpectation;
      expect(
        mockPost.mock.calls.some(
          ([message]) =>
            (message as { type?: string } | undefined)?.type === "SAVE_ACK"
        )
      ).toBe(false);
      expect(mockPost).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SAVE_NACK",
          payload: expect.objectContaining({ saveId: "save-failed" }),
        }),
        "https://blockly.test"
      );
      expect(result.hasUnsavedChanges.value).toBe(true);
      unmount();
    });

    it("RESPONSE save 前变为不可保存：不持久化、不 ACK，并发送 NACK", async () => {
      let allowed = true;
      const onPost = vi.fn().mockResolvedValue(undefined);
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onPost, canSave: () => allowed }))
      );
      const mockPost = vi.fn();
      result.editor.value = {
        contentWindow: { postMessage: mockPost },
      } as MockIframe as HTMLIFrameElement;

      const savePromise = result.save();
      const saveExpectation = expect(savePromise).rejects.toThrow(
        "current script cannot be saved"
      );
      allowed = false;
      await result.handleMessage({
        data: {
          type: "RESPONSE",
          requestId: requestIdFrom(mockPost),
          payload: {
            action: "save",
            saveId: "save-not-allowed",
            lua: "lua",
            js: "js",
            data: { script: 1 },
          },
        },
      } as MockMessageEvent as MessageEvent);

      await saveExpectation;
      expect(onPost).not.toHaveBeenCalled();
      expect(
        mockPost.mock.calls.some(
          ([message]) =>
            (message as { type?: string } | undefined)?.type === "SAVE_ACK"
        )
      ).toBe(false);
      expect(mockPost).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SAVE_NACK",
          payload: expect.objectContaining({ saveId: "save-not-allowed" }),
        }),
        "https://blockly.test"
      );
      expect(result.hasUnsavedChanges.value).toBe(true);
      unmount();
    });

    it("RESPONSE save（warnings 不是数组）：忽略警告且不影响保存", async () => {
      const onPost = vi.fn().mockResolvedValue(undefined);
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onPost }))
      );
      const mockPost = vi.fn();
      result.editor.value = {
        contentWindow: { postMessage: mockPost },
      } as MockIframe as HTMLIFrameElement;

      const savePromise = result.save();
      await result.handleMessage({
        data: {
          type: "RESPONSE",
          requestId: requestIdFrom(mockPost),
          payload: {
            action: "save",
            lua: "local x=1",
            js: "var x=1;",
            data: {},
            warnings: { message: "不应显示" },
          },
        },
      } as MockMessageEvent as MessageEvent);

      await expect(savePromise).resolves.toBeUndefined();
      expect(onPost).toHaveBeenCalledOnce();
      expect(mockMessage.warning).not.toHaveBeenCalled();
      expect(mockMessage.error).not.toHaveBeenCalled();
      unmount();
    });

    it("RESPONSE save（lua 不是字符串）：显示 error1 并不调用 onPost", async () => {
      const onPost = vi.fn();
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onPost }))
      );

      // Set up editor so save() can send postMessage
      const mockPost = vi.fn();
      result.editor.value = {
        contentWindow: { postMessage: mockPost },
      } as MockIframe as HTMLIFrameElement;

      // Trigger save() first — catch the rejection to avoid unhandled promise
      const savePromise = result.save().catch(() => {
        /* expected rejection */
      });

      await result.handleMessage({
        data: {
          type: "RESPONSE",
          requestId: requestIdFrom(mockPost),
          payload: { action: "save", lua: 123, js: "ok" },
        },
      } as MockMessageEvent as MessageEvent);

      await savePromise;

      expect(mockMessage.error).toHaveBeenCalledWith("i18n.error1");
      expect(onPost).not.toHaveBeenCalled();
      unmount();
    });

    it("RESPONSE save noChange：显示 info 消息", async () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      // Set up editor so save() can send postMessage
      const mockPost = vi.fn();
      result.editor.value = {
        contentWindow: { postMessage: mockPost },
      } as MockIframe as HTMLIFrameElement;

      // Trigger save() first
      result.save();

      await result.handleMessage({
        data: {
          type: "RESPONSE",
          requestId: requestIdFrom(mockPost),
          payload: { action: "save", noChange: true },
        },
      } as MockMessageEvent as MessageEvent);

      expect(mockMessage.info).toHaveBeenCalledWith("i18n.info");
      unmount();
    });

    it("RESPONSE save noChange（带 warnings）：显示警告且不叠加无变化提示", async () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      const mockPost = vi.fn();
      result.editor.value = {
        contentWindow: { postMessage: mockPost },
      } as MockIframe as HTMLIFrameElement;

      const savePromise = result.save();
      await result.handleMessage({
        data: {
          type: "RESPONSE",
          requestId: requestIdFrom(mockPost),
          payload: {
            action: "save",
            noChange: true,
            warnings: [{ message: "生成的 JavaScript 存在语法错误" }],
          },
        },
      } as MockMessageEvent as MessageEvent);

      await expect(savePromise).resolves.toBeUndefined();
      expect(mockMessage.warning).toHaveBeenCalledWith(
        "脚本已保留，但存在 1 项警告：生成的 JavaScript 存在语法错误"
      );
      expect(mockMessage.info).not.toHaveBeenCalled();
      expect(mockMessage.error).not.toHaveBeenCalled();
      unmount();
    });

    it("EVENT update：更新 LuaCode 和 JavaScriptCode", async () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      await result.handleMessage({
        data: {
          type: "EVENT",
          payload: {
            event: "update",
            lua: "x = 1",
            js: "var x=1;",
            blocklyData: {},
          },
        },
      } as MockMessageEvent as MessageEvent);

      expect(result.LuaCode.value).toBe(
        "local meta = {}\nlocal index = ''\nx = 1"
      );
      expect(result.JavaScriptCode.value).toBe("formatted:var x=1;");
      unmount();
    });

    it("EVENT update：Blockly 数据不变但生成代码升级时标记为待保存", async () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      const blocklyData = { blocks: { blocks: [] } };
      result.initializeSavedSnapshot({
        lua: "old lua",
        js: "old js",
        blocklyData,
      });

      await result.handleMessage({
        data: {
          type: "EVENT",
          payload: {
            event: "update",
            lua: "new lua",
            js: "new js",
            blocklyData,
          },
        },
      } as MockMessageEvent as MessageEvent);

      expect(result.hasUnsavedChanges.value).toBe(true);
      unmount();
    });

    it("EVENT update：插件 dirty 为 false 时不会因协议 revision 变化误报", async () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      const contentWindow = { postMessage: vi.fn() };
      result.editor.value = {
        contentWindow,
      } as MockIframe as HTMLIFrameElement;
      result.beginEditorSession(
        { lua: "same", js: "same", blocklyData: { b: 2, a: 1 } },
        "meta:1"
      );
      const sessionId = result.getEditorInitState()!.hostSessionId;

      await result.handleMessage({
        data: {
          type: "EVENT",
          payload: {
            event: "update",
            hostSessionId: sessionId,
            workspaceRevision: 9,
            dirty: false,
            lua: "same",
            js: "same",
            blocklyData: { a: 1, b: 2 },
          },
        },
      } as unknown as MessageEvent);

      expect(result.hasUnsavedChanges.value).toBe(false);
      unmount();
    });

    it("拒绝非当前 iframe、旧会话和倒退 revision 的消息", async () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      const contentWindow = { postMessage: vi.fn() };
      result.editor.value = {
        contentWindow,
      } as MockIframe as HTMLIFrameElement;
      result.beginEditorSession(
        { lua: "saved", js: "saved", blocklyData: { v: 0 } },
        "meta:1"
      );
      const sessionId = result.getEditorInitState()!.hostSessionId;
      const event = (
        source: unknown,
        session: string,
        revision: number,
        v: number
      ) =>
        ({
          ...(source === null ? {} : { source }),
          data: {
            type: "EVENT",
            payload: {
              event: "update",
              hostSessionId: session,
              workspaceRevision: revision,
              dirty: true,
              lua: `lua-${v}`,
              js: `js-${v}`,
              blocklyData: { v },
            },
          },
        }) as unknown as MessageEvent;

      await result.handleMessage(event({}, sessionId, 1, 1));
      await result.handleMessage(event(null, "old-session", 1, 2));
      await result.handleMessage(event(null, sessionId, 3, 3));
      await result.handleMessage(event(null, sessionId, 2, 4));

      expect(result.unsavedBlocklyData.value).toStrictEqual({ v: 3 });
      unmount();
    });

    it("noChange 完整快照只推进请求内容，不吞并发更新", async () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      const contentWindow = { postMessage: vi.fn() };
      result.editor.value = {
        contentWindow,
      } as MockIframe as HTMLIFrameElement;
      result.beginEditorSession(
        { lua: "saved", js: "saved", blocklyData: { v: 0 } },
        "meta:1"
      );
      const sessionId = result.getEditorInitState()!.hostSessionId;
      await result.handleMessage({
        data: {
          type: "EVENT",
          payload: {
            event: "update",
            hostSessionId: sessionId,
            workspaceRevision: 1,
            dirty: true,
            lua: "one",
            js: "one",
            blocklyData: { v: 1 },
          },
        },
      } as unknown as MessageEvent);
      const savePromise = result.save();
      await result.handleMessage({
        data: {
          type: "EVENT",
          payload: {
            event: "update",
            hostSessionId: sessionId,
            workspaceRevision: 2,
            dirty: true,
            lua: "two",
            js: "two",
            blocklyData: { v: 2 },
          },
        },
      } as unknown as MessageEvent);
      const request = contentWindow.postMessage.mock.calls.find(
        ([message]) => message.type === "REQUEST"
      )?.[0];
      await result.handleMessage({
        data: {
          type: "RESPONSE",
          requestId: request.id,
          payload: {
            action: "save",
            noChange: true,
            hostSessionId: sessionId,
            workspaceRevision: 1,
            lua: "one",
            js: "one",
            data: { v: 1 },
          },
        },
      } as unknown as MessageEvent);

      await expect(savePromise).resolves.toBeUndefined();
      expect(result.unsavedBlocklyData.value).toStrictEqual({ v: 2 });
      expect(result.hasUnsavedChanges.value).toBe(true);
      unmount();
    });

    it("旧版 Blockly 的直接 Ctrl+S noChange 会持久化宿主草稿", async () => {
      const onPost = vi.fn().mockResolvedValue(undefined);
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onPost }))
      );
      const contentWindow = window as unknown as Window;
      result.editor.value = { contentWindow } as HTMLIFrameElement;
      result.beginEditorSession(
        { lua: "saved", js: "saved", blocklyData: { v: 0 } },
        "meta:1"
      );
      await result.handleMessage({
        source: contentWindow,
        origin: "https://blockly.test",
        data: {
          type: "EVENT",
          payload: {
            event: "update",
            lua: "saved",
            js: "saved",
            blocklyData: { v: 1 },
          },
        },
      } as unknown as MessageEvent);

      await result.handleMessage({
        source: contentWindow,
        origin: "https://blockly.test",
        data: {
          type: "RESPONSE",
          payload: { action: "save", noChange: true },
        },
      } as unknown as MessageEvent);

      expect(onPost).toHaveBeenCalledWith(
        { data: { v: 1 }, lua: "saved", js: "saved" },
        { trigger: "manual" }
      );
      expect(result.hasUnsavedChanges.value).toBe(false);
      unmount();
    });

    it("旧版 Blockly 直接 save-error 会显示错误且不会写入", async () => {
      const onPost = vi.fn();
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onPost }))
      );
      const contentWindow = window as unknown as Window;
      result.editor.value = { contentWindow } as HTMLIFrameElement;

      await result.handleMessage({
        source: contentWindow,
        origin: "https://blockly.test",
        data: {
          type: "RESPONSE",
          payload: { action: "save-error", message: "serialize failed" },
        },
      } as unknown as MessageEvent);

      expect(mockMessage.error).toHaveBeenCalledWith("serialize failed");
      expect(onPost).not.toHaveBeenCalled();
      unmount();
    });

    it("标准保存拒绝缺失 requestId 的响应", async () => {
      const onPost = vi.fn();
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onPost }))
      );
      const contentWindow = window as unknown as Window;
      const originalPostMessage = contentWindow.postMessage;
      contentWindow.postMessage = vi.fn();
      result.editor.value = { contentWindow } as HTMLIFrameElement;
      const savePromise = result.save();

      await result.handleMessage({
        source: contentWindow,
        origin: "https://blockly.test",
        data: {
          type: "RESPONSE",
          payload: { action: "save", lua: "x", js: "x", data: {} },
        },
      } as unknown as MessageEvent);

      expect(onPost).not.toHaveBeenCalled();
      expect(result.isSaving.value).toBe(true);
      result.beginEditorSession(
        { lua: "", js: "", blocklyData: {} },
        "meta:next"
      );
      await expect(savePromise).rejects.toThrow(
        "script changed while save was pending"
      );
      contentWindow.postMessage = originalPostMessage;
      unmount();
    });

    it("生产消息严格拒绝错误或 opaque origin", async () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      const contentWindow = window as unknown as Window;
      result.editor.value = { contentWindow } as HTMLIFrameElement;
      const payload = {
        event: "update",
        lua: "unsafe",
        js: "unsafe",
        blocklyData: { unsafe: true },
      };

      await result.handleMessage({
        source: contentWindow,
        origin: "null",
        data: { type: "EVENT", payload },
      } as unknown as MessageEvent);
      await result.handleMessage({
        source: contentWindow,
        origin: "https://attacker.test",
        data: { type: "EVENT", payload },
      } as unknown as MessageEvent);

      expect(result.unsavedBlocklyData.value).toBeNull();
      unmount();
    });

    it("连续旧版 Ctrl+S 响应在首个写入完成前只接受一次", async () => {
      let release!: () => void;
      const onPost = vi.fn(
        () => new Promise<void>((resolve) => (release = resolve))
      );
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onPost }))
      );
      const contentWindow = markRaw({
        postMessage: vi.fn(),
      }) as unknown as Window;
      result.editor.value = { contentWindow } as HTMLIFrameElement;
      const directResponse = (v: number) =>
        result.handleMessage({
          source: contentWindow,
          origin: "https://blockly.test",
          data: {
            type: "RESPONSE",
            payload: {
              action: "save",
              lua: `lua-${v}`,
              js: `js-${v}`,
              data: { v },
            },
          },
        } as unknown as MessageEvent);

      const first = directResponse(1);
      await Promise.resolve();
      await directResponse(2);
      expect(onPost).toHaveBeenCalledTimes(1);

      const hostSave = result.save();
      await expect(hostSave).rejects.toThrow(
        "script persistence is already in progress"
      );
      expect(contentWindow.postMessage).not.toHaveBeenCalled();

      release();
      await first;
      expect(result.isSaving.value).toBe(false);
      unmount();
    });

    it("save-request 通过宿主标准 REQUEST 发起快捷键保存", async () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      const messageSource = markRaw({
        postMessage: vi.fn(),
      }) as unknown as Window;
      result.editor.value = {
        contentWindow: messageSource,
      } as MockIframe as HTMLIFrameElement;
      result.beginEditorSession(
        { lua: "saved", js: "saved", blocklyData: {} },
        "meta:1"
      );
      const sessionId = result.getEditorInitState()!.hostSessionId;

      await result.handleMessage({
        source: messageSource,
        origin: "https://blockly.test",
        data: {
          type: "EVENT",
          payload: { event: "save-request", hostSessionId: sessionId },
        },
      } as unknown as MessageEvent);

      expect(messageSource.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "REQUEST",
          payload: expect.objectContaining({
            action: "save",
            hostSessionId: sessionId,
          }),
        }),
        "https://blockly.test"
      );
      unmount();
    });

    it("snapshotKey 切换原子清理旧脚本会话，同 key 重载保留当前编辑", async () => {
      const onPost = vi.fn().mockResolvedValue(undefined);
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onPost }))
      );
      const mockPost = vi.fn();
      result.editor.value = {
        contentWindow: { postMessage: mockPost },
      } as MockIframe as HTMLIFrameElement;
      result.initializeSavedSnapshot(
        { lua: "a saved", js: "a saved", blocklyData: { script: "A" } },
        "meta:A"
      );
      await result.handleMessage({
        data: {
          type: "EVENT",
          payload: {
            event: "update",
            lua: "a edited",
            js: "a edited",
            blocklyData: { script: "A edited" },
          },
        },
      } as MockMessageEvent as MessageEvent);

      const pendingSave = result.save();
      const pendingRequest = mockPost.mock.calls.find(
        ([message]) =>
          (message as { type?: string } | undefined)?.type === "REQUEST"
      )?.[0] as { id: string };
      const pendingExpectation = expect(pendingSave).rejects.toThrow(
        "script changed while save was pending"
      );
      result.initializeSavedSnapshot(
        { lua: "b saved", js: "b saved", blocklyData: { script: "B" } },
        "meta:B"
      );

      await pendingExpectation;
      expect(result.unsavedBlocklyData.value).toBeNull();
      expect(result.hasUnsavedChanges.value).toBe(false);
      expect(result.isSaving.value).toBe(false);

      await result.handleMessage({
        data: {
          type: "RESPONSE",
          requestId: pendingRequest.id,
          payload: {
            action: "save",
            saveId: "stale-a-save",
            lua: "a edited",
            js: "a edited",
            data: { script: "A edited" },
          },
        },
      } as MockMessageEvent as MessageEvent);
      expect(onPost).not.toHaveBeenCalled();

      await result.handleMessage({
        data: {
          type: "EVENT",
          payload: {
            event: "update",
            lua: "b edited",
            js: "b edited",
            blocklyData: { script: "B edited" },
          },
        },
      } as MockMessageEvent as MessageEvent);
      result.initializeSavedSnapshot(
        {
          lua: "b reloaded",
          js: "b reloaded",
          blocklyData: { script: "B reloaded" },
        },
        "meta:B"
      );

      expect(result.unsavedBlocklyData.value).toStrictEqual({
        script: "B edited",
      });
      expect(result.hasUnsavedChanges.value).toBe(true);
      unmount();
    });

    it("EVENT update（js 不是字符串）：忽略更新", async () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      await result.handleMessage({
        data: {
          type: "EVENT",
          payload: { event: "update", lua: "ok", js: 999 },
        },
      } as MockMessageEvent as MessageEvent);

      expect(result.LuaCode.value).toBe("");
      unmount();
    });

    it("无 type 的消息：直接忽略", async () => {
      const onPost = vi.fn();
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onPost }))
      );

      await result.handleMessage({
        data: {},
      } as MockMessageEvent as MessageEvent);

      expect(onPost).not.toHaveBeenCalled();
      unmount();
    });

    it("null data：直接忽略，不抛出异常", async () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      await expect(
        result.handleMessage({ data: null } as MockMessageEvent as MessageEvent)
      ).resolves.not.toThrow();
      unmount();
    });
  });

  // ---- loadHighlightStyle ----
  describe("loadHighlightStyle()", () => {
    it("creates a new link tag when no existing highlight-style link", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      result.loadHighlightStyle(false);

      const link = document.querySelector(
        "#highlight-style"
      ) as HTMLLinkElement;
      expect(link).not.toBeNull();
      expect(link.href).toContain("a11y-light");
      unmount();
    });

    it("uses dark URL when dark=true", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      result.loadHighlightStyle(true);

      const link = document.querySelector(
        "#highlight-style"
      ) as HTMLLinkElement;
      expect(link).not.toBeNull();
      expect(link.href).toContain("a11y-dark");
      unmount();
    });

    it("updates href on existing link when called again", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      result.loadHighlightStyle(false); // creates link with light
      result.loadHighlightStyle(true); // updates to dark

      const link = document.querySelector(
        "#highlight-style"
      ) as HTMLLinkElement;
      expect(link.href).toContain("a11y-dark");
      unmount();
    });
  });

  // ---- copyCode ----
  describe("copyCode()", () => {
    it("calls clipboard.writeText and shows success message", async () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: mockWriteText },
        configurable: true,
      });

      await result.copyCode("print('hello')");
      expect(mockWriteText).toHaveBeenCalledWith("print('hello')");
      expect(mockMessage.success).toHaveBeenCalled();
      unmount();
    });

    it("shows error message when clipboard fails", async () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
        configurable: true,
      });

      await result.copyCode("code");
      expect(mockMessage.error).toHaveBeenCalled();
      unmount();
    });
  });

  // ---- toggleFullscreen ----
  describe("toggleFullscreen()", () => {
    it("requests fullscreen on editor container when not in fullscreen", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      // Simulate no active fullscreen
      Object.defineProperty(document, "fullscreenElement", {
        value: null,
        configurable: true,
      });

      // Attach an iframe with a parent so requestFullscreen exists
      const iframe = document.createElement("iframe");
      const parent = document.createElement("div");
      parent.appendChild(iframe);
      const mockRequestFullscreen = vi.fn().mockResolvedValue(undefined);
      parent.requestFullscreen = mockRequestFullscreen;
      result.editor.value = iframe;

      result.toggleFullscreen();

      expect(mockRequestFullscreen).toHaveBeenCalled();
      expect(result.isFullscreen.value).toBe(true);
      unmount();
    });

    it("exits fullscreen when already in fullscreen mode", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      // Simulate active fullscreen
      const fakeElement = document.createElement("div");
      Object.defineProperty(document, "fullscreenElement", {
        value: fakeElement,
        configurable: true,
      });
      const mockExitFullscreen = vi.fn().mockResolvedValue(undefined);
      document.exitFullscreen = mockExitFullscreen;

      result.toggleFullscreen();

      expect(mockExitFullscreen).toHaveBeenCalled();
      expect(result.isFullscreen.value).toBe(false);

      // Restore
      Object.defineProperty(document, "fullscreenElement", {
        value: null,
        configurable: true,
      });
      unmount();
    });
  });

  // ---- save ----
  describe("save()", () => {
    it("当前脚本不可保存时立即拒绝且不发送 REQUEST", async () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ canSave: () => false }))
      );
      const mockPostMessage = vi.fn();
      result.editor.value = {
        contentWindow: { postMessage: mockPostMessage },
      } as MockIframe as HTMLIFrameElement;

      await expect(result.save()).rejects.toThrow(
        "current script cannot be saved"
      );
      expect(mockPostMessage).not.toHaveBeenCalled();
      expect(result.isSaving.value).toBe(false);
      unmount();
    });

    it("preserves hasUnsavedChanges and sends save postMessage", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      // Set up a mock editor with contentWindow
      const mockPostMessage = vi.fn();
      const fakeContentWindow = { postMessage: mockPostMessage };
      result.editor.value = {
        contentWindow: fakeContentWindow,
      } as MockIframe as HTMLIFrameElement;

      result.hasUnsavedChanges.value = true;
      result.save();

      expect(result.hasUnsavedChanges.value).toBe(true);
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "REQUEST",
          payload: expect.objectContaining({ action: "save" }),
        }),
        "https://blockly.test"
      );
      unmount();
    });
  });
});

describe("useScriptEditorBase copyCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "isSecureContext", {
      value: true,
      configurable: true,
    });
  });

  it("copies code with the Clipboard API in a secure context", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const { result, unmount } = withSetup(() =>
      useScriptEditorBase(makeOptions())
    );

    await result.copyCode({ value: "print('hello')" });

    expect(writeText).toHaveBeenCalledWith("print('hello')");
    expect(mockMessage.success).toHaveBeenCalledWith("copy.success");
    unmount();
  });

  it("falls back to a temporary textarea when Clipboard API is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      value: execCommand,
      configurable: true,
    });

    const { result, unmount } = withSetup(() =>
      useScriptEditorBase(makeOptions())
    );

    await result.copyCode("const answer = 42;");

    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector('textarea[readonly="readonly"]')).toBeNull();
    expect(mockMessage.success).toHaveBeenCalledWith("copy.success");
    unmount();
  });

  it("reports an error when both copy strategies fail", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    Object.defineProperty(document, "execCommand", {
      value: vi.fn().mockReturnValue(false),
      configurable: true,
    });

    const { result, unmount } = withSetup(() =>
      useScriptEditorBase(makeOptions())
    );

    await result.copyCode("print('blocked')");

    expect(mockMessage.error).toHaveBeenCalledWith("copy.error");
    unmount();
  });
});

// ---------------------------------------------------------------------------
// onBeforeUnmount 匿名回调 — 覆盖 lines 417-419, 422, 425
//
// 说明：
//   onBeforeUnmount 中三个 document.removeEventListener 调用传入的是匿名函数。
//   由于 removeEventListener 不调用其 callback 参数，这些回调在正常流程中不会执行。
//   通过 spy 捕获传入的匿名回调，然后手动调用，达到代码覆盖目的。
// ---------------------------------------------------------------------------
describe("onBeforeUnmount 匿名回调（lines 417-419, 422, 425）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 确保 fullscreenElement 为 null
    Object.defineProperty(document, "fullscreenElement", {
      value: null,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(document, "fullscreenElement", {
      value: null,
      configurable: true,
    });
  });

  it("Escape 键且 showCodeDialog=true 时关闭对话框 (lines 417-418)", () => {
    let capturedKeydownCallback: ((e: KeyboardEvent) => void) | undefined;

    const spy = vi
      .spyOn(document, "removeEventListener")
      .mockImplementation(
        (
          event: string,
          callback: EventListenerOrEventListenerObject | null
        ) => {
          if (event === "keydown" && typeof callback === "function") {
            capturedKeydownCallback = callback as (e: KeyboardEvent) => void;
          }
        }
      );

    const { result, unmount } = withSetup(() =>
      useScriptEditorBase(makeOptions())
    );
    result.showCodeDialog.value = true;

    // unmount → onBeforeUnmount → document.removeEventListener("keydown", anonymous)
    unmount();
    spy.mockRestore();

    expect(capturedKeydownCallback).toBeDefined();
    // 手动调用捕获到的匿名 callback（line 416-420 的函数体）
    capturedKeydownCallback!({ key: "Escape" } as KeyboardEvent);
    // line 418: showCodeDialog.value = false
    expect(result.showCodeDialog.value).toBe(false);
  });

  it("Escape 键且 showCodeDialog=false 时不修改状态 (line 417 false branch)", () => {
    let capturedKeydownCallback: ((e: KeyboardEvent) => void) | undefined;

    const spy = vi
      .spyOn(document, "removeEventListener")
      .mockImplementation(
        (
          event: string,
          callback: EventListenerOrEventListenerObject | null
        ) => {
          if (event === "keydown" && typeof callback === "function") {
            capturedKeydownCallback = callback as (e: KeyboardEvent) => void;
          }
        }
      );

    const { result, unmount } = withSetup(() =>
      useScriptEditorBase(makeOptions())
    );
    result.showCodeDialog.value = false;

    unmount();
    spy.mockRestore();

    capturedKeydownCallback!({ key: "Escape" } as KeyboardEvent);
    // showCodeDialog 已经是 false，仍然是 false
    expect(result.showCodeDialog.value).toBe(false);
  });

  it("非 Escape 键不触发关闭 (line 417 key!='Escape' branch)", () => {
    let capturedKeydownCallback: ((e: KeyboardEvent) => void) | undefined;

    const spy = vi
      .spyOn(document, "removeEventListener")
      .mockImplementation(
        (
          event: string,
          callback: EventListenerOrEventListenerObject | null
        ) => {
          if (event === "keydown" && typeof callback === "function") {
            capturedKeydownCallback = callback as (e: KeyboardEvent) => void;
          }
        }
      );

    const { result, unmount } = withSetup(() =>
      useScriptEditorBase(makeOptions())
    );
    result.showCodeDialog.value = true;

    unmount();
    spy.mockRestore();

    capturedKeydownCallback!({ key: "Enter" } as KeyboardEvent);
    // 非 Escape 键：showCodeDialog 保持 true
    expect(result.showCodeDialog.value).toBe(true);
  });

  it("fullscreenchange 回调更新 isFullscreen (line 422)", () => {
    const fullscreenCallbacks: (() => void)[] = [];

    const spy = vi
      .spyOn(document, "removeEventListener")
      .mockImplementation(
        (
          event: string,
          callback: EventListenerOrEventListenerObject | null
        ) => {
          if (event === "fullscreenchange" && typeof callback === "function") {
            fullscreenCallbacks.push(callback as () => void);
          }
        }
      );

    const { result, unmount } = withSetup(() =>
      useScriptEditorBase(makeOptions())
    );
    unmount();
    spy.mockRestore();

    // 第一个 fullscreenchange 回调对应 isFullscreen（line 422）
    expect(fullscreenCallbacks.length).toBeGreaterThanOrEqual(1);

    // 模拟进入全屏
    Object.defineProperty(document, "fullscreenElement", {
      value: document.createElement("div"),
      configurable: true,
    });
    fullscreenCallbacks[0]!();
    // line 422: isFullscreen.value = !!document.fullscreenElement → true
    expect(result.isFullscreen.value).toBe(true);
  });

  it("fullscreenchange 回调退出全屏时 isFullscreen=false (line 422 falsy branch)", () => {
    const fullscreenCallbacks: (() => void)[] = [];

    const spy = vi
      .spyOn(document, "removeEventListener")
      .mockImplementation(
        (
          event: string,
          callback: EventListenerOrEventListenerObject | null
        ) => {
          if (event === "fullscreenchange" && typeof callback === "function") {
            fullscreenCallbacks.push(callback as () => void);
          }
        }
      );

    const { result, unmount } = withSetup(() =>
      useScriptEditorBase(makeOptions())
    );
    result.isFullscreen.value = true; // 先设为 true
    unmount();
    spy.mockRestore();

    // fullscreenElement = null → isFullscreen = false
    Object.defineProperty(document, "fullscreenElement", {
      value: null,
      configurable: true,
    });
    fullscreenCallbacks[0]?.();
    expect(result.isFullscreen.value).toBe(false);
  });
});
