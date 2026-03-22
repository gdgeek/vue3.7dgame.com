/**
 * Unit tests for src/assets/js/file/server.ts
 * Covers the pure utility functions: fileUrl(), publicHandler(), privateHandler().
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("spark-md5", () => ({
  default: {
    ArrayBuffer: vi.fn(() => ({ append: vi.fn(), end: vi.fn(() => "md5") })),
  },
}));
vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/environment", () => ({
  default: {
    api: "https://api.example.com",
  },
}));
vi.mock("axios", () => ({
  default: { head: vi.fn(), get: vi.fn() },
}));
vi.mock("@/api/v1/upload", () => ({ uploadFile: vi.fn() }));
vi.mock("path-browserify", () => ({
  default: {
    join: (...parts: string[]) => parts.filter(Boolean).join("/"),
  },
}));

describe("server.ts", () => {
  let serverFile: typeof import("@/assets/js/file/server").default;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    serverFile = (await import("@/assets/js/file/server")).default;
  });

  // -------------------------------------------------------------------------
  // fileUrl()
  // -------------------------------------------------------------------------
  describe("fileUrl()", () => {
    it("builds URL with storage prefix", () => {
      const url = serverFile.fileUrl("abc123", ".glb");
      expect(url).toContain("storage");
      expect(url).toContain("abc123.glb");
    });

    it("uses env.api as base", () => {
      const url = serverFile.fileUrl("file", ".png");
      expect(url).toContain("https://api.example.com");
    });

    it("prepends dot if extension is missing it", () => {
      const url = serverFile.fileUrl("name", "png");
      expect(url).toContain("name.png");
    });

    it("does not double-up dot when extension already has one", () => {
      const url = serverFile.fileUrl("name", ".png");
      expect(url).not.toContain("..png");
      expect(url).toContain("name.png");
    });

    it("includes bucket from handler in path", () => {
      const url = serverFile.fileUrl("file", ".glb", { bucket: "raw" });
      expect(url).toContain("raw");
    });

    it("uses empty string for bucket when handler is null", () => {
      const url = serverFile.fileUrl("file", ".glb", null);
      expect(url).toContain("storage");
    });

    it("includes dir in path when specified", () => {
      const url = serverFile.fileUrl(
        "file",
        ".glb",
        { bucket: "store" },
        "models"
      );
      expect(url).toContain("models");
    });
  });

  // -------------------------------------------------------------------------
  // publicHandler() / privateHandler()
  // -------------------------------------------------------------------------
  describe("publicHandler()", () => {
    it("resolves to a handler with bucket='store'", async () => {
      const handler = await serverFile.publicHandler();
      expect(handler.bucket).toBe("store");
    });
  });

  describe("privateHandler()", () => {
    it("resolves to a handler with bucket='raw'", async () => {
      const handler = await serverFile.privateHandler();
      expect(handler.bucket).toBe("raw");
    });
  });

  // -------------------------------------------------------------------------
  // getUrl() — stub that returns empty string
  // -------------------------------------------------------------------------
  describe("getUrl()", () => {
    it("returns empty string (stub)", () => {
      const result = serverFile.getUrl(
        { bucket: "store" },
        { md5: "abc", ext: ".glb" },
        { bucket: "store" }
      );
      expect(result).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // Additional edge cases
  // -------------------------------------------------------------------------
  describe("fileUrl() — additional", () => {
    it("returns a string for any input", () => {
      const url = serverFile.fileUrl("test", ".txt");
      expect(typeof url).toBe("string");
    });

    it("two different md5 values produce different URLs", () => {
      const url1 = serverFile.fileUrl("md5-aaa", ".glb");
      const url2 = serverFile.fileUrl("md5-bbb", ".glb");
      expect(url1).not.toBe(url2);
    });
  });

  describe("publicHandler() and privateHandler()", () => {
    it("publicHandler resolves to an object", async () => {
      const handler = await serverFile.publicHandler();
      expect(typeof handler).toBe("object");
      expect(handler).not.toBeNull();
    });

    it("privateHandler resolves to an object with different bucket than publicHandler", async () => {
      const pub = await serverFile.publicHandler();
      const priv = await serverFile.privateHandler();
      expect(pub.bucket).not.toBe(priv.bucket);
    });
  });
});
