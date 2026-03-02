/**
 * Unit tests for src/api/v1/cyber.ts and src/api/v1/tencent-cloud.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

// -----------------------------------------------------------------------
// Cyber API
// -----------------------------------------------------------------------
describe("Cyber API", () => {
  let request: ReturnType<typeof vi.fn>;
  let cyberApi: typeof import("@/api/v1/cyber");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    cyberApi = await import("@/api/v1/cyber");
  });

  describe("putCyber()", () => {
    it("calls PUT /v1/cybers/{id}", async () => {
      await cyberApi.putCyber(5, { name: "updated" } as never);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/cybers/5", method: "put" })
      );
    });

    it("sends data in request body", async () => {
      await cyberApi.putCyber(7, { name: "cyber7" } as never);
      expect(request.mock.calls[0][0].data).toEqual({ name: "cyber7" });
    });

    it("uses numeric id in URL", async () => {
      await cyberApi.putCyber(42, {} as never);
      expect(request.mock.calls[0][0].url).toBe("/v1/cybers/42");
    });
  });

  describe("postCyber()", () => {
    it("calls POST /v1/cybers", async () => {
      await cyberApi.postCyber({ name: "new-cyber" } as never);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/cybers", method: "post" })
      );
    });

    it("sends data in request body", async () => {
      await cyberApi.postCyber({ name: "cyber-x", type: "basic" } as never);
      expect(request.mock.calls[0][0].data).toEqual({
        name: "cyber-x",
        type: "basic",
      });
    });

    it("URL has no id suffix", async () => {
      await cyberApi.postCyber({} as never);
      expect(request.mock.calls[0][0].url).toBe("/v1/cybers");
    });

    it("returns the request result", async () => {
      const mockResp = { data: { id: 1, name: "new-cyber" } };
      request.mockResolvedValue(mockResp);
      const result = await cyberApi.postCyber({ name: "new-cyber" } as never);
      expect(result).toEqual(mockResp);
    });
  });

  describe("putCyber() — return value", () => {
    it("returns the request result", async () => {
      const mockResp = { data: { id: 5, name: "updated" } };
      request.mockResolvedValue(mockResp);
      const result = await cyberApi.putCyber(5, { name: "updated" } as never);
      expect(result).toEqual(mockResp);
    });
  });
});

// -----------------------------------------------------------------------
// Tencent Cloud API
// -----------------------------------------------------------------------
describe("Tencent Cloud API", () => {
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

  describe("token()", () => {
    it("calls GET /v1/tencent-clouds/token with bucket and region", async () => {
      await tencentApi.token("my-bucket", "ap-shanghai");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/tencent-clouds/token");
      expect(url).toContain("bucket=my-bucket");
      expect(url).toContain("region=ap-shanghai");
      expect(request.mock.calls[0][0].method).toBe("get");
    });

    it("defaults region to ap-nanjing when not provided", async () => {
      await tencentApi.token("bucket-x");
      expect(request.mock.calls[0][0].url).toContain("region=ap-nanjing");
    });

    it("includes the provided bucket name in URL", async () => {
      await tencentApi.token("production-bucket");
      expect(request.mock.calls[0][0].url).toContain(
        "bucket=production-bucket"
      );
    });
  });

  describe("store()", () => {
    it("calls GET /v1/tencent-clouds/store", async () => {
      await tencentApi.store();
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/tencent-clouds/store",
          method: "get",
        })
      );
    });
  });

  describe("cloud()", () => {
    it("calls GET /v1/tencent-clouds/cloud", async () => {
      await tencentApi.cloud();
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/tencent-clouds/cloud",
          method: "get",
        })
      );
    });
  });

  describe("store() — method", () => {
    it("uses GET method", async () => {
      await tencentApi.store();
      expect(request.mock.calls[0][0].method).toBe("get");
    });
  });

  describe("token() — with only bucket", () => {
    it("URL contains /v1/tencent-clouds/token even with just bucket", async () => {
      await tencentApi.token("just-bucket");
      expect(request.mock.calls[0][0].url).toContain("/v1/tencent-clouds/token");
    });
  });

  describe("store() — return value", () => {
    it("returns the request result", async () => {
      const mockResp = { data: { bucket: "my-bucket" } };
      request.mockResolvedValue(mockResp);
      const result = await tencentApi.store();
      expect(result).toEqual(mockResp);
    });
  });

  describe("cloud() — return value", () => {
    it("returns the request result", async () => {
      const mockResp = { data: { name: "cloud-config" } };
      request.mockResolvedValue(mockResp);
      const result = await tencentApi.cloud();
      expect(result).toEqual(mockResp);
    });
  });

  describe("token() — return value", () => {
    it("returns the request result", async () => {
      const mockResp = { data: { credentials: { tmpSecretId: "sid" } } };
      request.mockResolvedValue(mockResp);
      const result = await tencentApi.token("my-bucket");
      expect(result).toEqual(mockResp);
    });
  });
});
