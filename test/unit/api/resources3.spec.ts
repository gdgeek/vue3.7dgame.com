/**
 * resources3.spec.ts
 *
 * Covers reject(error) catch blocks not reached by resources2.spec.ts:
 *   - getPolygen() catch (line 211)
 *   - getVoxel() catch (line 229)
 *   - getPicture() catch (line 247)
 *
 * Also covers the success paths with convertToHttps for these three.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));
vi.mock("uuid", () => ({ v4: () => "test-uuid-3" }));
vi.mock("@/assets/js/helper", () => ({
  convertToHttps: vi.fn((url: string) =>
    url?.startsWith("http://") ? url.replace("http://", "https://") : url
  ),
}));

describe("Resources API (part 3) — getPolygen / getVoxel / getPicture", () => {
  let request: ReturnType<typeof vi.fn>;
  let resourcesApi: typeof import("@/api/v1/resources/index");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<typeof vi.fn>;
    request.mockResolvedValue({ data: {} });
    resourcesApi = await import("@/api/v1/resources/index");
  });

  // ── getPolygen ────────────────────────────────────────────────────────────

  describe("getPolygen()", () => {
    it("calls GET /v1/resources/{id} with type=polygen", async () => {
      await resourcesApi.getPolygen(1);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: expect.stringContaining("/v1/resources/1") })
      );
    });

    it("rewrites http:// file URL to https://", async () => {
      request.mockResolvedValue({
        data: { file: { url: "http://cdn.example.com/polygen.glb" } },
      });
      const result = (await resourcesApi.getPolygen(1)) as {
        data: { file: { url: string } };
      };
      expect(result.data.file.url).toBe("https://cdn.example.com/polygen.glb");
    });

    it("leaves https:// URL unchanged", async () => {
      request.mockResolvedValue({
        data: { file: { url: "https://cdn.example.com/polygen.glb" } },
      });
      const result = (await resourcesApi.getPolygen(1)) as {
        data: { file: { url: string } };
      };
      expect(result.data.file.url).toBe("https://cdn.example.com/polygen.glb");
    });

    it("handles missing file gracefully", async () => {
      request.mockResolvedValue({ data: { id: 1, type: "polygen" } });
      const result = (await resourcesApi.getPolygen(1)) as { data: unknown };
      expect(result.data).toEqual({ id: 1, type: "polygen" });
    });

    it("rejects when request fails (line 211)", async () => {
      request.mockRejectedValue(new Error("polygen fetch error"));
      await expect(resourcesApi.getPolygen(1)).rejects.toThrow("polygen fetch error");
    });

    it("rejects with non-Error objects (line 211)", async () => {
      request.mockRejectedValue({ status: 503 });
      await expect(resourcesApi.getPolygen(1)).rejects.toEqual({ status: 503 });
    });
  });

  // ── getVoxel ──────────────────────────────────────────────────────────────

  describe("getVoxel()", () => {
    it("calls GET /v1/resources/{id} with type=voxel", async () => {
      await resourcesApi.getVoxel(2);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: expect.stringContaining("/v1/resources/2") })
      );
    });

    it("rewrites http:// file URL to https://", async () => {
      request.mockResolvedValue({
        data: { file: { url: "http://cdn.example.com/voxel.vox" } },
      });
      const result = (await resourcesApi.getVoxel(2)) as {
        data: { file: { url: string } };
      };
      expect(result.data.file.url).toBe("https://cdn.example.com/voxel.vox");
    });

    it("handles missing file gracefully", async () => {
      request.mockResolvedValue({ data: { id: 2 } });
      const result = (await resourcesApi.getVoxel(2)) as { data: unknown };
      expect(result.data).toEqual({ id: 2 });
    });

    it("rejects when request fails (line 229)", async () => {
      request.mockRejectedValue(new Error("voxel fetch error"));
      await expect(resourcesApi.getVoxel(2)).rejects.toThrow("voxel fetch error");
    });

    it("rejects with string errors (line 229)", async () => {
      request.mockRejectedValue("server down");
      await expect(resourcesApi.getVoxel(2)).rejects.toBe("server down");
    });
  });

  // ── getPicture ────────────────────────────────────────────────────────────

  describe("getPicture()", () => {
    it("calls GET /v1/resources/{id} with type=picture", async () => {
      await resourcesApi.getPicture(3);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: expect.stringContaining("/v1/resources/3") })
      );
    });

    it("rewrites http:// file URL to https://", async () => {
      request.mockResolvedValue({
        data: { file: { url: "http://cdn.example.com/pic.jpg" } },
      });
      const result = (await resourcesApi.getPicture(3)) as {
        data: { file: { url: string } };
      };
      expect(result.data.file.url).toBe("https://cdn.example.com/pic.jpg");
    });

    it("handles missing file gracefully", async () => {
      request.mockResolvedValue({ data: { id: 3 } });
      const result = (await resourcesApi.getPicture(3)) as { data: unknown };
      expect(result.data).toEqual({ id: 3 });
    });

    it("rejects when request fails (line 247)", async () => {
      request.mockRejectedValue(new Error("picture fetch error"));
      await expect(resourcesApi.getPicture(3)).rejects.toThrow("picture fetch error");
    });

    it("rejects with network error objects (line 247)", async () => {
      request.mockRejectedValue({ code: "ECONNREFUSED" });
      await expect(resourcesApi.getPicture(3)).rejects.toEqual({ code: "ECONNREFUSED" });
    });
  });
});
