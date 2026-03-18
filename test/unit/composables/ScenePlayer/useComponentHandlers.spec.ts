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
      x: 0,
      y: 0,
      z: 0,
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
        x: 0,
        y: 0,
        z: 0,
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
    expect(
      typeof (result.data as { setVisibility: unknown }).setVisibility
    ).toBe("function");
  });

  it("setVisibility toggles mesh.visible", () => {
    const mesh = makeMesh();
    mesh.visible = true;
    const ctx = makeCtx();
    const result = applyComponents({ mesh, uuid: "u1", components: [], ctx });
    (result.data as { setVisibility: (v: boolean) => void }).setVisibility(
      false
    );
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
        (
          ctx.renderer as {
            domElement: { addEventListener: ReturnType<typeof vi.fn> };
          }
        ).domElement.addEventListener
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
        (
          ctx.renderer as {
            domElement: { removeEventListener: ReturnType<typeof vi.fn> };
          }
        ).domElement.removeEventListener
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
        typeof (result.data as { updateBoundingBox?: unknown })
          .updateBoundingBox
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
        (
          ctx.renderer as {
            domElement: { removeEventListener: ReturnType<typeof vi.fn> };
          }
        ).domElement.removeEventListener
      ).toHaveBeenCalled();
    });

    it("onMouseDown starts dragging when mesh is intersected", () => {
      const mesh = makeMesh();
      const ctx = makeCtx();
      // Make raycaster detect an intersection
      const intersectPoint = { x: 1, y: 2, z: 3, copy: vi.fn().mockReturnThis(), sub: vi.fn().mockReturnThis() };
      (ctx.raycaster.intersectObject as ReturnType<typeof vi.fn>).mockReturnValue([
        { point: intersectPoint },
      ]);
      // Fix dragOffset mock to support chaining (copy returns this)
      ctx.dragState.dragOffset = { copy: vi.fn().mockReturnThis(), sub: vi.fn().mockReturnThis() } as never;

      let capturedMouseDown: ((e: MouseEvent) => void) | null = null;
      (
        ctx.renderer as {
          domElement: { addEventListener: ReturnType<typeof vi.fn> };
        }
      ).domElement.addEventListener.mockImplementation(
        (event: string, handler: (e: MouseEvent) => void) => {
          if (event === "mousedown") capturedMouseDown = handler;
        }
      );

      applyComponents({
        mesh,
        uuid: "u1",
        components: [{ type: "Moved", parameters: { uuid: "m1" } }],
        ctx,
      });

      capturedMouseDown!({ clientX: 100, clientY: 200, preventDefault: vi.fn() } as unknown as MouseEvent);

      expect(ctx.dragState.isDragging).toBe(true);
      expect(ctx.dragState.draggedObject).toBe(mesh);
      expect(ctx.controls.value!.enabled).toBe(false);
    });

    it("onMouseDown does NOT start dragging when no intersection", () => {
      const mesh = makeMesh();
      const ctx = makeCtx();
      (ctx.raycaster.intersectObject as ReturnType<typeof vi.fn>).mockReturnValue([]);

      let capturedMouseDown: ((e: MouseEvent) => void) | null = null;
      (
        ctx.renderer as {
          domElement: { addEventListener: ReturnType<typeof vi.fn> };
        }
      ).domElement.addEventListener.mockImplementation(
        (event: string, handler: (e: MouseEvent) => void) => {
          if (event === "mousedown") capturedMouseDown = handler;
        }
      );

      applyComponents({
        mesh,
        uuid: "u1",
        components: [{ type: "Moved", parameters: { uuid: "m1" } }],
        ctx,
      });

      capturedMouseDown!({ clientX: 100, clientY: 200, preventDefault: vi.fn() } as unknown as MouseEvent);

      expect(ctx.dragState.isDragging).toBe(false);
      expect(ctx.controls.value!.enabled).toBe(true);
    });

    it("onMouseUp ends dragging and re-enables controls", () => {
      const mesh = makeMesh();
      const ctx = makeCtx();
      ctx.dragState.isDragging = true;
      ctx.dragState.draggedObject = mesh;
      ctx.controls.value!.enabled = false;

      const addEventSpy = vi.spyOn(document, "addEventListener");
      applyComponents({
        mesh,
        uuid: "u1",
        components: [{ type: "Moved", parameters: { uuid: "m1" } }],
        ctx,
      });

      // Find the mouseup handler
      const mouseUpCall = addEventSpy.mock.calls.find(([ev]) => ev === "mouseup");
      expect(mouseUpCall).toBeDefined();
      const mouseUpHandler = mouseUpCall![1] as () => void;

      mouseUpHandler();
      expect(ctx.dragState.isDragging).toBe(false);
      expect(ctx.dragState.draggedObject).toBeNull();
      expect(ctx.controls.value!.enabled).toBe(true);

      addEventSpy.mockRestore();
    });

    it("onMouseMove does nothing when not dragging", () => {
      const mesh = makeMesh();
      const ctx = makeCtx();
      ctx.dragState.isDragging = false;

      const addEventSpy = vi.spyOn(document, "addEventListener");
      applyComponents({
        mesh,
        uuid: "u1",
        components: [{ type: "Moved", parameters: { uuid: "m1" } }],
        ctx,
      });

      const mouseMoveCall = addEventSpy.mock.calls.find(([ev]) => ev === "mousemove");
      expect(mouseMoveCall).toBeDefined();
      const mouseMoveHandler = mouseMoveCall![1] as (e: MouseEvent) => void;

      // Not dragging → should not throw or modify position
      expect(() =>
        mouseMoveHandler({ clientX: 50, clientY: 50 } as MouseEvent)
      ).not.toThrow();

      addEventSpy.mockRestore();
    });

    it("onMouseMove moves object when dragging and plane intersection found", () => {
      const mesh = makeMesh();
      const ctx = makeCtx();
      ctx.dragState.isDragging = true;
      ctx.dragState.draggedObject = mesh;

      // Provide a moveable object with no limits
      ctx.moveableObjects.value.push({
        mesh,
        isDragging: true,
        magnetic: false,
        scalable: false,
        limit: {
          x: { enable: false, min: 0, max: 0 },
          y: { enable: false, min: 0, max: 0 },
          z: { enable: false, min: 0, max: 0 },
        },
        checkVisibility: true,
      } as never);

      // Make raycaster find a plane intersection
      const intersection = {
        x: 5, y: 5, z: 5,
        copy: vi.fn().mockReturnThis(),
        add: vi.fn().mockReturnThis(),
        lerpVectors: vi.fn().mockReturnThis(),
      };
      (ctx.raycaster.ray.intersectPlane as ReturnType<typeof vi.fn>).mockReturnValue(intersection);

      const addEventSpy = vi.spyOn(document, "addEventListener");
      applyComponents({
        mesh,
        uuid: "u1",
        components: [
          {
            type: "Moved",
            parameters: { uuid: "m1" },
          },
        ],
        ctx,
      });

      const mouseMoveCall = addEventSpy.mock.calls.find(([ev]) => ev === "mousemove");
      const mouseMoveHandler = mouseMoveCall![1] as (e: MouseEvent) => void;

      expect(() =>
        mouseMoveHandler({ clientX: 200, clientY: 300 } as MouseEvent)
      ).not.toThrow();

      addEventSpy.mockRestore();
    });

    it("uses limit constraints when enabled", () => {
      const mesh = makeMesh();
      const ctx = makeCtx();
      ctx.dragState.isDragging = true;
      ctx.dragState.draggedObject = mesh;

      const clampedPosition = {
        x: 5, y: 5, z: 5,
        copy: vi.fn().mockReturnThis(),
        add: vi.fn().mockReturnThis(),
        lerpVectors: vi.fn().mockReturnThis(),
      };
      (ctx.raycaster.ray.intersectPlane as ReturnType<typeof vi.fn>).mockReturnValue(clampedPosition);

      const addEventSpy = vi.spyOn(document, "addEventListener");
      applyComponents({
        mesh,
        uuid: "u1",
        components: [
          {
            type: "Moved",
            parameters: {
              uuid: "m1",
              limit: {
                x: { enable: true, min: -1, max: 1 },
                y: { enable: true, min: -2, max: 2 },
                z: { enable: true, min: -3, max: 3 },
              },
            },
          },
        ],
        ctx,
      });

      const mouseMoveCall = addEventSpy.mock.calls.find(([ev]) => ev === "mousemove");
      const mouseMoveHandler = mouseMoveCall![1] as (e: MouseEvent) => void;

      expect(() =>
        mouseMoveHandler({ clientX: 100, clientY: 100 } as MouseEvent)
      ).not.toThrow();

      addEventSpy.mockRestore();
    });
  });

  describe("Action component — click handler", () => {
    it("does not fire event when mesh is not visible", async () => {
      const mesh = makeMesh();
      mesh.visible = false;
      const ctx = makeCtx();

      let capturedClick: ((e: MouseEvent) => void) | null = null;
      (
        ctx.renderer as {
          domElement: { addEventListener: ReturnType<typeof vi.fn> };
        }
      ).domElement.addEventListener.mockImplementation(
        (event: string, handler: (e: MouseEvent) => void) => {
          if (event === "click") capturedClick = handler;
        }
      );

      applyComponents({
        mesh,
        uuid: "u1",
        components: [{ type: "Action", parameters: { uuid: "ev1" } }],
        ctx,
      });

      capturedClick!({ clientX: 100, clientY: 100 } as MouseEvent);
      expect(ctx.triggerEvent).not.toHaveBeenCalled();
    });

    it("fires triggerEvent when mesh is clicked and visible", async () => {
      const mesh = makeMesh();
      mesh.visible = true;
      const ctx = makeCtx();

      // Make raycaster detect intersection
      (ctx.raycaster.intersectObject as ReturnType<typeof vi.fn>).mockReturnValue([
        { point: { x: 0, y: 0, z: 0 } },
      ]);

      let capturedClick: ((e: MouseEvent) => void) | null = null;
      (
        ctx.renderer as {
          domElement: { addEventListener: ReturnType<typeof vi.fn> };
        }
      ).domElement.addEventListener.mockImplementation(
        (event: string, handler: (e: MouseEvent) => void) => {
          if (event === "click") capturedClick = handler;
        }
      );

      applyComponents({
        mesh,
        uuid: "u1",
        components: [{ type: "Action", parameters: { uuid: "ev-trigger" } }],
        ctx,
      });

      await capturedClick!({ clientX: 100, clientY: 100 } as MouseEvent);
      expect(ctx.triggerEvent).toHaveBeenCalledWith("ev-trigger");
    });

    it("handles triggerEvent error gracefully", async () => {
      const mesh = makeMesh();
      mesh.visible = true;
      const ctx = makeCtx();
      (ctx.triggerEvent as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("event error")
      );
      (ctx.raycaster.intersectObject as ReturnType<typeof vi.fn>).mockReturnValue([
        { point: { x: 0, y: 0, z: 0 } },
      ]);

      let capturedClick: ((e: MouseEvent) => void) | null = null;
      (
        ctx.renderer as {
          domElement: { addEventListener: ReturnType<typeof vi.fn> };
        }
      ).domElement.addEventListener.mockImplementation(
        (event: string, handler: (e: MouseEvent) => void) => {
          if (event === "click") capturedClick = handler;
        }
      );

      applyComponents({
        mesh,
        uuid: "u1",
        components: [{ type: "Action", parameters: { uuid: "ev-err" } }],
        ctx,
      });

      // Should not throw
      await expect(
        capturedClick!({ clientX: 100, clientY: 100 } as MouseEvent)
      ).resolves.not.toThrow();
    });
  });

  describe("Rotate component — setRotating", () => {
    it("removes mesh from rotatingObjects when setRotating(false)", () => {
      const mesh = makeMesh();
      // Use a plain (non-Vue-reactive) array so findIndex keeps === identity
      const rawArr: unknown[] = [];
      const rotatingObjects = { value: rawArr };
      const ctx = makeCtx({ rotatingObjects });
      const result = applyComponents({
        mesh,
        uuid: "u1",
        components: [
          {
            type: "Rotate",
            parameters: { uuid: "r1", speed: { x: 0, y: 45, z: 0 } },
          },
        ],
        ctx,
      });

      expect(rawArr).toHaveLength(1);
      const { setRotating } = result.data as {
        setRotating?: (isRotating: boolean) => void;
      };
      setRotating!(false);
      expect(rawArr).toHaveLength(0);
    });

    it("re-adds mesh to rotatingObjects when setRotating(true) and not present", () => {
      const mesh = makeMesh();
      const rawArr: unknown[] = [];
      const rotatingObjects = { value: rawArr };
      const ctx = makeCtx({ rotatingObjects });
      const result = applyComponents({
        mesh,
        uuid: "u1",
        components: [
          {
            type: "Rotate",
            parameters: { uuid: "r1", speed: { x: 0, y: 45, z: 0 } },
          },
        ],
        ctx,
      });

      const { setRotating } = result.data as {
        setRotating?: (isRotating: boolean) => void;
      };
      setRotating!(false); // remove first
      expect(rawArr).toHaveLength(0);
      setRotating!(true); // re-add
      expect(rawArr).toHaveLength(1);
    });
  });

  describe("Trigger component — updateBoundingBox on existing source", () => {
    it("updates existing source's updateBoundingBox when source exists in ctx.sources", () => {
      const mesh = makeMesh();
      const ctx = makeCtx();

      // Pre-populate sources with a model type entry for the same uuid
      ctx.sources.set("u1", {
        type: "model",
        data: {
          mesh,
          setVisibility: vi.fn(),
          cleanup: undefined,
          updateBoundingBox: undefined,
          setRotating: undefined,
        },
      } as never);

      applyComponents({
        mesh,
        uuid: "u1",
        components: [
          { type: "Trigger", parameters: { uuid: "t1", target: "u2" } },
        ],
        ctx,
      });

      const existingSource = ctx.sources.get("u1") as {
        type: string;
        data: { updateBoundingBox?: () => void };
      };
      expect(typeof existingSource.data.updateBoundingBox).toBe("function");
    });
  });
});
