/**
 * 路由模块单元测试 - 公共路由 (public.ts)
 * 验证 Web 首页、SSO、隐私政策等公共路由的结构完整性
 */
import { describe, it, expect } from "vitest";
import { publicRoutes } from "@/router/modules/public";

describe("publicRoutes 路由模块", () => {
  // -------------------------------------------------------------------------
  // 基本结构
  // -------------------------------------------------------------------------
  it("publicRoutes 是一个数组", () => {
    expect(Array.isArray(publicRoutes)).toBe(true);
  });

  it("publicRoutes 包含 7 个顶级路由配置", () => {
    expect(publicRoutes).toHaveLength(7);
  });

  // -------------------------------------------------------------------------
  // /web 路由组
  // -------------------------------------------------------------------------
  describe("/web 路由组", () => {
    const webRoute = () => publicRoutes.find((r) => r.path === "/web");

    it("存在 /web 路由", () => {
      expect(webRoute()).toBeDefined();
    });

    it("/web 路由的 redirect 为 /web/index", () => {
      expect(webRoute()?.redirect).toBe("/web/index");
    });

    it("/web 路由 component 是函数（懒加载）", () => {
      expect(typeof webRoute()?.component).toBe("function");
    });

    it("/web 路由 meta.hidden=true", () => {
      expect(webRoute()?.meta?.hidden).toBe(true);
    });

    it("/web 路由有 5 个子路由", () => {
      expect(webRoute()?.children).toHaveLength(5);
    });

    const webChildren = [
      { path: "/web/index", name: "WebIndex" },
      { path: "/web/bbs", name: "WebBBS" },
      { path: "/web/category", name: "WebCategory" },
      { path: "/web/buy", name: "WebBuy" },
      { path: "/web/document", name: "WebDocument" },
    ];

    webChildren.forEach(({ path, name }) => {
      it(`/web 子路由: ${name} path="${path}"`, () => {
        const child = webRoute()?.children?.find((c) => c.name === name);
        expect(child).toBeDefined();
        expect(child?.path).toBe(path);
        expect(typeof child?.component).toBe("function");
      });
    });
  });

  // -------------------------------------------------------------------------
  // /site 路由组
  // -------------------------------------------------------------------------
  describe("/site 路由组", () => {
    const siteRoute = () => publicRoutes.find((r) => r.path === "/site");

    it("存在 /site 路由", () => {
      expect(siteRoute()).toBeDefined();
    });

    it("/site 路由 meta.hidden=true", () => {
      expect(siteRoute()?.meta?.hidden).toBe(true);
    });

    it("/site 有 3 个子路由", () => {
      expect(siteRoute()?.children).toHaveLength(3);
    });

    it("/site/login 子路由 redirect 到 /web/index", () => {
      const loginRoute = siteRoute()?.children?.find(
        (c) => c.path === "/site/login"
      );
      expect(loginRoute).toBeDefined();
      expect(loginRoute?.redirect).toBe("/web/index");
    });

    it("/site/logout 子路由 component 是函数", () => {
      const logoutRoute = siteRoute()?.children?.find(
        (c) => c.path === "/site/logout"
      );
      expect(logoutRoute).toBeDefined();
      expect(typeof logoutRoute?.component).toBe("function");
    });

    it("/site/register 子路由 component 是函数", () => {
      const registerRoute = siteRoute()?.children?.find(
        (c) => c.path === "/site/register"
      );
      expect(registerRoute).toBeDefined();
      expect(typeof registerRoute?.component).toBe("function");
    });
  });

  // -------------------------------------------------------------------------
  // /sso 路由
  // -------------------------------------------------------------------------
  describe("/sso 路由", () => {
    const ssoRoute = () => publicRoutes.find((r) => r.path === "/sso");

    it("存在 /sso 路由", () => {
      expect(ssoRoute()).toBeDefined();
    });

    it("/sso component 是函数（懒加载）", () => {
      expect(typeof ssoRoute()?.component).toBe("function");
    });

    it("/sso meta.hidden=true", () => {
      expect(ssoRoute()?.meta?.hidden).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // /login 重定向路由
  // -------------------------------------------------------------------------
  describe("/login 重定向路由", () => {
    const loginRoute = () => publicRoutes.find((r) => r.path === "/login");

    it("存在 /login 路由", () => {
      expect(loginRoute()).toBeDefined();
    });

    it("/login redirect 到 /web/index", () => {
      expect(loginRoute()?.redirect).toBe("/web/index");
    });
  });

  // -------------------------------------------------------------------------
  // /privacy-policy 路由
  // -------------------------------------------------------------------------
  describe("/privacy-policy 路由", () => {
    const ppRoute = () =>
      publicRoutes.find((r) => r.path === "/privacy-policy");

    it("存在 /privacy-policy 路由", () => {
      expect(ppRoute()).toBeDefined();
    });

    it("/privacy-policy name 为 PrivacyPolicy", () => {
      expect(ppRoute()?.name).toBe("PrivacyPolicy");
    });

    it("/privacy-policy component 是函数", () => {
      expect(typeof ppRoute()?.component).toBe("function");
    });

    it("/privacy-policy meta.hidden=true", () => {
      expect(ppRoute()?.meta?.hidden).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // /terms 和 /privacy 重定向
  // -------------------------------------------------------------------------
  describe("隐私相关重定向路由", () => {
    it("/terms 重定向到 /privacy-policy?tab=terms", () => {
      const route = publicRoutes.find((r) => r.path === "/terms");
      expect(route?.redirect).toBe("/privacy-policy?tab=terms");
    });

    it("/privacy 重定向到 /privacy-policy?tab=privacy", () => {
      const route = publicRoutes.find((r) => r.path === "/privacy");
      expect(route?.redirect).toBe("/privacy-policy?tab=privacy");
    });
  });

  // -------------------------------------------------------------------------
  // 懒加载验证
  // -------------------------------------------------------------------------
  describe("懒加载组件", () => {
    it("/web component() 返回 Promise", () => {
      const webRoute = publicRoutes.find((r) => r.path === "/web");
      const comp = webRoute?.component as () => Promise<unknown>;
      expect(comp()).toBeInstanceOf(Promise);
    });

    it("/sso component() 返回 Promise", () => {
      const ssoRoute = publicRoutes.find((r) => r.path === "/sso");
      const comp = ssoRoute?.component as () => Promise<unknown>;
      expect(comp()).toBeInstanceOf(Promise);
    });
  });
});
