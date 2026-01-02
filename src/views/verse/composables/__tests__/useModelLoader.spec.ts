import { describe, it, expect, vi, beforeEach } from "vitest";
import { useModelLoader } from "../useModelLoader";
import { ref, reactive } from "vue";
import * as THREE from "three";

// Mock Dependencies
vi.mock("@/assets/js/voxel/VOXLoader.js", () => ({
  VOXLoader: vi.fn(),
  VOXMesh: vi.fn(),
}));
vi.mock("@/lib/three/loaders", () => ({
  getConfiguredGLTFLoader: vi.fn(() => ({
    load: vi.fn((url, onLoad) => {
      onLoad({ scene: new THREE.Object3D(), animations: [] });
    }),
  })),
}));
vi.mock("@/assets/js/helper", () => ({
  convertToHttps: vi.fn((url) => url),
}));

// Mock THREE
vi.mock("three", async () => {
  const actual = await vi.importActual("three");
  return {
    ...(actual as any),
    Scene: vi.fn(() => ({ add: vi.fn(), remove: vi.fn() })),
    PerspectiveCamera: vi.fn(),
    WebGLRenderer: vi.fn(),
    AnimationMixer: vi.fn(),
    VideoTexture: vi.fn(),
    TextureLoader: vi.fn(() => ({ load: vi.fn() })),
    // Add other needed mocks
  };
});

describe("useModelLoader", () => {
  const mockContext = () => ({
    threeScene: new THREE.Scene(),
    camera: ref(null),
    renderer: ref(null),
    mixers: new Map(),
    sources: new Map(),
    collisionObjects: ref([]),
    rotatingObjects: ref([]),
    moveableObjects: ref([]),
    dragState: reactive({} as any),
    controls: ref(null),
    mouse: new THREE.Vector2(),
    raycaster: new THREE.Raycaster(),
    verse: { data: {}, metas: [], resources: [] },
  });

  let loader: ReturnType<typeof useModelLoader>;

  beforeEach(() => {
    loader = useModelLoader(mockContext() as any);
  });

  it("should be defined", () => {
    expect(loader).toBeDefined();
    expect(loader.loadModel).toBeDefined();
  });

  it("should load video resource", async () => {
    const resource = {
      type: "video",
      file: { url: "http://test.com/video.mp4" },
      id: 1,
    };
    const entity = {
      type: "Video",
      parameters: { uuid: "v1", active: true, width: 1, height: 1 },
    };

    // Spy on document.createElement to handle video
    const mockVideo = {
      addEventListener: vi.fn((event, cb) => {
        if (event === "loadedmetadata") cb();
      }),
      play: vi.fn(),
      videoWidth: 100,
      videoHeight: 100,
      style: {},
    };
    vi.spyOn(document, "createElement").mockReturnValue(mockVideo as any);

    const result = await loader.loadModel(resource as any, entity as any);

    expect(result).toBeDefined();
    // Since we mocked Scene.add, verifying calls to it would be ideal
    // But result returns the mesh, so we can check that.
    // However, in mock implementations, types might be loose.
    expect((result as any).isMesh).toBe(true);
  });
});
