import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));
vi.mock("@/services/auth/authClient", () => ({
  default: { logout: vi.fn().mockResolvedValue(undefined) },
}));

describe("api/v1/auth", () => {
  let request: ReturnType<typeof vi.fn>;
  let api: typeof import("@/api/v1/auth");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    api = await import("@/api/v1/auth");
  });

  it("login posts to /v1/auth/login", async () => {
    const data = { account: "u", password: "p" } as Parameters<
      typeof api.login
    >[0];
    await api.login(data);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/auth/login",
      method: "post",
      data,
    });
  });

  it("refresh posts refreshToken payload", async () => {
    await api.refresh("r1");
    expect(request).toHaveBeenCalledWith({
      url: "/v1/auth/refresh",
      method: "post",
      data: { refreshToken: "r1" },
    });
  });

  it("link posts account link payload", async () => {
    const data = { provider: "wechat", code: "x" } as Parameters<
      typeof api.link
    >[0];
    await api.link(data);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/auth/link",
      method: "post",
      data,
    });
  });

  it("register posts registration payload", async () => {
    const data = { username: "name", password: "pwd" } as Parameters<
      typeof api.register
    >[0];
    await api.register(data);
    expect(request).toHaveBeenCalledWith({
      url: "/v1/auth/register",
      method: "post",
      data,
    });
  });

  it("logout resolves true", async () => {
    await expect(api.logout()).resolves.toBe(true);
    const { default: authClient } = await import("@/services/auth/authClient");
    expect(authClient.logout).toHaveBeenCalledOnce();
  });

  it("logout preserves a failed session revocation", async () => {
    const { default: authClient } = await import("@/services/auth/authClient");
    const failure = new Error("session revocation unavailable");
    vi.mocked(authClient.logout).mockRejectedValueOnce(failure);
    await expect(api.logout()).rejects.toBe(failure);
  });

  it("logout does not call request", async () => {
    await api.logout();
    expect(request).not.toHaveBeenCalled();
  });

  it("login returns raw request promise result", async () => {
    const payload = { data: { token: "t" } };
    request.mockResolvedValue(payload);
    await expect(
      api.login({} as Parameters<typeof api.login>[0])
    ).resolves.toEqual(payload);
  });

  it("register returns raw request promise result", async () => {
    const payload = { data: { id: 1 } };
    request.mockResolvedValue(payload);
    await expect(
      api.register({} as Parameters<typeof api.register>[0])
    ).resolves.toEqual(payload);
  });
});
