/**
 * Unit tests for src/store/modules/user.ts — supplemental (round 14)
 *
 * Covers uncovered branches:
 *   - loginByWechat(): success=true but token=null → throws "missing access_token"
 *     (lines 27-29 in user.ts)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/api/v1/auth", () => ({
  login: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@/api/v1/wechat", () => ({
  login: vi.fn(),
}));

vi.mock("@/api/v1/user", () => ({
  putUserData: vi.fn(),
  info: vi.fn(),
}));

vi.mock("@/store/modules/token", () => ({
  default: {
    setToken: vi.fn(),
    getToken: vi.fn(() => "some-token"),
    removeToken: vi.fn(),
    hasToken: vi.fn(() => false),
  },
}));

vi.mock("@/store", async () => {
  const { createPinia: cp } = await import("pinia");
  return { store: cp() };
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("useUserStore — loginByWechat null token (supplemental)", () => {
  let wechatApi: { login: ReturnType<typeof vi.fn> };
  let useUserStore: typeof import("@/store/modules/user").useUserStore;

  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.resetModules();

    wechatApi = (await import("@/api/v1/wechat")) as never;
    ({ useUserStore } = await import("@/store/modules/user"));
  });

  // ── loginByWechat null token (lines 27-29) ──────────────────────────────

  it("loginByWechat() throws when success=true but token is null", async () => {
    wechatApi.login.mockResolvedValue({ data: { success: true, token: null } });
    const store = useUserStore();
    await expect(
      store.loginByWechat({ code: "wx-code" } as never)
    ).rejects.toThrow("missing the access_token");
  });

  it("loginByWechat() throws when success=true but token is undefined", async () => {
    wechatApi.login.mockResolvedValue({
      data: { success: true, token: undefined },
    });
    const store = useUserStore();
    await expect(
      store.loginByWechat({ code: "wx-code" } as never)
    ).rejects.toThrow();
  });

  it("loginByWechat() throws when success=true but token is empty string", async () => {
    wechatApi.login.mockResolvedValue({ data: { success: true, token: "" } });
    const store = useUserStore();
    await expect(
      store.loginByWechat({ code: "any" } as never)
    ).rejects.toThrow();
  });

  it("loginByWechat() throws with the exact message when token is null", async () => {
    wechatApi.login.mockResolvedValue({ data: { success: true, token: null } });
    const store = useUserStore();
    await expect(
      store.loginByWechat({ code: "c" } as never)
    ).rejects.toThrow("The login response is missing the access_token");
  });

  it("loginByWechat() does NOT throw when success=true and token is a valid string", async () => {
    wechatApi.login.mockResolvedValue({
      data: { success: true, token: "valid-token" },
    });
    const store = useUserStore();
    await expect(
      store.loginByWechat({ code: "wx-code" } as never)
    ).resolves.toBe(true);
  });

  it("loginByWechat() throws 'Login failed' when success=false", async () => {
    wechatApi.login.mockResolvedValue({ data: { success: false, token: null } });
    const store = useUserStore();
    await expect(
      store.loginByWechat({ code: "bad" } as never)
    ).rejects.toThrow("Login failed");
  });

  it("loginByWechat() propagates network errors", async () => {
    wechatApi.login.mockRejectedValue(new Error("Network error"));
    const store = useUserStore();
    await expect(
      store.loginByWechat({ code: "c" } as never)
    ).rejects.toThrow("Network error");
  });

  it("loginByWechat() does not call Token.setToken when token is null", async () => {
    const Token = (await import("@/store/modules/token")).default as never as {
      setToken: ReturnType<typeof vi.fn>;
    };
    wechatApi.login.mockResolvedValue({ data: { success: true, token: null } });
    const store = useUserStore();
    await expect(
      store.loginByWechat({ code: "c" } as never)
    ).rejects.toThrow();
    expect(Token.setToken).not.toHaveBeenCalled();
  });
});
