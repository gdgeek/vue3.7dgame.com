/**
 * Unit tests for src/api/v1/verse.ts
 * Covers: postVerse, getVerse, getVerses, getPublic, putVerse, deleteVerse,
 *         addPublic, removePublic, addTag, removeTag, takePhoto
 *         and the internal createQueryParams logic (tested indirectly).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));
vi.mock("uuid", () => ({ v4: () => "mock-uuid-1234" }));

describe("Verse API", () => {
  let request: ReturnType<typeof vi.fn>;
  let verseApi: typeof import("@/api/v1/verse");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    verseApi = await import("@/api/v1/verse");
  });

  // -----------------------------------------------------------------------
  // postVerse
  // -----------------------------------------------------------------------
  describe("postVerse()", () => {
    it("calls POST /v1/verses", async () => {
      await verseApi.postVerse({ name: "My Verse" } as Parameters<
        typeof verseApi.postVerse
      >[0]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/verses", method: "post" })
      );
    });

    it("auto-generates uuid when not supplied", async () => {
      await verseApi.postVerse({ name: "test" } as Parameters<
        typeof verseApi.postVerse
      >[0]);
      const data = request.mock.calls[0][0].data;
      expect(data.uuid).toBe("mock-uuid-1234");
    });

    it("keeps existing uuid when supplied", async () => {
      const existing = "existing-uuid-abc";
      await verseApi.postVerse({ name: "test", uuid: existing } as Parameters<
        typeof verseApi.postVerse
      >[0]);
      const data = request.mock.calls[0][0].data;
      expect(data.uuid).toBe(existing);
    });

    it("attaches version from environment", async () => {
      await verseApi.postVerse({ name: "test" } as Parameters<
        typeof verseApi.postVerse
      >[0]);
      const data = request.mock.calls[0][0].data;
      expect(data.version).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // getVerse
  // -----------------------------------------------------------------------
  describe("getVerse()", () => {
    it("calls GET /v1/verses/{id}", async () => {
      await verseApi.getVerse(42);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/verses/42");
    });

    it("includes default expand=metas,share", async () => {
      await verseApi.getVerse(1);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("expand=metas%2Cshare");
    });

    it("includes default cl=lua", async () => {
      await verseApi.getVerse(1);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("cl=lua");
    });

    it("uses GET method", async () => {
      await verseApi.getVerse(1);
      expect(request.mock.calls[0][0].method).toBe("get");
    });

    it("accepts custom expand and cl", async () => {
      await verseApi.getVerse(5, "metas", "js");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("cl=js");
    });
  });

  // -----------------------------------------------------------------------
  // putVerseCode
  // -----------------------------------------------------------------------
  describe("putVerseCode()", () => {
    it("calls PUT /v1/verses/{id}/code", async () => {
      await verseApi.putVerseCode(7, { code: "print(1)" } as Parameters<
        typeof verseApi.putVerseCode
      >[1]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/verses/7/code",
          method: "put",
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // getVerses — createQueryParams logic
  // -----------------------------------------------------------------------
  describe("getVerses()", () => {
    it("calls GET /v1/verses", async () => {
      await verseApi.getVerses({});
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/verses");
    });

    it("omits search key when search is empty", async () => {
      await verseApi.getVerses({ search: "" });
      const url: string = request.mock.calls[0][0].url;
      expect(url).not.toContain("VerseSearch");
    });

    it("includes search when non-empty", async () => {
      await verseApi.getVerses({ search: "hello" });
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("VerseSearch");
      expect(url).toContain("hello");
    });

    it("omits page param when page <= 1", async () => {
      await verseApi.getVerses({ page: 1 });
      const url: string = request.mock.calls[0][0].url;
      expect(url).not.toContain("page=");
    });

    it("includes page param when page > 1", async () => {
      await verseApi.getVerses({ page: 3 });
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("page=3");
    });

    it("omits tags when array is empty", async () => {
      await verseApi.getVerses({ tags: [] });
      const url: string = request.mock.calls[0][0].url;
      expect(url).not.toContain("tags");
    });

    it("includes tags when non-empty", async () => {
      await verseApi.getVerses({ tags: [1, 2] });
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("tags");
    });
  });

  // -----------------------------------------------------------------------
  // getPublic
  // -----------------------------------------------------------------------
  describe("getPublic()", () => {
    it("calls GET /v1/verses/public", async () => {
      await verseApi.getPublic({});
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/verses/public");
    });
  });

  // -----------------------------------------------------------------------
  // putVerse
  // -----------------------------------------------------------------------
  describe("putVerse()", () => {
    it("calls PUT /v1/verses/{id}", async () => {
      await verseApi.putVerse(10, { name: "Updated" } as Parameters<
        typeof verseApi.putVerse
      >[1]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/verses/10", method: "put" })
      );
    });

    it("attaches version to data", async () => {
      await verseApi.putVerse(10, { name: "test" } as Parameters<
        typeof verseApi.putVerse
      >[1]);
      const data = request.mock.calls[0][0].data;
      expect(data.version).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // deleteVerse
  // -----------------------------------------------------------------------
  describe("deleteVerse()", () => {
    it("calls DELETE /v1/verses/{id}", async () => {
      await verseApi.deleteVerse(99);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/verses/99", method: "delete" })
      );
    });

    it("accepts string id", async () => {
      await verseApi.deleteVerse("abc-123");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("abc-123");
    });
  });

  // -----------------------------------------------------------------------
  // addPublic / removePublic
  // -----------------------------------------------------------------------
  describe("addPublic()", () => {
    it("calls POST /v1/verses/{id}/public", async () => {
      await verseApi.addPublic(5);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/verses/5/public",
          method: "post",
        })
      );
    });
  });

  describe("removePublic()", () => {
    it("calls DELETE /v1/verses/{id}/public", async () => {
      await verseApi.removePublic(5);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/verses/5/public",
          method: "delete",
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // addTag / removeTag
  // -----------------------------------------------------------------------
  describe("addTag()", () => {
    it("calls POST /v1/verses/{id}/tag with tags_id", async () => {
      await verseApi.addTag(3, 7);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/verses/3/tag");
      expect(url).toContain("tags_id=7");
      expect(request.mock.calls[0][0].method).toBe("post");
    });
  });

  describe("removeTag()", () => {
    it("calls DELETE /v1/verses/{id}/tag with tags_id", async () => {
      await verseApi.removeTag(3, 7);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/verses/3/tag");
      expect(url).toContain("tags_id=7");
      expect(request.mock.calls[0][0].method).toBe("delete");
    });
  });

  // -----------------------------------------------------------------------
  // takePhoto
  // -----------------------------------------------------------------------
  describe("takePhoto()", () => {
    it("calls POST /v1/verses/{id}/take-photo", async () => {
      await verseApi.takePhoto(42);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/verses/42/take-photo",
          method: "post",
        })
      );
    });

    it("returns the request result", async () => {
      const mockResp = { data: { url: "https://cdn/photo.jpg" } };
      request.mockResolvedValue(mockResp);
      const result = await verseApi.takePhoto(1);
      expect(result).toEqual(mockResp);
    });
  });

  describe("postVerse() — return value", () => {
    it("returns the request result", async () => {
      const mockResp = { data: { id: 77, name: "My Verse" } };
      request.mockResolvedValue(mockResp);
      const result = await verseApi.postVerse({ name: "My Verse" } as Parameters<typeof verseApi.postVerse>[0]);
      expect(result).toEqual(mockResp);
    });
  });

  describe("addTag() — different IDs", () => {
    it("embeds both verse ID and tag ID in the URL", async () => {
      await verseApi.addTag(10, 20);
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("10");
      expect(url).toContain("tags_id=20");
    });
  });

  describe("addPublic() / removePublic() — different IDs", () => {
    it("addPublic uses correct verse ID", async () => {
      await verseApi.addPublic(99);
      expect(request.mock.calls[0][0].url).toContain("/v1/verses/99/public");
    });

    it("removePublic uses correct verse ID", async () => {
      await verseApi.removePublic(55);
      expect(request.mock.calls[0][0].url).toContain("/v1/verses/55/public");
    });
  });
});
