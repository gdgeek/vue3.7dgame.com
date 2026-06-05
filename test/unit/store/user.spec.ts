/**
 * Unit tests for src/store/modules/user.ts — useUserStore
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";

vi.mock("@/utils/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/api/v1/auth", () => ({
  login: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("@/api/v1/wechat", () => ({
  login: vi.fn(),
}));
vi.mock("@/api/v1/user", () => ({
  putUserData: vi.fn(),
}));
const mockAuthClient = vi.hoisted(() => ({
  acceptToken: vi.fn(),
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("@/services/auth/authClient", () => ({
  default: mockAuthClient,
}));
vi.mock("@/store", async () => {
  const { createPinia: cp } = await import("pinia");
  return { store: cp() };
});

describe("useUserStore", () => {
  let wechatApi: { login: ReturnType<typeof vi.fn> };
  let userApi: {
    putUserData: ReturnType<typeof vi.fn>;
  };
  let useUserStore: typeof import("@/store/modules/user").useUserStore;

  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockAuthClient.acceptToken.mockReset();
    mockAuthClient.getCurrentUser.mockReset();
    mockAuthClient.login.mockReset();
    mockAuthClient.logout.mockReset();
    wechatApi = (await import("@/api/v1/wechat")) as never;
    userApi = (await import("@/api/v1/user")) as never;
    ({ useUserStore } = await import("@/store/modules/user"));
  });

  // -----------------------------------------------------------------------
  // Initial state
  // -----------------------------------------------------------------------
  it("userInfo starts as null", () => {
    const store = useUserStore();
    expect(store.userInfo).toBeNull();
  });

  it("form starts with empty username and password", () => {
    const store = useUserStore();
    expect(store.form.username).toBe("");
    expect(store.form.password).toBe("");
  });

  // -----------------------------------------------------------------------
  // RoleEnum
  // -----------------------------------------------------------------------
  it("RoleEnum.Root is 'root'", () => {
    const store = useUserStore();
    expect(store.RoleEnum.Root).toBe("root");
  });

  it("RoleEnum.Admin is 'admin'", () => {
    const store = useUserStore();
    expect(store.RoleEnum.Admin).toBe("admin");
  });

  it("RoleEnum.None is null", () => {
    const store = useUserStore();
    expect(store.RoleEnum.None).toBeNull();
  });

  // -----------------------------------------------------------------------
  // getRole()
  // -----------------------------------------------------------------------
  it("getRole() returns null when userInfo is null", () => {
    const store = useUserStore();
    expect(store.getRole()).toBeNull();
  });

  it("getRole() returns 'root' when roles contains 'root'", () => {
    const store = useUserStore();
    store.userInfo = { roles: ["root", "admin"] } as never;
    expect(store.getRole()).toBe("root");
  });

  it("getRole() returns 'admin' when roles contains 'admin' but not 'root'", () => {
    const store = useUserStore();
    store.userInfo = { roles: ["admin", "user"] } as never;
    expect(store.getRole()).toBe("admin");
  });

  it("getRole() returns 'user' when roles only contains 'user'", () => {
    const store = useUserStore();
    store.userInfo = { roles: ["user"] } as never;
    expect(store.getRole()).toBe("user");
  });

  it("getRole() returns null when roles is empty array", () => {
    const store = useUserStore();
    store.userInfo = { roles: [] } as never;
    expect(store.getRole()).toBeNull();
  });

  // -----------------------------------------------------------------------
  // isUserPermissionGreater()
  // -----------------------------------------------------------------------
  it("root user passes admin permission check (4 >= 3)", () => {
    const store = useUserStore();
    store.userInfo = { roles: ["root"] } as never;
    expect(store.isUserPermissionGreater("admin")).toBe(true);
  });

  it("admin user fails root permission check (3 < 4)", () => {
    const store = useUserStore();
    store.userInfo = { roles: ["admin"] } as never;
    expect(store.isUserPermissionGreater("root")).toBe(false);
  });

  it("user with same role passes permission check (1 >= 1)", () => {
    const store = useUserStore();
    store.userInfo = { roles: ["user"] } as never;
    expect(store.isUserPermissionGreater("user")).toBe(true);
  });

  it("null user fails any role check (0 < 1)", () => {
    const store = useUserStore();
    expect(store.isUserPermissionGreater("user")).toBe(false);
  });

  it("manager user passes user permission check (2 >= 1)", () => {
    const store = useUserStore();
    store.userInfo = { roles: ["manager"] } as never;
    expect(store.isUserPermissionGreater("user")).toBe(true);
  });

  // -----------------------------------------------------------------------
  // login()
  // -----------------------------------------------------------------------
  it("login() calls authClient.login on success", async () => {
    mockAuthClient.login.mockResolvedValue({
      success: true,
      token: {
        token: "tok-123",
        accessToken: "tok-123",
        refreshToken: "refresh-123",
        expires: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    const store = useUserStore();
    await store.login({ username: "u", password: "p" });
    expect(mockAuthClient.login).toHaveBeenCalledWith({
      username: "u",
      password: "p",
    });
  });

  it("login() returns true on success", async () => {
    mockAuthClient.login.mockResolvedValue({
      success: true,
      token: {
        token: "tok-123",
        accessToken: "tok-123",
        refreshToken: "refresh-123",
        expires: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    const store = useUserStore();
    const result = await store.login({ username: "u", password: "p" });
    expect(result).toBe(true);
  });

  it("login() throws when response.data.success is false", async () => {
    mockAuthClient.login.mockResolvedValue({ success: false });
    const store = useUserStore();
    await expect(
      store.login({ username: "u", password: "p" })
    ).rejects.toThrow();
  });

  it("login() throws when token is missing in response", async () => {
    mockAuthClient.login.mockResolvedValue({ success: true, token: null });
    const store = useUserStore();
    await expect(
      store.login({ username: "u", password: "p" })
    ).rejects.toThrow();
  });

  // -----------------------------------------------------------------------
  // loginByWechat()
  // -----------------------------------------------------------------------
  it("loginByWechat() calls authClient.acceptToken on success", async () => {
    wechatApi.login.mockResolvedValue({
      data: { success: true, token: "wec-tok" },
    });
    const store = useUserStore();
    await store.loginByWechat({ code: "wx-code" } as never);
    expect(mockAuthClient.acceptToken).toHaveBeenCalledWith(
      "wec-tok",
      "wechat"
    );
  });

  it("loginByWechat() throws when success is false", async () => {
    wechatApi.login.mockResolvedValue({ data: { success: false } });
    const store = useUserStore();
    await expect(
      store.loginByWechat({ code: "bad" } as never)
    ).rejects.toThrow();
  });

  // -----------------------------------------------------------------------
  // logout()
  // -----------------------------------------------------------------------
  it("logout() calls authClient.logout", async () => {
    mockAuthClient.logout.mockResolvedValue(undefined);
    const store = useUserStore();
    await store.logout();
    expect(mockAuthClient.logout).toHaveBeenCalled();
  });

  it("logout() resets userInfo to an empty-ish object", async () => {
    mockAuthClient.logout.mockResolvedValue(undefined);
    const store = useUserStore();
    store.userInfo = { roles: ["admin"] } as never;
    await store.logout();
    expect(store.userInfo!.roles).toEqual([]);
    expect(store.userInfo!.id).toBe(0);
  });

  it("logout() throws when authClient.logout fails but still resets userInfo", async () => {
    mockAuthClient.logout.mockRejectedValue(new Error("network error"));
    const store = useUserStore();
    await expect(store.logout()).rejects.toThrow("network error");
    expect(store.userInfo!.roles).toEqual([]);
  });

  it("logout() completes cleanly without refreshInterval (token refresh handled by request.ts interceptor)", async () => {
    mockAuthClient.logout.mockResolvedValue(undefined);
    const store = useUserStore();
    // refreshInterval 已从 store 中移除，token 刷新由 request.ts 拦截器按需触发
    await expect(store.logout()).resolves.toBeUndefined();
    expect(store.userInfo?.roles).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // getUserInfo()
  // -----------------------------------------------------------------------
  it("getUserInfo() returns updated userInfo on success", async () => {
    const mockUser = { id: 1, roles: ["user"], userData: {}, userInfo: {} };
    mockAuthClient.getCurrentUser.mockResolvedValue({
      success: true,
      data: mockUser,
    });
    const store = useUserStore();
    const result = await store.getUserInfo();
    expect(result).toBe(store.userInfo);
    expect(store.userInfo?.id).toBe(1);
  });

  it("getUserInfo() returns undefined when success is false", async () => {
    mockAuthClient.getCurrentUser.mockResolvedValue({ success: false });
    const store = useUserStore();
    const result = await store.getUserInfo();
    expect(result).toBeUndefined();
  });

  it("getUserInfo() returns undefined when roles is null", async () => {
    mockAuthClient.getCurrentUser.mockResolvedValue({
      success: true,
      data: { id: 2, roles: null },
    });
    const store = useUserStore();
    const result = await store.getUserInfo();
    expect(result).toBeUndefined();
  });

  it("getUserInfo() throws on network error", async () => {
    mockAuthClient.getCurrentUser.mockRejectedValue(new Error("Network error"));
    const store = useUserStore();
    await expect(store.getUserInfo()).rejects.toThrow("Network error");
  });

  // -----------------------------------------------------------------------
  // setUserInfo()
  // -----------------------------------------------------------------------
  it("setUserInfo() updates userInfo on success", async () => {
    const mockUser = { id: 5, roles: ["admin"], userData: {}, userInfo: {} };
    userApi.putUserData.mockResolvedValue({
      data: { success: true, data: mockUser },
    });
    const store = useUserStore();
    const result = await store.setUserInfo({ nickname: "Alice" });
    expect(result).toBe(store.userInfo);
    expect(store.userInfo?.id).toBe(5);
  });

  it("setUserInfo() returns undefined when success is false", async () => {
    userApi.putUserData.mockResolvedValue({ data: { success: false } });
    const store = useUserStore();
    const result = await store.setUserInfo({});
    expect(result).toBeUndefined();
  });

  it("setUserInfo() returns undefined when roles is null", async () => {
    userApi.putUserData.mockResolvedValue({
      data: { success: true, data: { id: 3, roles: null } },
    });
    const store = useUserStore();
    const result = await store.setUserInfo({});
    expect(result).toBeUndefined();
  });

  it("setUserInfo() throws on network error", async () => {
    userApi.putUserData.mockRejectedValue(new Error("API error"));
    const store = useUserStore();
    await expect(store.setUserInfo({})).rejects.toThrow("API error");
  });

  // -----------------------------------------------------------------------
  // useUserStoreHook()
  // -----------------------------------------------------------------------
  it("useUserStoreHook() returns a store with expected interface", async () => {
    const { useUserStoreHook } = await import("@/store/modules/user");
    const hook = useUserStoreHook();
    expect(hook).toHaveProperty("userInfo");
    expect(hook).toHaveProperty("login");
    expect(hook).toHaveProperty("logout");
    expect(hook).toHaveProperty("getRole");
  });
});
