/**
 * 路由模块单元测试 - 校园管理路由 (campus.ts)
 * 验证路由配置结构的完整性与正确性
 */
import { describe, it, expect } from "vitest";
import { campusRoutes } from "@/router/modules/campus";

describe("campusRoutes 路由模块", () => {
  // -------------------------------------------------------------------------
  // 根路由基本属性
  // -------------------------------------------------------------------------
  describe("根路由基本属性", () => {
    it("根路由 path 为 /campus", () => {
      expect(campusRoutes.path).toBe("/campus");
    });

    it("根路由 name 为 Campus", () => {
      expect(campusRoutes.name).toBe("Campus");
    });

    it("根路由有 redirect 到 /campus/school", () => {
      expect(campusRoutes.redirect).toBe("/campus/school");
    });

    it("根路由 component 是函数（懒加载）", () => {
      expect(typeof campusRoutes.component).toBe("function");
    });
  });

  // -------------------------------------------------------------------------
  // Meta 属性验证
  // -------------------------------------------------------------------------
  describe("根路由 meta 属性", () => {
    it("meta.title 为 campus.title", () => {
      expect(campusRoutes.meta?.title).toBe("campus.title");
    });

    it("meta.hidden 为 false（默认显示）", () => {
      expect(campusRoutes.meta?.hidden).toBe(false);
    });

    it("meta.alwaysShow 为 true", () => {
      expect(campusRoutes.meta?.alwaysShow).toBe(true);
    });

    it("meta.icon 不为空", () => {
      expect(campusRoutes.meta?.icon).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 子路由结构
  // -------------------------------------------------------------------------
  describe("子路由列表", () => {
    it("children 数组包含 5 条子路由", () => {
      expect(campusRoutes.children).toHaveLength(5);
    });

    it("每条子路由都有 path、name、meta 和 component 字段", () => {
      campusRoutes.children?.forEach((child) => {
        expect(child.path).toBeTruthy();
        expect(child.name).toBeTruthy();
        expect(child.meta).toBeDefined();
        expect(typeof child.component).toBe("function");
      });
    });

    it("每条子路由的 component 是函数（懒加载）", () => {
      campusRoutes.children?.forEach((child) => {
        expect(typeof child.component).toBe("function");
      });
    });

    // 具体子路由路径与名称
    const expectedChildren = [
      { path: "/campus/school", name: "CampusSchool" },
      { path: "/campus/teacher", name: "CampusTeacher" },
      { path: "/campus/student", name: "CampusStudent" },
      { path: "/campus/group", name: "CampusGroup" },
      { path: "/campus/class", name: "CampusClass" },
    ];

    expectedChildren.forEach(({ path, name }) => {
      it(`子路由 ${name}: path="${path}"`, () => {
        const route = campusRoutes.children?.find((c) => c.name === name);
        expect(route).toBeDefined();
        expect(route?.path).toBe(path);
      });
    });
  });

  // -------------------------------------------------------------------------
  // 特定子路由 meta 属性
  // -------------------------------------------------------------------------
  describe("子路由 meta.hidden 属性", () => {
    it("CampusSchool: hidden=false（在菜单显示）", () => {
      const route = campusRoutes.children?.find(
        (c) => c.name === "CampusSchool"
      );
      expect(route?.meta?.hidden).toBe(false);
    });

    it("CampusTeacher: hidden=false（在菜单显示）", () => {
      const route = campusRoutes.children?.find(
        (c) => c.name === "CampusTeacher"
      );
      expect(route?.meta?.hidden).toBe(false);
    });

    it("CampusStudent: hidden=false（在菜单显示）", () => {
      const route = campusRoutes.children?.find(
        (c) => c.name === "CampusStudent"
      );
      expect(route?.meta?.hidden).toBe(false);
    });

    it("CampusGroup: hidden=true（隐藏路由）", () => {
      const route = campusRoutes.children?.find(
        (c) => c.name === "CampusGroup"
      );
      expect(route?.meta?.hidden).toBe(true);
    });

    it("CampusClass: hidden=true（隐藏路由）", () => {
      const route = campusRoutes.children?.find(
        (c) => c.name === "CampusClass"
      );
      expect(route?.meta?.hidden).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 懒加载组件函数返回 Promise
  // -------------------------------------------------------------------------
  describe("懒加载组件函数", () => {
    it("根路由 component() 返回 Promise", () => {
      const comp = campusRoutes.component as () => Promise<unknown>;
      const result = comp();
      expect(result).toBeInstanceOf(Promise);
    });

    it("每个子路由 component() 返回 Promise", () => {
      campusRoutes.children?.forEach((child) => {
        const comp = child.component as () => Promise<unknown>;
        const result = comp();
        expect(result).toBeInstanceOf(Promise);
      });
    });
  });
});
