/**
 * Unit tests for src/utils/modelProcessor.ts
 * Covers: processModel() — GLTF loading, info JSON generation, error path
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockDRACOSetPath = vi.hoisted(() => vi.fn());
const mockGLTFSetDRACO = vi.hoisted(() => vi.fn());
const mockGLTFSetKTX2 = vi.hoisted(() => vi.fn());
const mockGLTFLoad = vi.hoisted(() => vi.fn());
const mockKTX2SetPath = vi.hoisted(() => vi.fn().mockReturnThis());
const mockKTX2DetectSupport = vi.hoisted(() => vi.fn().mockReturnThis());
const mockRendererDispose = vi.hoisted(() => vi.fn());
const mockRendererRender = vi.hoisted(() => vi.fn());
const mockRendererSetSize = vi.hoisted(() => vi.fn());
const mockRendererSetClearColor = vi.hoisted(() => vi.fn());
const mockToBlob = vi.hoisted(() => vi.fn());

vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: vi.fn(() => ({
    setDRACOLoader: mockGLTFSetDRACO,
    setKTX2Loader: mockGLTFSetKTX2,
    load: mockGLTFLoad,
  })),
}));

vi.mock("three/examples/jsm/loaders/DRACOLoader.js", () => ({
  DRACOLoader: vi.fn(() => ({
    setDecoderPath: mockDRACOSetPath,
  })),
}));

vi.mock("three/examples/jsm/loaders/KTX2Loader.js", () => {
  function KTX2LoaderMock(this: any) {
    this.setTranscoderPath = (path: string) => {
      mockKTX2SetPath(path);
      return this;
    };
    this.detectSupport = (renderer: any) => {
      mockKTX2DetectSupport(renderer);
      return this;
    };
  }
  return { KTX2Loader: KTX2LoaderMock };
});

vi.mock("three", async () => {
  const actual = await vi.importActual<typeof import("three")>("three");
  return {
    ...actual,
    WebGLRenderer: vi.fn(() => ({
      setSize: mockRendererSetSize,
      setClearColor: mockRendererSetClearColor,
      shadowMap: { enabled: false, type: null },
      render: mockRendererRender,
      dispose: mockRendererDispose,
      domElement: { toBlob: mockToBlob },
    })),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeGLTFScene() {
  const THREE = require("three");
  const mesh = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial()
  );
  const group = new THREE.Group();
  group.add(mesh);
  return group;
}

function makeGLTF(animations: any[] = []) {
  return { scene: makeGLTFScene(), animations };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("processModel()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls GLTFLoader.load with the blob URL", async () => {
    const mockBlob = new Blob(["img"], { type: "image/jpeg" });
    mockToBlob.mockImplementation((cb: (b: Blob) => void) => cb(mockBlob));
    mockGLTFLoad.mockImplementation((_url: string, onLoad: Function) => {
      onLoad(makeGLTF());
    });

    const { processModel } = await import("@/utils/modelProcessor");
    const file = new File(["data"], "model.gltf");
    await processModel(file);

    expect(mockGLTFLoad).toHaveBeenCalledWith(
      "blob:mock-url",
      expect.any(Function),
      undefined,
      expect.any(Function)
    );
  });

  it("resolves with info JSON containing size, center, anim, faces", async () => {
    const mockBlob = new Blob(["img"], { type: "image/jpeg" });
    mockToBlob.mockImplementation((cb: (b: Blob) => void) => cb(mockBlob));
    mockGLTFLoad.mockImplementation((_url: string, onLoad: Function) => {
      onLoad(makeGLTF([{ name: "Walk", duration: 2.5 }]));
    });

    const { processModel } = await import("@/utils/modelProcessor");
    const file = new File(["data"], "model.gltf");
    const result = await processModel(file);

    const info = JSON.parse(result.info);
    expect(info).toHaveProperty("size");
    expect(info).toHaveProperty("center");
    expect(info).toHaveProperty("anim");
    expect(info).toHaveProperty("faces");
    expect(info.anim[0].name).toBe("Walk");
  });

  it("resolves with image File named after the source file", async () => {
    const mockBlob = new Blob(["img"], { type: "image/jpeg" });
    mockToBlob.mockImplementation((cb: (b: Blob) => void) => cb(mockBlob));
    mockGLTFLoad.mockImplementation((_url: string, onLoad: Function) => {
      onLoad(makeGLTF());
    });

    const { processModel } = await import("@/utils/modelProcessor");
    const file = new File(["data"], "mymodel.glb");
    const result = await processModel(file);

    expect(result.image).toBeInstanceOf(File);
    expect(result.image.name).toBe("mymodel.jpg");
  });

  it("rejects when GLTFLoader.load fires an error", async () => {
    const loadError = new Error("Load failed");
    mockGLTFLoad.mockImplementation(
      (_url: string, _onLoad: Function, _onProgress: any, onError: Function) => {
        onError(loadError);
      }
    );

    const { processModel } = await import("@/utils/modelProcessor");
    const file = new File(["data"], "bad.gltf");
    await expect(processModel(file)).rejects.toThrow("Load failed");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("rejects when toBlob returns null", async () => {
    mockToBlob.mockImplementation((cb: (b: Blob | null) => void) => cb(null));
    mockGLTFLoad.mockImplementation((_url: string, onLoad: Function) => {
      onLoad(makeGLTF());
    });

    const { processModel } = await import("@/utils/modelProcessor");
    const file = new File(["data"], "model.gltf");
    await expect(processModel(file)).rejects.toThrow(
      "Failed to generate screenshot blob"
    );
  });

  it("calls renderer.dispose() after successful processing", async () => {
    const mockBlob = new Blob(["img"], { type: "image/jpeg" });
    mockToBlob.mockImplementation((cb: (b: Blob) => void) => cb(mockBlob));
    mockGLTFLoad.mockImplementation((_url: string, onLoad: Function) => {
      onLoad(makeGLTF());
    });

    const { processModel } = await import("@/utils/modelProcessor");
    const file = new File(["data"], "model.gltf");
    await processModel(file);

    expect(mockRendererDispose).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
