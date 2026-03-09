/**
 * 路由模块单元测试 - Verse 路由 (verse.ts)
 * 验证 verseRoutes 的结构完整性
 */
import { describe, it, expect } from "vitest";
import { verseRoutes } from "@/router/modules/verse";

// ============================================================================
// verseRoutes
// ============================================================================
describe("verseRoutes 路由模块", () => {
  describe("根路由基本属性", () => {
    it("path 为 /verse", () => {
      expect(verseRoutes.path).toBe("/verse");
    });

    it("name 为 Verse", () => {
      expect(verseRoutes.name).toBe("Verse");
    });

    it("redirect 为 /verse/index", () => {
      expect(verseRoutes.redirect).toBe("/verse/index");
    });

    it("component 为 null", () => {
      expect(verseRoutes.component).toBeNull();
    });
  });

  describe("根路由 meta 属性", () => {
    it("meta.title 为 project.title", () => {
      expect(verseRoutes.meta?.title).toBe("project.title");
    });

    it("meta.hidden 为 true", () => {
      expect(verseRoutes.meta?.hidden).toBe(true);
    });

    it("meta.alwaysShow 为 false", () => {
      expect(verseRoutes.meta?.alwaysShow).toBe(false);
    });
  });

  describe("子路由列表", () => {
    it("children 非空", () => {
      expect(Array.isArray(verseRoutes.children)).toBe(true);
      expect(verseRoutes.children!.length).toBeGreaterThan(0);
    });

    it("包含 /verse/index 子路由", () => {
      const r = verseRoutes.children!.find((c) => c.path === "/verse/index");
      expect(r).toBeDefined();
      expect(r?.name).toBe("VerseIndex");
    });

    it("包含 /verse/public 子路由", () => {
      const r = verseRoutes.children!.find((c) => c.path === "/verse/public");
      expect(r).toBeDefined();
      expect(r?.name).toBe("VersePublic");
    });

    it("包含 /verse/view 子路由（private）", () => {
      const r = verseRoutes.children!.find((c) => c.path === "/verse/view");
      expect(r).toBeDefined();
      expect((r?.meta as Record<string, unknown>)?.private).toBe(true);
    });

    it("包含 /verse/script 子路由（keepAlive）", () => {
      const r = verseRoutes.children!.find((c) => c.path === "/verse/script");
      expect(r).toBeDefined();
      expect(r?.meta?.keepAlive).toBe(true);
    });

    it("包含 /verse/scene 子路由（keepAlive）", () => {
      const r = verseRoutes.children!.find((c) => c.path === "/verse/scene");
      expect(r).toBeDefined();
      expect(r?.meta?.keepAlive).toBe(true);
    });

    it("所有子路由 component 为函数（懒加载）", () => {
      for (const r of verseRoutes.children!) {
        expect(typeof r.component).toBe("function");
      }
    });
  });
});
