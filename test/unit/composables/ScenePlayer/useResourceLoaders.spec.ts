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

  describe("destroy() guard – async callbacks are skipped after destroy()", () => {
    it("video: loadedmetadata callback does not execute after destroy()", async () => {
      const { useResourceLoaders } = await import(
        "@/components/ScenePlayer/composables/useResourceLoaders"
      );
      const ctx = makeCtx();

      let loadedMetadataCallback: (() => void) | null = null;
      const fakeVideo = {
        src: "",
        crossOrigin: "",
        loop: false,
        muted: false,
        playsInline: false,
        volume: 1,
        videoWidth: 640,
        videoHeight: 480,
        addEventListener: (_event: string, cb: () => void) => {
          if (_event === "loadedmetadata") loadedMetadataCallback = cb;
        },
      };
      const createElementSpy = vi.spyOn(document, "createElement").mockReturnValueOnce(
        fakeVideo as unknown as HTMLElement
      );

      const { loadModel, destroy } = useResourceLoaders(ctx as never);

      const resource = { type: "video", file: { url: "https://example.com/video.mp4" } };
      const entity = {
        type: "Video",
        parameters: { uuid: "video-d1", active: true, loop: false, muted: false, volume: 1, play: false },
      };

      // Start loading without awaiting – promise stays pending until the event fires
      loadModel(resource as never, entity as never);

      // Mark as destroyed before the async event arrives
      destroy();

      // Simulate loadedmetadata firing after destroy
      expect(loadedMetadataCallback).not.toBeNull();
      loadedMetadataCallback!();

      // The guard `if (_destroyed) return` must have fired – scene must be untouched
      expect(ctx.threeScene.add).not.toHaveBeenCalled();

      createElementSpy.mockRestore();
    });

    it("picture: texture load callback does not execute after destroy()", async () => {
      const { useResourceLoaders } = await import(
        "@/components/ScenePlayer/composables/useResourceLoaders"
      );
      const THREE = await import("three");
      const ctx = makeCtx();

      let textureOnLoad: ((texture: unknown) => void) | null = null;
      const loadSpy = vi.spyOn(THREE.TextureLoader.prototype, "load").mockImplementation(
        (_url: string, onLoad?: (texture: unknown) => void) => {
          if (onLoad) textureOnLoad = onLoad;
          return undefined as never;
        }
      );

      const { loadModel, destroy } = useResourceLoaders(ctx as never);

      const resource = { type: "picture", file: { url: "https://example.com/image.png" } };
      const entity = {
        type: "Picture",
        parameters: { uuid: "picture-d1", active: true, width: 1 },
      };

      // Start loading without awaiting
      loadModel(resource as never, entity as never);

      // Destroy before the callback fires
      destroy();

      // Simulate texture loaded after destroy
      expect(textureOnLoad).not.toBeNull();
      textureOnLoad!({ image: { width: 100, height: 100 } });

      // The guard must have prevented any scene mutation
      expect(ctx.threeScene.add).not.toHaveBeenCalled();

      loadSpy.mockRestore();
    });

    it("VOX: loader success callback does not execute after destroy()", async () => {
      const { useResourceLoaders } = await import(
        "@/components/ScenePlayer/composables/useResourceLoaders"
      );
      const { VOXLoader } = await import("@/assets/js/voxel/VOXLoader.js");
      const ctx = makeCtx();

      let voxOnLoad: ((chunks: unknown[]) => Promise<void>) | null = null;
      vi.mocked(VOXLoader).mockImplementation(() => ({
        load: (_url: string, onLoad: (chunks: unknown[]) => Promise<void>) => {
          voxOnLoad = onLoad;
        },
      }) as never);

      const { loadModel, destroy } = useResourceLoaders(ctx as never);

      const resource = { type: "voxel", file: { url: "https://example.com/model.vox" } };
      const entity = {
        type: "Voxel",
        parameters: { uuid: "vox-d1", active: true },
      };

      // Start loading without awaiting
      loadModel(resource as never, entity as never);

      // Destroy before the callback fires
      destroy();

      // Simulate VOX loader completing after destroy
      expect(voxOnLoad).not.toBeNull();
      await voxOnLoad!([{ data: [1], size: { x: 1, y: 1, z: 1 }, palette: [] }]);

      // The guard must have prevented any scene mutation
      expect(ctx.threeScene.add).not.toHaveBeenCalled();
    });

    it("GLTF: loader success callback does not execute after destroy()", async () => {
      const { useResourceLoaders } = await import(
        "@/components/ScenePlayer/composables/useResourceLoaders"
      );
      const { getConfiguredGLTFLoader } = await import("@/lib/three/loaders");
      const ctx = makeCtx();

      let gltfOnLoad: ((gltf: unknown) => Promise<void>) | null = null;
      vi.mocked(getConfiguredGLTFLoader).mockImplementation(() => ({
        load: (_url: string, onLoad: (gltf: unknown) => Promise<void>) => {
          gltfOnLoad = onLoad;
        },
      }) as never);

      const { loadModel, destroy } = useResourceLoaders(ctx as never);

      const resource = { type: "model", file: { url: "https://example.com/model.gltf" } };
      const entity = {
        type: "Model",
        parameters: { uuid: "gltf-d1", active: true },
      };

      // Start loading without awaiting
      loadModel(resource as never, entity as never);

      // Destroy before the callback fires
      destroy();

      // Simulate GLTF loader completing after destroy
      expect(gltfOnLoad).not.toBeNull();
      await gltfOnLoad!({ scene: {}, animations: [] });

      // The guard must have prevented any scene mutation
      expect(ctx.threeScene.add).not.toHaveBeenCalled();
    });
  });
});
