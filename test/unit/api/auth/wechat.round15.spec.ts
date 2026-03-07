import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));
vi.mock("@/environment", () => ({
  default: { auth_api: "https://auth.round15.example" },
}));

describe("src/api/auth/wechat.ts round15", () => {
  let request: ReturnType<typeof vi.fn>;
  let getQrcode: typeof import("@/api/auth/wechat").getQrcode;
  let refresh: typeof import("@/api/auth/wechat").refresh;

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ ok: true });
    ({ getQrcode, refresh } = await import("@/api/auth/wechat"));
  });

  it("getQrcode uses GET", async () => {
    await getQrcode();
    expect(request.mock.calls[0][0].method).toBe("get");
  });

  it("getQrcode targets /v1/wechat/qrcode", async () => {
    await getQrcode();
    expect(request.mock.calls[0][0].url).toBe(
      "https://auth.round15.example/v1/wechat/qrcode"
    );
  });

  it("getQrcode returns request promise value", async () => {
    request.mockResolvedValue({ data: { ticket: "abc" } });
    await expect(getQrcode()).resolves.toEqual({ data: { ticket: "abc" } });
  });

  it("refresh uses GET", async () => {
    await refresh("t1");
    expect(request.mock.calls[0][0].method).toBe("get");
  });

  it("refresh appends token query", async () => {
    await refresh("token-123");
    expect(request.mock.calls[0][0].url).toBe(
      "https://auth.round15.example/v1/wechat/refresh?token=token-123"
    );
  });

  it("refresh keeps empty string token", async () => {
    await refresh("");
    expect(request.mock.calls[0][0].url.endsWith("token=")).toBe(true);
  });

  it("refresh serializes null token", async () => {
    await refresh(null);
    expect(request.mock.calls[0][0].url.endsWith("token=null")).toBe(true);
  });

  it("refresh returns request promise value", async () => {
    request.mockResolvedValue({ data: { success: true } });
    await expect(refresh("x")).resolves.toEqual({ data: { success: true } });
  });
});
