/**
 * Unit tests for src/components/ScenePlayer/composables/useThreeScene.ts
 * Covers: useThreeScene — setup, handleResize, updateTheme, cleanupScene,
 *         resetClock, and getter functions.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";

// ── Mock logger ──────────────────────────────────────────────────────────────
vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// ── Mock Stats.js ────────────────────────────────────────────────────────────
vi.mock("stats.js", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      showPanel: vi.fn(),
      begin: vi.fn(),
      end: vi.fn(),
      dom: { style: {}, style2: {} },
    })),
  };
});

// ── Mock OrbitControls ───────────────────────────────────────────────────────
const mockControlsDispose = vi.fn();

vi.mock("three/examples/jsm/controls/OrbitControls.js", () => ({
  OrbitControls: vi.fn().mockImplementation(() => ({
    enableDamping: false,
    dampingFactor: 0,
    screenSpacePanning: false,
    minDistance: 0,
    maxDistance: 0,
    update: vi.fn(),
    dispose: mockControlsDispose,
  })),
}));

// ── Mock THREE ───────────────────────────────────────────────────────────────
const mockRenderer = {
  setSize: vi.fn(),
  setClearColor: vi.fn(),
  setPixelRatio: vi.fn(),
  dispose: vi.fn(),
  forceContextLoss: vi.fn(),
  render: vi.fn(),
  domElement: {
    remove: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  outputColorSpace: "",
};

const mockCamera = {
  aspect: 1,
  position: { set: vi.fn() },
  updateProjectionMatrix: vi.fn(),
};

const mockScene = {
  add: vi.fn(),
};

const mockClock = {
  getDelta: vi.fn().mockReturnValue(0.016),
};

vi.mock("three", async () => {
  const actual = await vi.importActual<typeof import("three")>("three");
  return {
    ...actual,
    Scene: vi.fn().mockImplementation(() => mockScene),
    WebGLRenderer: vi.fn().mockImplementation(() => mockRenderer),
    PerspectiveCamera: vi.fn().mockImplementation(() => mockCamera),
    AmbientLight: vi.fn().mockImplementation(() => ({ castShadow: false })),
    DirectionalLight: vi.fn().mockImplementation(() => ({
      castShadow: false,
      position: { set: vi.fn() },
    })),
    PointLight: vi.fn().mockImplementation(() => ({
      castShadow: false,
      position: { set: vi.fn() },
    })),
    Clock: vi.fn().mockImplementation(() => mockClock),
    SRGBColorSpace: "srgb",
  };
});

// ── Mock ResizeObserver ───────────────────────────────────────────────────────
const mockResizeObserver = {
  observe: vi.fn(),
  disconnect: vi.fn(),
};
global.ResizeObserver = vi.fn().mockImplementation(() => mockResizeObserver);

// ── Mock requestAnimationFrame / cancelAnimationFrame ─────────────────────────
global.requestAnimationFrame = vi.fn().mockReturnValue(42);
global.cancelAnimationFrame = vi.fn();

// ── Helpers ─────────────────────────────────────────────────────────────────
function makeContainer() {
  return {
    clientWidth: 800,
    clientHeight: 600,
    appendChild: vi.fn(),
  } as unknown as HTMLDivElement;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("useThreeScene", () => {
  let useThreeScene: typeof import("@/components/ScenePlayer/composables/useThreeScene").useThreeScene;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-mock to reset call counts
    mockRenderer.setSize.mockClear();
    mockRenderer.setClearColor.mockClear();
    mockRenderer.dispose.mockClear();
    mockScene.add.mockClear();
    mockControlsDispose.mockClear();
    const mod = await import(
      "@/components/ScenePlayer/composables/useThreeScene"
    );
    useThreeScene = mod.useThreeScene;
  });

  it("creates a threeScene immediately on call", () => {
    const { threeScene } = useThreeScene();
    expect(threeScene).toBeDefined();
  });

  it("getRenderer returns null before setupScene is called", () => {
    const { getRenderer } = useThreeScene();
    expect(getRenderer()).toBeNull();
  });

  it("getCamera returns null before setupScene is called", () => {
    const { getCamera } = useThreeScene();
    expect(getCamera()).toBeNull();
  });

  it("getControls returns null before setupScene is called", () => {
    const { getControls } = useThreeScene();
    expect(getControls()).toBeNull();
  });

  it("getClock returns a Clock instance immediately", () => {
    const { getClock } = useThreeScene();
    expect(getClock()).toBeDefined();
  });

  it("setupScene appends renderer to container", () => {
    const { setupScene } = useThreeScene();
    const container = makeContainer();
    const controls = ref(null);
    setupScene(container, {
      isDark: false,
      mode: "meta",
      controls,
      onFrame: vi.fn(),
    });
    expect(container.appendChild).toHaveBeenCalled();
  });

  it("setupScene creates renderer with correct background for light theme", () => {
    const { setupScene } = useThreeScene();
    const container = makeContainer();
    const controls = ref(null);
    setupScene(container, {
      isDark: false,
      mode: "meta",
      controls,
      onFrame: vi.fn(),
    });
    expect(mockRenderer.setClearColor).toHaveBeenCalledWith(0xeeeeee, 1);
  });

  it("setupScene creates renderer with dark background for dark theme", () => {
    const { setupScene } = useThreeScene();
    const container = makeContainer();
    const controls = ref(null);
    setupScene(container, {
      isDark: true,
      mode: "meta",
      controls,
      onFrame: vi.fn(),
    });
    expect(mockRenderer.setClearColor).toHaveBeenCalledWith(0x242424, 1);
  });

  it("setupScene sets up OrbitControls and assigns to controls ref", async () => {
    const { OrbitControls } = await import(
      "three/examples/jsm/controls/OrbitControls.js"
    );
    const { setupScene } = useThreeScene();
    const container = makeContainer();
    const controls = ref(null);
    setupScene(container, {
      isDark: false,
      mode: "meta",
      controls,
      onFrame: vi.fn(),
    });
    expect(OrbitControls).toHaveBeenCalled();
    expect(controls.value).toBeDefined();
  });

  it("setupScene adds lights to scene", () => {
    const { setupScene } = useThreeScene();
    const container = makeContainer();
    const controls = ref(null);
    setupScene(container, {
      isDark: false,
      mode: "meta",
      controls,
      onFrame: vi.fn(),
    });
    // AmbientLight + DirectionalLight + PointLight = 3 adds
    expect(mockScene.add).toHaveBeenCalledTimes(3);
  });

  it("setupScene installs ResizeObserver on container", () => {
    const { setupScene } = useThreeScene();
    const container = makeContainer();
    const controls = ref(null);
    setupScene(container, {
      isDark: false,
      mode: "meta",
      controls,
      onFrame: vi.fn(),
    });
    expect(mockResizeObserver.observe).toHaveBeenCalledWith(container);
  });

  it("setupScene calls requestAnimationFrame to start the animation loop", () => {
    const { setupScene } = useThreeScene();
    const container = makeContainer();
    const controls = ref(null);
    setupScene(container, {
      isDark: false,
      mode: "verse",
      controls,
      onFrame: vi.fn(),
    });
    expect(requestAnimationFrame).toHaveBeenCalled();
  });

  it("getRenderer returns renderer after setupScene", () => {
    const { setupScene, getRenderer } = useThreeScene();
    const container = makeContainer();
    const controls = ref(null);
    setupScene(container, {
      isDark: false,
      mode: "meta",
      controls,
      onFrame: vi.fn(),
    });
    expect(getRenderer()).not.toBeNull();
  });

  it("getCamera returns camera after setupScene", () => {
    const { setupScene, getCamera } = useThreeScene();
    const container = makeContainer();
    const controls = ref(null);
    setupScene(container, {
      isDark: false,
      mode: "meta",
      controls,
      onFrame: vi.fn(),
    });
    expect(getCamera()).not.toBeNull();
  });

  it("handleResize updates renderer and camera when both exist", () => {
    const { setupScene, handleResize } = useThreeScene();
    const container = makeContainer();
    const controls = ref(null);
    setupScene(container, {
      isDark: false,
      mode: "meta",
      controls,
      onFrame: vi.fn(),
    });
    mockRenderer.setSize.mockClear();
    handleResize(container);
    expect(mockCamera.updateProjectionMatrix).toHaveBeenCalled();
    expect(mockRenderer.setSize).toHaveBeenCalled();
  });

  it("handleResize does nothing when renderer is null (before setup)", () => {
    const { handleResize } = useThreeScene();
    const container = makeContainer();
    // Should not throw
    expect(() => handleResize(container)).not.toThrow();
    expect(mockRenderer.setSize).not.toHaveBeenCalled();
  });

  it("updateTheme sets dark clear color", () => {
    const { setupScene, updateTheme } = useThreeScene();
    const container = makeContainer();
    const controls = ref(null);
    setupScene(container, {
      isDark: false,
      mode: "meta",
      controls,
      onFrame: vi.fn(),
    });
    mockRenderer.setClearColor.mockClear();
    updateTheme(true);
    expect(mockRenderer.setClearColor).toHaveBeenCalledWith(0x242424, 1);
  });

  it("updateTheme sets light clear color", () => {
    const { setupScene, updateTheme } = useThreeScene();
    const container = makeContainer();
    const controls = ref(null);
    setupScene(container, {
      isDark: false,
      mode: "meta",
      controls,
      onFrame: vi.fn(),
    });
    mockRenderer.setClearColor.mockClear();
    updateTheme(false);
    expect(mockRenderer.setClearColor).toHaveBeenCalledWith(0xeeeeee, 1);
  });

  it("updateTheme does nothing when renderer is null", () => {
    const { updateTheme } = useThreeScene();
    expect(() => updateTheme(true)).not.toThrow();
    expect(mockRenderer.setClearColor).not.toHaveBeenCalled();
  });

  it("cleanupScene disconnects ResizeObserver and disposes renderer", () => {
    const { setupScene, cleanupScene } = useThreeScene();
    const container = makeContainer();
    const controls = ref(null);
    setupScene(container, {
      isDark: false,
      mode: "meta",
      controls,
      onFrame: vi.fn(),
    });
    cleanupScene();
    expect(mockResizeObserver.disconnect).toHaveBeenCalled();
    expect(mockRenderer.dispose).toHaveBeenCalled();
    expect(mockRenderer.forceContextLoss).toHaveBeenCalled();
    expect(mockRenderer.domElement.remove).toHaveBeenCalled();
  });

  it("cleanupScene cancels the animation frame", () => {
    const { setupScene, cleanupScene } = useThreeScene();
    const container = makeContainer();
    const controls = ref(null);
    setupScene(container, {
      isDark: false,
      mode: "meta",
      controls,
      onFrame: vi.fn(),
    });
    cleanupScene();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
  });

  it("cleanupScene disposes OrbitControls", () => {
    const { setupScene, cleanupScene } = useThreeScene();
    const container = makeContainer();
    const controls = ref(null);
    setupScene(container, {
      isDark: false,
      mode: "meta",
      controls,
      onFrame: vi.fn(),
    });
    cleanupScene();
    expect(mockControlsDispose).toHaveBeenCalled();
  });

  it("cleanupScene does not throw when renderer is null", () => {
    const { cleanupScene } = useThreeScene();
    expect(() => cleanupScene()).not.toThrow();
  });

  it("cleanupScene does not throw when called before setupScene (no controls)", () => {
    const { cleanupScene } = useThreeScene();
    // No setupScene called — controls and rafId are null
    expect(() => cleanupScene()).not.toThrow();
    expect(cancelAnimationFrame).not.toHaveBeenCalled();
  });

  it("resetClock results in getClock() returning a valid Clock instance", async () => {
    const THREE = await import("three");
    const { getClock, resetClock } = useThreeScene();
    const initialCallCount = (THREE.Clock as ReturnType<typeof vi.fn>).mock
      .calls.length;
    resetClock();
    const afterCallCount = (THREE.Clock as ReturnType<typeof vi.fn>).mock.calls
      .length;
    // resetClock should have triggered one additional new THREE.Clock()
    expect(afterCallCount).toBeGreaterThan(initialCallCount);
    expect(getClock()).toBeDefined();
  });
});
