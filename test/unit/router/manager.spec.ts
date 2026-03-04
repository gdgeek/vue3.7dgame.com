/**
 * 路由模块单元测试 - 管理后台路由 (manager.ts)
 * 验证 managerRoutes 和 gameRoutes 的结构完整性
 */
import { describe, it, expect } from "vitest";
import { managerRoutes, gameRoutes } from "@/router/modules/manager";

// ============================================================================
// managerRoutes
// ============================================================================
describe("managerRoutes 路由模块", () => {
  describe("根路由基本属性", () => {
    it("path 为 /manager", () => {
      expect(managerRoutes.path).toBe("/manager");
    });

    it("name 为 Manager", () => {
      expect(managerRoutes.name).toBe("Manager");
    });

    it("component 为 null", () => {
      expect(managerRoutes.component).toBeNull();
    });
  });

  describe("根路由 meta 属性", () => {
    it("meta.title 为 manager.title", () => {
      expect(managerRoutes.meta?.title).toBe("manager.title");
    });

    it("meta.hidden 为 true", () => {
      expect(managerRoutes.meta?.hidden).toBe(true);
    });

    it("meta.alwaysShow 为 false", () => {
      expect(managerRoutes.meta?.alwaysShow).toBe(false);
    });

    it("meta.icon 不为空", () => {
      expect(managerRoutes.meta?.icon).toBeTruthy();
    });
  });

  describe("子路由列表", () => {
    it("children 是非空数组", () => {
      expect(Array.isArray(managerRoutes.children)).toBe(true);
      expect(managerRoutes.children!.length).toBeGreaterThan(0);
    });

    it("包含 /manager/user 子路由", () => {
      const route = managerRoutes.children!.find(
        (r) => r.path === "/manager/user"
      );
      expect(route).toBeDefined();
      expect(route?.name).toBe("ManagerUser");
    });

    it("包含 /phototype/list 子路由", () => {
      const route = managerRoutes.children!.find(
        (r) => r.path === "/phototype/list"
      );
      expect(route).toBeDefined();
      expect(route?.name).toBe("PhototypeList");
    });

    it("包含 /phototype/edit 子路由（private）", () => {
      const route = managerRoutes.children!.find(
        (r) => r.path === "/phototype/edit"
      );
      expect(route).toBeDefined();
      expect(route?.name).toBe("PhototypeEdit");
      expect((route?.meta as any)?.private).toBe(true);
    });

    it("包含 /test/vue-form-demo 子路由", () => {
      const route = managerRoutes.children!.find(
        (r) => r.path === "/test/vue-form-demo"
      );
      expect(route).toBeDefined();
      expect(route?.name).toBe("VueFormDemo");
    });

    it("子路由 component 均为函数（懒加载）", () => {
      for (const r of managerRoutes.children!) {
        expect(typeof r.component).toBe("function");
      }
    });
  });
});

// ============================================================================
// gameRoutes
// ============================================================================
describe("gameRoutes 路由模块", () => {
  describe("根路由基本属性", () => {
    it("path 为 /game", () => {
      expect(gameRoutes.path).toBe("/game");
    });

    it("name 为 Game", () => {
      expect(gameRoutes.name).toBe("Game");
    });

    it("component 为 null", () => {
      expect(gameRoutes.component).toBeNull();
    });
  });

  describe("根路由 meta 属性", () => {
    it("meta.title 为 game.title", () => {
      expect(gameRoutes.meta?.title).toBe("game.title");
    });

    it("meta.hidden 为 true", () => {
      expect(gameRoutes.meta?.hidden).toBe(true);
    });

    it("meta.private 为 true", () => {
      expect((gameRoutes.meta as any)?.private).toBe(true);
    });
  });

  describe("子路由列表", () => {
    it("children 包含 2 个子路由", () => {
      expect(gameRoutes.children?.length).toBe(2);
    });

    it("包含 /game/index 子路由", () => {
      const route = gameRoutes.children!.find((r) => r.path === "/game/index");
      expect(route).toBeDefined();
      expect(route?.name).toBe("GameIndex");
    });

    it("包含 /game/map 子路由", () => {
      const route = gameRoutes.children!.find((r) => r.path === "/game/map");
      expect(route).toBeDefined();
      expect(route?.name).toBe("GameMap");
    });

    it("子路由 component 均为函数（懒加载）", () => {
      for (const r of gameRoutes.children!) {
        expect(typeof r.component).toBe("function");
      }
    });
  });
});
