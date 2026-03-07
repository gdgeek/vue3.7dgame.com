/**
 * 路由模块单元测试 - Meta 相关路由 (meta.ts)
 * 验证 Meta 列表、编辑、脚本编辑器、场景编辑器等路由的结构完整性
 */
import { describe, it, expect } from "vitest";
import { metaRoutes } from "@/router/modules/meta";

describe("metaRoutes 路由模块", () => {
  // -------------------------------------------------------------------------
  // 基本结构
  // -------------------------------------------------------------------------
  it("metaRoutes 是一个数组", () => {
    expect(Array.isArray(metaRoutes)).toBe(true);
  });

  it("metaRoutes 包含 5 条路由", () => {
    expect(metaRoutes).toHaveLength(5);
  });

  it("每条路由都有 path 和 component 字段", () => {
    metaRoutes.forEach((route) => {
      expect(route.path).toBeTruthy();
      expect(typeof route.component).toBe("function");
    });
  });

  it("每条路由 component 是懒加载函数", () => {
    metaRoutes.forEach((route) => {
      const comp = route.component as () => Promise<unknown>;
      expect(comp()).toBeInstanceOf(Promise);
    });
  });

  // -------------------------------------------------------------------------
  // 具体路由：MetaList
  // -------------------------------------------------------------------------
  describe("MetaList 路由", () => {
    const getRoute = () => metaRoutes.find((r) => r.name === "MetaList");

    it("存在 MetaList 路由", () => {
      expect(getRoute()).toBeDefined();
    });

    it("path 为 /meta/list", () => {
      expect(getRoute()?.path).toBe("/meta/list");
    });

    it("meta.title 为 meta.title", () => {
      expect(getRoute()?.meta?.title).toBe("meta.title");
    });

    it("meta.hidden=false（菜单显示）", () => {
      expect(getRoute()?.meta?.hidden).toBe(false);
    });

    it("meta.keepAlive=true", () => {
      expect(getRoute()?.meta?.keepAlive).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 具体路由：Role（Prefabs）
  // -------------------------------------------------------------------------
  describe("Role（Prefabs）路由", () => {
    const getRoute = () => metaRoutes.find((r) => r.name === "Role");

    it("存在 Role 路由", () => {
      expect(getRoute()).toBeDefined();
    });

    it("path 为 /meta/prefabs", () => {
      expect(getRoute()?.path).toBe("/meta/prefabs");
    });

    it("meta.hidden=true（隐藏路由）", () => {
      expect(getRoute()?.meta?.hidden).toBe(true);
    });

    it("meta.private=true", () => {
      expect(getRoute()?.meta?.private).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 具体路由：PrefabEdit
  // -------------------------------------------------------------------------
  describe("PrefabEdit 路由", () => {
    const getRoute = () => metaRoutes.find((r) => r.name === "PrefabEdit");

    it("存在 PrefabEdit 路由", () => {
      expect(getRoute()).toBeDefined();
    });

    it("path 为 /meta/prefab-edit", () => {
      expect(getRoute()?.path).toBe("/meta/prefab-edit");
    });

    it("meta.hidden=true", () => {
      expect(getRoute()?.meta?.hidden).toBe(true);
    });

    it("meta.private=true", () => {
      expect(getRoute()?.meta?.private).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 具体路由：MetaEdit
  // -------------------------------------------------------------------------

    it("MetaEdit 路由已移除，共有 5 条 meta 路由", () => {
      expect(metaRoutes.length).toBe(5);
    });
  });

  // -------------------------------------------------------------------------
  // 具体路由：MetaScript
  // -------------------------------------------------------------------------
  describe("MetaScript 路由", () => {
    const getRoute = () => metaRoutes.find((r) => r.name === "MetaScript");

    it("存在 MetaScript 路由", () => {
      expect(getRoute()).toBeDefined();
    });

    it("path 为 /meta/script", () => {
      expect(getRoute()?.path).toBe("/meta/script");
    });

    it("meta.keepAlive=true", () => {
      expect(getRoute()?.meta?.keepAlive).toBe(true);
    });

    it("meta.hidden=true（编辑器页面不在菜单显示）", () => {
      expect(getRoute()?.meta?.hidden).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 具体路由：MetaSceneEditor
  // -------------------------------------------------------------------------
  describe("MetaSceneEditor 路由", () => {
    const getRoute = () =>
      metaRoutes.find((r) => r.name === "MetaSceneEditor");

    it("存在 MetaSceneEditor 路由", () => {
      expect(getRoute()).toBeDefined();
    });

    it("path 为 /meta/scene", () => {
      expect(getRoute()?.path).toBe("/meta/scene");
    });

    it("meta.keepAlive=true", () => {
      expect(getRoute()?.meta?.keepAlive).toBe(true);
    });

    it("meta.hidden=true", () => {
      expect(getRoute()?.meta?.hidden).toBe(true);
    });

    it("meta.private=true", () => {
      expect(getRoute()?.meta?.private).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 路由名称唯一性
  // -------------------------------------------------------------------------
  describe("路由名称唯一性", () => {
    it("所有路由 name 均唯一", () => {
      const names = metaRoutes.map((r) => r.name).filter(Boolean);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it("所有路由 path 均唯一", () => {
      const paths = metaRoutes.map((r) => r.path);
      const uniquePaths = new Set(paths);
      expect(uniquePaths.size).toBe(paths.length);
    });
  });
});
