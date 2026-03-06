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
vi.mock("@/store/modules/token", () => ({
  default: {
    setToken: vi.fn(),
    hasToken: vi.fn(),
    removeToken: vi.fn(),
    getToken: vi.fn(),
  },
}));
vi.mock("@/api/v1/user", () => ({
  putUserData: vi.fn(),
  info: vi.fn(),
}));
vi.mock("@/store", async () => {
  const { createPinia: cp } = await import("pinia");
  return { store: cp() };
});

describe("useUserStore", () => {
  let authApi: { login: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };
  let wechatApi: { login: ReturnType<typeof vi.fn> };
  let token: {
    setToken: ReturnType<typeof vi.fn>;
    hasToken: ReturnType<typeof vi.fn>;
    removeToken: ReturnType<typeof vi.fn>;
  };
  let userApi: { putUserData: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn> };
  let useUserStore: typeof import("@/store/modules/user").useUserStore;

  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    authApi = await import("@/api/v1/auth") as never;
    wechatApi = await import("@/api/v1/wechat") as never;
    token = (await import("@/store/modules/token")).default as never;
    userApi = await import("@/api/v1/user") as never;
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
  it("login() calls Token.setToken on success", async () => {
    authApi.login.mockResolvedValue({ data: { success: true, token: "tok-123" } });
    const store = useUserStore();
    await store.login({ username: "u", password: "p" });
    expect(token.setToken).toHaveBeenCalledWith("tok-123");
  });

  it("login() returns true on success", async () => {
    authApi.login.mockResolvedValue({ data: { success: true, token: "tok-123" } });
    const store = useUserStore();
    const result = await store.login({ username: "u", password: "p" });
    expect(result).toBe(true);
  });

  it("login() throws when response.data.success is false", async () => {
    authApi.login.mockResolvedValue({ data: { success: false } });
    const store = useUserStore();
    await expect(store.login({ username: "u", password: "p" })).rejects.toThrow();
  });

  it("login() throws when token is missing in response", async () => {
    authApi.login.mockResolvedValue({ data: { success: true, token: null } });
    const store = useUserStore();
    await expect(store.login({ username: "u", password: "p" })).rejects.toThrow();
  });

  // -----------------------------------------------------------------------
  // loginByWechat()
  // -----------------------------------------------------------------------
  it("loginByWechat() calls Token.setToken on success", async () => {
    wechatApi.login.mockResolvedValue({ data: { success: true, token: "wec-tok" } });
    const store = useUserStore();
    await store.loginByWechat({ code: "wx-code" } as never);
    expect(token.setToken).toHaveBeenCalledWith("wec-tok");
  });

  it("loginByWechat() throws when success is false", async () => {
    wechatApi.login.mockResolvedValue({ data: { success: false } });
    const store = useUserStore();
    await expect(store.loginByWechat({ code: "bad" } as never)).rejects.toThrow();
  });

  // -----------------------------------------------------------------------
  // logout()
  // -----------------------------------------------------------------------
  it("logout() calls AuthAPI.logout when token exists", async () => {
    token.hasToken.mockReturnValue(true);
    authApi.logout.mockResolvedValue({});
    const store = useUserStore();
    await store.logout();
    expect(authApi.logout).toHaveBeenCalled();
  });

  it("logout() skips AuthAPI.logout when no token", async () => {
    token.hasToken.mockReturnValue(false);
    const store = useUserStore();
    await store.logout();
    expect(authApi.logout).not.toHaveBeenCalled();
  });

  it("logout() always calls Token.removeToken", async () => {
    token.hasToken.mockReturnValue(false);
    const store = useUserStore();
    await store.logout();
    expect(token.removeToken).toHaveBeenCalled();
  });

  it("logout() resets userInfo to an empty-ish object", async () => {
    token.hasToken.mockReturnValue(false);
    const store = useUserStore();
    store.userInfo = { roles: ["admin"] } as never;
    await store.logout();
    expect(store.userInfo!.roles).toEqual([]);
    expect(store.userInfo!.id).toBe(0);
  });

  it("logout() continues even when AuthAPI.logout throws", async () => {
    token.hasToken.mockReturnValue(true);
    authApi.logout.mockRejectedValue(new Error("network error"));
    const store = useUserStore();
    await expect(store.logout()).resolves.toBeUndefined();
    expect(token.removeToken).toHaveBeenCalled();
  });

  it("logout() completes cleanly without refreshInterval (token refresh handled by request.ts interceptor)", async () => {
    token.hasToken.mockReturnValue(false);
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
    userApi.info.mockResolvedValue({ data: { success: true, data: mockUser } });
    const store = useUserStore();
    const result = await store.getUserInfo();
    expect(result).toBe(store.userInfo);
    expect(store.userInfo?.id).toBe(1);
  });

  it("getUserInfo() returns undefined when success is false", async () => {
    userApi.info.mockResolvedValue({ data: { success: false } });
    const store = useUserStore();
    const result = await store.getUserInfo();
    expect(result).toBeUndefined();
  });

  it("getUserInfo() returns undefined when roles is null", async () => {
    userApi.info.mockResolvedValue({
      data: { success: true, data: { id: 2, roles: null } },
    });
    const store = useUserStore();
    const result = await store.getUserInfo();
    expect(result).toBeUndefined();
  });

  it("getUserInfo() returns undefined on network error", async () => {
    userApi.info.mockRejectedValue(new Error("Network error"));
    const store = useUserStore();
    const result = await store.getUserInfo();
    expect(result).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // setUserInfo()
  // -----------------------------------------------------------------------
  it("setUserInfo() updates userInfo on success", async () => {
    const mockUser = { id: 5, roles: ["admin"], userData: {}, userInfo: {} };
    userApi.putUserData.mockResolvedValue({ data: { success: true, data: mockUser } });
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

  it("setUserInfo() returns undefined on network error", async () => {
    userApi.putUserData.mockRejectedValue(new Error("API error"));
    const store = useUserStore();
    const result = await store.setUserInfo({});
    expect(result).toBeUndefined();
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
