import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("api/v1/wechat", () => {
  let request: ReturnType<typeof vi.fn>;
  let api: typeof import("@/api/v1/wechat");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: { ok: true } });
    api = await import("@/api/v1/wechat");
  });

  it("login sends POST /v1/wechat/login", async () => {
    const payload = { code: "login-code" } as Parameters<typeof api.login>[0];
    await api.login(payload);

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/v1/wechat/login",
        method: "post",
        data: payload,
      })
    );
  });

  it("link sends POST /v1/wechat/link", async () => {
    const payload = { code: "link-code" } as Parameters<typeof api.link>[0];
    await api.link(payload);

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/v1/wechat/link",
        method: "post",
        data: payload,
      })
    );
  });

  it("register sends POST /v1/wechat/register", async () => {
    const payload = { code: "register-code" } as Parameters<
      typeof api.register
    >[0];
    await api.register(payload);

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/v1/wechat/register",
        method: "post",
        data: payload,
      })
    );
  });

  it("forwards the request resolved value from login", async () => {
    const resolved = { data: { token: "t1" } };
    request.mockResolvedValueOnce(resolved);

    await expect(api.login({ code: "x" } as Parameters<typeof api.login>[0]))
      .resolves.toBe(resolved);
  });

  it("forwards request rejection from link", async () => {
    request.mockRejectedValueOnce(new Error("network down"));

    await expect(
      api.link({ code: "x" } as Parameters<typeof api.link>[0])
    ).rejects.toThrow("network down");
  });

  it("calls request exactly once per API call", async () => {
    await api.login({ code: "a" } as Parameters<typeof api.login>[0]);
    await api.link({ code: "b" } as Parameters<typeof api.link>[0]);
    await api.register({ code: "c" } as Parameters<typeof api.register>[0]);

    expect(request).toHaveBeenCalledTimes(3);
  });
});
