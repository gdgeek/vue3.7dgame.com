/**
 * Unit tests for src/components/Meta/useFullscreen.ts
 *
 * Tests the two toggle functions (editor + scene), the syncState handler
 * registered on the fullscreenchange event, and the initial reactive state.
 *
 * document.fullscreenElement and document.exitFullscreen are mocked with
 * Object.defineProperty so we can control which "mode" the browser is in.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp, defineComponent, h } from "vue";
import { useFullscreen } from "../../../src/components/Meta/useFullscreen";

// ---------------------------------------------------------------------------
// Mount helper (needed for onMounted / onUnmounted to fire)
// ---------------------------------------------------------------------------
function mountUseFullscreen() {
  let result: ReturnType<typeof useFullscreen>;
  const app = createApp(
    defineComponent({
      setup() {
        result = useFullscreen();
        return () => h("div");
      },
    })
  );
  const el = document.createElement("div");
  app.mount(el);
  return {
    getResult: () => result!,
    unmount: () => app.unmount(),
  };
}

// ---------------------------------------------------------------------------
// Helpers to manipulate document.fullscreenElement / exitFullscreen
// ---------------------------------------------------------------------------
function setFullscreenElement(el: Element | null) {
  Object.defineProperty(document, "fullscreenElement", {
    value: el,
    configurable: true,
  });
}

function setExitFullscreen(fn: () => void) {
  Object.defineProperty(document, "exitFullscreen", {
    value: fn,
    configurable: true,
    writable: true,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("useFullscreen — initial state", () => {
  beforeEach(() => {
    setFullscreenElement(null);
  });

  it("isFullscreen starts as false", () => {
    const { getResult, unmount } = mountUseFullscreen();
    expect(getResult().isFullscreen.value).toBe(false);
    unmount();
  });

  it("isSceneFullscreen starts as false", () => {
    const { getResult, unmount } = mountUseFullscreen();
    expect(getResult().isSceneFullscreen.value).toBe(false);
    unmount();
  });
});

describe("useFullscreen — toggleEditor", () => {
  let mockContainer: HTMLElement;
  let mockRequestFullscreen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setFullscreenElement(null);
    setExitFullscreen(vi.fn());
    mockRequestFullscreen = vi.fn();
    mockContainer = document.createElement("div");
    mockContainer.requestFullscreen = mockRequestFullscreen;
  });

  afterEach(() => {
    setFullscreenElement(null);
  });

  it("sets isFullscreen=true when entering fullscreen", () => {
    const { getResult, unmount } = mountUseFullscreen();
    getResult().toggleEditor(mockContainer);
    expect(getResult().isFullscreen.value).toBe(true);
    unmount();
  });

  it("calls container.requestFullscreen() when entering", () => {
    const { getResult, unmount } = mountUseFullscreen();
    getResult().toggleEditor(mockContainer);
    expect(mockRequestFullscreen).toHaveBeenCalled();
    unmount();
  });

  it("sets isFullscreen=false when exiting fullscreen", () => {
    const mockExitFullscreen = vi.fn();
    setExitFullscreen(mockExitFullscreen);
    setFullscreenElement(mockContainer);

    const { getResult, unmount } = mountUseFullscreen();
    getResult().toggleEditor(mockContainer);
    expect(getResult().isFullscreen.value).toBe(false);
    unmount();
  });

  it("calls document.exitFullscreen() when already in fullscreen", () => {
    const mockExitFullscreen = vi.fn();
    setExitFullscreen(mockExitFullscreen);
    setFullscreenElement(mockContainer);

    const { getResult, unmount } = mountUseFullscreen();
    getResult().toggleEditor(mockContainer);
    expect(mockExitFullscreen).toHaveBeenCalled();
    unmount();
  });

  it("does not call requestFullscreen when container is null", () => {
    const { getResult, unmount } = mountUseFullscreen();
    getResult().toggleEditor(null);
    expect(mockRequestFullscreen).not.toHaveBeenCalled();
    // isFullscreen is still set to true (state logic is separate from API call)
    expect(getResult().isFullscreen.value).toBe(true);
    unmount();
  });
});

describe("useFullscreen — toggleScene", () => {
  let mockContainer: HTMLElement;
  let mockRequestFullscreen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setFullscreenElement(null);
    setExitFullscreen(vi.fn());
    mockRequestFullscreen = vi.fn();
    mockContainer = document.createElement("div");
    mockContainer.requestFullscreen = mockRequestFullscreen;
  });

  afterEach(() => {
    setFullscreenElement(null);
  });

  it("sets isSceneFullscreen=true when entering", () => {
    const { getResult, unmount } = mountUseFullscreen();
    getResult().toggleScene(mockContainer);
    expect(getResult().isSceneFullscreen.value).toBe(true);
    unmount();
  });

  it("calls container.requestFullscreen() for scene toggle", () => {
    const { getResult, unmount } = mountUseFullscreen();
    getResult().toggleScene(mockContainer);
    expect(mockRequestFullscreen).toHaveBeenCalled();
    unmount();
  });

  it("sets isSceneFullscreen=false when already in fullscreen", () => {
    const mockExitFullscreen = vi.fn();
    setExitFullscreen(mockExitFullscreen);
    setFullscreenElement(mockContainer);

    const { getResult, unmount } = mountUseFullscreen();
    getResult().toggleScene(mockContainer);
    expect(getResult().isSceneFullscreen.value).toBe(false);
    unmount();
  });
});

describe("useFullscreen — fullscreenchange syncState", () => {
  afterEach(() => {
    setFullscreenElement(null);
    vi.restoreAllMocks();
  });

  it("resets both flags to false when fullscreenchange fires without active element", () => {
    const { getResult, unmount } = mountUseFullscreen();
    // Simulate entering fullscreen manually
    getResult().isFullscreen.value = true;
    getResult().isSceneFullscreen.value = true;

    setFullscreenElement(null);
    document.dispatchEvent(new Event("fullscreenchange"));

    expect(getResult().isFullscreen.value).toBe(false);
    expect(getResult().isSceneFullscreen.value).toBe(false);
    unmount();
  });

  it("does not reset flags when fullscreenchange fires with active element", () => {
    const fakeEl = document.createElement("div");
    setFullscreenElement(fakeEl);

    const { getResult, unmount } = mountUseFullscreen();
    getResult().isFullscreen.value = true;

    document.dispatchEvent(new Event("fullscreenchange"));
    expect(getResult().isFullscreen.value).toBe(true);
    unmount();
  });

  it("removes fullscreenchange listener on unmount", () => {
    const original = document.removeEventListener.bind(document);
    const calls: string[] = [];
    document.removeEventListener = (type: string, ...args: any[]) => {
      calls.push(type);
      return original(type, ...args);
    };
    const { unmount } = mountUseFullscreen();
    unmount();
    expect(calls).toContain("fullscreenchange");
    document.removeEventListener = original;
  });
});
