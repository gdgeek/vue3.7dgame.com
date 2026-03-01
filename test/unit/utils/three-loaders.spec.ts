/**
 * Unit tests for src/lib/three/loaders.ts
 * Covers: getConfiguredGLTFLoader(), disposeKTX2Loader()
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be hoisted so they're available before imports
// ---------------------------------------------------------------------------
const mockSetDRACO = vi.hoisted(() => vi.fn());
const mockSetKTX2 = vi.hoisted(() => vi.fn());
const mockDRACOSetPath = vi.hoisted(() => vi.fn());
const mockKTX2SetPath = vi.hoisted(() => vi.fn());
const mockDetectSupport = vi.hoisted(() => vi.fn().mockReturnThis());
const mockKTX2Dispose = vi.hoisted(() => vi.fn());
const mockRendererDispose = vi.hoisted(() => vi.fn());
const mockForceContextLoss = vi.hoisted(() => vi.fn());

vi.mock("three", async () => {
  const actual = await vi.importActual<typeof import("three")>("three");
  return {
    ...actual,
    WebGLRenderer: vi.fn(() => ({
      dispose: mockRendererDispose,
      forceContextLoss: mockForceContextLoss,
    })),
  };
});

vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: vi.fn(() => ({
    setDRACOLoader: mockSetDRACO,
    setKTX2Loader: mockSetKTX2,
  })),
}));

vi.mock("three/examples/jsm/loaders/DRACOLoader.js", () => ({
  DRACOLoader: vi.fn(() => ({
    setDecoderPath: mockDRACOSetPath,
  })),
}));

vi.mock("three/examples/jsm/loaders/KTX2Loader.js", () => ({
  KTX2Loader: vi.fn(() => ({
    setTranscoderPath: mockKTX2SetPath,
    detectSupport: mockDetectSupport,
    dispose: mockKTX2Dispose,
  })),
}));

vi.mock("@/utils/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("getConfiguredGLTFLoader()", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    // Reset chain mocks after resetModules
    mockKTX2SetPath.mockReturnThis?.();
    mockDetectSupport.mockReturnThis();
  });

  it("returns an object with setDRACOLoader and setKTX2Loader methods", async () => {
    const { getConfiguredGLTFLoader } = await import("@/lib/three/loaders");
    const loader = getConfiguredGLTFLoader();
    expect(loader).toBeDefined();
    expect(typeof (loader as any).setDRACOLoader).toBe("function");
    expect(typeof (loader as any).setKTX2Loader).toBe("function");
  });

  it("configures a DRACOLoader with the correct decoder path", async () => {
    const { getConfiguredGLTFLoader } = await import("@/lib/three/loaders");
    getConfiguredGLTFLoader();
    expect(mockDRACOSetPath).toHaveBeenCalledWith(
      "/js/three.js/libs/draco/"
    );
  });

  it("calls setDRACOLoader on the GLTFLoader", async () => {
    const { getConfiguredGLTFLoader } = await import("@/lib/three/loaders");
    getConfiguredGLTFLoader();
    expect(mockSetDRACO).toHaveBeenCalledTimes(1);
  });

  it("calls setKTX2Loader when KTX2 initialisation succeeds", async () => {
    const { getConfiguredGLTFLoader } = await import("@/lib/three/loaders");
    getConfiguredGLTFLoader();
    expect(mockSetKTX2).toHaveBeenCalledTimes(1);
  });

  it("creates a new GLTFLoader on every call", async () => {
    const { getConfiguredGLTFLoader } = await import("@/lib/three/loaders");
    const { GLTFLoader } = await import(
      "three/examples/jsm/loaders/GLTFLoader.js"
    );
    getConfiguredGLTFLoader();
    getConfiguredGLTFLoader();
    expect(vi.mocked(GLTFLoader)).toHaveBeenCalledTimes(2);
  });

  it("disposes the temporary renderer after KTX2 initialisation", async () => {
    const { getConfiguredGLTFLoader } = await import("@/lib/three/loaders");
    getConfiguredGLTFLoader();
    expect(mockRendererDispose).toHaveBeenCalled();
  });

  it("calls forceContextLoss on the temp renderer when available", async () => {
    const { getConfiguredGLTFLoader } = await import("@/lib/three/loaders");
    getConfiguredGLTFLoader();
    expect(mockForceContextLoss).toHaveBeenCalled();
  });

  it("sets KTX2 transcoder path to /js/three.js/libs/basis/", async () => {
    const { getConfiguredGLTFLoader } = await import("@/lib/three/loaders");
    getConfiguredGLTFLoader();
    expect(mockKTX2SetPath).toHaveBeenCalledWith("/js/three.js/libs/basis/");
  });
});

describe("disposeKTX2Loader()", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockDetectSupport.mockReturnThis();
  });

  it("calls dispose() on the cached KTX2Loader", async () => {
    const { getConfiguredGLTFLoader, disposeKTX2Loader } = await import(
      "@/lib/three/loaders"
    );
    // Ensure KTX2 is initialised first
    getConfiguredGLTFLoader();
    disposeKTX2Loader();
    expect(mockKTX2Dispose).toHaveBeenCalled();
  });

  it("is a no-op when called before any loader is created", async () => {
    const { disposeKTX2Loader } = await import("@/lib/three/loaders");
    expect(() => disposeKTX2Loader()).not.toThrow();
    expect(mockKTX2Dispose).not.toHaveBeenCalled();
  });

  it("nulls out the cached KTX2 so a second call is also a no-op", async () => {
    const { getConfiguredGLTFLoader, disposeKTX2Loader } = await import(
      "@/lib/three/loaders"
    );
    getConfiguredGLTFLoader();
    disposeKTX2Loader(); // first dispose — sets sharedKTX2 = null
    vi.clearAllMocks();
    disposeKTX2Loader(); // second call — sharedKTX2 is null, should not call dispose
    expect(mockKTX2Dispose).not.toHaveBeenCalled();
  });

  it("KTX2Loader is created only once when getConfiguredGLTFLoader is called twice", async () => {
    const { KTX2Loader } = await import(
      "three/examples/jsm/loaders/KTX2Loader.js"
    );
    const { getConfiguredGLTFLoader } = await import("@/lib/three/loaders");
    getConfiguredGLTFLoader();
    getConfiguredGLTFLoader(); // second call — should reuse cached KTX2
    expect(vi.mocked(KTX2Loader)).toHaveBeenCalledTimes(1);
  });
});
