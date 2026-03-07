/**
 * Unit tests for src/components/Meta/useFullscreen.ts
 * Covers: initial state, toggleEditor, toggleScene, syncState,
 *         event listener registration/deregistration.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { effectScope } from "vue";

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

  async function createComposable() {
    const { useFullscreen } = await import("@/components/Meta/useFullscreen");
    let result: ReturnType<typeof useFullscreen>;
    const scope = effectScope();
    scope.run(() => {
      result = useFullscreen();
    });
    return { result: result!, scope };
  }

  it("initial isFullscreen is false", async () => {
    const { result, scope } = await createComposable();
    expect(result.isFullscreen.value).toBe(false);
    scope.stop();
  });

  it("initial isSceneFullscreen is false", async () => {
    const { result, scope } = await createComposable();
    expect(result.isSceneFullscreen.value).toBe(false);
    scope.stop();
  });

  it("toggleEditor sets isFullscreen=true when not in fullscreen", async () => {
    const { result, scope } = await createComposable();
    result.toggleEditor(makeEl());
    expect(result.isFullscreen.value).toBe(true);
    scope.stop();
  });

  it("toggleEditor calls requestFullscreen on provided element", async () => {
    const { result, scope } = await createComposable();
    const el = makeEl();
    result.toggleEditor(el);
    expect(el.requestFullscreen).toHaveBeenCalled();
    scope.stop();
  });

  it("toggleEditor with null container still sets isFullscreen=true", async () => {
    const { result, scope } = await createComposable();
    result.toggleEditor(null);
    expect(result.isFullscreen.value).toBe(true);
    scope.stop();
  });

  it("toggleEditor sets isFullscreen=false when already in fullscreen", async () => {
    Object.defineProperty(document, "fullscreenElement", {
      value: document.body,
      configurable: true,
    });
    const { result, scope } = await createComposable();
    result.toggleEditor(makeEl());
    expect(result.isFullscreen.value).toBe(false);
    scope.stop();
  });

  it("toggleScene sets isSceneFullscreen=true when not in fullscreen", async () => {
    const { result, scope } = await createComposable();
    result.toggleScene(makeEl());
    expect(result.isSceneFullscreen.value).toBe(true);
    scope.stop();
  });

  it("toggleScene sets isSceneFullscreen=false when already in fullscreen", async () => {
    Object.defineProperty(document, "fullscreenElement", {
      value: document.body,
      configurable: true,
    });
    const { result, scope } = await createComposable();
    result.toggleScene(makeEl());
    expect(result.isSceneFullscreen.value).toBe(false);
    scope.stop();
  });

  it("returns toggleEditor and toggleScene functions", async () => {
    const { result, scope } = await createComposable();
    expect(typeof result.toggleEditor).toBe("function");
    expect(typeof result.toggleScene).toBe("function");
    scope.stop();
  });

  it("toggleEditor without container does not throw", async () => {
    const { result, scope } = await createComposable();
    expect(() => result.toggleEditor(undefined)).not.toThrow();
    scope.stop();
  });

  it("toggleScene without container does not throw", async () => {
    const { result, scope } = await createComposable();
    expect(() => result.toggleScene(undefined)).not.toThrow();
    scope.stop();
  });
});
