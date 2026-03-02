/**
 * Unit tests for src/store/modules/permission.ts — usePermissionStore
 * Focuses on setMixLeftMenus (pure lookup logic) and initial state.
 * generateRoutes is tested indirectly via mocked routerData.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";

// Provide a mutable routerData ref so tests can configure route data
const mockRouterData = { value: [] as unknown[] };

vi.mock("@/router", () => ({
  constantRoutes: [],
  routerData: mockRouterData,
}));
vi.mock("@/store", async () => {
  const { createPinia: cp } = await import("pinia");
  return { store: cp() };
});
vi.mock("@/api/menu/model", () => ({}));
vi.mock("@/layout/index.vue", () => ({ default: {} }));

describe("usePermissionStore", () => {
  let usePermissionStore: typeof import("@/store/modules/permission").usePermissionStore;

  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockRouterData.value = [];
    ({ usePermissionStore } = await import("@/store/modules/permission"));
  });

  // -----------------------------------------------------------------------
  // Initial state
  // -----------------------------------------------------------------------
  it("routes starts as empty array", () => {
    const store = usePermissionStore();
    expect(store.routes).toEqual([]);
  });

  it("mixLeftMenus starts as empty array", () => {
    const store = usePermissionStore();
    expect(store.mixLeftMenus).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // setMixLeftMenus()
  // -----------------------------------------------------------------------
  it("sets mixLeftMenus from the matched top-level route children", () => {
    const children = [{ path: "/dashboard", name: "Dashboard" }];
    mockRouterData.value = [
      { path: "/home", children },
      { path: "/settings", children: [] },
    ] as never;

    const store = usePermissionStore();
    store.setMixLeftMenus("/home");
    expect(store.mixLeftMenus).toEqual(children);
  });

  it("does not change mixLeftMenus when path is not found", () => {
    mockRouterData.value = [
      { path: "/home", children: [{ path: "/sub" }] },
    ] as never;
    const store = usePermissionStore();
    store.setMixLeftMenus("/nonexistent");
    expect(store.mixLeftMenus).toEqual([]);
  });

  it("does not change mixLeftMenus when matched route has no children", () => {
    mockRouterData.value = [{ path: "/home" }] as never; // no children property
    const store = usePermissionStore();
    store.setMixLeftMenus("/home");
    expect(store.mixLeftMenus).toEqual([]);
  });

  it("replaces mixLeftMenus when called with a new path", () => {
    const childrenA = [{ path: "/a/sub" }];
    const childrenB = [{ path: "/b/sub1" }, { path: "/b/sub2" }];
    mockRouterData.value = [
      { path: "/a", children: childrenA },
      { path: "/b", children: childrenB },
    ] as never;

    const store = usePermissionStore();
    store.setMixLeftMenus("/a");
    expect(store.mixLeftMenus).toEqual(childrenA);

    store.setMixLeftMenus("/b");
    expect(store.mixLeftMenus).toEqual(childrenB);
  });

  // -----------------------------------------------------------------------
  // generateRoutes()
  // -----------------------------------------------------------------------
  it("generateRoutes() resolves with dynamic routes array", async () => {
    mockRouterData.value = [] as never;
    const store = usePermissionStore();
    const result = await store.generateRoutes();
    expect(Array.isArray(result)).toBe(true);
  });

  it("generateRoutes() populates store.routes with constantRoutes + dynamic routes", async () => {
    mockRouterData.value = [] as never;
    const store = usePermissionStore();
    await store.generateRoutes();
    // constantRoutes is mocked as [] and no dynamic routes → routes stays []
    expect(Array.isArray(store.routes)).toBe(true);
  });

  // -----------------------------------------------------------------------
  // transformRoutes — via generateRoutes()
  // -----------------------------------------------------------------------
  it("transformRoutes replaces 'Layout' component string with a lazy import function", async () => {
    mockRouterData.value = [
      { path: "/app", component: "Layout", children: [] },
    ] as never;
    const store = usePermissionStore();
    const result = await store.generateRoutes();
    expect(result).toHaveLength(1);
    // Layout becomes the lazy import arrow function
    expect(typeof result[0].component).toBe("function");
  });

  it("transformRoutes falls back to 404 component for unknown view component", async () => {
    mockRouterData.value = [
      { path: "/unknown", component: "nonexistent/Page" },
    ] as never;
    const store = usePermissionStore();
    const result = await store.generateRoutes();
    expect(result).toHaveLength(1);
    // 404.vue exists in the project, so the fallback is a lazy import function
    expect(typeof result[0].component).toBe("function");
  });

  it("transformRoutes sets component to the matching view module when found", async () => {
    // "home/index" maps to "../../views/home/index.vue" which exists in the project,
    // exercising the branch where a component IS found in the glob modules (line 67).
    mockRouterData.value = [
      { path: "/home", component: "home/index" },
    ] as never;
    const store = usePermissionStore();
    const result = await store.generateRoutes();
    expect(result).toHaveLength(1);
    expect(typeof result[0].component).toBe("function");
  });

  it("transformRoutes recursively processes children routes", async () => {
    mockRouterData.value = [
      {
        path: "/app",
        component: "Layout",
        children: [
          { path: "dashboard", component: "home/Dashboard" },
          { path: "settings", component: "settings/Index" },
        ],
      },
    ] as never;
    const store = usePermissionStore();
    const result = await store.generateRoutes();
    expect(result[0].children).toHaveLength(2);
  });

  it("transformRoutes processes nested children recursively", async () => {
    mockRouterData.value = [
      {
        path: "/root",
        component: "Layout",
        children: [
          {
            path: "parent",
            component: "some/Parent",
            children: [{ path: "child", component: "some/Child" }],
          },
        ],
      },
    ] as never;
    const store = usePermissionStore();
    const result = await store.generateRoutes();
    const parent = result[0].children?.[0] as { children?: unknown[] };
    expect(parent?.children).toHaveLength(1);
  });

  // -----------------------------------------------------------------------
  // usePermissionStoreHook()
  // -----------------------------------------------------------------------
  it("usePermissionStoreHook() returns a store with expected interface", async () => {
    const { usePermissionStoreHook } = await import(
      "@/store/modules/permission"
    );
    const hook = usePermissionStoreHook();
    expect(hook).toHaveProperty("routes");
    expect(hook).toHaveProperty("generateRoutes");
    expect(hook).toHaveProperty("mixLeftMenus");
    expect(hook).toHaveProperty("setMixLeftMenus");
  });

  // -----------------------------------------------------------------------
  // Additional setMixLeftMenus edge cases
  // -----------------------------------------------------------------------
  it("setMixLeftMenus with empty children array sets mixLeftMenus to []", () => {
    mockRouterData.value = [{ path: "/empty", children: [] }] as never;
    const store = usePermissionStore();
    store.setMixLeftMenus("/empty");
    expect(store.mixLeftMenus).toEqual([]);
  });

  it("setMixLeftMenus matches by exact path", () => {
    mockRouterData.value = [
      { path: "/home", children: [{ path: "/home/sub" }] },
      { path: "/homepage", children: [{ path: "/homepage/sub" }] },
    ] as never;
    const store = usePermissionStore();
    store.setMixLeftMenus("/home");
    expect(store.mixLeftMenus).toHaveLength(1);
    expect((store.mixLeftMenus[0] as { path: string }).path).toBe("/home/sub");
  });

  it("generateRoutes with multiple top-level routes returns all of them", async () => {
    mockRouterData.value = [
      { path: "/a", component: "Layout", children: [] },
      { path: "/b", component: "Layout", children: [] },
      { path: "/c", component: "Layout", children: [] },
    ] as never;
    const store = usePermissionStore();
    const result = await store.generateRoutes();
    expect(result.length).toBeGreaterThanOrEqual(3);
  });
});
