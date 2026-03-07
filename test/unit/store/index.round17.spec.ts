import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const piniaUse = vi.fn().mockReturnThis();
  const piniaInstall = vi.fn();
  const piniaInstance = { use: piniaUse, install: piniaInstall };

  return {
    piniaUse,
    piniaInstall,
    piniaInstance,
    createPinia: vi.fn(() => piniaInstance),
    persistedState: vi.fn(),
    useAppStore: vi.fn(),
    useConfigStore: vi.fn(),
    usePermissionStore: vi.fn(),
    useScreenStore: vi.fn(),
    useSettingsStore: vi.fn(),
    useTagsViewStore: vi.fn(),
    useUserStore: vi.fn(),
    useDomainStore: vi.fn(),
  };
});

vi.mock("pinia", () => ({
  createPinia: hoisted.createPinia,
}));

vi.mock("pinia-plugin-persistedstate", () => ({
  default: hoisted.persistedState,
}));

vi.mock("@/store/modules/app", () => ({ useAppStore: hoisted.useAppStore }));
vi.mock("@/store/modules/config", () => ({ useConfigStore: hoisted.useConfigStore }));
vi.mock("@/store/modules/permission", () => ({ usePermissionStore: hoisted.usePermissionStore }));
vi.mock("@/store/modules/screen", () => ({ useScreenStore: hoisted.useScreenStore }));
vi.mock("@/store/modules/settings", () => ({ useSettingsStore: hoisted.useSettingsStore }));
vi.mock("@/store/modules/tagsView", () => ({ useTagsViewStore: hoisted.useTagsViewStore }));
vi.mock("@/store/modules/user", () => ({ useUserStore: hoisted.useUserStore }));
vi.mock("@/store/modules/domain", () => ({ useDomainStore: hoisted.useDomainStore }));

describe("src/store/index.ts (round17)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("creates pinia store during module initialization", async () => {
    await import("@/store/index");

    expect(hoisted.createPinia).toHaveBeenCalledTimes(1);
  });

  it("applies persisted-state plugin to store", async () => {
    await import("@/store/index");

    expect(hoisted.piniaUse).toHaveBeenCalledWith(hoisted.persistedState);
    expect(hoisted.piniaUse).toHaveBeenCalledTimes(1);
  });

  it("exports store as the created pinia instance", async () => {
    const mod = await import("@/store/index");

    expect(mod.store).toBe(hoisted.piniaInstance);
  });

  it("setupStore calls app.use with store", async () => {
    const mod = await import("@/store/index");
    const app = { use: vi.fn() } as any;

    mod.setupStore(app);

    expect(app.use).toHaveBeenCalledWith(mod.store);
    expect(app.use).toHaveBeenCalledTimes(1);
  });

  it("setupStore returns undefined", async () => {
    const { setupStore } = await import("@/store/index");
    const app = { use: vi.fn() } as any;

    const result = setupStore(app);

    expect(result).toBeUndefined();
  });

  it("setupStore can be called repeatedly on same app", async () => {
    const { setupStore } = await import("@/store/index");
    const app = { use: vi.fn() } as any;

    setupStore(app);
    setupStore(app);

    expect(app.use).toHaveBeenCalledTimes(2);
  });

  it("re-exports useAppStore and useUserStore", async () => {
    const mod = await import("@/store/index");

    expect(mod.useAppStore).toBe(hoisted.useAppStore);
    expect(mod.useUserStore).toBe(hoisted.useUserStore);
  });

  it("re-exports remaining module store hooks", async () => {
    const mod = await import("@/store/index");

    expect(mod.useConfigStore).toBe(hoisted.useConfigStore);
    expect(mod.usePermissionStore).toBe(hoisted.usePermissionStore);
    expect(mod.useScreenStore).toBe(hoisted.useScreenStore);
    expect(mod.useSettingsStore).toBe(hoisted.useSettingsStore);
    expect(mod.useTagsViewStore).toBe(hoisted.useTagsViewStore);
    expect(mod.useDomainStore).toBe(hoisted.useDomainStore);
  });

  it("returns same module-level store across imports without reset", async () => {
    const first = await import("@/store/index");
    const second = await import("@/store/index");

    expect(first.store).toBe(second.store);
    expect(hoisted.createPinia).toHaveBeenCalledTimes(1);
  });
});
