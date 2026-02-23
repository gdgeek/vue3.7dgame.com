import { describe, it, expect, vi, beforeEach } from "vitest";
import { useModelLoader } from "../useModelLoader";
import { ref, reactive } from "vue";
import * as THREE from "three";
import type { DragState, Entity, Resource, Verse } from "@/types/verse";

// Mock Dependencies
vi.mock("@/assets/js/voxel/VOXLoader.js", () => ({
  VOXLoader: vi.fn(),
  VOXMesh: vi.fn(),
}));
vi.mock("@/lib/three/loaders", () => ({
  getConfiguredGLTFLoader: vi.fn(() => ({
    load: vi.fn(
      (
        url: string,
        onLoad: (gltf: {
          scene: THREE.Object3D;
          animations: THREE.AnimationClip[];
        }) => void
      ) => {
        onLoad({ scene: new THREE.Object3D(), animations: [] });
      }
    ),
  })),
}));
vi.mock("@/assets/js/helper", () => ({
  convertToHttps: vi.fn((url: string) => url),
}));

// Mock THREE
vi.mock("three", async () => {
  const actual = await vi.importActual<typeof import("three")>("three");
  return {
    ...actual,
    Scene: vi.fn(() => ({ add: vi.fn(), remove: vi.fn() })),
    PerspectiveCamera: vi.fn(),
    WebGLRenderer: vi.fn(),
    AnimationMixer: vi.fn(),
    VideoTexture: vi.fn(),
    TextureLoader: vi.fn(() => ({ load: vi.fn() })),
    // Add other needed mocks
  };
});

const createDragState = (): DragState => ({
  isDragging: false,
  draggedObject: null,
  dragStartPosition: new THREE.Vector3(),
  dragOffset: new THREE.Vector3(),
  mouseStartPosition: new THREE.Vector2(),
  lastIntersection: new THREE.Vector3(),
});

const createVerse = (): Verse => ({
  data: {},
  metas: [],
  resources: [],
});

const createContext = (): Parameters<typeof useModelLoader>[0] => ({
  threeScene: new THREE.Scene(),
  camera: ref(null),
  renderer: ref(null),
  mixers: new Map(),
  sources: new Map(),
  collisionObjects: ref([]),
  rotatingObjects: ref([]),
  moveableObjects: ref([]),
  dragState: reactive(createDragState()),
  controls: ref(null),
  mouse: new THREE.Vector2(),
  raycaster: new THREE.Raycaster(),
  verse: createVerse(),
});

const createVideoResource = (): Resource => ({
  type: "video",
  file: { url: "http://test.com/video.mp4" },
  id: 1,
});

const createVideoEntity = (): Entity => ({
  type: "Video",
  parameters: { uuid: "v1", active: true, width: 1, height: 1 },
});
describe("useModelLoader", () => {
  let loader: ReturnType<typeof useModelLoader>;

  beforeEach(() => {
    loader = useModelLoader(createContext());
  });

  it("should be defined", () => {
    expect(loader).toBeDefined();
    expect(loader.loadModel).toBeDefined();
  });

  it("should load video resource", async () => {
    const resource = createVideoResource();
    const entity = createVideoEntity();

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
    vi.spyOn(document, "createElement").mockReturnValue(
      mockVideo as unknown as HTMLVideoElement
    );

    const result = await loader.loadModel(resource, entity);

    expect(result).toBeDefined();
    // Since we mocked Scene.add, verifying calls to it would be ideal
    // But result returns the mesh, so we can check that.
    // However, in mock implementations, types might be loose.
    expect(result && result instanceof THREE.Object3D).toBe(true);
  });
});
