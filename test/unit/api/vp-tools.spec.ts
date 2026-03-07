/**
 * Unit tests for:
 *   - src/api/v1/tools.ts
 *   - src/api/v1/vp-guide.ts
 *   - src/api/v1/vp-map.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

// ============================================================
// tools API
// ============================================================
describe("Tools API", () => {
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

  it("getUserLinked() calls GET /v1/tools/user-linked", async () => {
    await toolsApi.getUserLinked();
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/v1/tools/user-linked", method: "get" })
    );
  });

  it("getUserLinked() returns the request result", async () => {
    const mockResp = { data: { linked: true } };
    request.mockResolvedValue(mockResp);
    const result = await toolsApi.getUserLinked();
    expect(result).toEqual(mockResp);
  });

  it("getUserLinked() does not send a request body", async () => {
    await toolsApi.getUserLinked();
    expect(request.mock.calls[0][0].data).toBeUndefined();
  });
});

// ============================================================
// vp-guide API
// ============================================================
describe("VpGuide API", () => {
  let request: ReturnType<typeof vi.fn>;
  let vpGuideApi: typeof import("@/api/v1/vp-guide");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    vpGuideApi = await import("@/api/v1/vp-guide");
  });

  describe("postVpGuide()", () => {
    it("calls POST /v1/vp-guides with data", async () => {
      const data = { name: "guide1" };
      await vpGuideApi.postVpGuide(data);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/vp-guides", method: "post", data })
      );
    });

    it("returns the request result", async () => {
      const mockResp = { data: { id: 10, name: "guide1" } };
      request.mockResolvedValue(mockResp);
      const result = await vpGuideApi.postVpGuide({ name: "guide1" });
      expect(result).toEqual(mockResp);
    });
  });

  describe("getVerses()", () => {
    it("calls GET /v1/vp-guides/verses with default params", async () => {
      await vpGuideApi.getVerses({});
      const { url, method } = request.mock.calls[0][0];
      expect(url).toContain("/v1/vp-guides/verses");
      expect(method).toBe("get");
    });

    it("omits VerseSearch when search is empty", async () => {
      await vpGuideApi.getVerses({ search: "" });
      expect(request.mock.calls[0][0].url).not.toContain("VerseSearch");
    });

    it("includes VerseSearch[name] when search is provided", async () => {
      await vpGuideApi.getVerses({ search: "my-verse" });
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("VerseSearch");
      expect(url).toContain("my-verse");
    });

    it("omits page when page <= 1", async () => {
      await vpGuideApi.getVerses({ page: 1 });
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });

    it("includes page when page > 1", async () => {
      await vpGuideApi.getVerses({ page: 3 });
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("page=3");
    });

    it("includes default expand=image,author,share when no expand provided", async () => {
      await vpGuideApi.getVerses({});
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("expand=image");
    });

    it("uses custom expand when provided", async () => {
      await vpGuideApi.getVerses({ expand: "author" });
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("expand=author");
    });

    it("omits page when page === 0 (default)", async () => {
      await vpGuideApi.getVerses({ page: 0 });
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });
  });

  describe("getVpGuide()", () => {
    it("calls GET /v1/vp-guides/{id}", async () => {
      await vpGuideApi.getVpGuide(7);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/vp-guides/7", method: "get" })
      );
    });

    it("different IDs produce different URLs", async () => {
      await vpGuideApi.getVpGuide(1);
      const url1: string = request.mock.calls[0][0].url;
      vi.clearAllMocks();
      await vpGuideApi.getVpGuide(2);
      const url2: string = request.mock.calls[0][0].url;
      expect(url1).not.toBe(url2);
    });
  });

  describe("getVpGuides()", () => {
    it("calls GET /v1/vp-guides with sort=order", async () => {
      await vpGuideApi.getVpGuides();
      const { url, method } = request.mock.calls[0][0];
      expect(url).toContain("/v1/vp-guides");
      expect(url).toContain("sort=order");
      expect(method).toBe("get");
    });

    it("includes page when page > 1", async () => {
      await vpGuideApi.getVpGuides(2);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("page=2");
    });

    it("omits page when page <= 1", async () => {
      await vpGuideApi.getVpGuides(1);
      expect(request.mock.calls[0][0].url).not.toContain("page=1");
    });

    it("omits page when page === 0 (default)", async () => {
      await vpGuideApi.getVpGuides(0);
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });
  });

  describe("putVpGuide()", () => {
    it("calls PUT /v1/vp-guides/{id} with data", async () => {
      const data = { title: "Updated Guide" };
      await vpGuideApi.putVpGuide(5, data);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/vp-guides/5",
          method: "put",
          data,
        })
      );
    });
  });

  describe("deleteVpGuide()", () => {
    it("calls DELETE /v1/vp-guides/{id}", async () => {
      await vpGuideApi.deleteVpGuide(9);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/vp-guides/9", method: "delete" })
      );
    });
  });
});

// ============================================================
// vp-map API
// ============================================================
describe("VpMap API", () => {
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

  describe("postVpMap()", () => {
    it("calls POST /v1/vp-maps with data", async () => {
      const data = { name: "map-1", verse_id: 10 } as Parameters<
        typeof vpMapApi.postVpMap
      >[0];
      await vpMapApi.postVpMap(data);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/vp-maps", method: "post", data })
      );
    });

    it("returns the request result", async () => {
      const mockResp = { data: { id: 7, name: "map-1" } };
      request.mockResolvedValue(mockResp);
      const data = { name: "map-1", verse_id: 10 } as Parameters<
        typeof vpMapApi.postVpMap
      >[0];
      const result = await vpMapApi.postVpMap(data);
      expect(result).toEqual(mockResp);
    });
  });

  describe("deleteVpMap()", () => {
    it("calls DELETE /v1/vp-maps/{id}", async () => {
      await vpMapApi.deleteVpMap(4);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/vp-maps/4", method: "delete" })
      );
    });

    it("uses the correct id in the URL", async () => {
      await vpMapApi.deleteVpMap(99);
      expect(request.mock.calls[0][0].url).toBe("/v1/vp-maps/99");
    });
  });

  describe("getVpMaps()", () => {
    it("calls GET /v1/vp-maps with default params (no page)", async () => {
      await vpMapApi.getVpMaps();
      const { url, method } = request.mock.calls[0][0];
      expect(url).toContain("/v1/vp-maps");
      expect(url).not.toContain("page=");
      expect(method).toBe("get");
    });

    it("includes page when page > 1", async () => {
      await vpMapApi.getVpMaps(3);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("page=3");
    });

    it("omits page when page === 1", async () => {
      await vpMapApi.getVpMaps(1);
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });

    it("omits page when called with no args (default page=1)", async () => {
      await vpMapApi.getVpMaps();
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });
  });
});
