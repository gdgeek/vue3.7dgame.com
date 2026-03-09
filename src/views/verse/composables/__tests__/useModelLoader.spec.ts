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
  let ctx: Parameters<typeof useModelLoader>[0];

  beforeEach(() => {
    ctx = createContext();
    loader = useModelLoader(ctx);
    vi.restoreAllMocks();
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
    expect(result && result instanceof THREE.Object3D).toBe(true);
  });

  it("should store audio source and resolve true", async () => {
    const resource: Resource = {
      type: "audio",
      file: { url: "http://example.com/sound.mp3" },
      id: 2,
    };
    const entity: Entity = {
      type: "Sound",
      parameters: { uuid: "audio-uuid-1", active: true },
    };

    const result = await loader.loadModel(resource, entity);

    expect(result).toBe(true);
    expect(ctx.sources.has("audio-uuid-1")).toBe(true);
    const entry = ctx.sources.get("audio-uuid-1") as {
      type: string;
      data: { url: string };
    };
    expect(entry.type).toBe("audio");
    expect(entry.data.url).toContain("sound.mp3");
  });

  it("should load text resource and return a Mesh", async () => {
    // jsdom does not implement canvas getContext — provide a minimal mock
    const mockCtx = {
      fillStyle: "",
      font: "",
      textAlign: "",
      textBaseline: "",
      fillText: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (
      HTMLCanvasElement.prototype as unknown as Record<string, unknown>
    ).getContext = vi.fn(() => mockCtx);

    const resource: Resource = {
      type: "text",
      file: null,
      id: 3,
    };
    const entity: Entity = {
      type: "Text",
      parameters: { uuid: "text-uuid-1", active: true, text: "Hello World" },
    };

    const result = await loader.loadModel(resource, entity);

    expect(result).toBeDefined();
    expect(result instanceof THREE.Mesh).toBe(true);
    expect(ctx.sources.has("text-uuid-1")).toBe(true);

    // Cleanup
    delete (HTMLCanvasElement.prototype as unknown as Record<string, unknown>)
      .getContext;
  });

  it("returns undefined for unknown resource type", async () => {
    const resource: Resource = {
      type: "unknown-type",
      file: undefined,
      id: 99,
    };
    const entity: Entity = {
      type: "Unknown",
      parameters: { uuid: "unknown-uuid", active: true },
    };

    const result = await loader.loadModel(resource, entity);

    expect(result).toBeUndefined();
  });

  it("should load model (GLTF) resource and return Object3D", async () => {
    const resource: Resource = {
      type: "model",
      file: { url: "http://example.com/model.gltf" },
      id: 4,
    };
    const entity: Entity = {
      type: "Model",
      parameters: { uuid: "model-uuid-1", active: true },
    };

    const result = await loader.loadModel(resource, entity);

    expect(result).toBeDefined();
    expect(result instanceof THREE.Object3D).toBe(true);
  });

  it("should load picture resource and return a Mesh", async () => {
    // Simulate TextureLoader calling onLoad with a fake texture
    const fakeTexture = {
      colorSpace: "",
      minFilter: 0,
      magFilter: 0,
      anisotropy: 0,
      image: { width: 100, height: 50 },
    } as unknown as THREE.Texture;

    vi.mocked(THREE.TextureLoader).mockImplementation(
      () =>
        ({
          load: vi.fn((url: string, onLoad: (t: THREE.Texture) => void) => {
            onLoad(fakeTexture);
          }),
        }) as unknown as THREE.TextureLoader
    );

    const resource: Resource = {
      type: "picture",
      file: { url: "http://example.com/image.png" },
      id: 5,
    };
    const entity: Entity = {
      type: "Picture",
      parameters: { uuid: "pic-uuid-1", active: true, width: 1, height: 1 },
    };

    const result = await loader.loadModel(resource, entity);

    expect(result).toBeDefined();
  });

  it("audio resource with no file returns undefined (no file to load)", async () => {
    const resource: Resource = {
      type: "audio",
      file: null,
      id: 6,
    };
    const entity: Entity = {
      type: "Sound",
      parameters: { uuid: "audio-no-file", active: true },
    };

    const result = await loader.loadModel(resource, entity);

    // When resource.file is null, audio block is skipped → falls through → undefined
    expect(result).toBeUndefined();
    expect(ctx.sources.has("audio-no-file")).toBe(false);
  });
});
