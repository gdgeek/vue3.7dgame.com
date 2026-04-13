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
    vi.resetModules();
    mockInitialize.mockReset();
    mockGetConfig.mockReset();
    mockGetAllPlugins.mockReset();
    mockGetAllowedActions.mockReset();
    mockProbeHostSession.mockReset();
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
    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();

    expect(mockGetAllowedActions).not.toHaveBeenCalled();
    expect(store.pluginAccessStates["user-management"]).toBe("unknown");
  });

  it("loads a plugin on demand and caches by current token fingerprint", async () => {
    mockGetAllowedActions.mockResolvedValue({
      data: { code: 0, data: { actions: ["view"] } },
    });

    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();
    await store.ensurePluginAccess("user-management");
    await store.ensurePluginAccess("user-management");

    expect(store.pluginAccessStates["user-management"]).toBe("visible");
    expect(store.pluginPermissions["user-management"]).toEqual(["view"]);
    expect(mockGetAllowedActions).toHaveBeenCalledTimes(1);
  });

  it("reloads permissions when the token fingerprint changes", async () => {
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

    mockGetAllowedActions
      .mockResolvedValueOnce({
        data: { code: 0, data: { actions: ["view"] } },
      })
      .mockResolvedValueOnce({
        data: { code: 0, data: { actions: ["edit"] } },
      });

    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();
    await store.ensurePluginAccess("user-management");
    await store.ensurePluginAccess("user-management");
    await store.ensurePluginAccess("user-management");

    expect(mockGetAllowedActions).toHaveBeenCalledTimes(2);
    expect(store.pluginPermissions["user-management"]).toEqual(["edit"]);
  });

  it("hides stale cached visibility from current-token getters until access is re-evaluated", async () => {
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

    store.pluginPermissions["user-management"] = ["view"];
    store.pluginAccessStates["user-management"] = "visible";
    store.pluginPermissionFingerprints["user-management"] = "stale-token";

    expect(store.currentTokenPluginAccessStates["user-management"]).toBe(
      "unknown"
    );
    expect(store.currentTokenPluginPermissions["user-management"]).toEqual([]);
    expect(store.enabledPlugins).toEqual([]);
    expect(store.pluginsByGroup.get("admin")).toBeUndefined();
  });

  it("does not treat degraded as a stable cached result", async () => {
    mockGetAllowedActions
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockRejectedValueOnce({ response: { status: 502 } })
      .mockResolvedValueOnce({
        data: { code: 0, data: { actions: ["view"] } },
      });

    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();
    await store.ensurePluginAccess("user-management");
    expect(store.pluginAccessStates["user-management"]).toBe("degraded");

    await store.ensurePluginAccess("user-management");

    expect(mockGetAllowedActions).toHaveBeenCalledTimes(3);
    expect(store.pluginAccessStates["user-management"]).toBe("visible");
    expect(store.pluginPermissions["user-management"]).toEqual(["view"]);
  });

  it("stores an opaque fingerprint instead of the raw access token", async () => {
    const Token = (await import("@/store/modules/token")).default;
    const accessToken = "token-visible-001";
    (Token.getToken as ReturnType<typeof vi.fn>).mockReturnValue({
      accessToken,
      refreshToken: "refresh-visible-001",
    });

    mockGetAllowedActions.mockResolvedValue({
      data: { code: 0, data: { actions: ["view"] } },
    });

    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();
    await store.ensurePluginAccess("user-management");

    expect(store.pluginPermissionFingerprints["user-management"]).toBeTruthy();
    expect(store.pluginPermissionFingerprints["user-management"]).not.toBe(
      accessToken
    );
  });

  it("deduplicates in-flight permission requests for the same plugin", async () => {
    let resolveRequest:
      | ((value: {
          data: { code: number; data: { actions: string[] } };
        }) => void)
      | undefined;
    const responsePromise = new Promise<{
      data: { code: number; data: { actions: string[] } };
    }>((resolve) => {
      resolveRequest = resolve;
    });
    mockGetAllowedActions.mockImplementation(() => responsePromise);

    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();

    const pendingA = store.ensurePluginAccess("user-management");
    const pendingB = store.ensurePluginAccess("user-management");

    expect(mockGetAllowedActions).toHaveBeenCalledTimes(1);

    resolveRequest?.({
      data: { code: 0, data: { actions: ["view"] } },
    });

    await Promise.all([pendingA, pendingB]);
    expect(store.pluginPermissions["user-management"]).toEqual(["view"]);
  });

  it("does not let stale responses overwrite newer token state", async () => {
    const Token = (await import("@/store/modules/token")).default;
    let resolveOldRequest:
      | ((value: {
          data: { code: number; data: { actions: string[] } };
        }) => void)
      | undefined;
    let resolveNewRequest:
      | ((value: {
          data: { code: number; data: { actions: string[] } };
        }) => void)
      | undefined;

    const oldDeferred = new Promise<{
      data: { code: number; data: { actions: string[] } };
    }>((resolve) => {
      resolveOldRequest = resolve;
    });
    const newDeferred = new Promise<{
      data: { code: number; data: { actions: string[] } };
    }>((resolve) => {
      resolveNewRequest = resolve;
    });

    (Token.getToken as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ accessToken: "token-old", refreshToken: "r-old" })
      .mockReturnValueOnce({ accessToken: "token-new", refreshToken: "r-new" })
      .mockReturnValue({ accessToken: "token-new", refreshToken: "r-new" });

    mockGetAllowedActions
      .mockReturnValueOnce(oldDeferred)
      .mockReturnValueOnce(newDeferred);

    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();

    const oldRequest = store.ensurePluginAccess("user-management");
    const newRequest = store.ensurePluginAccess("user-management", {
      force: true,
    });

    resolveNewRequest?.({
      data: { code: 0, data: { actions: ["edit"] } },
    });
    await newRequest;

    resolveOldRequest?.({
      data: { code: 0, data: { actions: ["view"] } },
    });
    await oldRequest;

    expect(store.pluginPermissions["user-management"]).toEqual(["edit"]);
    expect(store.pluginAccessStates["user-management"]).toBe("visible");
  });

  it("does not let a stale 401-plus-host-probe result overwrite newer token state", async () => {
    const Token = (await import("@/store/modules/token")).default;
    let currentToken = { accessToken: "token-old", refreshToken: "r-old" };
    (Token.getToken as ReturnType<typeof vi.fn>).mockImplementation(
      () => currentToken
    );

    let resolveHostProbe:
      | ((value: { data: { code: number; data: {} } }) => void)
      | undefined;
    let resolveHostProbeStarted: (() => void) | undefined;
    const hostProbeStarted = new Promise<void>((resolve) => {
      resolveHostProbeStarted = resolve;
    });
    const pendingHostProbe = new Promise<{ data: { code: number; data: {} } }>(
      (resolve) => {
        resolveHostProbe = resolve;
      }
    );
    mockProbeHostSession.mockImplementationOnce(() => {
      currentToken = { accessToken: "token-new", refreshToken: "r-new" };
      resolveHostProbeStarted?.();
      return pendingHostProbe;
    });

    mockGetAllowedActions
      .mockRejectedValueOnce({ response: { status: 401 } })
      .mockResolvedValueOnce({
        data: { code: 0, data: { actions: ["edit"] } },
      });

    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();

    const oldRequest = store.ensurePluginAccess("user-management");
    await hostProbeStarted;
    await store.ensurePluginAccess("user-management");

    resolveHostProbe?.({
      data: { code: 0, data: {} },
    });
    await oldRequest;

    expect(mockGetAllowedActions).toHaveBeenCalledTimes(2);
    expect(mockProbeHostSession).toHaveBeenCalledTimes(1);
    expect(store.pluginPermissions["user-management"]).toEqual(["edit"]);
    expect(store.pluginAccessStates["user-management"]).toBe("visible");
  });

  it("hands stale 401-plus-host-probe callers off to the current-token access resolution", async () => {
    const Token = (await import("@/store/modules/token")).default;
    let currentToken = { accessToken: "token-old", refreshToken: "r-old" };
    (Token.getToken as ReturnType<typeof vi.fn>).mockImplementation(
      () => currentToken
    );

    let resolveHostProbe:
      | ((value: { data: { code: number; data: {} } }) => void)
      | undefined;
    let resolveHostProbeStarted: (() => void) | undefined;
    const hostProbeStarted = new Promise<void>((resolve) => {
      resolveHostProbeStarted = resolve;
    });
    const pendingHostProbe = new Promise<{ data: { code: number; data: {} } }>(
      (resolve) => {
        resolveHostProbe = resolve;
      }
    );

    let resolveCurrentTokenRequest:
      | ((value: {
          data: { code: number; data: { actions: string[] } };
        }) => void)
      | undefined;
    const currentTokenRequest = new Promise<{
      data: { code: number; data: { actions: string[] } };
    }>((resolve) => {
      resolveCurrentTokenRequest = resolve;
    });

    mockProbeHostSession.mockImplementationOnce(() => {
      currentToken = { accessToken: "token-new", refreshToken: "r-new" };
      resolveHostProbeStarted?.();
      return pendingHostProbe;
    });

    mockGetAllowedActions
      .mockRejectedValueOnce({ response: { status: 401 } })
      .mockReturnValueOnce(currentTokenRequest);

    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();

    const staleRequest = store.ensurePluginAccess("user-management");
    await hostProbeStarted;
    const currentRequest = store.ensurePluginAccess("user-management");

    let staleSettled = false;
    staleRequest.finally(() => {
      staleSettled = true;
    });

    resolveHostProbe?.({
      data: { code: 0, data: {} },
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(staleSettled).toBe(false);

    resolveCurrentTokenRequest?.({
      data: { code: 0, data: { actions: ["edit"] } },
    });

    await expect(staleRequest).resolves.toEqual({
      status: "visible",
      actions: ["edit"],
    });
    await expect(currentRequest).resolves.toEqual({
      status: "visible",
      actions: ["edit"],
    });
  });

  it("maps 403 to forbidden and retries once before degrading on 5xx", async () => {
    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
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

  it("treats plugin auth 401 as degraded when the host session probe succeeds", async () => {
    mockGetAllowedActions.mockRejectedValueOnce({ response: { status: 401 } });
    mockProbeHostSession.mockResolvedValueOnce({
      data: { code: 0, data: {} },
    });

    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();

    await expect(
      store.ensurePluginAccess("user-management", { force: true })
    ).resolves.toEqual({
      status: "degraded",
      actions: [],
    });

    expect(mockGetAllowedActions).toHaveBeenCalledTimes(1);
    expect(mockProbeHostSession).toHaveBeenCalledTimes(1);
    expect(store.pluginAccessStates["user-management"]).toBe("degraded");
    expect(store.pluginPermissions["user-management"]).toEqual([]);
  });

  it("rethrows the host 401 when plugin auth 401 is caused by host session expiry", async () => {
    const pluginError = { response: { status: 401 } };
    const hostError = { response: { status: 401 }, message: "host expired" };
    mockGetAllowedActions.mockRejectedValueOnce(pluginError);
    mockProbeHostSession.mockRejectedValueOnce(hostError);

    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();

    await expect(
      store.ensurePluginAccess("user-management", { force: true })
    ).rejects.toBe(hostError);

    expect(mockGetAllowedActions).toHaveBeenCalledTimes(1);
    expect(mockProbeHostSession).toHaveBeenCalledTimes(1);
    expect(store.pluginAccessStates["user-management"]).toBe("loading");
  });

  it("does not reject plugin preload when host session has already expired", async () => {
    const hostError = { response: { status: 401 }, message: "host expired" };
    mockGetAllowedActions.mockRejectedValueOnce({ response: { status: 401 } });
    mockProbeHostSession.mockRejectedValueOnce(hostError);

    const { usePluginSystemStore } = await import(
      "@/store/modules/plugin-system"
    );
    const store = usePluginSystemStore();

    await store.init();

    await expect(store.ensureAllEnabledPluginAccess()).resolves.toBeUndefined();

    expect(mockGetAllowedActions).toHaveBeenCalledTimes(1);
    expect(mockProbeHostSession).toHaveBeenCalledTimes(1);
  });
});
