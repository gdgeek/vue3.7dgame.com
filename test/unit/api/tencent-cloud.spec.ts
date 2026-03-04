/**
 * Unit tests for src/api/v1/tencent-cloud.ts
 * Covers: token, store, cloud
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("TencentCloud API", () => {
  let request: ReturnType<typeof vi.fn>;
  let tencentApi: typeof import("@/api/v1/tencent-cloud");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    tencentApi = await import("@/api/v1/tencent-cloud");
  });

  // -----------------------------------------------------------------------
  // token()
  // -----------------------------------------------------------------------
  describe("token()", () => {
    it("calls GET /v1/tencent-clouds/token", async () => {
      await tencentApi.token("my-bucket");
      const { url, method } = request.mock.calls[0][0];
      expect(url).toContain("/v1/tencent-clouds/token");
      expect(method).toBe("get");
    });

    it("includes bucket in query string", async () => {
      await tencentApi.token("my-bucket");
      expect(request.mock.calls[0][0].url).toContain("bucket=my-bucket");
    });

    it("uses default region=ap-nanjing when region not specified", async () => {
      await tencentApi.token("test-bucket");
      expect(request.mock.calls[0][0].url).toContain("region=ap-nanjing");
    });

    it("uses custom region when provided", async () => {
      await tencentApi.token("test-bucket", "ap-beijing");
      expect(request.mock.calls[0][0].url).toContain("region=ap-beijing");
    });

    it("includes both bucket and region in query string", async () => {
      await tencentApi.token("video-bucket", "ap-shanghai");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("bucket=video-bucket");
      expect(url).toContain("region=ap-shanghai");
    });

    it("returns the request result", async () => {
      const mockResp = { data: { credentials: { token: "cos-token-xyz" } } };
      request.mockResolvedValue(mockResp);
      const result = await tencentApi.token("bucket");
      expect(result).toEqual(mockResp);
    });
  });

  // -----------------------------------------------------------------------
  // store()
  // -----------------------------------------------------------------------
  describe("store()", () => {
    it("calls GET /v1/tencent-clouds/store", async () => {
      await tencentApi.store();
      const { url, method } = request.mock.calls[0][0];
      expect(url).toBe("/v1/tencent-clouds/store");
      expect(method).toBe("get");
    });

    it("returns the request result", async () => {
      const mockResp = { data: { bucket: "store-bucket" } };
      request.mockResolvedValue(mockResp);
      const result = await tencentApi.store();
      expect(result).toEqual(mockResp);
    });
  });

  // -----------------------------------------------------------------------
  // cloud()
  // -----------------------------------------------------------------------
  describe("cloud()", () => {
    it("calls GET /v1/tencent-clouds/cloud", async () => {
      await tencentApi.cloud();
      const { url, method } = request.mock.calls[0][0];
      expect(url).toBe("/v1/tencent-clouds/cloud");
      expect(method).toBe("get");
    });

    it("returns the request result", async () => {
      const mockResp = { data: { region: "ap-nanjing" } };
      request.mockResolvedValue(mockResp);
      const result = await tencentApi.cloud();
      expect(result).toEqual(mockResp);
    });

    it("store and cloud hit different endpoints", async () => {
      await tencentApi.store();
      const storeUrl: string = request.mock.calls[0][0].url;
      vi.clearAllMocks();
      request.mockResolvedValue({ data: {} });
      await tencentApi.cloud();
      const cloudUrl: string = request.mock.calls[0][0].url;
      expect(storeUrl).not.toBe(cloudUrl);
    });
  });
});
