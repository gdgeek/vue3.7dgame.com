/**
 * Unit tests for src/api/v1/resources/index.ts (part 2)
 *
 * This file covers the remaining 11 functions not tested in resources.spec.ts:
 *   put helpers:    putPicture, putVideo, putAudio, putParticle
 *   delete helpers: deleteVoxel, deletePicture, deleteVideo, deleteParticle
 *   get single:     getVideo, getParticle, getAudio (with convertToHttps)
 *
 * All tests mock @/utils/request and @/assets/js/helper.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));
vi.mock("uuid", () => ({ v4: () => "test-uuid-1234" }));
vi.mock("@/assets/js/helper", () => ({
  convertToHttps: vi.fn((url: string) =>
    url?.startsWith("http://") ? url.replace("http://", "https://") : url
  ),
}));

describe("Resources API (part 2) — uncovered functions", () => {
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

  // ── put helpers ─────────────────────────────────────────────────────────

  describe("putPicture()", () => {
    it("calls PUT /v1/resources/{id}", async () => {
      await resourcesApi.putPicture(10, { name: "landscape" });
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/resources/10", method: "put" })
      );
    });

    it("sends the correct data payload", async () => {
      const data = { name: "updated-photo", info: "info text" };
      await resourcesApi.putPicture(10, data);
      expect(request.mock.calls[0][0].data).toEqual(data);
    });
  });

  describe("putVideo()", () => {
    it("calls PUT /v1/resources/{id}", async () => {
      await resourcesApi.putVideo(11, { name: "my video" });
      expect(request.mock.calls[0][0].url).toBe("/v1/resources/11");
      expect(request.mock.calls[0][0].method).toBe("put");
    });

    it("accepts string id", async () => {
      await resourcesApi.putVideo("abc", { name: "v" });
      expect(request.mock.calls[0][0].url).toBe("/v1/resources/abc");
    });
  });

  describe("putAudio()", () => {
    it("calls PUT /v1/resources/{id}", async () => {
      await resourcesApi.putAudio(12, { name: "track update" });
      expect(request.mock.calls[0][0].url).toBe("/v1/resources/12");
      expect(request.mock.calls[0][0].method).toBe("put");
    });

    it("sends data payload correctly", async () => {
      const data = { name: "audio-v2", info: "remix" };
      await resourcesApi.putAudio(12, data);
      expect(request.mock.calls[0][0].data).toEqual(data);
    });
  });

  describe("putParticle()", () => {
    it("calls PUT /v1/resources/{id}", async () => {
      await resourcesApi.putParticle(13, { name: "sparks-v2" });
      expect(request.mock.calls[0][0].url).toBe("/v1/resources/13");
      expect(request.mock.calls[0][0].method).toBe("put");
    });

    it("returns the request result", async () => {
      const mockResp = { data: { id: 13, name: "sparks-v2" } };
      request.mockResolvedValue(mockResp);
      const result = await resourcesApi.putParticle(13, { name: "sparks-v2" });
      expect(result).toEqual(mockResp);
    });
  });

  // ── delete helpers ───────────────────────────────────────────────────────

  describe("deleteVoxel()", () => {
    it("calls DELETE /v1/resources/{id}", async () => {
      await resourcesApi.deleteVoxel(20);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/resources/20", method: "delete" })
      );
    });

    it("accepts string id", async () => {
      await resourcesApi.deleteVoxel("vox-id");
      expect(request.mock.calls[0][0].url).toBe("/v1/resources/vox-id");
    });
  });

  describe("deletePicture()", () => {
    it("calls DELETE /v1/resources/{id}", async () => {
      await resourcesApi.deletePicture(21);
      expect(request.mock.calls[0][0].url).toBe("/v1/resources/21");
      expect(request.mock.calls[0][0].method).toBe("delete");
    });
  });

  describe("deleteVideo()", () => {
    it("calls DELETE /v1/resources/{id}", async () => {
      await resourcesApi.deleteVideo(22);
      expect(request.mock.calls[0][0].url).toBe("/v1/resources/22");
      expect(request.mock.calls[0][0].method).toBe("delete");
    });

    it("returns the request result", async () => {
      const mockResp = { data: null };
      request.mockResolvedValue(mockResp);
      const result = await resourcesApi.deleteVideo(22);
      expect(result).toEqual(mockResp);
    });
  });

  describe("deleteParticle()", () => {
    it("calls DELETE /v1/resources/{id}", async () => {
      await resourcesApi.deleteParticle(23);
      expect(request.mock.calls[0][0].url).toBe("/v1/resources/23");
      expect(request.mock.calls[0][0].method).toBe("delete");
    });
  });

  // ── get single helpers with convertToHttps ──────────────────────────────

  describe("getVideo() — convertToHttps", () => {
    it("rewrites http:// file URL to https://", async () => {
      request.mockResolvedValue({
        data: { file: { url: "http://cdn.example.com/video.mp4" } },
      });
      const result = (await resourcesApi.getVideo(30)) as {
        data: { file: { url: string } };
      };
      expect(result.data.file.url).toBe("https://cdn.example.com/video.mp4");
    });

    it("leaves https:// URL unchanged", async () => {
      request.mockResolvedValue({
        data: { file: { url: "https://cdn.example.com/video.mp4" } },
      });
      const result = (await resourcesApi.getVideo(30)) as {
        data: { file: { url: string } };
      };
      expect(result.data.file.url).toBe("https://cdn.example.com/video.mp4");
    });

    it("handles missing file gracefully", async () => {
      request.mockResolvedValue({ data: { id: 30, type: "video" } });
      const result = (await resourcesApi.getVideo(30)) as { data: unknown };
      expect(result.data).toEqual({ id: 30, type: "video" });
    });

    it("rejects when request fails", async () => {
      request.mockRejectedValue(new Error("Network error"));
      await expect(resourcesApi.getVideo(30)).rejects.toThrow("Network error");
    });
  });

  describe("getParticle() — convertToHttps", () => {
    it("rewrites http:// file URL to https://", async () => {
      request.mockResolvedValue({
        data: { file: { url: "http://cdn.example.com/particle.json" } },
      });
      const result = (await resourcesApi.getParticle(40)) as {
        data: { file: { url: string } };
      };
      expect(result.data.file.url).toBe(
        "https://cdn.example.com/particle.json"
      );
    });

    it("handles no file.url field", async () => {
      request.mockResolvedValue({ data: { file: {} } });
      const result = (await resourcesApi.getParticle(40)) as { data: unknown };
      expect(result.data).toEqual({ file: {} });
    });

    it("handles missing file object", async () => {
      request.mockResolvedValue({ data: { id: 40 } });
      const result = (await resourcesApi.getParticle(40)) as { data: unknown };
      expect(result.data).toEqual({ id: 40 });
    });

    it("rejects when request fails", async () => {
      request.mockRejectedValue(new Error("Server error"));
      await expect(resourcesApi.getParticle(40)).rejects.toThrow(
        "Server error"
      );
    });
  });

  describe("getAudio() — convertToHttps", () => {
    it("rewrites http:// file URL to https://", async () => {
      request.mockResolvedValue({
        data: { file: { url: "http://cdn.example.com/audio.mp3" } },
      });
      const result = (await resourcesApi.getAudio(50)) as {
        data: { file: { url: string } };
      };
      expect(result.data.file.url).toBe("https://cdn.example.com/audio.mp3");
    });

    it("leaves https:// URL unchanged", async () => {
      request.mockResolvedValue({
        data: { file: { url: "https://cdn.example.com/audio.mp3" } },
      });
      const result = (await resourcesApi.getAudio(50)) as {
        data: { file: { url: string } };
      };
      expect(result.data.file.url).toBe("https://cdn.example.com/audio.mp3");
    });

    it("handles missing file gracefully", async () => {
      request.mockResolvedValue({ data: { id: 50, type: "audio" } });
      const result = (await resourcesApi.getAudio(50)) as { data: unknown };
      expect(result.data).toEqual({ id: 50, type: "audio" });
    });

    it("rejects when request fails", async () => {
      request.mockRejectedValue(new Error("Network failure"));
      await expect(resourcesApi.getAudio(50)).rejects.toThrow(
        "Network failure"
      );
    });
  });
});
