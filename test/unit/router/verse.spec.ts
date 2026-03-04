/**
 * 路由模块单元测试 - Verse / AI 路由 (verse.ts)
 * 验证 verseRoutes 和 aiRoutes 的结构完整性
 */
import { describe, it, expect } from "vitest";
import { verseRoutes, aiRoutes } from "@/router/modules/verse";

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
      expect((r?.meta as any)?.private).toBe(true);
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

// ============================================================================
// aiRoutes
// ============================================================================
describe("aiRoutes 路由模块", () => {
  describe("根路由基本属性", () => {
    it("path 为 /ai", () => {
      expect(aiRoutes.path).toBe("/ai");
    });

    it("name 为 AI", () => {
      expect(aiRoutes.name).toBe("AI");
    });

    it("component 为 null", () => {
      expect(aiRoutes.component).toBeNull();
    });
  });

  describe("根路由 meta 属性", () => {
    it("meta.title 为 ai.title", () => {
      expect(aiRoutes.meta?.title).toBe("ai.title");
    });

    it("meta.hidden 为 false（菜单中可见）", () => {
      expect(aiRoutes.meta?.hidden).toBe(false);
    });
  });

  describe("子路由列表", () => {
    it("children 包含 2 个子路由", () => {
      expect(aiRoutes.children?.length).toBe(2);
    });

    it("包含 /ai/list 子路由", () => {
      const r = aiRoutes.children!.find((c) => c.path === "/ai/list");
      expect(r).toBeDefined();
      expect(r?.name).toBe("AIList");
      expect(r?.meta?.keepAlive).toBe(true);
    });

    it("包含 /ai/generation 子路由", () => {
      const r = aiRoutes.children!.find((c) => c.path === "/ai/generation");
      expect(r).toBeDefined();
      expect(r?.name).toBe("AIGeneration");
    });

    it("子路由 component 均为函数（懒加载）", () => {
      for (const r of aiRoutes.children!) {
        expect(typeof r.component).toBe("function");
      }
    });
  });
});
