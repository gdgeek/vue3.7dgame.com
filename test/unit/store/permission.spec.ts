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
    mockRouterData.value = [{ path: "/home", children: [{ path: "/sub" }] }] as never;
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
});
