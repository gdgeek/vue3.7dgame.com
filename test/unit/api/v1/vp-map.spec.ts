/**
 * Unit tests for src/api/v1/vp-map.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));
vi.mock("querystringify", () => ({
  default: {
    stringify: vi.fn((obj: Record<string, unknown>, prefix: boolean) => {
      const entries = Object.entries(obj);
      if (!entries.length) return "";
      const q = entries.map(([k, v]) => `${k}=${v}`).join("&");
      return prefix ? `?${q}` : q;
    }),
  },
}));

describe("vp-map API", () => {
  let request: ReturnType<typeof vi.fn>;
  let vpMapApi: typeof import("@/api/v1/vp-map");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    vpMapApi = await import("@/api/v1/vp-map");
  });

  // -------------------------------------------------------------------------
  // postVpMap
  // -------------------------------------------------------------------------
  describe("postVpMap()", () => {
    it("sends POST /v1/vp-maps", async () => {
      await vpMapApi.postVpMap({ page: 1 });
      expect(request.mock.calls[0][0].url).toBe("/v1/vp-maps");
      expect(request.mock.calls[0][0].method).toBe("post");
    });

    it("includes the data payload", async () => {
      await vpMapApi.postVpMap({ page: 3 });
      expect(request.mock.calls[0][0].data).toEqual({ page: 3 });
    });

    it("returns the request result", async () => {
      const mockResp = { data: { id: 1, page: 1, guides: [] } };
      request.mockResolvedValue(mockResp);
      const result = await vpMapApi.postVpMap({ page: 1 });
      expect(result).toEqual(mockResp);
    });
  });

  // -------------------------------------------------------------------------
  // deleteVpMap
  // -------------------------------------------------------------------------
  describe("deleteVpMap()", () => {
    it("sends DELETE /v1/vp-maps/{id}", async () => {
      await vpMapApi.deleteVpMap(42);
      expect(request.mock.calls[0][0].url).toBe("/v1/vp-maps/42");
      expect(request.mock.calls[0][0].method).toBe("delete");
    });

    it("uses the provided id in the URL", async () => {
      await vpMapApi.deleteVpMap(99);
      expect(request.mock.calls[0][0].url).toContain("99");
    });
  });

  // -------------------------------------------------------------------------
  // getVpMaps
  // -------------------------------------------------------------------------
  describe("getVpMaps()", () => {
    it("sends GET /v1/vp-maps without page param on page=1", async () => {
      await vpMapApi.getVpMaps(1);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toBe("/v1/vp-maps");
      expect(request.mock.calls[0][0].method).toBe("get");
    });

    it("uses default page=1 when called without arguments", async () => {
      await vpMapApi.getVpMaps();
      const url: string = request.mock.calls[0][0].url;
      // page 1 should NOT add a query param (page <= 1 is skipped)
      expect(url).toBe("/v1/vp-maps");
    });

    it("includes page param when page > 1", async () => {
      await vpMapApi.getVpMaps(2);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("page=2");
    });

    it("includes page param when page > 1 for page=5", async () => {
      await vpMapApi.getVpMaps(5);
      expect(request.mock.calls[0][0].url).toContain("page=5");
    });

    it("returns the request result", async () => {
      const mockResp = { data: [{ id: 1, page: 1, guides: [] }] };
      request.mockResolvedValue(mockResp);
      const result = await vpMapApi.getVpMaps();
      expect(result).toEqual(mockResp);
    });
  });
});
