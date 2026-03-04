/**
 * Unit tests for src/api/v1/files.ts
 * Covers: postFile
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("Files API", () => {
  let request: ReturnType<typeof vi.fn>;
  let filesApi: typeof import("@/api/v1/files");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    filesApi = await import("@/api/v1/files");
  });

  describe("postFile()", () => {
    it("calls POST /v1/files", async () => {
      await filesApi.postFile({ name: "photo.png" } as Parameters<
        typeof filesApi.postFile
      >[0]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/files", method: "post" })
      );
    });

    it("sends the data payload", async () => {
      const data = { name: "avatar.jpg", size: 1024 };
      await filesApi.postFile(data as Parameters<typeof filesApi.postFile>[0]);
      expect(request.mock.calls[0][0].data).toEqual(data);
    });

    it("returns the request result", async () => {
      const mockResp = { data: { id: 1, url: "https://cdn.example.com/photo.png" } };
      request.mockResolvedValue(mockResp);
      const result = await filesApi.postFile({ name: "photo.png" } as Parameters<
        typeof filesApi.postFile
      >[0]);
      expect(result).toEqual(mockResp);
    });

    it("uses POST method (not GET or PUT)", async () => {
      await filesApi.postFile({} as Parameters<typeof filesApi.postFile>[0]);
      const method: string = request.mock.calls[0][0].method;
      expect(method).toBe("post");
      expect(method).not.toBe("get");
    });
  });
});
