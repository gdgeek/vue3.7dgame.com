import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp, defineComponent, h } from "vue";

// --- 提升 mock 变量，确保在工厂函数中可用 ---
const { mockInflate, mockJsBeautify, mockMessage, mockMessageBox } =
  vi.hoisted(() => ({
    mockInflate: vi.fn(() => "decompressed-content"),
    mockJsBeautify: vi.fn((code: string) => `formatted:${code}`),
    mockMessage: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
    mockMessageBox: { confirm: vi.fn() },
  }));

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
  default: { blockly: "https://blockly.test" },
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
      expect(result.disabled.value).toBe(false);
      expect(result.isSceneFullscreen.value).toBe(false);
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
      expect(result.src.value).toBe("https://blockly.test?language=zh-CN");
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
      const event = { preventDefault: vi.fn(), returnValue: "" } as any;
      result.handleBeforeUnload(event);

      expect(event.preventDefault).toHaveBeenCalled();
      unmount();
    });

    it("无未保存变更时不调用 event.preventDefault", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      result.hasUnsavedChanges.value = false;
      const event = { preventDefault: vi.fn(), returnValue: "" } as any;
      result.handleBeforeUnload(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      unmount();
    });
  });

  // ----------------------------------------------------------------
  // handleKeyDown
  // ----------------------------------------------------------------
  describe("handleKeyDown", () => {
    function makeKeyEvent(opts: {
      ctrlKey?: boolean;
      metaKey?: boolean;
      key: string;
    }) {
      return {
        ctrlKey: opts.ctrlKey ?? false,
        metaKey: opts.metaKey ?? false,
        key: opts.key,
        preventDefault: vi.fn(),
      } as any;
    }

    it("Ctrl+S 调用 postMessage 发送 save 命令", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      const mockContentWindow = { postMessage: vi.fn() };
      result.editor.value = { contentWindow: mockContentWindow } as any;

      result.handleKeyDown(makeKeyEvent({ ctrlKey: true, key: "s" }));

      expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ action: "save" }),
        "*"
      );
      unmount();
    });

    it("Meta+S（macOS）同样触发 save", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      const mockContentWindow = { postMessage: vi.fn() };
      result.editor.value = { contentWindow: mockContentWindow } as any;

      result.handleKeyDown(makeKeyEvent({ metaKey: true, key: "s" }));

      expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ action: "save" }),
        "*"
      );
      unmount();
    });

    it("Ctrl+S 调用 event.preventDefault 阻止默认行为", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      result.editor.value = {
        contentWindow: { postMessage: vi.fn() },
      } as any;
      const event = makeKeyEvent({ ctrlKey: true, key: "s" });
      result.handleKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      unmount();
    });

    it("其他按键不触发 save", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      const mockContentWindow = { postMessage: vi.fn() };
      result.editor.value = { contentWindow: mockContentWindow } as any;

      result.handleKeyDown(makeKeyEvent({ ctrlKey: false, key: "a" }));

      expect(mockContentWindow.postMessage).not.toHaveBeenCalled();
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
      result.editor.value = { contentWindow: mockContentWindow } as any;

      result.postMessage("test-action", { key: "value" });

      expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
        { from: "meta", action: "test-action", data: { key: "value" } },
        "*"
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
      result.editor.value = { contentWindow: null } as any;
      result.postMessage("any", {});

      expect(mockMessage.error).toHaveBeenCalledWith("i18n.error3");
      unmount();
    });
  });

  // ----------------------------------------------------------------
  // handleMessage
  // ----------------------------------------------------------------
  describe("handleMessage", () => {
    it("action=ready：调用 onReady 并将 isReady 设为 true", async () => {
      const onReady = vi.fn();
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onReady }))
      );
      result.editor.value = {
        contentWindow: { postMessage: vi.fn() },
      } as any;

      await result.handleMessage({ data: { action: "ready" } } as any);

      expect(onReady).toHaveBeenCalledOnce();
      expect(result.isReady()).toBe(true);
      unmount();
    });

    it("action=ready：发送 user-info 消息给 iframe", async () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );
      const mockPost = vi.fn();
      result.editor.value = { contentWindow: { postMessage: mockPost } } as any;

      await result.handleMessage({ data: { action: "ready" } } as any);

      expect(mockPost).toHaveBeenCalledWith(
        expect.objectContaining({ action: "user-info" }),
        "*"
      );
      unmount();
    });

    it("action=post（合法数据）：调用 onPost", async () => {
      const onPost = vi.fn().mockResolvedValue(undefined);
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onPost }))
      );

      await result.handleMessage({
        data: {
          action: "post",
          data: { lua: "local x=1", js: "var x=1;", data: {} },
        },
      } as any);

      expect(onPost).toHaveBeenCalledWith(
        expect.objectContaining({ lua: "local x=1", js: "var x=1;" })
      );
      unmount();
    });

    it("action=post（lua 不是字符串）：显示 error1 并不调用 onPost", async () => {
      const onPost = vi.fn();
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onPost }))
      );

      await result.handleMessage({
        data: { action: "post", data: { lua: 123, js: "ok" } },
      } as any);

      expect(mockMessage.error).toHaveBeenCalledWith("i18n.error1");
      expect(onPost).not.toHaveBeenCalled();
      unmount();
    });

    it("action=post:no-change：显示 info 消息", async () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      await result.handleMessage({
        data: { action: "post:no-change" },
      } as any);

      expect(mockMessage.info).toHaveBeenCalledWith("i18n.info");
      unmount();
    });

    it("action=update：更新 LuaCode 和 JavaScriptCode", async () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      await result.handleMessage({
        data: {
          action: "update",
          data: { lua: "x = 1", js: "var x=1;", blocklyData: {} },
        },
      } as any);

      expect(result.LuaCode.value).toBe(
        "local meta = {}\nlocal index = ''\nx = 1"
      );
      expect(result.JavaScriptCode.value).toBe("formatted:var x=1;");
      unmount();
    });

    it("action=update（js 不是字符串）：忽略更新", async () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      await result.handleMessage({
        data: { action: "update", data: { lua: "ok", js: 999 } },
      } as any);

      expect(result.LuaCode.value).toBe("");
      unmount();
    });

    it("无 action 的消息：直接忽略", async () => {
      const onPost = vi.fn();
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onPost }))
      );

      await result.handleMessage({ data: {} } as any);

      expect(onPost).not.toHaveBeenCalled();
      unmount();
    });

    it("null data：直接忽略，不抛出异常", async () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      await expect(
        result.handleMessage({ data: null } as any)
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

      const link = document.querySelector("#highlight-style") as HTMLLinkElement;
      expect(link).not.toBeNull();
      expect(link.href).toContain("a11y-light");
      unmount();
    });

    it("uses dark URL when dark=true", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      result.loadHighlightStyle(true);

      const link = document.querySelector("#highlight-style") as HTMLLinkElement;
      expect(link).not.toBeNull();
      expect(link.href).toContain("a11y-dark");
      unmount();
    });

    it("updates href on existing link when called again", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      result.loadHighlightStyle(false); // creates link with light
      result.loadHighlightStyle(true);  // updates to dark

      const link = document.querySelector("#highlight-style") as HTMLLinkElement;
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
      (result.editor as any).value = iframe;

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
    it("sets hasUnsavedChanges to false and sends save postMessage", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      // Set up a mock editor with contentWindow
      const mockPostMessage = vi.fn();
      const fakeContentWindow = { postMessage: mockPostMessage };
      (result.editor as any).value = { contentWindow: fakeContentWindow };

      result.hasUnsavedChanges.value = true;
      result.save();

      expect(result.hasUnsavedChanges.value).toBe(false);
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({ action: "save" }),
        "*"
      );
      unmount();
    });
  });

  // ---- toggleSceneFullscreen ----
  describe("toggleSceneFullscreen()", () => {
    it("requests fullscreen on .runArea element when not in fullscreen", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      Object.defineProperty(document, "fullscreenElement", {
        value: null,
        configurable: true,
      });

      const runArea = document.createElement("div");
      runArea.className = "runArea";
      const mockRequestFullscreen = vi.fn().mockResolvedValue(undefined);
      runArea.requestFullscreen = mockRequestFullscreen;
      document.body.appendChild(runArea);

      result.toggleSceneFullscreen();

      expect(mockRequestFullscreen).toHaveBeenCalled();
      expect(result.isSceneFullscreen.value).toBe(true);

      document.body.removeChild(runArea);
      Object.defineProperty(document, "fullscreenElement", {
        value: null,
        configurable: true,
      });
      unmount();
    });

    it("does nothing when .runArea element is not found", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      Object.defineProperty(document, "fullscreenElement", {
        value: null,
        configurable: true,
      });

      // Ensure no .runArea exists in DOM
      const existing = document.querySelector(".runArea");
      if (existing) existing.remove();

      result.toggleSceneFullscreen();

      expect(result.isSceneFullscreen.value).toBe(false);
      unmount();
    });

    it("exits fullscreen when already in scene fullscreen mode", () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      const fakeEl = document.createElement("div");
      Object.defineProperty(document, "fullscreenElement", {
        value: fakeEl,
        configurable: true,
      });
      const mockExitFullscreen = vi.fn().mockResolvedValue(undefined);
      document.exitFullscreen = mockExitFullscreen;

      result.toggleSceneFullscreen();

      expect(mockExitFullscreen).toHaveBeenCalled();
      expect(result.isSceneFullscreen.value).toBe(false);

      Object.defineProperty(document, "fullscreenElement", {
        value: null,
        configurable: true,
      });
      unmount();
    });
  });
});
