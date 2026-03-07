/**
 * Unit tests for src/components/ScenePlayer/composables/useComponentHandlers.ts
 * Covers: applyComponents — no components, Action, Trigger, Rotate, Moved
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";

vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Mock THREE with minimal implementations
vi.mock("three", async () => {
  const actual = await vi.importActual<typeof import("three")>("three");
  return {
    ...actual,
    Box3: vi.fn().mockImplementation(() => ({
      setFromObject: vi.fn().mockReturnThis(),
    })),
    MathUtils: {
      degToRad: (deg: number) => (deg * Math.PI) / 180,
      clamp: (v: number, min: number, max: number) =>
        Math.max(min, Math.min(max, v)),
    },
    Vector2: vi.fn().mockImplementation(() => ({ x: 0, y: 0 })),
    Vector3: vi.fn().mockImplementation(() => ({
      x: 0, y: 0, z: 0,
      copy: vi.fn().mockReturnThis(),
      sub: vi.fn().mockReturnThis(),
      add: vi.fn().mockReturnThis(),
      dot: vi.fn(() => 0),
      applyQuaternion: vi.fn().mockReturnThis(),
      lerpVectors: vi.fn().mockReturnThis(),
      clone: vi.fn().mockReturnThis(),
    })),
    Plane: vi.fn(),
    Raycaster: vi.fn().mockImplementation(() => ({
      setFromCamera: vi.fn(),
      intersectObject: vi.fn(() => []),
      ray: { intersectPlane: vi.fn(() => false) },
    })),
    Object3D: vi.fn().mockImplementation(() => ({
      visible: true,
      position: {
        x: 0, y: 0, z: 0,
        clone: vi.fn(() => ({ x: 0, y: 0, z: 0, copy: vi.fn() })),
        copy: vi.fn().mockReturnThis(),
        dot: vi.fn(() => 0),
      },
      quaternion: {},
      userData: {},
    })),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMesh() {
  return {
    visible: true,
    position: {
      x: 0,
      y: 0,
      z: 0,
      clone: vi.fn(() => ({ x: 0, y: 0, z: 0, copy: vi.fn() })),
      copy: vi.fn().mockReturnThis(),
      sub: vi.fn().mockReturnThis(),
      dot: vi.fn(() => 0),
    },
    userData: {},
  } as unknown as import("three").Object3D;
}

function makeCtx(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    renderer: {
      domElement: {
        getBoundingClientRect: vi.fn(() => ({
          left: 0,
          top: 0,
          width: 800,
          height: 600,
        })),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    },
    camera: { quaternion: {} },
    threeScene: {},
    controls: ref({ enabled: true }),
    mouse: { x: 0, y: 0 },
    raycaster: {
      setFromCamera: vi.fn(),
      intersectObject: vi.fn(() => []),
      ray: { intersectPlane: vi.fn(() => false) },
    },
    sources: new Map(),
    mixers: new Map(),
    collisionObjects: ref([]),
    rotatingObjects: ref([]),
    moveableObjects: ref([]),
    dragState: {
      isDragging: false,
      draggedObject: null,
      dragStartPosition: { copy: vi.fn(), dot: vi.fn(() => 0) },
      mouseStartPosition: { copy: vi.fn() },
      dragOffset: { copy: vi.fn(), sub: vi.fn().mockReturnThis() },
      lastIntersection: { copy: vi.fn() },
    },
    sceneInstanceId: "test-scene",
    triggerEvent: vi.fn().mockResolvedValue(undefined),
    findResource: vi.fn(),
    ...overrides,
  } as unknown as import("@/components/ScenePlayer/types").LoaderContext;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("applyComponents", () => {
  let applyComponents: typeof import("@/components/ScenePlayer/composables/useComponentHandlers").applyComponents;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ applyComponents } = await import(
      "@/components/ScenePlayer/composables/useComponentHandlers"
    ));
  });

  it("returns a SourceRecord of type 'model' with no components", () => {
    const mesh = makeMesh();
    const ctx = makeCtx();
    const result = applyComponents({
      mesh,
      uuid: "u1",
      components: [],
      ctx,
    });
    expect(result.type).toBe("model");
  });

  it("sets setVisibility on the returned data", () => {
    const mesh = makeMesh();
    const ctx = makeCtx();
    const result = applyComponents({ mesh, uuid: "u1", components: [], ctx });
    expect(typeof (result.data as { setVisibility: unknown }).setVisibility).toBe("function");
  });

  it("setVisibility toggles mesh.visible", () => {
    const mesh = makeMesh();
    mesh.visible = true;
    const ctx = makeCtx();
    const result = applyComponents({ mesh, uuid: "u1", components: [], ctx });
    (result.data as { setVisibility: (v: boolean) => void }).setVisibility(false);
    expect(mesh.visible).toBe(false);
  });

  describe("Action component", () => {
    it("registers a click event listener on renderer.domElement", () => {
      const mesh = makeMesh();
      const ctx = makeCtx();
      applyComponents({
        mesh,
        uuid: "u1",
        components: [{ type: "Action", parameters: { uuid: "event-1" } }],
        ctx,
      });
      expect(
        (ctx.renderer as { domElement: { addEventListener: ReturnType<typeof vi.fn> } })
          .domElement.addEventListener
      ).toHaveBeenCalledWith("click", expect.any(Function));
    });

    it("attaches a cleanup function that removes the click listener", () => {
      const mesh = makeMesh();
      const ctx = makeCtx();
      const result = applyComponents({
        mesh,
        uuid: "u1",
        components: [{ type: "Action", parameters: { uuid: "event-1" } }],
        ctx,
      });
      const { cleanup } = result.data as { cleanup?: () => void };
      expect(typeof cleanup).toBe("function");
      cleanup!();
      expect(
        (ctx.renderer as { domElement: { removeEventListener: ReturnType<typeof vi.fn> } })
          .domElement.removeEventListener
      ).toHaveBeenCalledWith("click", expect.any(Function));
    });
  });

  describe("Trigger component", () => {
    it("adds a collision object when target is provided", () => {
      const mesh = makeMesh();
      const ctx = makeCtx();
      applyComponents({
        mesh,
        uuid: "u1",
        components: [
          {
            type: "Trigger",
            parameters: { uuid: "trigger-event", target: "u2" },
          },
        ],
        ctx,
      });
      expect(ctx.collisionObjects.value).toHaveLength(1);
      expect(ctx.collisionObjects.value[0].sourceUuid).toBe("u1");
      expect(ctx.collisionObjects.value[0].targetUuid).toBe("u2");
    });

    it("does not add collision object when target is missing", () => {
      const mesh = makeMesh();
      const ctx = makeCtx();
      applyComponents({
        mesh,
        uuid: "u1",
        components: [
          { type: "Trigger", parameters: { uuid: "event-no-target" } },
        ],
        ctx,
      });
      expect(ctx.collisionObjects.value).toHaveLength(0);
    });

    it("sets updateBoundingBox on returned data", () => {
      const mesh = makeMesh();
      const ctx = makeCtx();
      const result = applyComponents({
        mesh,
        uuid: "u1",
        components: [
          {
            type: "Trigger",
            parameters: { uuid: "e1", target: "u2" },
          },
        ],
        ctx,
      });
      expect(
        typeof (result.data as { updateBoundingBox?: unknown }).updateBoundingBox
      ).toBe("function");
    });
  });

  describe("Rotate component", () => {
    it("adds a rotating object when speed is provided", () => {
      const mesh = makeMesh();
      const ctx = makeCtx();
      applyComponents({
        mesh,
        uuid: "u1",
        components: [
          {
            type: "Rotate",
            parameters: {
              uuid: "r1",
              speed: { x: 0, y: 45, z: 0 },
            },
          },
        ],
        ctx,
      });
      expect(ctx.rotatingObjects.value).toHaveLength(1);
      expect(ctx.rotatingObjects.value[0].mesh).toStrictEqual(mesh);
    });

    it("logs warning when speed is missing", async () => {
      const { logger } = await import("@/utils/logger");
      const mesh = makeMesh();
      const ctx = makeCtx();
      applyComponents({
        mesh,
        uuid: "u1",
        components: [{ type: "Rotate", parameters: { uuid: "r1" } }],
        ctx,
      });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Rotate component missing speed")
      );
    });

    it("attaches setRotating to returned data", () => {
      const mesh = makeMesh();
      const ctx = makeCtx();
      const result = applyComponents({
        mesh,
        uuid: "u1",
        components: [
          {
            type: "Rotate",
            parameters: { uuid: "r1", speed: { x: 0, y: 90, z: 0 } },
          },
        ],
        ctx,
      });
      expect(
        typeof (result.data as { setRotating?: unknown }).setRotating
      ).toBe("function");
    });
  });

  describe("Moved component", () => {
    it("adds a moveable object", () => {
      const mesh = makeMesh();
      const ctx = makeCtx();
      applyComponents({
        mesh,
        uuid: "u1",
        components: [{ type: "Moved", parameters: { uuid: "m1" } }],
        ctx,
      });
      expect(ctx.moveableObjects.value).toHaveLength(1);
      expect(ctx.moveableObjects.value[0].mesh).toStrictEqual(mesh);
    });

    it("attaches cleanup that removes event listeners", () => {
      const mesh = makeMesh();
      const ctx = makeCtx();
      const result = applyComponents({
        mesh,
        uuid: "u1",
        components: [{ type: "Moved", parameters: { uuid: "m1" } }],
        ctx,
      });
      const { cleanup } = result.data as { cleanup?: () => void };
      expect(typeof cleanup).toBe("function");
      cleanup!();
      expect(
        (ctx.renderer as { domElement: { removeEventListener: ReturnType<typeof vi.fn> } })
          .domElement.removeEventListener
      ).toHaveBeenCalled();
    });
  });
});
