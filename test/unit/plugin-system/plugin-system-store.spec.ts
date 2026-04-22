import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const mockInitialize = vi.fn();
const mockGetConfig = vi.fn();
const mockGetAllPlugins = vi.fn();
const mockVerifyPluginHostSession = vi.fn();

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

vi.mock("@/plugin-system/services/hostSessionApi", () => ({
  verifyPluginHostSession: (...args: unknown[]) =>
    mockVerifyPluginHostSession(...args),
}));

vi.mock("@/store/modules/token", () => ({
  default: {
    getToken: vi.fn(() => ({
      accessToken: "token-visible-001",
      refreshToken: "refresh-visible-001",
    })),
  },
}));

describe("plugin-system store access-scope visibility", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetModules();
    mockInitialize.mockReset();
    mockGetConfig.mockReset();
    mockGetAllPlugins.mockReset();
    mockVerifyPluginHostSession.mockReset();
    mockGetConfig.mockReturnValue({
      version: "1.0.0",
      menuGroups: [{ id: "admin", name: "Admin", order: 1 }],
      plugins: [
        {
          id: "user-management",
          name: "User Management",
          description: "",
          url: "https://plugins.example.com/user-management",
          icon: "User",
          group: "admin",
          enabled: true,
          order: 1,
          version: "1.0.0",
          allowedOrigin: "https://plugins.example.com",
          accessScope: "admin-only",
        },
        {
          id: "system-admin",
          name: "System Admin",
          description: "",
          url: "https://plugins.example.com/system-admin",
          icon: "Setting",
          group: "admin",
          enabled: true,
          order: 2,
          version: "1.0.0",
          allowedOrigin: "https://plugins.example.com",
          accessScope: "root-only",
        },
      ],
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
      {
        pluginId: "system-admin",
        name: "System Admin",
        description: "",
        icon: "Setting",
        group: "admin",
        state: "unloaded",
        enabled: true,
        order: 2,
      },
    ]);
  });

  it("init does not eagerly verify the host plugin session", async () => {
    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();

    expect(mockVerifyPluginHostSession).not.toHaveBeenCalled();
    expect(store.pluginAccessStates["user-management"]).toBe("unknown");
  });

  it("verifies host roles once and caches per current token fingerprint", async () => {
    mockVerifyPluginHostSession.mockResolvedValue({
      data: {
        code: 0,
        data: {
          id: 7,
          username: "admin",
          roles: ["admin"],
        },
      },
    });

    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();
    await store.ensurePluginAccess("user-management");
    await store.ensurePluginAccess("user-management");

    expect(mockVerifyPluginHostSession).toHaveBeenCalledTimes(1);
    expect(store.pluginAccessStates["user-management"]).toBe("visible");
    expect(store.currentTokenPluginAccessScopes["user-management"]).toBe(
      "admin-only"
    );
  });

  it("evaluates root-only plugins as forbidden for non-root sessions", async () => {
    mockVerifyPluginHostSession.mockResolvedValue({
      data: {
        code: 0,
        data: {
          id: 7,
          username: "admin",
          roles: ["admin"],
        },
      },
    });

    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();
    const result = await store.ensurePluginAccess("system-admin");

    expect(result).toEqual({
      status: "forbidden",
      accessScope: "root-only",
    });
    expect(store.enabledPlugins).toEqual([]);
  });

  it("reloads host visibility after the token fingerprint changes", async () => {
    const Token = (await import("@/store/modules/token")).default;
    (Token.getToken as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({
        accessToken: "token-visible-001",
        refreshToken: "refresh-visible-001",
      })
      .mockReturnValueOnce({
        accessToken: "token-visible-001",
        refreshToken: "refresh-visible-001",
      })
      .mockReturnValueOnce({
        accessToken: "token-visible-001",
        refreshToken: "refresh-visible-001",
      })
      .mockReturnValueOnce({
        accessToken: "token-visible-002",
        refreshToken: "refresh-visible-002",
      })
      .mockReturnValue({
        accessToken: "token-visible-002",
        refreshToken: "refresh-visible-002",
      });

    mockVerifyPluginHostSession
      .mockResolvedValueOnce({
        data: {
          code: 0,
          data: {
            id: 7,
            username: "admin",
            roles: ["admin"],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          code: 0,
          data: {
            id: 1,
            username: "root",
            roles: ["root"],
          },
        },
      });

    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();
    await store.ensurePluginAccess("system-admin");
    await store.ensurePluginAccess("system-admin");
    await store.ensurePluginAccess("system-admin");

    expect(mockVerifyPluginHostSession).toHaveBeenCalledTimes(2);
    expect(store.pluginAccessStates["system-admin"]).toBe("visible");
  });

  it("hides stale cached visibility from current-token getters until re-evaluated", async () => {
    const Token = (await import("@/store/modules/token")).default;
    (Token.getToken as ReturnType<typeof vi.fn>).mockReturnValue({
      accessToken: "token-current",
      refreshToken: "refresh-current",
    });

    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();

    store.pluginAccessScopes["user-management"] = "admin-only";
    store.pluginAccessStates["user-management"] = "visible";
    store.pluginPermissionFingerprints["user-management"] = "stale-token";

    expect(store.currentTokenPluginAccessStates["user-management"]).toBe(
      "unknown"
    );
    expect(store.currentTokenPluginAccessScopes["user-management"]).toBeNull();
    expect(store.enabledPlugins).toEqual([]);
    expect(store.pluginsByGroup.get("admin")).toBeUndefined();
  });

  it("does not treat degraded as a stable cached result", async () => {
    mockVerifyPluginHostSession
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockResolvedValueOnce({
        data: {
          code: 0,
          data: {
            id: 7,
            username: "admin",
            roles: ["admin"],
          },
        },
      });

    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();
    await store.ensurePluginAccess("user-management");
    expect(store.pluginAccessStates["user-management"]).toBe("degraded");

    await store.ensurePluginAccess("user-management");

    expect(mockVerifyPluginHostSession).toHaveBeenCalledTimes(2);
    expect(store.pluginAccessStates["user-management"]).toBe("visible");
  });

  it("deduplicates in-flight host session visibility checks for the same token", async () => {
    let resolveRequest:
      | ((value: { data: { code: number; data: { roles: string[] } } }) => void)
      | undefined;
    const responsePromise = new Promise<{
      data: { code: number; data: { roles: string[] } };
    }>((resolve) => {
      resolveRequest = resolve;
    });
    mockVerifyPluginHostSession.mockImplementation(() => responsePromise);

    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();

    const pendingA = store.ensurePluginAccess("user-management");
    const pendingB = store.ensurePluginAccess("user-management");

    expect(mockVerifyPluginHostSession).toHaveBeenCalledTimes(1);

    resolveRequest?.({
      data: { code: 0, data: { roles: ["admin"] } },
    });

    await Promise.all([pendingA, pendingB]);
    expect(store.pluginAccessStates["user-management"]).toBe("visible");
  });

  it("does not let stale session responses overwrite newer token state", async () => {
    const Token = (await import("@/store/modules/token")).default;
    let currentToken = { accessToken: "token-old", refreshToken: "r-old" };
    (Token.getToken as ReturnType<typeof vi.fn>).mockImplementation(
      () => currentToken
    );

    let resolveOldRequest:
      | ((value: { data: { code: number; data: { roles: string[] } } }) => void)
      | undefined;
    let resolveNewRequest:
      | ((value: { data: { code: number; data: { roles: string[] } } }) => void)
      | undefined;

    const oldDeferred = new Promise<{
      data: { code: number; data: { roles: string[] } };
    }>((resolve) => {
      resolveOldRequest = resolve;
    });
    const newDeferred = new Promise<{
      data: { code: number; data: { roles: string[] } };
    }>((resolve) => {
      resolveNewRequest = resolve;
    });

    mockVerifyPluginHostSession
      .mockReturnValueOnce(oldDeferred)
      .mockReturnValueOnce(newDeferred);

    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();

    const oldRequest = store.ensurePluginAccess("system-admin");
    currentToken = { accessToken: "token-new", refreshToken: "r-new" };
    const newRequest = store.ensurePluginAccess("system-admin", {
      force: true,
    });

    resolveNewRequest?.({
      data: { code: 0, data: { roles: ["root"] } },
    });
    await newRequest;

    resolveOldRequest?.({
      data: { code: 0, data: { roles: ["admin"] } },
    });
    await oldRequest;

    expect(store.pluginAccessStates["system-admin"]).toBe("visible");
    expect(store.currentTokenPluginAccessScopes["system-admin"]).toBe(
      "root-only"
    );
  });

  it("does not reject plugin preload when host session has already expired", async () => {
    const hostError = { response: { status: 401 }, message: "host expired" };
    mockVerifyPluginHostSession.mockRejectedValueOnce(hostError);

    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();

    await expect(store.ensureAllEnabledPluginAccess()).resolves.toBeUndefined();

    expect(mockVerifyPluginHostSession).toHaveBeenCalledTimes(1);
  });

  it("denies scoped plugins from known host roles without probing verify-token", async () => {
    const { useUserStore } = await import("@/store/modules/user");
    const userStore = useUserStore();
    userStore.userInfo = {
      id: 7,
      roles: ["user"],
    } as NonNullable<typeof userStore.userInfo>;

    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();

    await expect(store.ensureAllEnabledPluginAccess()).resolves.toBeUndefined();

    expect(mockVerifyPluginHostSession).not.toHaveBeenCalled();
    expect(store.pluginAccessStates["user-management"]).toBe("forbidden");
    expect(store.pluginAccessStates["system-admin"]).toBe("forbidden");
  });

  it("treats forbidden host session probes as a stable denied plugin session", async () => {
    const hostError = { response: { status: 403 }, message: "forbidden" };
    mockVerifyPluginHostSession.mockRejectedValueOnce(hostError);

    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();

    await expect(store.ensureAllEnabledPluginAccess()).resolves.toBeUndefined();

    expect(mockVerifyPluginHostSession).toHaveBeenCalledTimes(1);
    expect(store.pluginAccessStates["user-management"]).toBe("forbidden");
    expect(store.pluginAccessStates["system-admin"]).toBe("forbidden");
    expect(store.pluginsByGroup.get("admin")).toBeUndefined();
  });
});
