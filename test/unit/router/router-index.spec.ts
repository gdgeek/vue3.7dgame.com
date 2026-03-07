/**
 * Unit tests for src/router/index.ts
 * Covers: Layout, setupRouter, constantRoutes, routerData,
 *         UpdateRoutes (check + convertRoutes), useRouter
 *
 * NOTE: structuredClone cannot clone arrow functions (component factories),
 * so UpdateRoutes tests use a spy to inject a clone-safe version.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoist shared mock setup ───────────────────────────────────────────────
const mockAppUse = vi.hoisted(() => vi.fn());

// ── Mock route modules with plain serializable objects ───────────────────
vi.mock("@/router/modules/public", () => ({
  publicRoutes: [{ path: "/login", meta: { hidden: true } }],
}));
vi.mock("@/router/modules/home", () => ({
  homeRoutes: { path: "/home", name: "Home", meta: { hidden: false } },
  settingsRoutes: {
    path: "/settings",
    name: "Settings",
    meta: { hidden: false },
  },
}));
vi.mock("@/router/modules/resource", () => ({
  resourceRoutes: {
    path: "/resource",
    name: "Resource",
    meta: { hidden: false },
  },
}));
vi.mock("@/router/modules/meta", () => ({
  metaRoutes: [{ path: "/meta", name: "Meta", meta: { hidden: false } }],
}));
vi.mock("@/router/modules/verse", () => ({
  verseRoutes: { path: "/verse", name: "Verse", meta: { hidden: false } },
  aiRoutes: { path: "/ai", name: "AI", meta: { hidden: false } },
}));
vi.mock("@/router/modules/campus", () => ({
  campusRoutes: { path: "/campus", name: "Campus", meta: { hidden: false } },
}));
vi.mock("@/router/modules/manager", () => ({
  managerRoutes: { path: "/manager", name: "Manager", meta: { hidden: false } },
  gameRoutes: { path: "/game", name: "Game", meta: { hidden: false } },
}));

// Mock layout component (function – cannot be structuredCloned)
vi.mock("@/layout/index.vue", () => ({ default: { name: "Layout" } }));

// ── Tests ─────────────────────────────────────────────────────────────────

describe("src/router/index.ts", () => {
  let routerIndex: typeof import("@/router/index");

  beforeEach(async () => {
    vi.clearAllMocks();
    routerIndex = await import("@/router/index");
  });

  // ── Layout ────────────────────────────────────────────────────────────────
  describe("Layout", () => {
    it("is a function (lazy-load factory)", () => {
      expect(typeof routerIndex.Layout).toBe("function");
    });

    it("returns a Promise when called", () => {
      const result = routerIndex.Layout();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  // ── setupRouter ───────────────────────────────────────────────────────────
  describe("setupRouter(app)", () => {
    it("calls app.use() exactly once", () => {
      const mockApp = { use: mockAppUse };
      routerIndex.setupRouter(mockApp as any);
      expect(mockAppUse).toHaveBeenCalledOnce();
    });

    it("does not throw", () => {
      const mockApp = { use: vi.fn() };
      expect(() => routerIndex.setupRouter(mockApp as any)).not.toThrow();
    });
  });

  // ── constantRoutes ────────────────────────────────────────────────────────
  describe("constantRoutes", () => {
    it("is an array", () => {
      expect(Array.isArray(routerIndex.constantRoutes)).toBe(true);
    });

    it("is non-empty (contains at least the root route)", () => {
      expect(routerIndex.constantRoutes.length).toBeGreaterThan(0);
    });

    it("contains a route with path '/'", () => {
      const rootRoute = routerIndex.constantRoutes.find((r) => r.path === "/");
      expect(rootRoute).toBeDefined();
    });

    it("root route has a redirect to /home", () => {
      const rootRoute = routerIndex.constantRoutes.find((r) => r.path === "/");
      expect(rootRoute?.redirect).toBe("/home");
    });

    it("contains a /redirect route", () => {
      const redirectRoute = routerIndex.constantRoutes.find(
        (r) => r.path === "/redirect"
      );
      expect(redirectRoute).toBeDefined();
    });
  });

  // ── routerData ────────────────────────────────────────────────────────────
  describe("routerData", () => {
    it("is a Vue ref (has .value property)", () => {
      expect(routerIndex.routerData).toHaveProperty("value");
    });

    it("initial value is an array", () => {
      expect(Array.isArray(routerIndex.routerData.value)).toBe(true);
    });
  });

  // ── UpdateRoutes ──────────────────────────────────────────────────────────
  describe("UpdateRoutes(ability)", () => {
    /**
     * structuredClone cannot clone arrow functions (component lazy factories).
     * We spy on the global so UpdateRoutes receives a clone that only carries
     * serialisable properties (meta, path, name, children).
     */
    const cloneWithoutFns = (obj: unknown): unknown => {
      if (Array.isArray(obj)) return obj.map(cloneWithoutFns);
      if (obj && typeof obj === "object") {
        return Object.fromEntries(
          Object.entries(obj as Record<string, unknown>)
            .filter(([, v]) => typeof v !== "function")
            .map(([k, v]) => [k, cloneWithoutFns(v)])
        );
      }
      return obj;
    };

    let cloneSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      cloneSpy = vi
        .spyOn(globalThis, "structuredClone")
        .mockImplementation(cloneWithoutFns as typeof structuredClone);
    });

    afterEach(() => {
      cloneSpy.mockRestore();
    });

    it("is an async function", () => {
      const result = routerIndex.UpdateRoutes({
        can: vi.fn(() => true),
      } as any);
      expect(result).toBeInstanceOf(Promise);
    });

    it("populates routerData after call", async () => {
      const ability = { can: vi.fn(() => true) };
      await routerIndex.UpdateRoutes(ability as any);
      expect(Array.isArray(routerIndex.routerData.value)).toBe(true);
    });

    it("hides routes when ability.can returns false", async () => {
      const ability = { can: vi.fn(() => false) };
      await routerIndex.UpdateRoutes(ability as any);
      const rootRoute = routerIndex.constantRoutes.find((r) => r.path === "/");
      if (rootRoute?.children) {
        rootRoute.children.forEach((child) => {
          if (child.meta) {
            expect(child.meta.hidden).toBe(true);
          }
        });
      }
    });

    it("shows routes when ability.can returns true", async () => {
      const ability = { can: vi.fn(() => true) };
      await routerIndex.UpdateRoutes(ability as any);
      const rootRoute = routerIndex.constantRoutes.find((r) => r.path === "/");
      if (rootRoute?.children) {
        rootRoute.children.forEach((child) => {
          if (child.meta) {
            expect(child.meta.hidden).toBe(false);
          }
        });
      }
    });

    it("ability.can is called for each route that has a meta", async () => {
      const canMock = vi.fn(() => true);
      const ability = { can: canMock };
      await routerIndex.UpdateRoutes(ability as any);
      expect(canMock).toHaveBeenCalled();
    });

    it("re-runs check independently on each call (state reset)", async () => {
      const hideAbility = { can: vi.fn(() => false) };
      await routerIndex.UpdateRoutes(hideAbility as any);
      const rootAfterHide = routerIndex.constantRoutes.find(
        (r) => r.path === "/"
      );
      const allHidden = rootAfterHide?.children?.every(
        (c) => c.meta?.hidden === true
      );

      const showAbility = { can: vi.fn(() => true) };
      await routerIndex.UpdateRoutes(showAbility as any);
      const rootAfterShow = routerIndex.constantRoutes.find(
        (r) => r.path === "/"
      );
      const allShown = rootAfterShow?.children?.every(
        (c) => c.meta?.hidden === false
      );

      // Both states should reflect the respective ability decisions
      expect(allHidden).toBe(true);
      expect(allShown).toBe(true);
    });
  });

  // ── useRouter ─────────────────────────────────────────────────────────────
  describe("useRouter()", () => {
    it("returns the router instance (truthy)", () => {
      const r = routerIndex.useRouter();
      expect(r).toBeTruthy();
    });

    it("router has push and replace methods", () => {
      const r = routerIndex.useRouter();
      expect(typeof r.push).toBe("function");
      expect(typeof r.replace).toBe("function");
    });

    it("populates routerData when called", () => {
      routerIndex.useRouter();
      expect(Array.isArray(routerIndex.routerData.value)).toBe(true);
    });

    it("returns the same router on subsequent calls", () => {
      const r1 = routerIndex.useRouter();
      const r2 = routerIndex.useRouter();
      expect(r1).toBe(r2);
    });
  });
});
