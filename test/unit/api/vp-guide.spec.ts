/**
 * Unit tests for src/api/v1/vp-guide.ts
 * Covers: postVpGuide, getVerses, getVpGuide, getVpGuides, putVpGuide, deleteVpGuide
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("vp-guide API", () => {
  let request: ReturnType<typeof vi.fn>;
  let api: typeof import("@/api/v1/vp-guide");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    api = await import("@/api/v1/vp-guide");
  });

  describe("postVpGuide", () => {
    it("calls POST /v1/vp-guides", async () => {
      const payload = { name: "guide1" };
      await api.postVpGuide(payload);
      expect(request.mock.calls[0][0].url).toBe("/v1/vp-guides");
      expect(request.mock.calls[0][0].method).toBe("post");
      expect(request.mock.calls[0][0].data).toEqual(payload);
    });
  });

  describe("getVerses", () => {
    it("calls GET /v1/vp-guides/verses with default params", async () => {
      await api.getVerses({});
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/vp-guides/verses");
      expect(request.mock.calls[0][0].method).toBe("get");
    });

    it("includes expand param in URL", async () => {
      await api.getVerses({ expand: "image,author" });
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("expand=image%2Cauthor");
    });

    it("includes sort param in URL", async () => {
      await api.getVerses({ sort: "created_at" });
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("sort=created_at");
    });

    it("includes search param when non-empty", async () => {
      await api.getVerses({ search: "hello" });
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("hello");
    });

    it("omits search param when empty", async () => {
      await api.getVerses({ search: "" });
      const url: string = request.mock.calls[0][0].url;
      expect(url).not.toContain("VerseSearch");
    });

    it("includes page param when page > 1", async () => {
      await api.getVerses({ page: 3 });
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("page=3");
    });

    it("omits page param when page <= 1", async () => {
      await api.getVerses({ page: 1 });
      const url: string = request.mock.calls[0][0].url;
      expect(url).not.toContain("page=1");
    });
  });

  describe("getVpGuide", () => {
    it("calls GET /v1/vp-guides/:id", async () => {
      await api.getVpGuide(42);
      expect(request.mock.calls[0][0].url).toBe("/v1/vp-guides/42");
      expect(request.mock.calls[0][0].method).toBe("get");
    });
  });

  describe("getVpGuides", () => {
    it("calls GET /v1/vp-guides with sort=order by default", async () => {
      await api.getVpGuides();
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/vp-guides");
      expect(url).toContain("sort=order");
      expect(request.mock.calls[0][0].method).toBe("get");
    });

    it("includes page param when page > 1", async () => {
      await api.getVpGuides(2);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("page=2");
    });

    it("omits page param when page <= 1", async () => {
      await api.getVpGuides(0);
      const url: string = request.mock.calls[0][0].url;
      expect(url).not.toContain("page=0");
    });
  });

  describe("putVpGuide", () => {
    it("calls PUT /v1/vp-guides/:id with data", async () => {
      const payload = { order: 3 };
      await api.putVpGuide(7, payload);
      expect(request.mock.calls[0][0].url).toBe("/v1/vp-guides/7");
      expect(request.mock.calls[0][0].method).toBe("put");
      expect(request.mock.calls[0][0].data).toEqual(payload);
    });
  });

  describe("deleteVpGuide", () => {
    it("calls DELETE /v1/vp-guides/:id", async () => {
      await api.deleteVpGuide(99);
      expect(request.mock.calls[0][0].url).toBe("/v1/vp-guides/99");
      expect(request.mock.calls[0][0].method).toBe("delete");
    });
  });
});
