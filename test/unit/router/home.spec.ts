/**
 * 路由模块单元测试 - 首页和设置路由 (home.ts)
 * 验证 homeRoutes、settingsRoutes 的结构完整性
 */
import { describe, it, expect } from "vitest";
import { homeRoutes, settingsRoutes } from "@/router/modules/home";

// ============================================================================
// homeRoutes
// ============================================================================
describe("homeRoutes 路由模块", () => {
  // 根路由基本属性
  describe("根路由基本属性", () => {
    it("path 为 /home", () => {
      expect(homeRoutes.path).toBe("/home");
    });

    it("name 为 Home", () => {
      expect(homeRoutes.name).toBe("Home");
    });

    it("redirect 为 /home/index", () => {
      expect(homeRoutes.redirect).toBe("/home/index");
    });

    it("component 是函数（懒加载 Structure 布局）", () => {
      expect(typeof homeRoutes.component).toBe("function");
    });

    it("component() 返回 Promise", () => {
      const comp = homeRoutes.component as () => Promise<unknown>;
      expect(comp()).toBeInstanceOf(Promise);
    });
  });

  // Meta 属性
  describe("根路由 meta 属性", () => {
    it("meta.title 为 personalCenter.title", () => {
      expect(homeRoutes.meta?.title).toBe("personalCenter.title");
    });

    it("meta.hidden=false（在菜单中显示）", () => {
      expect(homeRoutes.meta?.hidden).toBe(false);
    });

    it("meta.alwaysShow=true", () => {
      expect(homeRoutes.meta?.alwaysShow).toBe(true);
    });

    it("meta.icon 不为空", () => {
      expect(homeRoutes.meta?.icon).toBeTruthy();
    });
  });

  // 子路由列表
  describe("子路由列表", () => {
    it("有 3 条子路由", () => {
      expect(homeRoutes.children).toHaveLength(3);
    });

    it("每条子路由都有 path、name、meta、component 字段", () => {
      homeRoutes.children?.forEach((child) => {
        expect(child.path).toBeTruthy();
        expect(child.name).toBeTruthy();
        expect(child.meta).toBeDefined();
        expect(typeof child.component).toBe("function");
      });
    });

    // HomeIndex
    describe("HomeIndex 子路由", () => {
      const getRoute = () =>
        homeRoutes.children?.find((c) => c.name === "HomeIndex");

      it("存在 HomeIndex", () => {
        expect(getRoute()).toBeDefined();
      });

      it("path 为 /home/index", () => {
        expect(getRoute()?.path).toBe("/home/index");
      });

      it("meta.affix=true（固定标签页）", () => {
        expect(getRoute()?.meta?.affix).toBe(true);
      });

      it("meta.keepAlive=true", () => {
        expect(getRoute()?.meta?.keepAlive).toBe(true);
      });

      it("meta.hidden=true", () => {
        expect(getRoute()?.meta?.hidden).toBe(true);
      });
    });

    // HomeDocument
    describe("HomeDocument 子路由", () => {
      const getRoute = () =>
        homeRoutes.children?.find((c) => c.name === "HomeDocument");

      it("存在 HomeDocument", () => {
        expect(getRoute()).toBeDefined();
      });

      it("path 为 /home/document", () => {
        expect(getRoute()?.path).toBe("/home/document");
      });

      it("meta.hidden=true（隐藏路由）", () => {
        expect(getRoute()?.meta?.hidden).toBe(true);
      });

      it("meta.private=true", () => {
        expect(getRoute()?.meta?.private).toBe(true);
      });
    });

    // HomeCategory
    describe("HomeCategory 子路由", () => {
      const getRoute = () =>
        homeRoutes.children?.find((c) => c.name === "HomeCategory");

      it("存在 HomeCategory", () => {
        expect(getRoute()).toBeDefined();
      });

      it("path 为 /home/category", () => {
        expect(getRoute()?.path).toBe("/home/category");
      });

      it("meta.hidden=true", () => {
        expect(getRoute()?.meta?.hidden).toBe(true);
      });
    });

    // 子路由懒加载验证
    it("所有子路由 component() 均返回 Promise", () => {
      homeRoutes.children?.forEach((child) => {
        const comp = child.component as () => Promise<unknown>;
        expect(comp()).toBeInstanceOf(Promise);
      });
    });
  });
});

// ============================================================================
// settingsRoutes
// ============================================================================
describe("settingsRoutes 路由模块", () => {
  // 根路由基本属性
  describe("根路由基本属性", () => {
    it("path 为 /settings", () => {
      expect(settingsRoutes.path).toBe("/settings");
    });

    it("name 为 Settings", () => {
      expect(settingsRoutes.name).toBe("Settings");
    });

    it("component 是函数（懒加载 Empty 布局）", () => {
      expect(typeof settingsRoutes.component).toBe("function");
    });

    it("component() 返回 Promise", () => {
      const comp = settingsRoutes.component as () => Promise<unknown>;
      expect(comp()).toBeInstanceOf(Promise);
    });
  });

  // Meta 属性
  describe("根路由 meta 属性", () => {
    it("meta.title 为 settings.title", () => {
      expect(settingsRoutes.meta?.title).toBe("settings.title");
    });

    it("meta.hidden=true（不在菜单显示）", () => {
      expect(settingsRoutes.meta?.hidden).toBe(true);
    });

    it("meta.private=true", () => {
      expect(settingsRoutes.meta?.private).toBe(true);
    });
  });

  // 子路由
  describe("子路由列表", () => {
    it("有 3 条子路由", () => {
      expect(settingsRoutes.children).toHaveLength(3);
    });

    // SettingsEdit
    describe("SettingsEdit 子路由", () => {
      const getRoute = () =>
        settingsRoutes.children?.find((c) => c.name === "SettingsEdit");

      it("存在 SettingsEdit", () => {
        expect(getRoute()).toBeDefined();
      });

      it("path 为 /settings/edit", () => {
        expect(getRoute()?.path).toBe("/settings/edit");
      });

      it("meta.title 为 settings.personalData", () => {
        expect(getRoute()?.meta?.title).toBe("settings.personalData");
      });
    });

    // SettingsEmail
    describe("SettingsEmail 子路由", () => {
      const getRoute = () =>
        settingsRoutes.children?.find((c) => c.name === "SettingsEmail");

      it("存在 SettingsEmail", () => {
        expect(getRoute()).toBeDefined();
      });

      it("path 为 /settings/email", () => {
        expect(getRoute()?.path).toBe("/settings/email");
      });
    });

    // SettingsPeople
    describe("SettingsPeople 子路由", () => {
      const getRoute = () =>
        settingsRoutes.children?.find((c) => c.name === "SettingsPeople");

      it("存在 SettingsPeople", () => {
        expect(getRoute()).toBeDefined();
      });

      it("path 为 /settings/people", () => {
        expect(getRoute()?.path).toBe("/settings/people");
      });
    });

    it("所有子路由均为私有路由（meta.private=true）", () => {
      settingsRoutes.children?.forEach((child) => {
        expect(child.meta?.private).toBe(true);
      });
    });

    it("所有子路由均隐藏（meta.hidden=true）", () => {
      settingsRoutes.children?.forEach((child) => {
        expect(child.meta?.hidden).toBe(true);
      });
    });

    it("所有子路由 component 是懒加载函数", () => {
      settingsRoutes.children?.forEach((child) => {
        expect(typeof child.component).toBe("function");
        const comp = child.component as () => Promise<unknown>;
        expect(comp()).toBeInstanceOf(Promise);
      });
    });
  });
});
