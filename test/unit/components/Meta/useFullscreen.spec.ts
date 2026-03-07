/**
 * Unit tests for src/components/Meta/useFullscreen.ts
 * Uses createApp + defineComponent for proper Vue lifecycle context.
 * Covers: initial state, toggleEditor, toggleScene, syncState,
 *         event listener registration/deregistration.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp, defineComponent, h } from "vue";

describe("useFullscreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(document, "fullscreenElement", {
      value: null,
      configurable: true,
      writable: true,
    });
    // jsdom doesn't implement exitFullscreen — polyfill it
    if (!document.exitFullscreen) {
      Object.defineProperty(document, "exitFullscreen", {
        value: vi.fn().mockResolvedValue(undefined),
        configurable: true,
        writable: true,
      });
    } else {
      vi.spyOn(document, "exitFullscreen").mockResolvedValue(undefined);
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  function makeEl() {
    return { requestFullscreen: vi.fn() } as unknown as HTMLElement;
  }

  /** Mount a minimal component wrapping useFullscreen() to get proper lifecycle context. */
  async function createMounted() {
    const { useFullscreen } = await import("@/components/Meta/useFullscreen");
    let result!: ReturnType<typeof useFullscreen>;

    const TestComponent = defineComponent({
      setup() {
        result = useFullscreen();
        return result;
      },
      render() {
        return h("div");
      },
    });

    const el = document.createElement("div");
    const app = createApp(TestComponent);
    app.mount(el);
    return { result, app, unmount: () => app.unmount() };
  }

  it("initial isFullscreen is false", async () => {
    const { result, unmount } = await createMounted();
    expect(result.isFullscreen.value).toBe(false);
    unmount();
  });

  it("initial isSceneFullscreen is false", async () => {
    const { result, unmount } = await createMounted();
    expect(result.isSceneFullscreen.value).toBe(false);
    unmount();
  });

  it("toggleEditor sets isFullscreen=true when not in fullscreen", async () => {
    const { result, unmount } = await createMounted();
    result.toggleEditor(makeEl());
    expect(result.isFullscreen.value).toBe(true);
    unmount();
  });

  it("toggleEditor calls requestFullscreen on provided element", async () => {
    const { result, unmount } = await createMounted();
    const el = makeEl();
    result.toggleEditor(el);
    expect(el.requestFullscreen).toHaveBeenCalled();
    unmount();
  });

  it("toggleEditor with null container still sets isFullscreen=true", async () => {
    const { result, unmount } = await createMounted();
    result.toggleEditor(null);
    expect(result.isFullscreen.value).toBe(true);
    unmount();
  });

  it("toggleEditor sets isFullscreen=false when already in fullscreen", async () => {
    Object.defineProperty(document, "fullscreenElement", {
      value: document.body,
      configurable: true,
    });
    const { result, unmount } = await createMounted();
    result.toggleEditor(makeEl());
    expect(result.isFullscreen.value).toBe(false);
    unmount();
  });

  it("toggleScene sets isSceneFullscreen=true when not in fullscreen", async () => {
    const { result, unmount } = await createMounted();
    result.toggleScene(makeEl());
    expect(result.isSceneFullscreen.value).toBe(true);
    unmount();
  });

  it("toggleScene sets isSceneFullscreen=false when already in fullscreen", async () => {
    Object.defineProperty(document, "fullscreenElement", {
      value: document.body,
      configurable: true,
    });
    const { result, unmount } = await createMounted();
    result.toggleScene(makeEl());
    expect(result.isSceneFullscreen.value).toBe(false);
    unmount();
  });

  it("returns toggleEditor and toggleScene functions", async () => {
    const { result, unmount } = await createMounted();
    expect(typeof result.toggleEditor).toBe("function");
    expect(typeof result.toggleScene).toBe("function");
    unmount();
  });

  it("toggleEditor without container does not throw", async () => {
    const { result, unmount } = await createMounted();
    expect(() => result.toggleEditor(undefined)).not.toThrow();
    unmount();
  });

  it("toggleScene without container does not throw", async () => {
    const { result, unmount } = await createMounted();
    expect(() => result.toggleScene(undefined)).not.toThrow();
    unmount();
  });

  it("syncState resets both flags to false when exiting fullscreen", async () => {
    const { result, unmount } = await createMounted();
    // Enter fullscreen via toggle
    result.toggleEditor(makeEl());
    expect(result.isFullscreen.value).toBe(true);

    // Simulate fullscreenchange with no active element (exiting)
    Object.defineProperty(document, "fullscreenElement", {
      value: null,
      configurable: true,
      writable: true,
    });
    document.dispatchEvent(new Event("fullscreenchange"));

    expect(result.isFullscreen.value).toBe(false);
    expect(result.isSceneFullscreen.value).toBe(false);
    unmount();
  });

  it("syncState does not reset flags when entering fullscreen", async () => {
    const { result, unmount } = await createMounted();
    result.toggleEditor(makeEl());
    expect(result.isFullscreen.value).toBe(true);

    // fullscreenchange while element is active → syncState is a no-op
    Object.defineProperty(document, "fullscreenElement", {
      value: document.body,
      configurable: true,
    });
    document.dispatchEvent(new Event("fullscreenchange"));

    expect(result.isFullscreen.value).toBe(true);
    unmount();
  });

  it("registers fullscreenchange listener on mount", async () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const { unmount } = await createMounted();
    expect(addSpy).toHaveBeenCalledWith("fullscreenchange", expect.any(Function));
    unmount();
  });

  it("removes fullscreenchange listener on unmount", async () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = await createMounted();
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("fullscreenchange", expect.any(Function));
  });
});
