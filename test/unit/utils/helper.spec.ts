/**
 * helper 工具函数单元测试
 * 注意：这些函数依赖 window.location，需要在测试中模拟
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// 模拟 window.location
const mockLocation = {
  protocol: "https:",
  hostname: "www.example.com",
  host: "www.example.com:3000",
  port: "3000",
};

describe("helper utils", () => {
  beforeEach(() => {
    // 模拟 window.location
    Object.defineProperty(window, "location", {
      value: { ...mockLocation },
      writable: true,
    });
  });

  describe("GetCurrentUrl", () => {
    it("should return full URL with protocol and hostname", async () => {
      const { GetCurrentUrl } = await import("@/utils/helper");
      const result = GetCurrentUrl();
      expect(result).toContain("https://");
      expect(result).toContain("example.com");
    });

    it("should include port when present", async () => {
      const { GetCurrentUrl } = await import("@/utils/helper");
      const result = GetCurrentUrl();
      expect(result).toContain(":3000");
    });
  });

  describe("GetIP", () => {
    it("should extract host from location", async () => {
      const { GetIP } = await import("@/utils/helper");
      const result = GetIP();
      expect(result).toBe("www.example.com");
    });
  });

  describe("GetDomain", () => {
    it("should remove www prefix", async () => {
      const { GetDomain } = await import("@/utils/helper");
      const result = GetDomain();
      expect(result).toBe("example.com");
    });

    it("should return localhost as is", async () => {
      Object.defineProperty(window, "location", {
        value: { ...mockLocation, hostname: "localhost" },
        writable: true,
      });
      // 需要重新导入以获取新的 mock
      vi.resetModules();
      const { GetDomain } = await import("@/utils/helper");
      expect(GetDomain()).toBe("localhost");
    });

    it("should return IP address as is", async () => {
      Object.defineProperty(window, "location", {
        value: { ...mockLocation, hostname: "192.168.1.1" },
        writable: true,
      });
      vi.resetModules();
      const { GetDomain } = await import("@/utils/helper");
      expect(GetDomain()).toBe("192.168.1.1");
    });
  });

  describe("ReplaceURL", () => {
    it("should replace domain placeholder", async () => {
      const { ReplaceURL } = await import("@/utils/helper");
      const result = ReplaceURL("https://{domain}/api");
      expect(result).toContain("example.com");
    });

    it("should replace scheme placeholder", async () => {
      const { ReplaceURL } = await import("@/utils/helper");
      const result = ReplaceURL("{scheme}//example.com");
      expect(result).toContain("https:");
    });

    it("should handle multiple placeholders", async () => {
      const { ReplaceURL } = await import("@/utils/helper");
      const result = ReplaceURL("{scheme}//{domain}/api");
      expect(result).toBe("https://example.com/api");
    });
  });
});
