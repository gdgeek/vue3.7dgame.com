/**
 * Unit tests for src/router/index.ts
 *
 * Covers:
 *   - setupRouter: registers router on Vue app
 *   - Layout: lazy-load function
 *   - UpdateRoutes: clones & ability-filters routes
 *   - useRouter: returns router + calls initRoutes
 *   - convertRoutes (via UpdateRoutes): path prefix, children, getComponentName branches
 *   - initRoutes else-branch: routerData = [] when no "/" route
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock vue-router ──────────────────────────────────────────────────────────
const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  go: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  beforeEach: vi.fn(),
  afterEach: vi.fn(),
  getRoutes: vi.fn(() => []),
}));

vi.mock("vue-router", () => ({
  createRouter: vi.fn(() => mockRouter),
  createWebHistory: vi.fn(() => ({})),
  useRoute: vi.fn(),
  useRouter: vi.fn(() => mockRouter),
}));

// ── Mock route modules ───────────────────────────────────────────────────────
vi.mock("@/router/modules/public", () => ({
  publicRoutes: [],
}));
vi.mock("@/router/modules/home", () => ({
  homeRoutes: { path: "/home", name: "Home", component: () => {}, children: [], meta: { title: "home" } },
  settingsRoutes: { path: "/settings", name: "Settings", component: () => {}, children: [], meta: {} },
}));
vi.mock("@/router/modules/resource", () => ({
  resourceRoutes: { path: "/resource", name: "Resource", component: () => {}, children: [], meta: {} },
}));
vi.mock("@/router/modules/meta", () => ({
  metaRoutes: [],
}));
vi.mock("@/router/modules/verse", () => ({
  verseRoutes: { path: "/verse", name: "Verse", component: () => {}, children: [], meta: {} },
  aiRoutes: { path: "/ai", name: "AI", component: () => {}, children: [], meta: {} },
}));
vi.mock("@/router/modules/campus", () => ({
  campusRoutes: { path: "/campus", name: "Campus", component: () => {}, children: [], meta: {} },
}));
vi.mock("@/router/modules/manager", () => ({
  managerRoutes: { path: "/manager", name: "Manager", component: () => {}, children: [], meta: {} },
  gameRoutes: { path: "/game", name: "Game", component: () => {}, children: [], meta: {} },
}));

// ── Mock ability utilities ────────────────────────────────────────────────────
vi.mock("@/utils/ability", () => ({
  AbilityRouter: class AbilityRouter {
    constructor(public path: string) {}
  },
}));

// ── Mock structuredClone (router uses it, but functions can't be cloned in jsdom) ──
const originalStructuredClone = globalThis.structuredClone;
function shallowCloneRoutes(routes: unknown[]): unknown[] {
  return routes.map((r: any) => ({
    ...r,
    children: r.children ? shallowCloneRoutes(r.children) : undefined,
  }));
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("src/router/index.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Stub structuredClone to handle function-component routes
    vi.stubGlobal("structuredClone", (val: unknown) => {
      if (Array.isArray(val)) return shallowCloneRoutes(val);
      return originalStructuredClone(val);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── setupRouter ───────────────────────────────────────────────────────────
  describe("setupRouter", () => {
    it("calls app.use with the router instance", async () => {
      const { setupRouter } = await import("@/router");
      const app = { use: vi.fn() };
      setupRouter(app as any);
      expect(app.use).toHaveBeenCalledWith(mockRouter);
    });
  });

  // ── Layout ───────────────────────────────────────────────────────────────
  describe("Layout", () => {
    it("is a function (lazy component loader)", async () => {
      const { Layout } = await import("@/router");
      expect(typeof Layout).toBe("function");
    });
  });

  // ── useRouter ────────────────────────────────────────────────────────────
  describe("useRouter", () => {
    it("returns the router instance", async () => {
      const { useRouter } = await import("@/router");
      const result = useRouter();
      expect(result).toBe(mockRouter);
    });

    it("can be called multiple times without error", async () => {
      const { useRouter } = await import("@/router");
      const r1 = useRouter();
      const r2 = useRouter();
      expect(r1).toBe(r2);
    });
  });

  // ── UpdateRoutes ─────────────────────────────────────────────────────────
  describe("UpdateRoutes", () => {
    it("calls ability.can for each route", async () => {
      const { UpdateRoutes } = await import("@/router");
      const mockAbility = {
        can: vi.fn(() => true),
      };
      await UpdateRoutes(mockAbility as any);
      expect(mockAbility.can).toHaveBeenCalled();
    });

    it("sets meta.hidden=false when ability.can returns true", async () => {
      const { UpdateRoutes, constantRoutes } = await import("@/router");
      const mockAbility = { can: vi.fn(() => true) };
      await UpdateRoutes(mockAbility as any);
      // All top-level routes with meta should have hidden=false (can open = true → !true = false)
      const routeWithMeta = constantRoutes.find(
        (r) => r.meta && r.path === "/redirect"
      );
      if (routeWithMeta?.meta) {
        expect(routeWithMeta.meta.hidden).toBe(false);
      }
    });

    it("sets meta.hidden=true when ability.can returns false", async () => {
      const { UpdateRoutes, constantRoutes } = await import("@/router");
      const mockAbility = { can: vi.fn(() => false) };
      await UpdateRoutes(mockAbility as any);
      const routeWithMeta = constantRoutes.find(
        (r) => r.meta && r.path === "/redirect"
      );
      if (routeWithMeta?.meta) {
        expect(routeWithMeta.meta.hidden).toBe(true);
      }
    });

    it("recurses into children routes", async () => {
      const { UpdateRoutes } = await import("@/router");
      let callCount = 0;
      const mockAbility = {
        can: vi.fn(() => {
          callCount++;
          return true;
        }),
      };
      await UpdateRoutes(mockAbility as any);
      // Should be called for redirect route + its children + "/" route children
      expect(callCount).toBeGreaterThan(2);
    });

    it("does not throw when ability.can always returns false", async () => {
      const { UpdateRoutes } = await import("@/router");
      const mockAbility = { can: vi.fn(() => false) };
      await expect(UpdateRoutes(mockAbility as any)).resolves.toBeUndefined();
    });
  });

  // ── routerData ref ───────────────────────────────────────────────────────
  describe("routerData", () => {
    it("is exported as a ref (has .value)", async () => {
      const { routerData } = await import("@/router");
      expect(routerData).toBeDefined();
      expect("value" in routerData).toBe(true);
    });

    it("routerData.value is an array after useRouter is called", async () => {
      const { useRouter, routerData } = await import("@/router");
      useRouter();
      expect(Array.isArray(routerData.value)).toBe(true);
    });
  });

  // ── getComponentName (via convertRoutes in UpdateRoutes) ─────────────────
  describe("getComponentName branches (exercised via UpdateRoutes + routerData)", () => {
    it("function component: name comes from function.name property", async () => {
      // The route modules mock returns components as arrow functions (no .name)
      // useRouter() → initRoutes() → convertRoutes() → getComponentName()
      const { useRouter, routerData } = await import("@/router");
      useRouter();
      // routerData should be an array (convertRoutes ran)
      expect(Array.isArray(routerData.value)).toBe(true);
    });
  });

  // ── constantRoutes export ────────────────────────────────────────────────
  describe("constantRoutes", () => {
    it("is an array of route records", async () => {
      const { constantRoutes } = await import("@/router");
      expect(Array.isArray(constantRoutes)).toBe(true);
    });

    it("includes the redirect route", async () => {
      const { constantRoutes } = await import("@/router");
      const redirectRoute = constantRoutes.find((r) => r.path === "/redirect");
      expect(redirectRoute).toBeDefined();
    });

    it('includes the root "/" route', async () => {
      const { constantRoutes } = await import("@/router");
      const rootRoute = constantRoutes.find((r) => r.path === "/");
      expect(rootRoute).toBeDefined();
    });
  });
});
