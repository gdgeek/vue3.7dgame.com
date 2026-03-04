/**
 * Unit tests for src/api/v1/prefab.ts
 * Covers: deletePrefab, postPrefab, getPrefab, getPrefabs, putPrefab
 * Special case: getPrefabs maps sort "name" → "title" and "-name" → "-title"
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("Prefab API", () => {
  let request: ReturnType<typeof vi.fn>;
  let prefabApi: typeof import("@/api/v1/prefab");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<typeof vi.fn>;
    request.mockResolvedValue({ data: {} });
    prefabApi = await import("@/api/v1/prefab");
  });

  // -------------------------------------------------------------------------
  // deletePrefab()
  // -------------------------------------------------------------------------
  describe("deletePrefab()", () => {
    it("calls DELETE /v1/prefabs/{id}", async () => {
      await prefabApi.deletePrefab(5);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/prefabs/5", method: "delete" })
      );
    });

    it("returns the request result", async () => {
      const mockResp = { data: null };
      request.mockResolvedValue(mockResp);
      const result = await prefabApi.deletePrefab(5);
      expect(result).toEqual(mockResp);
    });
  });

  // -------------------------------------------------------------------------
  // postPrefab()
  // -------------------------------------------------------------------------
  describe("postPrefab()", () => {
    it("calls POST /v1/prefabs with data", async () => {
      const data = { title: "My Prefab", scene_id: 1 } as Parameters<typeof prefabApi.postPrefab>[0];
      await prefabApi.postPrefab(data);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/prefabs", method: "post", data })
      );
    });

    it("returns the request result", async () => {
      const mockResp = { data: { id: 10, title: "My Prefab" } };
      request.mockResolvedValue(mockResp);
      const result = await prefabApi.postPrefab({ title: "My Prefab" } as Parameters<typeof prefabApi.postPrefab>[0]);
      expect(result).toEqual(mockResp);
    });
  });

  // -------------------------------------------------------------------------
  // getPrefab()
  // -------------------------------------------------------------------------
  describe("getPrefab()", () => {
    it("calls GET /v1/prefabs/{id}", async () => {
      await prefabApi.getPrefab(7);
      const { url, method } = request.mock.calls[0][0];
      expect(method).toBe("get");
      expect(url).toContain("/v1/prefabs/7");
    });

    it("includes expand param when provided", async () => {
      await prefabApi.getPrefab(7, "image,author");
      expect(request.mock.calls[0][0].url).toContain("expand=");
    });

    it("returns the request result", async () => {
      const mockResp = { data: { id: 7, title: "Prefab A" } };
      request.mockResolvedValue(mockResp);
      const result = await prefabApi.getPrefab(7);
      expect(result).toEqual(mockResp);
    });
  });

  // -------------------------------------------------------------------------
  // getPrefabs()
  // -------------------------------------------------------------------------
  describe("getPrefabs()", () => {
    it("calls GET /v1/prefabs", async () => {
      await prefabApi.getPrefabs();
      const { url, method } = request.mock.calls[0][0];
      expect(method).toBe("get");
      expect(url).toContain("/v1/prefabs");
    });

    it("includes default expand and sort in query", async () => {
      await prefabApi.getPrefabs();
      const { url } = request.mock.calls[0][0];
      expect(url).toContain("expand=");
      expect(url).toContain("sort=");
    });

    it("maps sort 'name' to 'title'", async () => {
      await prefabApi.getPrefabs("name");
      expect(request.mock.calls[0][0].url).toContain("sort=title");
    });

    it("maps sort '-name' to '-title'", async () => {
      await prefabApi.getPrefabs("-name");
      expect(request.mock.calls[0][0].url).toContain("sort=-title");
    });

    it("leaves other sort values unchanged", async () => {
      await prefabApi.getPrefabs("-created_at");
      expect(request.mock.calls[0][0].url).toContain("sort=-created_at");
    });

    it("includes MetaSearch[title] when search is provided", async () => {
      await prefabApi.getPrefabs("-created_at", "castle");
      const { url } = request.mock.calls[0][0];
      expect(url).toContain("MetaSearch");
      expect(url).toContain("castle");
    });

    it("omits MetaSearch when search is empty", async () => {
      await prefabApi.getPrefabs("-created_at", "");
      expect(request.mock.calls[0][0].url).not.toContain("MetaSearch");
    });

    it("includes page when page > 1", async () => {
      await prefabApi.getPrefabs("-created_at", "", 2);
      expect(request.mock.calls[0][0].url).toContain("page=2");
    });

    it("omits page when page <= 1", async () => {
      await prefabApi.getPrefabs("-created_at", "", 1);
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });

    it("includes custom expand", async () => {
      await prefabApi.getPrefabs("-created_at", "", 0, "image");
      expect(request.mock.calls[0][0].url).toContain("expand=image");
    });

    it("returns the request result", async () => {
      const mockResp = { data: [{ id: 1, title: "Prefab A" }] };
      request.mockResolvedValue(mockResp);
      const result = await prefabApi.getPrefabs();
      expect(result).toEqual(mockResp);
    });
  });

  // -------------------------------------------------------------------------
  // putPrefab()
  // -------------------------------------------------------------------------
  describe("putPrefab()", () => {
    it("calls PUT /v1/prefabs/{id} with data", async () => {
      const data = { title: "Updated Prefab" } as Parameters<typeof prefabApi.putPrefab>[1];
      await prefabApi.putPrefab(3, data);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/prefabs/3", method: "put", data })
      );
    });

    it("returns the request result", async () => {
      const mockResp = { data: { id: 3, title: "Updated Prefab" } };
      request.mockResolvedValue(mockResp);
      const result = await prefabApi.putPrefab(3, { title: "Updated Prefab" } as Parameters<typeof prefabApi.putPrefab>[1]);
      expect(result).toEqual(mockResp);
    });
  });
});
