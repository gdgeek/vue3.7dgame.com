import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const mockInitialize = vi.fn();
const mockGetConfig = vi.fn();
const mockGetAllPlugins = vi.fn();
const mockGetAllowedActions = vi.fn();
const mockProbeHostSession = vi.fn();

vi.mock("@/plugin-system", () => ({
  pluginSystem: {
    initialize: (...args: unknown[]) => mockInitialize(...args),
    getConfig: (...args: unknown[]) => mockGetConfig(...args),
    getAllPlugins: (...args: unknown[]) => mockGetAllPlugins(...args),
    destroy: vi.fn(),
    loadPlugin: vi.fn(),
    unloadPlugin: vi.fn(),
    getPluginState: vi.fn(() => "unloaded"),
  },
}));

vi.mock("@/plugin-system/services/systemAdminApi", () => ({
  getSystemAdminAllowedActions: (...args: unknown[]) =>
    mockGetAllowedActions(...args),
}));

vi.mock("@/plugin-system/services/hostSessionApi", () => ({
  probeHostSession: (...args: unknown[]) => mockProbeHostSession(...args),
}));

vi.mock("@/store/modules/token", () => ({
  default: {
    getToken: vi.fn(() => ({
      accessToken: "token-visible-001",
      refreshToken: "refresh-visible-001",
    })),
  },
}));

describe("plugin-system store permission loading", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.resetModules();
    mockGetConfig.mockReturnValue({
      version: "1.0.0",
      menuGroups: [{ id: "admin", name: "Admin", order: 1 }],
      plugins: [],
    });
    mockGetAllPlugins.mockReturnValue([
      {
        pluginId: "user-management",
        name: "User Management",
        description: "",
        icon: "User",
        group: "admin",
        state: "unloaded",
        enabled: true,
        order: 1,
      },
    ]);
  });

  it("init does not eagerly fetch plugin permissions", async () => {
    const { usePluginSystemStore } = await import("@/store/modules/plugin-system");
    const store = usePluginSystemStore();

    await store.init();

    expect(mockGetAllowedActions).not.toHaveBeenCalled();
    expect(store.pluginAccessStates["user-management"]).toBe("unknown");
  });

  it("loads a plugin on demand and caches by current token fingerprint", async () => {
    mockGetAllowedActions.mockResolvedValue({
      data: { code: 0, data: { actions: ["view"] } },
    });

    const { usePluginSystemStore } = await import("@/store/modules/plugin-system");
    const store = usePluginSystemStore();

    await store.init();
    await store.ensurePluginAccess("user-management");
    await store.ensurePluginAccess("user-management");

    expect(store.pluginAccessStates["user-management"]).toBe("visible");
    expect(store.pluginPermissions["user-management"]).toEqual(["view"]);
    expect(mockGetAllowedActions).toHaveBeenCalledTimes(1);
  });

  it("maps 403 to forbidden and retries once before degrading on 5xx", async () => {
    const { usePluginSystemStore } = await import("@/store/modules/plugin-system");
    const store = usePluginSystemStore();

    await store.init();

    mockGetAllowedActions.mockRejectedValueOnce({ response: { status: 403 } });
    await store.ensurePluginAccess("user-management", { force: true });
    expect(store.pluginAccessStates["user-management"]).toBe("forbidden");

    mockGetAllowedActions
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockRejectedValueOnce({ response: { status: 502 } });
    await store.ensurePluginAccess("user-management", { force: true });
    expect(mockGetAllowedActions).toHaveBeenCalledTimes(3);
    expect(store.pluginAccessStates["user-management"]).toBe("degraded");
  });
});
