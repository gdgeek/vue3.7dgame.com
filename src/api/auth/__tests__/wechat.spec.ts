import { describe, expect, it, vi } from "vitest";

const request = vi.fn();

vi.mock("@/utils/request", () => ({
  default: request,
}));

describe("wechat auth API", () => {
  it("requests the QR code using the shared API base URL only once", async () => {
    const { getQrcode } = await import("../wechat");

    getQrcode();

    expect(request).toHaveBeenCalledWith({
      url: "/v1/wechat/qrcode",
      method: "get",
    });
  });

  it("refreshes WeChat login status without duplicating the API prefix", async () => {
    const { refresh } = await import("../wechat");

    refresh("wechat-token");

    expect(request).toHaveBeenCalledWith({
      url: "/v1/wechat/refresh?token=wechat-token",
      method: "get",
    });
  });
});
