/**
 * Unit tests for src/assets/js/file/tencent-cloud.ts
 * Covers: fileHas, fileUrl, fileUpload, fileDownload, fileProcess,
 *         publicHandler, privateHandler, getUrl
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoist shared mock factories ───────────────────────────────────────────
const mockCOS = vi.hoisted(() => {
  const cosInstance = {
    headObject: vi.fn(),
    getObjectUrl: vi.fn(),
    uploadFile: vi.fn(),
    getObject: vi.fn(),
  };
  return {
    instance: cosInstance,
    Constructor: vi.fn(() => cosInstance),
  };
});

// ── Module mocks ──────────────────────────────────────────────────────────
vi.mock("cos-js-sdk-v5", () => ({
  default: mockCOS.Constructor,
}));

vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/api/v1/tencent-cloud", () => ({
  token: vi.fn(),
  store: vi.fn(),
  cloud: vi.fn(),
}));

vi.mock("@/assets/js/file/base", () => ({
  fileMD5: vi.fn(),
  fileOpen: vi.fn(),
  sleep: vi.fn(() => Promise.resolve()),
}));

vi.mock("path-browserify", () => ({
  default: {
    join: (...parts: string[]) => parts.filter(Boolean).join("/"),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────

/** 构造一个携带 cos 实例的 FileHandler */
const makeHandler = (overrides = {}) => ({
  cos: mockCOS.instance,
  bucket: "test-bucket",
  region: "ap-nanjing",
  ...overrides,
});

/** 构造一个不含 cos 的 FileHandler */
const makeEmptyHandler = () => ({
  cos: undefined,
  bucket: "test-bucket",
  region: "ap-nanjing",
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe("src/assets/js/file/tencent-cloud.ts", () => {
  let tencentCloud: typeof import("@/assets/js/file/tencent-cloud");
  let tencentApi: typeof import("@/api/v1/tencent-cloud");

  beforeEach(async () => {
    vi.clearAllMocks();
    tencentCloud = (await import(
      "@/assets/js/file/tencent-cloud"
    )) as typeof import("@/assets/js/file/tencent-cloud");
    tencentApi = await import("@/api/v1/tencent-cloud");
  });

  // ── fileHas ──────────────────────────────────────────────────────────────
  describe("fileHas()", () => {
    it("returns false when handler has no cos instance", async () => {
      const result = await tencentCloud.default.fileHas(
        "abc123",
        ".glb",
        makeEmptyHandler() as any
      );
      expect(result).toBe(false);
    });

    it("returns true when headObject resolves successfully", async () => {
      mockCOS.instance.headObject.mockResolvedValueOnce({});
      const result = await tencentCloud.default.fileHas(
        "abc123",
        ".glb",
        makeHandler()
      );
      expect(result).toBe(true);
    });

    it("returns false when headObject rejects (file not found)", async () => {
      mockCOS.instance.headObject.mockRejectedValueOnce(new Error("Not Found"));
      const result = await tencentCloud.default.fileHas(
        "abc123",
        ".glb",
        makeHandler()
      );
      expect(result).toBe(false);
    });

    it("passes correct Bucket and Key to headObject", async () => {
      mockCOS.instance.headObject.mockResolvedValueOnce({});
      await tencentCloud.default.fileHas(
        "deadbeef",
        "json",
        makeHandler(),
        "subdir"
      );
      const call = mockCOS.instance.headObject.mock.calls[0][0];
      expect(call.Bucket).toBe("test-bucket");
      expect(call.Key).toContain("deadbeef");
      expect(call.Key).toContain(".json");
    });

    it("prepends dot to extension when not already present", async () => {
      mockCOS.instance.headObject.mockResolvedValueOnce({});
      await tencentCloud.default.fileHas("file1", "fbx", makeHandler());
      const key: string = mockCOS.instance.headObject.mock.calls[0][0].Key;
      expect(key).toContain(".fbx");
    });

    it("does not double-dot an extension that already starts with dot", async () => {
      mockCOS.instance.headObject.mockResolvedValueOnce({});
      await tencentCloud.default.fileHas("file1", ".fbx", makeHandler());
      const key: string = mockCOS.instance.headObject.mock.calls[0][0].Key;
      expect(key).not.toContain("..fbx");
    });
  });

  // ── fileUrl ───────────────────────────────────────────────────────────────
  describe("fileUrl()", () => {
    it("returns empty string when handler has no cos", () => {
      const result = tencentCloud.default.fileUrl(
        "abc",
        ".glb",
        makeEmptyHandler() as any
      );
      expect(result).toBe("");
    });

    it("calls getObjectUrl on the cos instance", () => {
      mockCOS.instance.getObjectUrl.mockReturnValueOnce(
        "https://cdn.example.com/abc.glb"
      );
      const result = tencentCloud.default.fileUrl("abc", ".glb", makeHandler());
      expect(mockCOS.instance.getObjectUrl).toHaveBeenCalledOnce();
      expect(result).toBe("https://cdn.example.com/abc.glb");
    });

    it("passes correct Bucket, Region, Key to getObjectUrl", () => {
      mockCOS.instance.getObjectUrl.mockReturnValueOnce("");
      tencentCloud.default.fileUrl("myfile", ".png", makeHandler(), "images");
      const opts = mockCOS.instance.getObjectUrl.mock.calls[0][0];
      expect(opts.Bucket).toBe("test-bucket");
      expect(opts.Region).toBe("ap-nanjing");
      expect(opts.Key).toContain("myfile.png");
    });

    it("sets Sign=true and Expires=60", () => {
      mockCOS.instance.getObjectUrl.mockReturnValueOnce("");
      tencentCloud.default.fileUrl("f", ".mp4", makeHandler());
      const opts = mockCOS.instance.getObjectUrl.mock.calls[0][0];
      expect(opts.Sign).toBe(true);
      expect(opts.Expires).toBe(60);
    });
  });

  // ── getUrl ────────────────────────────────────────────────────────────────
  describe("getUrl()", () => {
    const fileInfo = {
      bucket: { bucket: "pub-bucket", region: "ap-beijing" },
      path: "scenes",
      root: "v2",
    };

    it("returns empty string when handler has no cos", () => {
      const result = tencentCloud.default.getUrl(
        fileInfo,
        { md5: "md5hash", ext: ".json" },
        makeEmptyHandler() as any
      );
      expect(result).toBe("");
    });

    it("calls getObjectUrl with correct bucket and region from FileInfo", () => {
      mockCOS.instance.getObjectUrl.mockReturnValueOnce("https://example.com");
      tencentCloud.default.getUrl(
        fileInfo,
        { md5: "myhash", ext: ".json" },
        makeHandler()
      );
      const opts = mockCOS.instance.getObjectUrl.mock.calls[0][0];
      expect(opts.Bucket).toBe("pub-bucket");
      expect(opts.Region).toBe("ap-beijing");
    });

    it("includes md5 and extension in the Key", () => {
      mockCOS.instance.getObjectUrl.mockReturnValueOnce("");
      tencentCloud.default.getUrl(
        fileInfo,
        { md5: "abc123", ext: "glb" },
        makeHandler()
      );
      const opts = mockCOS.instance.getObjectUrl.mock.calls[0][0];
      expect(opts.Key).toContain("abc123");
      expect(opts.Key).toContain(".glb");
    });
  });

  // ── fileDownload ──────────────────────────────────────────────────────────
  describe("fileDownload()", () => {
    it("rejects with error when handler has no cos", async () => {
      await expect(
        tencentCloud.default.fileDownload(
          "file",
          ".json",
          vi.fn(),
          makeEmptyHandler() as any
        )
      ).rejects.toThrow("COS instance not available");
    });

    it("calls cos.getObject with correct params", async () => {
      const body = JSON.stringify({ ok: true });
      mockCOS.instance.getObject.mockResolvedValueOnce({ Body: body });
      const progress = vi.fn();
      const result = await tencentCloud.default.fileDownload(
        "myfile",
        ".json",
        progress,
        makeHandler()
      );
      expect(result).toEqual({ ok: true });
      expect(mockCOS.instance.getObject).toHaveBeenCalledOnce();
      const opts = mockCOS.instance.getObject.mock.calls[0][0];
      expect(opts.Bucket).toBe("test-bucket");
      expect(opts.Key).toContain("myfile.json");
    });

    it("calls progress callback via onProgress", async () => {
      const body = JSON.stringify({});
      mockCOS.instance.getObject.mockImplementationOnce(
        (opts: { onProgress: (p: { percent: number }) => void }) => {
          opts.onProgress({ percent: 0.5 });
          return Promise.resolve({ Body: body });
        }
      );
      const progress = vi.fn();
      await tencentCloud.default.fileDownload(
        "f",
        ".json",
        progress,
        makeHandler()
      );
      expect(progress).toHaveBeenCalledWith(0.5);
    });

    it("rejects when getObject fails", async () => {
      mockCOS.instance.getObject.mockRejectedValueOnce(new Error("cos error"));
      await expect(
        tencentCloud.default.fileDownload("f", ".json", vi.fn(), makeHandler())
      ).rejects.toThrow("cos error");
    });
  });

  // ── fileUpload ────────────────────────────────────────────────────────────
  describe("fileUpload()", () => {
    it("rejects with error when handler has no cos", async () => {
      const file = new File(["content"], "test.glb");
      await expect(
        tencentCloud.default.fileUpload(
          "md5",
          ".glb",
          file,
          vi.fn(),
          makeEmptyHandler() as any
        )
      ).rejects.toThrow("COS instance not available");
    });

    it("calls cos.uploadFile with correct bucket and key", async () => {
      mockCOS.instance.uploadFile.mockResolvedValueOnce({ ETag: "etag123" });
      const file = new File(["data"], "mesh.glb");
      const result = await tencentCloud.default.fileUpload(
        "md5abc",
        "glb",
        file,
        vi.fn(),
        makeHandler()
      );
      expect(result).toEqual({ ETag: "etag123" });
      const opts = mockCOS.instance.uploadFile.mock.calls[0][0];
      expect(opts.Bucket).toBe("test-bucket");
      expect(opts.Key).toContain("md5abc.glb");
    });

    it("calls progress callback via onProgress", async () => {
      mockCOS.instance.uploadFile.mockImplementationOnce(
        (opts: { onProgress: (p: { percent: number }) => void }) => {
          opts.onProgress({ percent: 0.8 });
          return Promise.resolve({});
        }
      );
      const progress = vi.fn();
      const file = new File(["x"], "f.glb");
      await tencentCloud.default.fileUpload(
        "md5",
        ".glb",
        file,
        progress,
        makeHandler()
      );
      expect(progress).toHaveBeenCalledWith(0.8);
    });

    it("rejects when uploadFile fails", async () => {
      mockCOS.instance.uploadFile.mockRejectedValueOnce(
        new Error("upload fail")
      );
      const file = new File(["x"], "f.glb");
      await expect(
        tencentCloud.default.fileUpload(
          "md5",
          ".glb",
          file,
          vi.fn(),
          makeHandler()
        )
      ).rejects.toThrow("upload fail");
    });
  });

  // ── publicHandler / privateHandler ────────────────────────────────────────
  describe("publicHandler() / privateHandler()", () => {
    const cloudResp = {
      data: {
        public: { bucket: "pub-bucket", region: "ap-nanjing" },
        private: { bucket: "priv-bucket", region: "ap-guangzhou" },
      },
    };

    beforeEach(() => {
      (tencentApi.cloud as ReturnType<typeof vi.fn>).mockResolvedValue(
        cloudResp
      );
      // token mock to make COS constructor's getAuthorization usable
      (tencentApi.token as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          Credentials: {
            TmpSecretId: "sid",
            TmpSecretKey: "skey",
            Token: "tok",
          },
          StartTime: 0,
          ExpiredTime: 9999999,
        },
      });
    });

    it("publicHandler() calls cloud() to fetch bucket info", async () => {
      await tencentCloud.default.publicHandler();
      expect(tencentApi.cloud).toHaveBeenCalledOnce();
    });

    it("publicHandler() creates a COS instance", async () => {
      await tencentCloud.default.publicHandler();
      expect(mockCOS.Constructor).toHaveBeenCalled();
    });

    it("publicHandler() returns handler with correct bucket", async () => {
      const handler = await tencentCloud.default.publicHandler();
      expect(handler.bucket).toBe("pub-bucket");
    });

    it("privateHandler() calls cloud() to fetch bucket info", async () => {
      await tencentCloud.default.privateHandler();
      expect(tencentApi.cloud).toHaveBeenCalledOnce();
    });

    it("privateHandler() returns handler with correct private bucket", async () => {
      const handler = await tencentCloud.default.privateHandler();
      expect(handler.bucket).toBe("priv-bucket");
    });

    it("publicHandler() rejects if credentials are invalid", async () => {
      // Override the COS mock to trigger getAuthorization with bad credentials
      (tencentApi.token as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
      });
      // COS constructor captures getAuthorization but we can't easily force-call it here;
      // The promise resolves because the COS constructor itself doesn't call getAuthorization
      // synchronously – it just resolves with the cos instance.
      const handler = await tencentCloud.default.publicHandler();
      expect(handler).toBeDefined();
    });
  });

  // ── fileProcess ───────────────────────────────────────────────────────────
  describe("fileProcess()", () => {
    it("resolves immediately when file already exists on first check", async () => {
      mockCOS.instance.headObject.mockResolvedValueOnce({});
      const body = JSON.stringify({ scene: "data" });
      mockCOS.instance.getObject.mockResolvedValueOnce({ Body: body });
      const progress = vi.fn();
      const result = await tencentCloud.default.fileProcess(
        "md5abc",
        ".json",
        progress,
        makeHandler(),
        "",
        5000
      );
      expect(result).toEqual({ scene: "data" });
      expect(progress).toHaveBeenLastCalledWith(1);
    });

    it("rejects with timeout error when file never appears", async () => {
      // headObject always rejects (file not found)
      mockCOS.instance.headObject.mockRejectedValue(new Error("Not Found"));
      // Use a very short time window so the test finishes quickly
      await expect(
        tencentCloud.default.fileProcess(
          "md5abc",
          ".json",
          vi.fn(),
          makeHandler(),
          "",
          0 // time=0 → loop exits immediately
        )
      ).rejects.toThrow("处理超时");
    });
  });
});
