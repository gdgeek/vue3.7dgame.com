/**
 * Unit tests for:
 *   - src/api/v1/multilanguage-verse.ts  (CRUD on /v1/multilanguage-verses)
 *   - src/api/v1/multilanguage-verses.ts (getlanguages + CRUD helpers)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

// ============================================================
// multilanguage-verse API
// ============================================================
describe("MultilanguageVerse API (multilanguage-verse.ts)", () => {
  let request: ReturnType<typeof vi.fn>;
  let verseApi: typeof import("@/api/v1/multilanguage-verse");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    verseApi = await import("@/api/v1/multilanguage-verse");
  });

  describe("postMultilanguageVerse()", () => {
    it("calls POST /v1/multilanguage-verses", async () => {
      await verseApi.postMultilanguageVerse({
        description: "desc",
        language: "zh-CN",
        name: "中文版",
        verse_id: 1,
      });
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/multilanguage-verses",
          method: "post",
        })
      );
    });

    it("sends the data payload", async () => {
      const data = {
        description: "Hello world",
        language: "en-US",
        name: "English",
        verse_id: 10,
      };
      await verseApi.postMultilanguageVerse(data);
      expect(request.mock.calls[0][0].data).toEqual(data);
    });

    it("returns the request result", async () => {
      const mockResp = { data: { id: 5, name: "English" } };
      request.mockResolvedValue(mockResp);
      const result = await verseApi.postMultilanguageVerse({
        description: "",
        language: "en-US",
        name: "English",
        verse_id: 10,
      });
      expect(result).toEqual(mockResp);
    });
  });

  describe("getMultilanguageVerse()", () => {
    it("calls GET /v1/multilanguage-verses/{id}", async () => {
      await verseApi.getMultilanguageVerse(3);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/multilanguage-verses/3",
          method: "get",
        })
      );
    });

    it("different IDs produce different URLs", async () => {
      await verseApi.getMultilanguageVerse(1);
      const url1: string = request.mock.calls[0][0].url;
      vi.clearAllMocks();
      request.mockResolvedValue({ data: {} });
      await verseApi.getMultilanguageVerse(2);
      const url2: string = request.mock.calls[0][0].url;
      expect(url1).not.toBe(url2);
    });
  });

  describe("putMultilanguageVerse()", () => {
    it("calls PUT /v1/multilanguage-verses/{id}", async () => {
      await verseApi.putMultilanguageVerse(4, {
        description: "updated",
        name: "Updated Name",
      });
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/multilanguage-verses/4",
          method: "put",
        })
      );
    });

    it("sends the data payload", async () => {
      const data = { description: "new desc", name: "New Name" };
      await verseApi.putMultilanguageVerse(4, data);
      expect(request.mock.calls[0][0].data).toEqual(data);
    });
  });

  describe("deleteMultilanguageVerse()", () => {
    it("calls DELETE /v1/multilanguage-verses/{id}", async () => {
      await verseApi.deleteMultilanguageVerse(6);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/multilanguage-verses/6",
          method: "delete",
        })
      );
    });

    it("returns the request result", async () => {
      const mockResp = { data: null };
      request.mockResolvedValue(mockResp);
      const result = await verseApi.deleteMultilanguageVerse(6);
      expect(result).toEqual(mockResp);
    });
  });
});

// ============================================================
// multilanguage-verses API
// ============================================================
describe("MultilanguageVerses API (multilanguage-verses.ts)", () => {
  let request: ReturnType<typeof vi.fn>;
  let versesApi: typeof import("@/api/v1/multilanguage-verses");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    versesApi = await import("@/api/v1/multilanguage-verses");
  });

  describe("getlanguages()", () => {
    it("calls GET /v1/verses/{id}", async () => {
      await versesApi.getlanguages(7);
      const { url, method } = request.mock.calls[0][0];
      expect(url).toContain("/v1/verses/7");
      expect(method).toBe("get");
    });

    it("includes default expand=languages", async () => {
      await versesApi.getlanguages(7);
      expect(request.mock.calls[0][0].url).toContain("expand=languages");
    });

    it("uses custom expand when provided", async () => {
      await versesApi.getlanguages(7, "translations");
      expect(request.mock.calls[0][0].url).toContain("expand=translations");
    });

    it("different verse IDs produce different URLs", async () => {
      await versesApi.getlanguages(1);
      const url1: string = request.mock.calls[0][0].url;
      vi.clearAllMocks();
      request.mockResolvedValue({ data: {} });
      await versesApi.getlanguages(2);
      const url2: string = request.mock.calls[0][0].url;
      expect(url1).not.toBe(url2);
    });
  });

  describe("postlanguages()", () => {
    it("calls POST /v1/multilanguage-verses", async () => {
      await versesApi.postlanguages({ name: "日本語版" });
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/multilanguage-verses",
          method: "post",
        })
      );
    });

    it("sends the data payload", async () => {
      const data = { name: "English", language: "en-US", verse_id: 5 };
      await versesApi.postlanguages(data);
      expect(request.mock.calls[0][0].data).toEqual(data);
    });

    it("returns the request result", async () => {
      const mockResp = { data: { id: 9 } };
      request.mockResolvedValue(mockResp);
      const result = await versesApi.postlanguages({ name: "Test" });
      expect(result).toEqual(mockResp);
    });
  });

  describe("putlanguages()", () => {
    it("calls PUT /v1/multilanguage-verses/{id}", async () => {
      await versesApi.putlanguages(8, { name: "Updated", description: "desc" });
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/multilanguage-verses/8",
          method: "put",
        })
      );
    });

    it("sends the data payload", async () => {
      const data = { name: "New Name", description: "New Desc" };
      await versesApi.putlanguages(8, data);
      expect(request.mock.calls[0][0].data).toEqual(data);
    });
  });

  describe("dellanguages()", () => {
    it("calls DELETE /v1/multilanguage-verses/{id}", async () => {
      await versesApi.dellanguages(12);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/multilanguage-verses/12",
          method: "delete",
        })
      );
    });

    it("returns the request result", async () => {
      const mockResp = { data: null };
      request.mockResolvedValue(mockResp);
      const result = await versesApi.dellanguages(12);
      expect(result).toEqual(mockResp);
    });
  });
});
