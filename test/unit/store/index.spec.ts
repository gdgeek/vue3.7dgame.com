/**
 * Unit tests for src/store/index.ts
 * Covers: setupStore, store (Pinia instance), module re-exports
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock pinia to avoid persistence plugins needing storage
vi.mock("pinia", () => {
  const mockStore = {
    use: vi.fn().mockReturnThis(),
    install: vi.fn(),
  };
  return {
    createPinia: vi.fn(() => mockStore),
  };
});

vi.mock("pinia-plugin-persistedstate", () => ({
  default: vi.fn(),
}));

// Mock all store modules to prevent complex dependency chains
vi.mock("@/store/modules/app", () => ({ useAppStore: vi.fn() }));
vi.mock("@/store/modules/config", () => ({ useConfigStore: vi.fn() }));
vi.mock("@/store/modules/permission", () => ({ usePermissionStore: vi.fn() }));
vi.mock("@/store/modules/screen", () => ({ useScreenStore: vi.fn() }));
vi.mock("@/store/modules/settings", () => ({ useSettingsStore: vi.fn() }));
vi.mock("@/store/modules/tagsView", () => ({ useTagsViewStore: vi.fn() }));
vi.mock("@/store/modules/user", () => ({ useUserStore: vi.fn() }));
vi.mock("@/store/modules/domain", () => ({ useDomainStore: vi.fn() }));

describe("store/index", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("setupStore calls app.use with the pinia instance", async () => {
    const { setupStore, store } = await import("@/store/index");
    const appUseSpy = vi.fn();
    const mockApp = { use: appUseSpy } as never;
    setupStore(mockApp);
    expect(appUseSpy).toHaveBeenCalledWith(store);
  });

  it("setupStore calls app.use exactly once", async () => {
    const { setupStore, store } = await import("@/store/index");
    const appUseSpy = vi.fn();
    const mockApp = { use: appUseSpy } as never;
    setupStore(mockApp);
    expect(appUseSpy).toHaveBeenCalledTimes(1);
  });

  it("exported store is a pinia instance (has use method)", async () => {
    const { store } = await import("@/store/index");
    expect(store).toBeDefined();
    expect(typeof store.use).toBe("function");
  });

  it("store has persistedstate plugin applied", async () => {
    const { createPinia } = await import("pinia");
    await import("@/store/index");
    const mockStore = (createPinia as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(mockStore.use).toHaveBeenCalled();
  });

  it("store exports useAppStore from modules/app", async () => {
    const storeIndex = await import("@/store/index");
    expect(storeIndex).toHaveProperty("useAppStore");
  });

  it("store exports usePermissionStore from modules/permission", async () => {
    const storeIndex = await import("@/store/index");
    expect(storeIndex).toHaveProperty("usePermissionStore");
  });

  it("store exports useUserStore from modules/user", async () => {
    const storeIndex = await import("@/store/index");
    expect(storeIndex).toHaveProperty("useUserStore");
  });

  it("setupStore returns undefined", async () => {
    const { setupStore } = await import("@/store/index");
    const mockApp = { use: vi.fn() } as never;
    const result = setupStore(mockApp);
    expect(result).toBeUndefined();
  });

  it("store is the same pinia instance across multiple imports", async () => {
    const mod1 = await import("@/store/index");
    const mod2 = await import("@/store/index");
    expect(mod1.store).toBe(mod2.store);
  });
});
