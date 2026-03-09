/**
 * Unit tests for src/api/v1/tools.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("tools API", () => {
  let request: ReturnType<typeof vi.fn>;
  let toolsApi: typeof import("@/api/v1/tools");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    toolsApi = await import("@/api/v1/tools");
  });

  describe("getUserLinked()", () => {
    it("sends GET /v1/tools/user-linked", async () => {
      await toolsApi.getUserLinked();
      expect(request.mock.calls[0][0].url).toBe("/v1/tools/user-linked");
      expect(request.mock.calls[0][0].method).toBe("get");
    });

    it("returns the request result", async () => {
      const mockResp = { data: { linked: true } };
      request.mockResolvedValue(mockResp);
      const result = await toolsApi.getUserLinked();
      expect(result).toEqual(mockResp);
    });

    it("calls request exactly once", async () => {
      await toolsApi.getUserLinked();
      expect(request).toHaveBeenCalledTimes(1);
    });

    it("does not send request body data", async () => {
      await toolsApi.getUserLinked();
      expect(request.mock.calls[0][0].data).toBeUndefined();
    });

    it("uses only url and method config keys", async () => {
      await toolsApi.getUserLinked();
      const config = request.mock.calls[0][0];
      expect(Object.keys(config).sort()).toEqual(["method", "url"]);
    });

    it("is idempotent across repeated calls", async () => {
      await toolsApi.getUserLinked();
      await toolsApi.getUserLinked();
      expect(request).toHaveBeenCalledTimes(2);
      expect(request.mock.calls[0][0]).toEqual(request.mock.calls[1][0]);
    });

    it("returns resolved primitive payload unchanged", async () => {
      const primitiveResp = { data: "ok" };
      request.mockResolvedValueOnce(primitiveResp);
      const result = await toolsApi.getUserLinked();
      expect(result).toBe(primitiveResp);
    });

    it("propagates request rejection", async () => {
      request.mockRejectedValueOnce(new Error("timeout"));
      await expect(toolsApi.getUserLinked()).rejects.toThrow("timeout");
    });
  });
});
