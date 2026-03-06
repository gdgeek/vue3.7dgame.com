/**
 * Unit tests for src/api/v1/upload.ts
 * Covers: uploadFile
 * Note: logger is mocked to prevent side-effects in test output.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));
vi.mock("@/utils/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("Upload API", () => {
  let request: ReturnType<typeof vi.fn>;
  let uploadApi: typeof import("@/api/v1/upload");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    uploadApi = await import("@/api/v1/upload");
  });

  describe("uploadFile()", () => {
    it("calls POST /v1/upload/file", async () => {
      await uploadApi.uploadFile({ name: "scene.glb" });
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/upload/file", method: "post" })
      );
    });

    it("sends the data payload", async () => {
      const data = { name: "model.fbx", size: 2048 };
      await uploadApi.uploadFile(data);
      expect(request.mock.calls[0][0].data).toEqual(data);
    });

    it("uses POST method (not GET)", async () => {
      await uploadApi.uploadFile({});
      expect(request.mock.calls[0][0].method).toBe("post");
    });

    it("returns the request result", async () => {
      const mockResp = { data: { id: 42, url: "https://cdn.example.com/model.fbx" } };
      request.mockResolvedValue(mockResp);
      const result = await uploadApi.uploadFile({ name: "model.fbx" });
      expect(result).toEqual(mockResp);
    });

    it("calls logger.error twice (function entry + data log)", async () => {
      const { logger } = await import("@/utils/logger");
      const loggerError = logger.error as ReturnType<typeof vi.fn>;
      await uploadApi.uploadFile({ name: "test.png" });
      expect(loggerError).toHaveBeenCalledTimes(2);
    });

    it("first logger.error call logs 'uploadFile' string", async () => {
      const { logger } = await import("@/utils/logger");
      const loggerError = logger.error as ReturnType<typeof vi.fn>;
      await uploadApi.uploadFile({ name: "test.png" });
      expect(loggerError.mock.calls[0][0]).toBe("uploadFile");
    });

    it("second logger.error call logs the data argument", async () => {
      const { logger } = await import("@/utils/logger");
      const loggerError = logger.error as ReturnType<typeof vi.fn>;
      const data = { name: "test.png", size: 512 };
      await uploadApi.uploadFile(data);
      expect(loggerError.mock.calls[1][0]).toEqual(data);
    });
  });
});
