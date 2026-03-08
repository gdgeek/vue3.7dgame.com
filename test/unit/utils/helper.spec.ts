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

  describe("ReplaceIP", () => {
    it("should replace {ip} placeholder with current host IP", async () => {
      const { ReplaceIP } = await import("@/utils/helper");
      const result = ReplaceIP("http://{ip}:8080/api");
      expect(result).toContain("www.example.com");
      expect(result).not.toContain("{ip}");
    });

    it("should handle string without {ip} placeholder", async () => {
      const { ReplaceIP } = await import("@/utils/helper");
      const result = ReplaceIP("http://static.example.com/api");
      expect(result).toBe("http://static.example.com/api");
    });
  });

  describe("GetCurrentUrl — no port", () => {
    it("should not include colon when port is empty", async () => {
      Object.defineProperty(window, "location", {
        value: { ...mockLocation, port: "" },
        writable: true,
      });
      vi.resetModules();
      const { GetCurrentUrl } = await import("@/utils/helper");
      const result = GetCurrentUrl();
      expect(result).not.toMatch(/:\d+$/);
      expect(result).toContain("https://www.example.com");
    });
  });

  describe("GetDomain — edge cases", () => {
    it("returns domain without www for a short domain", async () => {
      Object.defineProperty(window, "location", {
        value: { ...mockLocation, hostname: "example.com" },
        writable: true,
      });
      vi.resetModules();
      const { GetDomain } = await import("@/utils/helper");
      expect(GetDomain()).toBe("example.com");
    });

    it("strips www from a sub.domain.com hostname", async () => {
      Object.defineProperty(window, "location", {
        value: { ...mockLocation, hostname: "www.sub.domain.com" },
        writable: true,
      });
      vi.resetModules();
      const { GetDomain } = await import("@/utils/helper");
      expect(GetDomain()).toBe("sub.domain.com");
    });
  });

  describe("ReplaceURL — ip placeholder", () => {
    it("should replace {ip} in template via ReplaceURL", async () => {
      vi.resetModules();
      const { ReplaceURL } = await import("@/utils/helper");
      const result = ReplaceURL("http://{ip}/api");
      expect(result).not.toContain("{ip}");
      expect(result).toContain("www.example.com");
    });
  });

  describe("ReplaceURL — no placeholders", () => {
    it("returns the string unchanged when no placeholders present", async () => {
      vi.resetModules();
      const { ReplaceURL } = await import("@/utils/helper");
      const plain = "https://fixed.example.com/api";
      expect(ReplaceURL(plain)).toBe(plain);
    });
  });

  describe("GetCurrentUrl — http protocol", () => {
    it("returns an http:// URL when protocol is http:", async () => {
      Object.defineProperty(window, "location", {
        value: {
          protocol: "http:",
          hostname: "dev.local",
          port: "8080",
          host: "dev.local:8080",
        },
        writable: true,
        configurable: true,
      });
      vi.resetModules();
      const { GetCurrentUrl } = await import("@/utils/helper");
      const result = GetCurrentUrl();
      expect(result).toContain("http://");
      expect(result).toContain("dev.local");
    });
  });

  describe("GetIP — host without port", () => {
    it("extracts just the hostname when no port is in host", async () => {
      Object.defineProperty(window, "location", {
        value: {
          protocol: "https:",
          hostname: "api.example.com",
          port: "",
          host: "api.example.com",
        },
        writable: true,
        configurable: true,
      });
      vi.resetModules();
      const { GetIP } = await import("@/utils/helper");
      expect(GetIP()).toBe("api.example.com");
    });
  });

  describe("GetIP — returns null when host is empty", () => {
    it("returns null when window.location.host is an empty string", async () => {
      // The regex /^([^:]+)/g cannot match an empty string, so ret === null
      Object.defineProperty(window, "location", {
        value: { protocol: "https:", hostname: "", port: "", host: "" },
        writable: true,
        configurable: true,
      });
      vi.resetModules();
      const { GetIP } = await import("@/utils/helper");
      expect(GetIP()).toBeNull();
    });
  });

  describe("getVueAppleLoginConfig", () => {
    it("returns config with usePopup = true", async () => {
      vi.resetModules();
      const { getVueAppleLoginConfig } = await import("@/utils/helper");
      expect(getVueAppleLoginConfig().usePopup).toBe(true);
    });

    it("returns config with clientId set to com.mrpp.www", async () => {
      vi.resetModules();
      const { getVueAppleLoginConfig } = await import("@/utils/helper");
      expect(getVueAppleLoginConfig().clientId).toBe("com.mrpp.www");
    });

    it("returns config with a numeric state string", async () => {
      vi.resetModules();
      const { getVueAppleLoginConfig } = await import("@/utils/helper");
      expect(Number(getVueAppleLoginConfig().state)).toBeGreaterThan(0);
    });
  });
});
