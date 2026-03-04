/**
 * Unit tests for src/assets/js/file/tencent-cloud.ts
 *
 * 覆盖范围：
 *   - publicHandler() / privateHandler() / rawHandler()
 *   - fileHas()      — 文件存在性检查
 *   - fileUrl()      — 生成带签名的文件 URL
 *   - getUrl()       — 由 FileInfo 生成带签名 URL
 *   - fileDownload() — 从 COS 下载文件
 *   - fileUpload()   — 上传文件到 COS
 *   - fileProcess()  — 轮询直到文件就绪或超时
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── 使用 vi.hoisted 使变量在模块工厂中可用 ──────────────────────────────────
const mockCosInstance = vi.hoisted(() => ({
  headObject: vi.fn(),
  getObject: vi.fn(),
  uploadFile: vi.fn(),
  getObjectUrl: vi.fn(),
}));

const mockCloudCaptured = vi.hoisted(() => ({ constructorArg: null as any }));

// ── Module mocks ────────────────────────────────────────────────────────────
vi.mock("cos-js-sdk-v5", () => ({
  default: vi.fn().mockImplementation((arg: any) => {
    mockCloudCaptured.constructorArg = arg;
    return mockCosInstance;
  }),
}));

vi.mock("@/api/v1/tencent-cloud", () => ({
  token: vi.fn(),
  store: vi.fn(),
  cloud: vi.fn(),
}));

vi.mock("@/assets/js/file/base", () => ({
  fileMD5: vi.fn(),
  fileOpen: vi.fn(),
  sleep: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("path-browserify", () => ({
  default: {
    join: (...parts: string[]) => parts.filter(Boolean).join("/"),
  },
}));

// ── Helpers ─────────────────────────────────────────────────────────────────
/** 构造一个带真实 COS 实例的 FileHandler */
function makeHandler(overrides: Record<string, any> = {}) {
  return {
    bucket: "test-bucket",
    region: "ap-guangzhou",
    cos: mockCosInstance,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("tencent-cloud.ts", () => {
  let tc: typeof import("@/assets/js/file/tencent-cloud").default;
  let cloudApi: typeof import("@/api/v1/tencent-cloud");

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // 重置 COS mock（resetModules 后需要重新绑定）
    const cos = await import("cos-js-sdk-v5");
    (cos.default as ReturnType<typeof vi.fn>).mockImplementation((arg: any) => {
      mockCloudCaptured.constructorArg = arg;
      return mockCosInstance;
    });

    tc = (await import("@/assets/js/file/tencent-cloud")).default;
    cloudApi = await import("@/api/v1/tencent-cloud");

    // 默认 cloud() 返回数据
    (cloudApi.cloud as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        public: { bucket: "pub-bucket", region: "ap-gz" },
        private: { bucket: "priv-bucket", region: "ap-gz" },
      },
    });

    // 默认 store() 返回数据
    (cloudApi.store as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        raw: { bucket: "raw-bucket", region: "ap-gz" },
      },
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // publicHandler()
  // ─────────────────────────────────────────────────────────────────────────
  describe("publicHandler()", () => {
    it("调用 cloud() 获取配置", async () => {
      await tc.publicHandler();
      expect(cloudApi.cloud).toHaveBeenCalledTimes(1);
    });

    it("返回 public bucket 的 FileHandler", async () => {
      const handler = await tc.publicHandler();
      expect(handler.bucket).toBe("pub-bucket");
      expect(handler.region).toBe("ap-gz");
    });

    it("返回的 handler 包含 cos 实例", async () => {
      const handler = await tc.publicHandler();
      expect(handler.cos).toBeDefined();
    });

    it("多次调用 publicHandler 每次都调用 cloud()", async () => {
      await tc.publicHandler();
      await tc.publicHandler();
      expect(cloudApi.cloud).toHaveBeenCalledTimes(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // privateHandler()
  // ─────────────────────────────────────────────────────────────────────────
  describe("privateHandler()", () => {
    it("调用 cloud() 获取配置", async () => {
      await tc.privateHandler();
      expect(cloudApi.cloud).toHaveBeenCalledTimes(1);
    });

    it("返回 private bucket 的 FileHandler", async () => {
      const handler = await tc.privateHandler();
      expect(handler.bucket).toBe("priv-bucket");
      expect(handler.region).toBe("ap-gz");
    });

    it("publicHandler 与 privateHandler 使用不同 bucket", async () => {
      const pub = await tc.publicHandler();
      vi.clearAllMocks();
      (cloudApi.cloud as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          public: { bucket: "pub-bucket", region: "ap-gz" },
          private: { bucket: "priv-bucket", region: "ap-gz" },
        },
      });
      const priv = await tc.privateHandler();
      expect(pub.bucket).not.toBe(priv.bucket);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // fileHas()
  // ─────────────────────────────────────────────────────────────────────────
  describe("fileHas()", () => {
    it("当 handler 没有 cos 实例时返回 false", async () => {
      const handler = makeHandler({ cos: undefined });
      const result = await tc.fileHas("abc", ".glb", handler);
      expect(result).toBe(false);
    });

    it("headObject 成功时返回 true", async () => {
      mockCosInstance.headObject.mockResolvedValue({});
      const result = await tc.fileHas("abc", ".glb", makeHandler());
      expect(result).toBe(true);
    });

    it("headObject 失败时返回 false（文件不存在）", async () => {
      mockCosInstance.headObject.mockRejectedValue(new Error("Not Found"));
      const result = await tc.fileHas("abc", ".glb", makeHandler());
      expect(result).toBe(false);
    });

    it("传入带点扩展名时不重复添加点", async () => {
      mockCosInstance.headObject.mockResolvedValue({});
      await tc.fileHas("abc", ".glb", makeHandler());
      const key: string = mockCosInstance.headObject.mock.calls[0][0].Key;
      expect(key).not.toContain("..glb");
      expect(key).toContain("abc.glb");
    });

    it("传入不带点扩展名时自动添加点", async () => {
      mockCosInstance.headObject.mockResolvedValue({});
      await tc.fileHas("abc", "glb", makeHandler());
      const key: string = mockCosInstance.headObject.mock.calls[0][0].Key;
      expect(key).toContain("abc.glb");
    });

    it("传入 dir 时路径包含目录", async () => {
      mockCosInstance.headObject.mockResolvedValue({});
      await tc.fileHas("abc", ".glb", makeHandler(), "models");
      const key: string = mockCosInstance.headObject.mock.calls[0][0].Key;
      expect(key).toContain("models");
      expect(key).toContain("abc.glb");
    });

    it("使用 handler.bucket 和 handler.region 调用 headObject", async () => {
      mockCosInstance.headObject.mockResolvedValue({});
      const handler = makeHandler({ bucket: "my-bucket", region: "ap-bj" });
      await tc.fileHas("file", ".json", handler);
      const args = mockCosInstance.headObject.mock.calls[0][0];
      expect(args.Bucket).toBe("my-bucket");
      expect(args.Region).toBe("ap-bj");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // fileUrl()
  // ─────────────────────────────────────────────────────────────────────────
  describe("fileUrl()", () => {
    it("当 handler 没有 cos 实例时返回空字符串", () => {
      const handler = makeHandler({ cos: undefined });
      const result = tc.fileUrl("abc", ".glb", handler);
      expect(result).toBe("");
    });

    it("调用 cos.getObjectUrl 并返回其结果", () => {
      mockCosInstance.getObjectUrl.mockReturnValue("https://cdn.example.com/abc.glb");
      const result = tc.fileUrl("abc", ".glb", makeHandler());
      expect(mockCosInstance.getObjectUrl).toHaveBeenCalledTimes(1);
      expect(result).toBe("https://cdn.example.com/abc.glb");
    });

    it("Key 包含 md5 和扩展名", () => {
      mockCosInstance.getObjectUrl.mockReturnValue("");
      tc.fileUrl("myhash", ".png", makeHandler());
      const key: string = mockCosInstance.getObjectUrl.mock.calls[0][0].Key;
      expect(key).toContain("myhash.png");
    });

    it("传入不带点扩展名时自动添加点", () => {
      mockCosInstance.getObjectUrl.mockReturnValue("");
      tc.fileUrl("myhash", "png", makeHandler());
      const key: string = mockCosInstance.getObjectUrl.mock.calls[0][0].Key;
      expect(key).toContain("myhash.png");
      expect(key).not.toContain("..png");
    });

    it("传入带点扩展名时不重复添加点", () => {
      mockCosInstance.getObjectUrl.mockReturnValue("");
      tc.fileUrl("myhash", ".png", makeHandler());
      const key: string = mockCosInstance.getObjectUrl.mock.calls[0][0].Key;
      expect(key).not.toContain("..png");
    });

    it("传入 dir 时 Key 包含目录前缀", () => {
      mockCosInstance.getObjectUrl.mockReturnValue("");
      tc.fileUrl("abc", ".glb", makeHandler(), "models/3d");
      const key: string = mockCosInstance.getObjectUrl.mock.calls[0][0].Key;
      expect(key).toContain("models/3d");
    });

    it("使用 handler.bucket 和 handler.region", () => {
      mockCosInstance.getObjectUrl.mockReturnValue("");
      const handler = makeHandler({ bucket: "special-bucket", region: "ap-sh" });
      tc.fileUrl("abc", ".glb", handler);
      const args = mockCosInstance.getObjectUrl.mock.calls[0][0];
      expect(args.Bucket).toBe("special-bucket");
      expect(args.Region).toBe("ap-sh");
    });

    it("Expires 设为 60，Sign 为 true", () => {
      mockCosInstance.getObjectUrl.mockReturnValue("");
      tc.fileUrl("abc", ".glb", makeHandler());
      const args = mockCosInstance.getObjectUrl.mock.calls[0][0];
      expect(args.Expires).toBe(60);
      expect(args.Sign).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getUrl()
  // ─────────────────────────────────────────────────────────────────────────
  describe("getUrl()", () => {
    const makeInfo = () => ({
      bucket: { bucket: "info-bucket", region: "ap-gz" },
      path: "scene",
      root: "root",
    });

    it("当 handler 没有 cos 实例时返回空字符串", () => {
      const result = tc.getUrl(makeInfo(), { md5: "abc", ext: ".glb" }, makeHandler({ cos: undefined }));
      expect(result).toBe("");
    });

    it("调用 cos.getObjectUrl", () => {
      mockCosInstance.getObjectUrl.mockReturnValue("https://cdn.example.com/file.glb");
      const result = tc.getUrl(makeInfo(), { md5: "abc", ext: ".glb" }, makeHandler());
      expect(mockCosInstance.getObjectUrl).toHaveBeenCalledTimes(1);
      expect(result).toBe("https://cdn.example.com/file.glb");
    });

    it("Key 包含 info.path / info.root / md5+ext", () => {
      mockCosInstance.getObjectUrl.mockReturnValue("");
      tc.getUrl(makeInfo(), { md5: "myhash", ext: ".glb" }, makeHandler());
      const key: string = mockCosInstance.getObjectUrl.mock.calls[0][0].Key;
      expect(key).toContain("scene");
      expect(key).toContain("root");
      expect(key).toContain("myhash.glb");
    });

    it("使用 info.bucket.bucket 和 info.bucket.region", () => {
      mockCosInstance.getObjectUrl.mockReturnValue("");
      tc.getUrl(makeInfo(), { md5: "abc", ext: ".glb" }, makeHandler());
      const args = mockCosInstance.getObjectUrl.mock.calls[0][0];
      expect(args.Bucket).toBe("info-bucket");
      expect(args.Region).toBe("ap-gz");
    });

    it("ext 不带点时自动添加点", () => {
      mockCosInstance.getObjectUrl.mockReturnValue("");
      tc.getUrl(makeInfo(), { md5: "abc", ext: "glb" }, makeHandler());
      const key: string = mockCosInstance.getObjectUrl.mock.calls[0][0].Key;
      expect(key).toContain("abc.glb");
      expect(key).not.toContain("..glb");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // fileDownload()
  // ─────────────────────────────────────────────────────────────────────────
  describe("fileDownload()", () => {
    it("当 handler 没有 cos 实例时 reject", async () => {
      const handler = makeHandler({ cos: undefined });
      await expect(
        tc.fileDownload("abc", ".glb", vi.fn(), handler)
      ).rejects.toThrow("COS instance not available");
    });

    it("调用 cos.getObject 并传入正确参数", async () => {
      mockCosInstance.getObject.mockResolvedValue({ Body: JSON.stringify({ ok: 1 }) });
      await tc.fileDownload("abc", ".glb", vi.fn(), makeHandler());
      const args = mockCosInstance.getObject.mock.calls[0][0];
      expect(args.Key).toContain("abc.glb");
      expect(args.Bucket).toBe("test-bucket");
      expect(args.Region).toBe("ap-guangzhou");
    });

    it("resolve 值是 JSON.parse 后的 Body", async () => {
      const payload = { id: 42, name: "test" };
      mockCosInstance.getObject.mockResolvedValue({ Body: JSON.stringify(payload) });
      const result = await tc.fileDownload("abc", ".glb", vi.fn(), makeHandler());
      expect(result).toEqual(payload);
    });

    it("getObject 失败时 reject", async () => {
      mockCosInstance.getObject.mockRejectedValue(new Error("Download failed"));
      await expect(
        tc.fileDownload("abc", ".glb", vi.fn(), makeHandler())
      ).rejects.toThrow("Download failed");
    });

    it("下载进度回调被传递给 onProgress", async () => {
      let capturedOnProgress: ((d: any) => void) | undefined;
      mockCosInstance.getObject.mockImplementation((opts: any) => {
        capturedOnProgress = opts.onProgress;
        return Promise.resolve({ Body: "{}" });
      });
      const mockProgress = vi.fn();
      await tc.fileDownload("abc", ".glb", mockProgress, makeHandler());
      capturedOnProgress?.({ percent: 0.5 });
      expect(mockProgress).toHaveBeenCalledWith(0.5);
    });

    it("传入不带点扩展名时自动添加点", async () => {
      mockCosInstance.getObject.mockResolvedValue({ Body: "{}" });
      await tc.fileDownload("abc", "glb", vi.fn(), makeHandler());
      const key: string = mockCosInstance.getObject.mock.calls[0][0].Key;
      expect(key).toContain("abc.glb");
      expect(key).not.toContain("..glb");
    });

    it("传入 dir 时 Key 包含目录", async () => {
      mockCosInstance.getObject.mockResolvedValue({ Body: "{}" });
      await tc.fileDownload("abc", ".glb", vi.fn(), makeHandler(), "models");
      const key: string = mockCosInstance.getObject.mock.calls[0][0].Key;
      expect(key).toContain("models");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // fileUpload()
  // ─────────────────────────────────────────────────────────────────────────
  describe("fileUpload()", () => {
    const mockFile = new File(["content"], "model.glb", { type: "model/gltf" });

    it("当 handler 没有 cos 实例时 reject", async () => {
      const handler = makeHandler({ cos: undefined });
      await expect(
        tc.fileUpload("abc", ".glb", mockFile, vi.fn(), handler)
      ).rejects.toThrow("COS instance not available");
    });

    it("调用 cos.uploadFile 并传入正确参数", async () => {
      mockCosInstance.uploadFile.mockResolvedValue({ ETag: "etag123" });
      await tc.fileUpload("abc", ".glb", mockFile, vi.fn(), makeHandler());
      const args = mockCosInstance.uploadFile.mock.calls[0][0];
      expect(args.Key).toContain("abc.glb");
      expect(args.Bucket).toBe("test-bucket");
      expect(args.Region).toBe("ap-guangzhou");
      expect(args.Body).toBe(mockFile);
    });

    it("resolve 值是 uploadFile 的返回值", async () => {
      const mockResp = { ETag: "etag-xyz", Location: "https://cdn/abc.glb" };
      mockCosInstance.uploadFile.mockResolvedValue(mockResp);
      const result = await tc.fileUpload("abc", ".glb", mockFile, vi.fn(), makeHandler());
      expect(result).toEqual(mockResp);
    });

    it("uploadFile 失败时 reject", async () => {
      mockCosInstance.uploadFile.mockRejectedValue(new Error("Upload failed"));
      await expect(
        tc.fileUpload("abc", ".glb", mockFile, vi.fn(), makeHandler())
      ).rejects.toThrow("Upload failed");
    });

    it("上传进度回调被传递给 onProgress", async () => {
      let capturedOnProgress: ((d: any) => void) | undefined;
      mockCosInstance.uploadFile.mockImplementation((opts: any) => {
        capturedOnProgress = opts.onProgress;
        return Promise.resolve({});
      });
      const mockProgress = vi.fn();
      await tc.fileUpload("abc", ".glb", mockFile, mockProgress, makeHandler());
      capturedOnProgress?.({ percent: 0.75 });
      expect(mockProgress).toHaveBeenCalledWith(0.75);
    });

    it("传入不带点扩展名时自动添加点", async () => {
      mockCosInstance.uploadFile.mockResolvedValue({});
      await tc.fileUpload("abc", "glb", mockFile, vi.fn(), makeHandler());
      const key: string = mockCosInstance.uploadFile.mock.calls[0][0].Key;
      expect(key).toContain("abc.glb");
      expect(key).not.toContain("..glb");
    });

    it("传入 dir 时 Key 包含目录", async () => {
      mockCosInstance.uploadFile.mockResolvedValue({});
      await tc.fileUpload("abc", ".glb", mockFile, vi.fn(), makeHandler(), "uploads/3d");
      const key: string = mockCosInstance.uploadFile.mock.calls[0][0].Key;
      expect(key).toContain("uploads/3d");
    });

    it("onHashProgress 调用 logger.log", async () => {
      let capturedOnHash: ((d: any) => void) | undefined;
      mockCosInstance.uploadFile.mockImplementation((opts: any) => {
        capturedOnHash = opts.onHashProgress;
        return Promise.resolve({});
      });
      const { logger } = await import("@/utils/logger");
      await tc.fileUpload("abc", ".glb", mockFile, vi.fn(), makeHandler());
      capturedOnHash?.({ percent: 0.5 });
      expect(logger.log).toHaveBeenCalledWith("校验中", expect.any(String));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // fileProcess()
  // ─────────────────────────────────────────────────────────────────────────
  describe("fileProcess()", () => {
    it("文件立即存在时 resolve 下载数据", async () => {
      // 第一次 fileHas → true（headObject 成功）
      mockCosInstance.headObject.mockResolvedValue({});
      const payload = { scene: "test" };
      mockCosInstance.getObject.mockResolvedValue({ Body: JSON.stringify(payload) });

      const mockProgress = vi.fn();
      const result = await tc.fileProcess("abc", ".glb", mockProgress, makeHandler(), "", 5000);
      expect(result).toEqual(payload);
    });

    it("文件存在时 progress(1) 被调用", async () => {
      mockCosInstance.headObject.mockResolvedValue({});
      mockCosInstance.getObject.mockResolvedValue({ Body: "{}" });
      const mockProgress = vi.fn();
      await tc.fileProcess("abc", ".glb", mockProgress, makeHandler(), "", 5000);
      expect(mockProgress).toHaveBeenCalledWith(1);
    });

    it("文件不存在且超时时 reject 并抛出超时错误", async () => {
      // headObject 始终失败 → fileHas 返回 false
      mockCosInstance.headObject.mockRejectedValue(new Error("404"));
      // time=0 → 立即超时（Date.now() >= start + 0 ，而 do..while 先执行一次）
      const mockProgress = vi.fn();
      await expect(
        tc.fileProcess("abc", ".glb", mockProgress, makeHandler(), "", 0)
      ).rejects.toThrow("处理超时");
    });

    it("文件不存在时调用 sleep(500) 等待", async () => {
      const { sleep } = await import("@/assets/js/file/base");
      // 先返回 false，再抛超时（time=0 时 do..while 只执行一次）
      mockCosInstance.headObject.mockRejectedValue(new Error("404"));
      await expect(
        tc.fileProcess("abc", ".glb", vi.fn(), makeHandler(), "", 0)
      ).rejects.toThrow();
      // sleep 应被调用一次（在循环第一次 has=false 时）
      expect(sleep).toHaveBeenCalledWith(500);
    });

    it("handler 没有 cos 实例时 reject", async () => {
      const handler = makeHandler({ cos: undefined });
      await expect(
        tc.fileProcess("abc", ".glb", vi.fn(), handler, "", 5000)
      ).rejects.toThrow("处理超时");
    });
  });
});
