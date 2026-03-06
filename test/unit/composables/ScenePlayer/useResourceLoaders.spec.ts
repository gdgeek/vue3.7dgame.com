import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/assets/js/helper", () => ({
  convertToHttps: (url: string) => url.replace("http://", "https://"),
}));

vi.mock("@/assets/js/voxel/VOXLoader.js", () => ({
  VOXLoader: vi.fn(),
  VOXMesh: vi.fn(),
}));

vi.mock("@/lib/three/loaders", () => ({
  getConfiguredGLTFLoader: vi.fn(),
}));

vi.mock("@/components/ScenePlayer/composables/useComponentHandlers", () => ({
  applyComponents: vi.fn().mockReturnValue({ type: "model", data: { mesh: {} } }),
}));

describe("combineTransforms (pure utility)", () => {
  const importCombineTransforms = async () => {
    const { combineTransforms } = await import(
      "@/components/ScenePlayer/composables/useResourceLoaders"
    );
    return combineTransforms;
  };

  it("returns default transform when both are undefined", async () => {
    const combineTransforms = await importCombineTransforms();
    const result = combineTransforms(undefined, undefined);
    expect(result.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(result.rotate).toEqual({ x: 0, y: 0, z: 0 });
    expect(result.scale).toEqual({ x: 1, y: 1, z: 1 });
  });

  it("returns childTransform when parentTransform is undefined", async () => {
    const combineTransforms = await importCombineTransforms();
    const child = {
      position: { x: 1, y: 2, z: 3 },
      rotate: { x: 10, y: 20, z: 30 },
      scale: { x: 2, y: 2, z: 2 },
    };
    const result = combineTransforms(undefined, child);
    expect(result).toBe(child);
  });

  it("returns parentTransform when childTransform is undefined", async () => {
    const combineTransforms = await importCombineTransforms();
    const parent = {
      position: { x: 5, y: 5, z: 5 },
      rotate: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    };
    const result = combineTransforms(parent, undefined);
    expect(result).toBe(parent);
  });

  it("sums rotations when both provided", async () => {
    const combineTransforms = await importCombineTransforms();
    const parent = {
      position: { x: 0, y: 0, z: 0 },
      rotate: { x: 10, y: 20, z: 30 },
      scale: { x: 1, y: 1, z: 1 },
    };
    const child = {
      position: { x: 0, y: 0, z: 0 },
      rotate: { x: 5, y: 10, z: 15 },
      scale: { x: 1, y: 1, z: 1 },
    };
    const result = combineTransforms(parent, child);
    expect(result.rotate.x).toBeCloseTo(15);
    expect(result.rotate.y).toBeCloseTo(30);
    expect(result.rotate.z).toBeCloseTo(45);
  });

  it("multiplies scales when both provided", async () => {
    const combineTransforms = await importCombineTransforms();
    const parent = {
      position: { x: 0, y: 0, z: 0 },
      rotate: { x: 0, y: 0, z: 0 },
      scale: { x: 2, y: 3, z: 4 },
    };
    const child = {
      position: { x: 0, y: 0, z: 0 },
      rotate: { x: 0, y: 0, z: 0 },
      scale: { x: 0.5, y: 2, z: 1 },
    };
    const result = combineTransforms(parent, child);
    expect(result.scale.x).toBeCloseTo(1);
    expect(result.scale.y).toBeCloseTo(6);
    expect(result.scale.z).toBeCloseTo(4);
  });

  it("offsets child position by parent position when no rotation", async () => {
    const combineTransforms = await importCombineTransforms();
    const parent = {
      position: { x: 10, y: 0, z: 0 },
      rotate: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    };
    const child = {
      position: { x: 5, y: 0, z: 0 },
      rotate: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    };
    const result = combineTransforms(parent, child);
    expect(result.position.x).toBeCloseTo(15);
    expect(result.position.y).toBeCloseTo(0);
    expect(result.position.z).toBeCloseTo(0);
  });

  it("scales child position by parent scale", async () => {
    const combineTransforms = await importCombineTransforms();
    const parent = {
      position: { x: 0, y: 0, z: 0 },
      rotate: { x: 0, y: 0, z: 0 },
      scale: { x: 2, y: 2, z: 2 },
    };
    const child = {
      position: { x: 3, y: 4, z: 5 },
      rotate: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    };
    const result = combineTransforms(parent, child);
    expect(result.position.x).toBeCloseTo(6);
    expect(result.position.y).toBeCloseTo(8);
    expect(result.position.z).toBeCloseTo(10);
  });
});

describe("useResourceLoaders", () => {
  const makeCtx = () => ({
    renderer: null,
    camera: null,
    threeScene: { add: vi.fn() },
    controls: { value: null },
    mouse: { x: 0, y: 0 },
    raycaster: {},
    sources: new Map(),
    mixers: new Map(),
    collisionObjects: { value: [] },
    rotatingObjects: { value: [] },
    moveableObjects: { value: [] },
    dragState: {
      isDragging: false,
      draggedObject: null,
      dragStartPosition: {},
      dragOffset: {},
      mouseStartPosition: {},
      lastIntersection: {},
    },
    sceneInstanceId: "test-id",
    triggerEvent: vi.fn(),
    findResource: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns loadModel and processEntities functions", async () => {
    const { useResourceLoaders } = await import(
      "@/components/ScenePlayer/composables/useResourceLoaders"
    );
    const ctx = makeCtx();
    const { loadModel, processEntities } = useResourceLoaders(ctx as never);
    expect(typeof loadModel).toBe("function");
    expect(typeof processEntities).toBe("function");
  });

  describe("loadModel - audio type", () => {
    it("stores audio URL in sources map", async () => {
      const { useResourceLoaders } = await import(
        "@/components/ScenePlayer/composables/useResourceLoaders"
      );
      const ctx = makeCtx();
      const { loadModel } = useResourceLoaders(ctx as never);

      const resource = {
        type: "audio",
        file: { url: "https://example.com/sound.mp3" },
      };
      const entity = {
        type: "Sound",
        parameters: {
          uuid: "audio-123",
          active: true,
        },
      };

      const result = await loadModel(resource as never, entity as never);
      expect(result).toBe(true);
      expect(ctx.sources.has("audio-123")).toBe(true);
      const source = ctx.sources.get("audio-123");
      expect(source?.type).toBe("audio");
      expect((source?.data as { url: string }).url).toBe("https://example.com/sound.mp3");
    });

    it("converts http to https for audio URL", async () => {
      const { useResourceLoaders } = await import(
        "@/components/ScenePlayer/composables/useResourceLoaders"
      );
      const ctx = makeCtx();
      const { loadModel } = useResourceLoaders(ctx as never);

      const resource = {
        type: "audio",
        file: { url: "http://example.com/sound.mp3" },
      };
      const entity = { type: "Sound", parameters: { uuid: "audio-456", active: true } };

      await loadModel(resource as never, entity as never);

      const source = ctx.sources.get("audio-456");
      expect((source?.data as { url: string }).url).toBe("https://example.com/sound.mp3");
    });
  });

  describe("processEntities - entity container type", () => {
    it("registers entity source in sources map", async () => {
      const { useResourceLoaders } = await import(
        "@/components/ScenePlayer/composables/useResourceLoaders"
      );
      const ctx = makeCtx();
      const { processEntities } = useResourceLoaders(ctx as never);

      const entities = [
        {
          type: "Entity",
          parameters: { uuid: "entity-abc", active: true },
        },
      ];

      await processEntities(entities as never);

      expect(ctx.sources.has("entity-abc")).toBe(true);
      expect(ctx.sources.get("entity-abc")?.type).toBe("entity");
    });

    it("skips entity without matching resource", async () => {
      const { useResourceLoaders } = await import(
        "@/components/ScenePlayer/composables/useResourceLoaders"
      );
      const ctx = makeCtx();
      ctx.findResource = vi.fn().mockReturnValue(undefined); // resource not found
      const { processEntities } = useResourceLoaders(ctx as never);

      const entities = [
        {
          type: "Model",
          parameters: { uuid: "model-xyz", resource: "999", active: true },
        },
      ];

      // Should not throw, just skip
      await expect(processEntities(entities as never)).resolves.toBeUndefined();
    });
  });
});
