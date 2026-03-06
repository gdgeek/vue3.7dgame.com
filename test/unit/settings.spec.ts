/**
 * Unit tests for src/settings.ts
 *
 * 覆盖：
 *   - defaultSettings 包含预期的默认字段值
 *   - 当 matchMedia.matches === false 时，theme 为 "light"
 *   - 当 matchMedia.matches === true  时，theme 为 "dark"（覆盖 branch）
 *   - pkg 信息来自 __APP_INFO__（vitest.config 中已 define）
 */
import { describe, it, expect, vi, afterEach } from "vitest";

// ── 工具：临时替换 matchMedia mock ────────────────────────────────────────────
function setMatchMediaMatches(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

describe("defaultSettings (src/settings.ts)", () => {
  afterEach(() => {
    // 恢复 setup.ts 中的默认 mock（matches: false）
    setMatchMediaMatches(false);
    vi.resetModules();
  });

  // ── 字段结构 ────────────────────────────────────────────────────────────

  describe("字段结构与默认值", () => {
    it("title 来自 __APP_INFO__.pkg.name", async () => {
      const { default: s } = await import("@/settings");
      expect(s.title).toBe("test-app");
    });

    it("version 来自 __APP_INFO__.pkg.version", async () => {
      const { default: s } = await import("@/settings");
      expect(s.version).toBe("0.0.0-test");
    });

    it("showSettings 默认为 true", async () => {
      const { default: s } = await import("@/settings");
      expect(s.showSettings).toBe(true);
    });

    it("tagsView 默认为 false", async () => {
      const { default: s } = await import("@/settings");
      expect(s.tagsView).toBe(false);
    });

    it("fixedHeader 默认为 true", async () => {
      const { default: s } = await import("@/settings");
      expect(s.fixedHeader).toBe(true);
    });

    it("sidebarLogo 默认为 true", async () => {
      const { default: s } = await import("@/settings");
      expect(s.sidebarLogo).toBe(true);
    });

    it("layout 默认为 'left'", async () => {
      const { default: s } = await import("@/settings");
      expect(s.layout).toBe("left");
    });

    it("size 默认为 'default'", async () => {
      const { default: s } = await import("@/settings");
      expect(s.size).toBe("default");
    });

    it("language 默认为 'zh-CN'", async () => {
      const { default: s } = await import("@/settings");
      expect(s.language).toBe("zh-CN");
    });

    it("themeColor 默认为 #409EFF", async () => {
      const { default: s } = await import("@/settings");
      expect(s.themeColor).toBe("#409EFF");
    });

    it("watermarkEnabled 默认为 false", async () => {
      const { default: s } = await import("@/settings");
      expect(s.watermarkEnabled).toBe(false);
    });
  });

  // ── 主题 branch（dark / light）────────────────────────────────────────────

  describe("theme 基于 prefers-color-scheme", () => {
    it("当 matchMedia.matches === false 时 theme 为 'light'", async () => {
      setMatchMediaMatches(false);
      vi.resetModules();
      const { default: s } = await import("@/settings");
      expect(s.theme).toBe("light");
    });

    it("当 matchMedia.matches === true 时 theme 为 'dark'", async () => {
      setMatchMediaMatches(true);
      vi.resetModules();
      const { default: s } = await import("@/settings");
      expect(s.theme).toBe("dark");
    });
  });
});
