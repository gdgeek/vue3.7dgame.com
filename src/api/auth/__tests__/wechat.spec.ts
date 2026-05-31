import { describe, expect, it, vi } from "vitest";

const request = vi.fn();

vi.mock("@/utils/request", () => ({
  default: request,
}));

vi.mock("@/environment", () => ({
  default: {
    authApi: "/api-auth/",
  },
}));

describe("wechat auth API", () => {
  it("requests the QR code from the configured auth API", async () => {
    const { getQrcode } = await import("../wechat");

    getQrcode();

    expect(request).toHaveBeenCalledWith({
      baseURL: "/api-auth",
      url: "/v1/wechat/qrcode",
      method: "get",
    });
  });

  it("refreshes WeChat login status from the configured auth API", async () => {
    const { refresh } = await import("../wechat");

    refresh("wechat-token");

    expect(request).toHaveBeenCalledWith({
      baseURL: "/api-auth",
      url: "/v1/wechat/refresh?token=wechat-token",
      method: "get",
    });
  });
});
