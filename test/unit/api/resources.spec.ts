/**
 * Unit tests for src/api/v1/resources/index.ts
 * Covers: getResources (type + search + page), typed getters,
 *         postPolygen/postVoxel/etc (uuid injection + type routing),
 *         putPolygen/etc, deletePolygen/etc, and the convertToHttps
 *         file-URL rewriting in getPolygen/getVoxel/etc.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));
vi.mock("uuid", () => ({ v4: () => "generated-uuid-9999" }));
vi.mock("@/assets/js/helper", () => ({
  convertToHttps: vi.fn((url: string) =>
    url?.startsWith("http://") ? url.replace("http://", "https://") : url
  ),
}));

describe("Resources API", () => {
  let request: ReturnType<typeof vi.fn>;
  let resourcesApi: typeof import("@/api/v1/resources/index");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    resourcesApi = await import("@/api/v1/resources/index");
  });

  // -----------------------------------------------------------------------
  // getResources — base function
  // -----------------------------------------------------------------------
  describe("getResources()", () => {
    it("calls GET /v1/resources with type query param", async () => {
      await resourcesApi.getResources("voxel");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("/v1/resources");
      expect(url).toContain("type=voxel");
      expect(request.mock.calls[0][0].method).toBe("get");
    });

    it("includes ResourceSearch[name] when search provided", async () => {
      await resourcesApi.getResources("picture", "-created_at", "tree");
      const url: string = request.mock.calls[0][0].url;
      expect(url).toContain("ResourceSearch");
      expect(url).toContain("tree");
    });

    it("omits ResourceSearch when search is empty", async () => {
      await resourcesApi.getResources("audio", "-created_at", "");
      expect(request.mock.calls[0][0].url).not.toContain("ResourceSearch");
    });

    it("includes page when page > 0", async () => {
      await resourcesApi.getResources("video", "-created_at", "", 2);
      expect(request.mock.calls[0][0].url).toContain("page=2");
    });

    it("omits page when page === 0", async () => {
      await resourcesApi.getResources("audio", "-created_at", "", 0);
      expect(request.mock.calls[0][0].url).not.toContain("page=");
    });
  });

  // -----------------------------------------------------------------------
  // Typed list getters (all delegate to getResources with correct type)
  // -----------------------------------------------------------------------
  describe("getVoxels()", () => {
    it("sends type=voxel", async () => {
      await resourcesApi.getVoxels();
      expect(request.mock.calls[0][0].url).toContain("type=voxel");
    });
  });

  describe("getPolygens()", () => {
    it("sends type=polygen", async () => {
      await resourcesApi.getPolygens();
      expect(request.mock.calls[0][0].url).toContain("type=polygen");
    });
  });

  describe("getPictures()", () => {
    it("sends type=picture", async () => {
      await resourcesApi.getPictures();
      expect(request.mock.calls[0][0].url).toContain("type=picture");
    });
  });

  describe("getVideos()", () => {
    it("sends type=video", async () => {
      await resourcesApi.getVideos();
      expect(request.mock.calls[0][0].url).toContain("type=video");
    });
  });

  describe("getAudios()", () => {
    it("sends type=audio", async () => {
      await resourcesApi.getAudios();
      expect(request.mock.calls[0][0].url).toContain("type=audio");
    });
  });

  describe("getParticles()", () => {
    it("sends type=particle", async () => {
      await resourcesApi.getParticles();
      expect(request.mock.calls[0][0].url).toContain("type=particle");
    });
  });

  // -----------------------------------------------------------------------
  // Post helpers — uuid injection + type routing
  // -----------------------------------------------------------------------
  describe("postPolygen()", () => {
    it("calls POST /v1/resources", async () => {
      await resourcesApi.postPolygen({ name: "my-polygen" });
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/resources", method: "post" })
      );
    });

    it("injects type=polygen", async () => {
      await resourcesApi.postPolygen({ name: "test" });
      expect(request.mock.calls[0][0].data.type).toBe("polygen");
    });

    it("auto-generates uuid", async () => {
      await resourcesApi.postPolygen({ name: "test" });
      expect(request.mock.calls[0][0].data.uuid).toBe("generated-uuid-9999");
    });
  });

  describe("postVoxel()", () => {
    it("injects type=voxel", async () => {
      await resourcesApi.postVoxel({ name: "cube" });
      expect(request.mock.calls[0][0].data.type).toBe("voxel");
    });
  });

  describe("postPicture()", () => {
    it("injects type=picture", async () => {
      await resourcesApi.postPicture({ name: "photo" });
      expect(request.mock.calls[0][0].data.type).toBe("picture");
    });
  });

  describe("postVideo()", () => {
    it("injects type=video", async () => {
      await resourcesApi.postVideo({ name: "clip" });
      expect(request.mock.calls[0][0].data.type).toBe("video");
    });
  });

  describe("postAudio()", () => {
    it("injects type=audio", async () => {
      await resourcesApi.postAudio({ name: "track" });
      expect(request.mock.calls[0][0].data.type).toBe("audio");
    });
  });

  describe("postParticle()", () => {
    it("injects type=particle", async () => {
      await resourcesApi.postParticle({ name: "sparks" });
      expect(request.mock.calls[0][0].data.type).toBe("particle");
    });
  });

  // -----------------------------------------------------------------------
  // Put helpers
  // -----------------------------------------------------------------------
  describe("putPolygen()", () => {
    it("calls PUT /v1/resources/{id}", async () => {
      await resourcesApi.putPolygen(3, { name: "updated" });
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/resources/3", method: "put" })
      );
    });
  });

  describe("putVoxel()", () => {
    it("calls PUT /v1/resources/{id}", async () => {
      await resourcesApi.putVoxel("abc", { name: "vox" });
      expect(request.mock.calls[0][0].url).toContain("/v1/resources/abc");
    });
  });

  // -----------------------------------------------------------------------
  // Delete helpers
  // -----------------------------------------------------------------------
  describe("deletePolygen()", () => {
    it("calls DELETE /v1/resources/{id}", async () => {
      await resourcesApi.deletePolygen(9);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/resources/9", method: "delete" })
      );
    });
  });

  describe("deleteAudio()", () => {
    it("calls DELETE /v1/resources/{id}", async () => {
      await resourcesApi.deleteAudio("xyz");
      expect(request.mock.calls[0][0].url).toContain("/v1/resources/xyz");
    });
  });

  // -----------------------------------------------------------------------
  // getPolygen/getVoxel — convertToHttps file URL rewriting
  // -----------------------------------------------------------------------
  describe("getPolygen() — convertToHttps", () => {
    it("rewrites http:// file URL to https://", async () => {
      request.mockResolvedValue({
        data: { file: { url: "http://cdn.example.com/model.glb" } },
      });
      const result = (await resourcesApi.getPolygen(1)) as {
        data: { file: { url: string } };
      };
      expect(result.data.file.url).toBe("https://cdn.example.com/model.glb");
    });

    it("leaves https:// URL unchanged", async () => {
      request.mockResolvedValue({
        data: { file: { url: "https://cdn.example.com/model.glb" } },
      });
      const result = (await resourcesApi.getPolygen(1)) as {
        data: { file: { url: string } };
      };
      expect(result.data.file.url).toBe("https://cdn.example.com/model.glb");
    });

    it("handles missing file gracefully (no rewrite)", async () => {
      request.mockResolvedValue({ data: { id: 1 } });
      const result = (await resourcesApi.getPolygen(1)) as { data: unknown };
      expect(result.data).toEqual({ id: 1 });
    });
  });

  describe("getVoxel() — convertToHttps", () => {
    it("rewrites http:// file URL to https://", async () => {
      request.mockResolvedValue({
        data: { file: { url: "http://cdn.example.com/voxel.vox" } },
      });
      const result = (await resourcesApi.getVoxel(2)) as {
        data: { file: { url: string } };
      };
      expect(result.data.file.url).toBe("https://cdn.example.com/voxel.vox");
    });
  });

  describe("getPicture() — convertToHttps", () => {
    it("rewrites http:// file URL to https://", async () => {
      request.mockResolvedValue({
        data: { file: { url: "http://cdn.example.com/pic.png" } },
      });
      const result = (await resourcesApi.getPicture(3)) as {
        data: { file: { url: string } };
      };
      expect(result.data.file.url).toBe("https://cdn.example.com/pic.png");
    });
  });

  describe("postPolygen() — return value", () => {
    it("returns the request result", async () => {
      const mockResp = { data: { id: 5, type: "polygen" } };
      request.mockResolvedValue(mockResp);
      const result = await resourcesApi.postPolygen({ name: "test" });
      expect(result).toEqual(mockResp);
    });
  });

  describe("getResources() — return value", () => {
    it("returns the request result", async () => {
      const mockResp = { data: [{ id: 1, type: "voxel" }] };
      request.mockResolvedValue(mockResp);
      const result = await resourcesApi.getResources("voxel");
      expect(result).toEqual(mockResp);
    });
  });

  describe("putPolygen() — data payload", () => {
    it("sends the data payload in the PUT request", async () => {
      const data = { name: "updated-model", file_id: 99 };
      await resourcesApi.putPolygen(3, data);
      expect(request.mock.calls[0][0].data).toEqual(data);
    });
  });

  describe("deletePolygen() — return value", () => {
    it("returns the request result", async () => {
      const mockResp = { data: null };
      request.mockResolvedValue(mockResp);
      const result = await resourcesApi.deletePolygen(1);
      expect(result).toEqual(mockResp);
    });
  });
});
