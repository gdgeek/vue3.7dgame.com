/**
 * Unit tests for src/utils/helper.ts — supplemental (round 14)
 *
 * Covers uncovered branches:
 *   - ReplaceIP(): GetIP() returns null → uses "" fallback (line 39)
 *   - ReplaceURL(): GetIP() returns null → uses "" fallback (line 44)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("helper.ts — ReplaceIP/ReplaceURL with null GetIP (supplemental)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  // ── Line 39: ReplaceIP with null GetIP ────────────────────────────────────

  describe("ReplaceIP — GetIP() returns null (line 39 null branch)", () => {
    it("replaces {ip} with empty string when host is empty (GetIP=null)", async () => {
      // Set window.location.host to "" so that /^([^:]+)/g.exec("") === null
      Object.defineProperty(window, "location", {
        value: {
          protocol: "https:",
          hostname: "",
          host: "",
          port: "",
        },
        writable: true,
        configurable: true,
      });
      vi.resetModules();
      const { ReplaceIP } = await import("@/utils/helper");
      const result = ReplaceIP("http://{ip}:8080/api");
      // GetIP() returns null → || "" → {ip} is replaced with ""
      expect(result).toBe("http://:8080/api");
    });

    it("returns string unchanged when no {ip} placeholder and GetIP=null", async () => {
      Object.defineProperty(window, "location", {
        value: { protocol: "https:", hostname: "", host: "", port: "" },
        writable: true,
        configurable: true,
      });
      vi.resetModules();
      const { ReplaceIP } = await import("@/utils/helper");
      const result = ReplaceIP("https://static.example.com/api");
      expect(result).toBe("https://static.example.com/api");
    });

    it("replaces {ip} with empty string even for multi-occurrence inputs", async () => {
      Object.defineProperty(window, "location", {
        value: { protocol: "https:", hostname: "", host: "", port: "" },
        writable: true,
        configurable: true,
      });
      vi.resetModules();
      const { ReplaceIP } = await import("@/utils/helper");
      // Note: String.replace only replaces first occurrence, so {ip}:{ip} → ":{ip}"
      const result = ReplaceIP("{ip}:{ip}");
      // The first {ip} is replaced with "" (null → ""), the second remains
      expect(result).toBe(":{ip}");
    });
  });

  // ── Line 44: ReplaceURL with null GetIP ───────────────────────────────────

  describe("ReplaceURL — GetIP() returns null (line 44 null branch)", () => {
    it("replaces {ip} with empty string in ReplaceURL when GetIP=null", async () => {
      Object.defineProperty(window, "location", {
        value: {
          protocol: "https:",
          hostname: "example.com",
          host: "",
          port: "",
        },
        writable: true,
        configurable: true,
      });
      vi.resetModules();
      const { ReplaceURL } = await import("@/utils/helper");
      const result = ReplaceURL("http://{ip}/path");
      // GetIP returns null (host is "") → || "" → {ip} → ""
      expect(result).toBe("http:///path");
    });

    it("ReplaceURL handles all placeholders when host is empty", async () => {
      Object.defineProperty(window, "location", {
        value: {
          protocol: "http:",
          hostname: "test.example.com",
          host: "",
          port: "",
        },
        writable: true,
        configurable: true,
      });
      vi.resetModules();
      const { ReplaceURL } = await import("@/utils/helper");
      const result = ReplaceURL("{scheme}//{domain}/{ip}/api");
      expect(result).toContain("http:");
      expect(result).toContain("example.com");
      expect(result).not.toContain("{ip}");
      expect(result).not.toContain("{scheme}");
      expect(result).not.toContain("{domain}");
    });

    it("ReplaceURL with both null GetIP and empty hostname produces valid string", async () => {
      Object.defineProperty(window, "location", {
        value: {
          protocol: "https:",
          hostname: "",
          host: "",
          port: "",
        },
        writable: true,
        configurable: true,
      });
      vi.resetModules();
      const { ReplaceURL } = await import("@/utils/helper");
      const result = ReplaceURL("{domain}/{ip}");
      expect(typeof result).toBe("string");
      expect(result).not.toContain("{domain}");
      expect(result).not.toContain("{ip}");
    });

    it("ReplaceURL: null GetIP does not affect scheme or domain replacement", async () => {
      Object.defineProperty(window, "location", {
        value: {
          protocol: "https:",
          hostname: "www.test.com",
          host: "",
          port: "",
        },
        writable: true,
        configurable: true,
      });
      vi.resetModules();
      const { ReplaceURL } = await import("@/utils/helper");
      const result = ReplaceURL("{scheme}://{domain}");
      expect(result).toContain("https:");
      expect(result).toContain("test.com"); // www stripped
    });
  });

  // ── Confirm normal (non-null) behavior still works ─────────────────────

  describe("ReplaceIP and ReplaceURL — normal host (sanity check)", () => {
    it("ReplaceIP uses actual host value when host is not empty", async () => {
      Object.defineProperty(window, "location", {
        value: {
          protocol: "https:",
          hostname: "192.168.1.1",
          host: "192.168.1.1",
          port: "",
        },
        writable: true,
        configurable: true,
      });
      vi.resetModules();
      const { ReplaceIP } = await import("@/utils/helper");
      const result = ReplaceIP("{ip}");
      expect(result).toBe("192.168.1.1");
    });

    it("ReplaceURL uses actual host value for {ip} when host is not empty", async () => {
      Object.defineProperty(window, "location", {
        value: {
          protocol: "https:",
          hostname: "192.168.0.5",
          host: "192.168.0.5",
          port: "",
        },
        writable: true,
        configurable: true,
      });
      vi.resetModules();
      const { ReplaceURL } = await import("@/utils/helper");
      const result = ReplaceURL("{ip}/api");
      expect(result).toBe("192.168.0.5/api");
    });
  });
});
