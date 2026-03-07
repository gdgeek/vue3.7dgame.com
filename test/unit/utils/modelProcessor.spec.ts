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

/** Scene with an INDEXED geometry — covers geometry.index branch (lines 77-78).
 *  Uses dynamic import to share the same ESM module as modelProcessor. */
async function makeGLTFSceneIndexed() {
  const THREE = await import("three");
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setIndex([0, 1, 2]); // 3 indices → 1 face
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
  const group = new THREE.Group();
  group.add(mesh);
  return group;
}

/** Scene with a NON-INDEXED geometry with position attribute — covers lines 79-81.
 *  Uses dynamic import to share the same ESM module as modelProcessor. */
async function makeGLTFSceneNonIndexedWithPosition() {
  const THREE = await import("three");
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]); // 3 vertices
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  // no setIndex → non-indexed path
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
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
      (
        _url: string,
        _onLoad: Function,
        _onProgress: any,
        onError: Function
      ) => {
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

  it("info anim is empty array when model has no animations", async () => {
    const mockBlob = new Blob(["img"], { type: "image/jpeg" });
    mockToBlob.mockImplementation((cb: (b: Blob) => void) => cb(mockBlob));
    mockGLTFLoad.mockImplementation((_url: string, onLoad: Function) => {
      onLoad(makeGLTF([])); // no animations
    });

    const { processModel } = await import("@/utils/modelProcessor");
    const result = await processModel(new File(["data"], "model.gltf"));
    const info = JSON.parse(result.info);
    expect(info.anim).toEqual([]);
  });

  it("info JSON string is valid JSON", async () => {
    const mockBlob = new Blob(["img"], { type: "image/jpeg" });
    mockToBlob.mockImplementation((cb: (b: Blob) => void) => cb(mockBlob));
    mockGLTFLoad.mockImplementation((_url: string, onLoad: Function) => {
      onLoad(makeGLTF());
    });

    const { processModel } = await import("@/utils/modelProcessor");
    const result = await processModel(new File(["data"], "model.gltf"));
    expect(() => JSON.parse(result.info)).not.toThrow();
  });

  it("faces count is non-negative", async () => {
    const mockBlob = new Blob(["img"], { type: "image/jpeg" });
    mockToBlob.mockImplementation((cb: (b: Blob) => void) => cb(mockBlob));
    mockGLTFLoad.mockImplementation((_url: string, onLoad: Function) => {
      onLoad(makeGLTF());
    });

    const { processModel } = await import("@/utils/modelProcessor");
    const result = await processModel(new File(["data"], "model.gltf"));
    const info = JSON.parse(result.info);
    expect(info.faces).toBeGreaterThanOrEqual(0);
  });

  it("counts faces via geometry.index when mesh has an index buffer", async () => {
    const mockBlob = new Blob(["img"], { type: "image/jpeg" });
    mockToBlob.mockImplementation((cb: (b: Blob) => void) => cb(mockBlob));
    const indexedScene = await makeGLTFSceneIndexed();
    mockGLTFLoad.mockImplementation((_url: string, onLoad: Function) => {
      onLoad({ scene: indexedScene, animations: [] });
    });

    const { processModel } = await import("@/utils/modelProcessor");
    const result = await processModel(new File(["data"], "model.gltf"));
    const info = JSON.parse(result.info);
    // 3 indices → 1 face
    expect(info.faces).toBe(1);
  });

  it("counts faces via geometry.attributes.position when mesh has no index", async () => {
    const mockBlob = new Blob(["img"], { type: "image/jpeg" });
    mockToBlob.mockImplementation((cb: (b: Blob) => void) => cb(mockBlob));
    const nonIndexedScene = await makeGLTFSceneNonIndexedWithPosition();
    mockGLTFLoad.mockImplementation((_url: string, onLoad: Function) => {
      onLoad({ scene: nonIndexedScene, animations: [] });
    });

    const { processModel } = await import("@/utils/modelProcessor");
    const result = await processModel(new File(["data"], "model.gltf"));
    const info = JSON.parse(result.info);
    // 3 positions / 3 = 1 face
    expect(info.faces).toBe(1);
  });
});
