import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("src/api/user/index.ts round15", () => {
  let request: ReturnType<typeof vi.fn>;
  let UserAPI: typeof import("@/api/user/index").default;

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: { ok: true } });
    ({ default: UserAPI } = await import("@/api/user/index"));
  });

  it("getInfo sends GET request", async () => {
    await UserAPI.getInfo();
    expect(request.mock.calls[0][0].method).toBe("get");
  });

  it("getInfo hits /v1/user/info", async () => {
    await UserAPI.getInfo();
    expect(request.mock.calls[0][0].url).toBe("/v1/user/info");
  });

  it("getInfo has no payload", async () => {
    await UserAPI.getInfo();
    expect(request.mock.calls[0][0].data).toBeUndefined();
  });

  it("getInfo returns request result", async () => {
    request.mockResolvedValue({ data: { id: 7 } });
    await expect(UserAPI.getInfo()).resolves.toEqual({ data: { id: 7 } });
  });

  it("multiple calls trigger multiple requests", async () => {
    await UserAPI.getInfo();
    await UserAPI.getInfo();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("passes through rejected promise", async () => {
    request.mockRejectedValue(new Error("network"));
    await expect(UserAPI.getInfo()).rejects.toThrow("network");
  });

  it("request call shape only includes method/url", async () => {
    await UserAPI.getInfo();
    expect(request).toHaveBeenCalledWith({
      url: "/v1/user/info",
      method: "get",
    });
  });

  it("getInfo is static callable method", () => {
    expect(typeof UserAPI.getInfo).toBe("function");
  });
});
