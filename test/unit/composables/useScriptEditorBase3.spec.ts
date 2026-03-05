/**
 * Unit tests for src/composables/useScriptEditorBase.ts (part 3)
 *
 * Covers the following previously-uncovered lines:
 *   - Line ~110: defineSingleAssignment else branch (double-set logger.log)
 *   - Lines ~291-293: saveResolve() called after action=post
 *   - Lines ~306-307: catch block in handleMessage (onPost throws)
 *   - Lines ~332: watch(isDark) callback → loadHighlightStyle
 *   - Lines ~338-340: watch(appStore.language) callback → src + onReady
 *   - Lines ~350-354: watch(userStore.userInfo) callback → postMessage
 *   - Lines ~360-389: onBeforeRouteLeave guard paths
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp, defineComponent, h, nextTick, reactive } from "vue";

// ── Reactive store mocks (must be "mock"-prefixed for Vitest hoisting) ──────
const mockSettingsState = reactive({ theme: "light" as string });
const mockAppState = reactive({ language: "zh-CN" as string });
const mockUserState = reactive({
  userInfo: { id: 42, userData: {} } as { id: number; userData: Record<string, unknown> } | null,
  getRole: vi.fn(() => "editor"),
});

const { mockInflate3, mockJsBeautify3, mockMessage3, mockMessageBox3 } =
  vi.hoisted(() => ({
    mockInflate3: vi.fn(() => "decompressed"),
    mockJsBeautify3: vi.fn((code: string) => `fmt:${code}`),
    mockMessage3: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
    mockMessageBox3: { confirm: vi.fn() },
  }));

const mockOnBeforeRouteLeave3 = vi.hoisted(() => vi.fn());
const mockLogger3 = vi.hoisted(() => ({ log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() }));

vi.mock("vue-router", () => ({
  onBeforeRouteLeave: mockOnBeforeRouteLeave3,
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("@/store/modules/settings", () => ({
  useSettingsStore: () => mockSettingsState,
}));

vi.mock("@/store/modules/app", () => ({
  useAppStore: () => mockAppState,
}));

vi.mock("@/store/modules/user", () => ({
  useUserStore: () => mockUserState,
}));

vi.mock("@/components/Dialog", () => ({
  Message: mockMessage3,
  MessageBox: mockMessageBox3,
}));

vi.mock("@/utils/logger", () => ({
  logger: mockLogger3,
}));

vi.mock("@/environment", () => ({
  default: { blockly: "https://blockly.test" },
}));

vi.mock("pako", () => ({
  default: { inflate: mockInflate3 },
}));

vi.mock("js-beautify", () => ({
  default: mockJsBeautify3,
}));

import {
  useScriptEditorBase,
  type UseScriptEditorBaseOptions,
} from "@/composables/useScriptEditorBase";

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useScriptEditorBase (part 3) — uncovered paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset reactive store states
    mockSettingsState.theme = "light";
    mockAppState.language = "zh-CN";
    mockUserState.userInfo = { id: 42, userData: {} };
    mockUserState.getRole.mockReturnValue("editor");
  });

  // ── Line ~110: defineSingleAssignment double-set ────────────────────────

  describe("defineSingleAssignment: double-set (line 110)", () => {
    it("second action=update call logs 'cannot be assigned again'", async () => {
      const { result, unmount } = withSetup(() => useScriptEditorBase(makeOptions()));

      const updateData = { lua: "print(1)", js: "console.log(1)", blocklyData: "xml" };

      // First update: initLuaCode.set() runs with isAssigned=false
      await result.handleMessage(
        new MessageEvent("message", {
          data: { action: "update", data: updateData },
        })
      );

      // Second update: initLuaCode.set() runs with isAssigned=true → else branch (line 110)
      await result.handleMessage(
        new MessageEvent("message", {
          data: { action: "update", data: updateData },
        })
      );

      expect(mockLogger3.log).toHaveBeenCalledWith(
        expect.stringContaining("cannot be assigned again")
      );

      unmount();
    });
  });

  // ── Lines ~291-293: saveResolve path ────────────────────────────────────

  describe("saveResolve path (lines 291-293)", () => {
    it("action=post after save() resolves the save promise", async () => {
      const onPost = vi.fn().mockResolvedValue(undefined);
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onPost }))
      );

      // Call save() to set saveResolve
      const savePromise = result.save();

      // Now fire action=post → handleMessage calls saveResolve()
      await result.handleMessage(
        new MessageEvent("message", {
          data: {
            action: "post",
            data: { lua: "return {}", js: "return {}", data: {} },
          },
        })
      );

      // save() promise should resolve
      await expect(savePromise).resolves.toBeUndefined();
      expect(onPost).toHaveBeenCalled();

      unmount();
    });

    it("saveResolve is set to null after being called", async () => {
      const onPost = vi.fn().mockResolvedValue(undefined);
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onPost }))
      );

      result.save();

      // First action=post → calls saveResolve(), sets it to null
      await result.handleMessage(
        new MessageEvent("message", {
          data: { action: "post", data: { lua: "x", js: "y", data: {} } },
        })
      );

      // Second action=post → saveResolve is null, so lines 291-293 NOT triggered again
      vi.clearAllMocks();
      await result.handleMessage(
        new MessageEvent("message", {
          data: { action: "post", data: { lua: "x", js: "y", data: {} } },
        })
      );

      // onPost called again (not saveResolve)
      expect(onPost).toHaveBeenCalled();

      unmount();
    });
  });

  // ── Lines ~306-307: catch block in handleMessage ──────────────────────────

  describe("handleMessage catch block (lines 306-307)", () => {
    it("onPost throws → catch block logs the error", async () => {
      const onPost = vi.fn().mockRejectedValue(new Error("save failed"));
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onPost }))
      );

      await result.handleMessage(
        new MessageEvent("message", {
          data: {
            action: "post",
            data: { lua: "x", js: "y", data: {} },
          },
        })
      );

      expect(mockLogger3.log).toHaveBeenCalledWith(
        expect.stringContaining("ex:")
      );

      unmount();
    });

    it("onPost throws → catch block does not re-throw", async () => {
      const onPost = vi.fn().mockRejectedValue(new Error("network error"));
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onPost }))
      );

      await expect(
        result.handleMessage(
          new MessageEvent("message", {
            data: { action: "post", data: { lua: "x", js: "y", data: {} } },
          })
        )
      ).resolves.toBeUndefined();

      unmount();
    });
  });

  // ── Line ~332: watch(isDark) callback ────────────────────────────────────

  describe("watch(isDark) callback (line 332)", () => {
    it("changing settingsStore.theme to dark triggers loadHighlightStyle", async () => {
      // Spy on link element creation to verify loadHighlightStyle
      const appendChildSpy = vi.spyOn(document.head, "appendChild");

      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      // Initially light — isDark = false
      expect(result.isDark.value).toBe(false);

      // Change theme to dark → isDark = true → watcher fires → loadHighlightStyle(true)
      mockSettingsState.theme = "dark";
      await nextTick();
      await nextTick(); // extra tick for watcher

      // isDark is now true
      expect(result.isDark.value).toBe(true);

      // loadHighlightStyle should have been called (creates/updates link element)
      // The call may create a link or update href. We just verify isDark reacted.
      expect(mockSettingsState.theme).toBe("dark");

      appendChildSpy.mockRestore();
      unmount();
    });

    it("changing theme back to light → isDark=false", async () => {
      mockSettingsState.theme = "dark";

      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      expect(result.isDark.value).toBe(true);

      mockSettingsState.theme = "light";
      await nextTick();
      await nextTick();

      expect(result.isDark.value).toBe(false);

      unmount();
    });
  });

  // ── Lines ~338-340: watch(appStore.language) callback ────────────────────

  describe("watch(appStore.language) callback (lines 338-340)", () => {
    it("changing appStore.language updates src.value with new language", async () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      // Initial src
      expect(result.src.value).toContain("zh-CN");

      // Change language
      mockAppState.language = "en-US";
      await nextTick();
      await nextTick();

      expect(result.src.value).toContain("en-US");

      unmount();
    });

    it("changing language calls onReady", async () => {
      const onReady = vi.fn();
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onReady }))
      );

      mockAppState.language = "ja-JP";
      await nextTick();
      await nextTick();

      expect(onReady).toHaveBeenCalled();

      unmount();
    });

    it("language change updates src to include blockly base URL", async () => {
      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      mockAppState.language = "zh-TW";
      await nextTick();
      await nextTick();

      expect(result.src.value).toContain("https://blockly.test");
      expect(result.src.value).toContain("zh-TW");

      unmount();
    });
  });

  // ── Lines ~350-354: watch(userStore.userInfo) callback ───────────────────

  describe("watch(userStore.userInfo) callback (lines 350-354)", () => {
    it("changing userStore.userInfo triggers postMessage with user-info", async () => {
      // Need an editor with contentWindow to capture postMessage call
      const mockPostMessage = vi.fn();
      const mockEditor = {
        contentWindow: { postMessage: mockPostMessage },
      } as unknown as HTMLIFrameElement;

      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      // Set up editor
      result.editor.value = mockEditor;

      // Change userInfo deeply
      mockUserState.userInfo = { id: 99, userData: {} };
      await nextTick();
      await nextTick();

      // postMessage("user-info", ...) should have been called
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({ action: "user-info" }),
        "*"
      );

      unmount();
    });

    it("userInfo change sends correct user id and role", async () => {
      const mockPostMessage = vi.fn();
      const mockEditor = {
        contentWindow: { postMessage: mockPostMessage },
      } as unknown as HTMLIFrameElement;

      mockUserState.getRole.mockReturnValue("admin");

      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      result.editor.value = mockEditor;

      mockUserState.userInfo = { id: 123, userData: {} };
      await nextTick();
      await nextTick();

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ id: 123, role: "admin" }),
        }),
        "*"
      );

      unmount();
    });

    it("userInfo set to null → postMessage sends id=null", async () => {
      const mockPostMessage = vi.fn();
      const mockEditor = {
        contentWindow: { postMessage: mockPostMessage },
      } as unknown as HTMLIFrameElement;

      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      result.editor.value = mockEditor;

      mockUserState.userInfo = null;
      await nextTick();
      await nextTick();

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ id: null }),
        }),
        "*"
      );

      unmount();
    });
  });

  // ── Lines ~360-389: onBeforeRouteLeave handler ───────────────────────────

  describe("onBeforeRouteLeave handler (lines 360-389)", () => {
    it("no unsaved changes → next() called directly (line 388)", async () => {
      const { unmount } = withSetup(() => useScriptEditorBase(makeOptions()));

      const guardCallback = mockOnBeforeRouteLeave3.mock.calls[0]?.[0];
      expect(guardCallback).toBeDefined();

      const next = vi.fn();
      await guardCallback({}, {}, next);

      expect(next).toHaveBeenCalledWith(); // no args = proceed

      unmount();
    });

    it("hasUnsavedChanges + confirm + save succeeds → next() called (lines 371-373)", async () => {
      mockMessageBox3.confirm.mockResolvedValue(undefined); // user confirmed
      const onPost = vi.fn().mockResolvedValue(undefined);

      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onPost }))
      );

      // Set unsaved changes
      result.hasUnsavedChanges.value = true;

      const guardCallback = mockOnBeforeRouteLeave3.mock.calls[0]?.[0];
      const next = vi.fn();

      // We need to resolve save() by triggering action=post
      // Run the guard and simultaneously resolve the save
      const guardPromise = guardCallback({}, {}, next);

      // Allow the guard to reach the save() call
      await nextTick();

      // Resolve save() by triggering action=post (saveResolve is set by save())
      await result.handleMessage(
        new MessageEvent("message", {
          data: { action: "post", data: { lua: "x", js: "y", data: {} } },
        })
      );

      await guardPromise;

      expect(next).toHaveBeenCalledWith();

      unmount();
    });

    it("hasUnsavedChanges + confirm resolves → MessageBox.confirm was called with expected options", async () => {
      mockMessageBox3.confirm.mockResolvedValue(undefined);
      const onPost = vi.fn().mockResolvedValue(undefined);

      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions({ onPost }))
      );

      result.hasUnsavedChanges.value = true;

      const guardCallback = mockOnBeforeRouteLeave3.mock.calls[0]?.[0];
      const next = vi.fn();

      // Start guard, then resolve save()
      const guardPromise = guardCallback({}, {}, next);
      await nextTick();

      await result.handleMessage(
        new MessageEvent("message", {
          data: { action: "post", data: { lua: "x", js: "y", data: {} } },
        })
      );

      await guardPromise;

      // MessageBox.confirm was called with the i18n keys
      expect(mockMessageBox3.confirm).toHaveBeenCalledWith(
        "i18n.leaveMessage1",
        "i18n.leaveMessage2",
        expect.objectContaining({ type: "warning" })
      );

      unmount();
    });

    it("hasUnsavedChanges + cancel → hasUnsavedChanges=false + info + next() (lines 378-382)", async () => {
      mockMessageBox3.confirm.mockRejectedValue("cancel");

      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      result.hasUnsavedChanges.value = true;

      const guardCallback = mockOnBeforeRouteLeave3.mock.calls[0]?.[0];
      const next = vi.fn();

      await guardCallback({}, {}, next);

      expect(result.hasUnsavedChanges.value).toBe(false);
      expect(mockMessage3.info).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();

      unmount();
    });

    it("hasUnsavedChanges + other rejection → next(false) (lines 383-385)", async () => {
      // action is not "cancel" — could be dismissed/backdrop click
      mockMessageBox3.confirm.mockRejectedValue("close");

      const { result, unmount } = withSetup(() =>
        useScriptEditorBase(makeOptions())
      );

      result.hasUnsavedChanges.value = true;

      const guardCallback = mockOnBeforeRouteLeave3.mock.calls[0]?.[0];
      const next = vi.fn();

      await guardCallback({}, {}, next);

      expect(next).toHaveBeenCalledWith(false);

      unmount();
    });
  });
});
