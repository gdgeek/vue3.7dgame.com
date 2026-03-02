/**
 * Unit tests for src/api/v1/meta.ts
 * Covers: postMeta, getMeta, getMetas (sort aliasing), putMeta, putMetaCode, deleteMeta
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("Meta API", () => {
  let request: ReturnType<typeof vi.fn>;
  let metaApi: typeof import("@/api/v1/meta");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    metaApi = await import("@/api/v1/meta");
  });

  // -----------------------------------------------------------------------
  // postMeta
  // -----------------------------------------------------------------------
  describe("postMeta()", () => {
    it("calls POST /v1/metas", async () => {
      await metaApi.postMeta({ title: "My Meta" } as Parameters<
        typeof metaApi.postMeta
      >[0]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/metas", method: "post" })
      );
    });

    it("sends the data payload", async () => {
      const payload = { title: "Test", type: "object" };
      await metaApi.postMeta(payload as Parameters<typeof metaApi.postMeta>[0]);
      expect(request.mock.calls[0][0].data).toEqual(payload);
    });
  });

  // -----------------------------------------------------------------------
  // getMeta
  // -----------------------------------------------------------------------
  describe("getMeta()", () => {
    it("calls GET /v1/metas/{id}", async () => {
      await metaApi.getMeta(42);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/metas/42");
      expect(request.mock.calls[0][0].method).toBe("get");
    });

    it("accepts string id", async () => {
      await metaApi.getMeta("abc");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/metas/abc");
    });

    it("appends extra params as query string", async () => {
      await metaApi.getMeta(1, { expand: "image" });
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("expand=image");
    });
  });

  // -----------------------------------------------------------------------
  // getMetas — sort aliasing
  // -----------------------------------------------------------------------
  describe("getMetas()", () => {
    it("calls GET /v1/metas", async () => {
      await metaApi.getMetas();
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/metas");
    });

    it("aliases sort='name' → 'title'", async () => {
      await metaApi.getMetas("name");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("sort=title");
      expect(url).not.toContain("sort=name");
    });

    it("aliases sort='-name' → '-title'", async () => {
      await metaApi.getMetas("-name");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("sort=-title");
      expect(url).not.toContain("sort=-name");
    });

    it("leaves other sort values unchanged", async () => {
      await metaApi.getMetas("-created_at");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("sort=-created_at");
    });

    it("omits MetaSearch when search is empty", async () => {
      await metaApi.getMetas("-created_at", "");
      const url: string = request.mock.calls[0][0].url;
      expect(url).not.toContain("MetaSearch");
    });

    it("includes MetaSearch when search is non-empty", async () => {
      await metaApi.getMetas("-created_at", "test");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("MetaSearch");
      expect(url).toContain("test");
    });

    it("omits page param when page <= 1", async () => {
      await metaApi.getMetas("-created_at", "", 1);
      const url: string = request.mock.calls[0][0].url;
      expect(url).not.toContain("page=");
    });

    it("includes page param when page > 1", async () => {
      await metaApi.getMetas("-created_at", "", 2);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("page=2");
    });

    it("includes expand in query", async () => {
      await metaApi.getMetas("-created_at", "", 0, "image,author");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("expand=");
    });
  });

  // -----------------------------------------------------------------------
  // putMeta
  // -----------------------------------------------------------------------
  describe("putMeta()", () => {
    it("calls PUT /v1/metas/{id}", async () => {
      await metaApi.putMeta(5, { title: "Updated" } as Parameters<
        typeof metaApi.putMeta
      >[1]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/metas/5", method: "put" })
      );
    });
  });

  // -----------------------------------------------------------------------
  // putMetaCode
  // -----------------------------------------------------------------------
  describe("putMetaCode()", () => {
    it("calls PUT /v1/metas/{id}/code", async () => {
      await metaApi.putMetaCode(3, { code: "print()" } as Parameters<
        typeof metaApi.putMetaCode
      >[1]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/metas/3/code", method: "put" })
      );
    });

    it("accepts null data", async () => {
      await metaApi.putMetaCode(3, null);
      expect(request.mock.calls[0][0].data).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // deleteMeta
  // -----------------------------------------------------------------------
  describe("deleteMeta()", () => {
    it("calls DELETE /v1/metas/{id}", async () => {
      await metaApi.deleteMeta(9);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/metas/9", method: "delete" })
      );
    });

    it("accepts string id", async () => {
      await metaApi.deleteMeta("xyz");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/metas/xyz");
    });

    it("returns the request result", async () => {
      const mockResp = { data: null };
      request.mockResolvedValue(mockResp);
      const result = await metaApi.deleteMeta(1);
      expect(result).toEqual(mockResp);
    });
  });

  describe("postMeta() — return value", () => {
    it("returns the request result", async () => {
      const mockResp = { data: { id: 55, title: "Meta" } };
      request.mockResolvedValue(mockResp);
      const result = await metaApi.postMeta({ title: "Meta" } as Parameters<typeof metaApi.postMeta>[0]);
      expect(result).toEqual(mockResp);
    });
  });

  describe("putMeta() — data payload", () => {
    it("sends the data payload in PUT request", async () => {
      const payload = { title: "Updated Meta" };
      await metaApi.putMeta(5, payload as Parameters<typeof metaApi.putMeta>[1]);
      expect(request.mock.calls[0][0].data).toEqual(payload);
    });
  });

  describe("getMetas() — page=0 omits page", () => {
    it("does not include page= when page is 0", async () => {
      await metaApi.getMetas("-created_at", "", 0);
      const url: string = request.mock.calls[0][0].url;
      expect(url).not.toContain("page=");
    });
  });

  describe("getMeta() — different IDs", () => {
    it("two different IDs produce different request URLs", async () => {
      await metaApi.getMeta(1);
      const url1: string = request.mock.calls[0][0].url;
      vi.clearAllMocks();
      await metaApi.getMeta(2);
      const url2: string = request.mock.calls[0][0].url;
      expect(url1).not.toBe(url2);
    });
  });
});
