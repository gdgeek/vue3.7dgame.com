/**
 * API 菜单模块单元测试 (api/menu/model.ts)
 * RouteVO 和 Meta 接口类型验证（结构测试）
 */
import { describe, it, expect } from "vitest";
import type { RouteVO, Meta } from "@/api/menu/model";

describe("RouteVO 接口", () => {
  it("可以创建最简 RouteVO 对象（所有字段可选）", () => {
    const route: RouteVO = {};
    expect(route).toBeDefined();
  });

  it("path 和 name 字段正常赋值", () => {
    const route: RouteVO = {
      path: "/test",
      name: "Test",
    };
    expect(route.path).toBe("/test");
    expect(route.name).toBe("Test");
  });

  it("component 字段可赋值字符串", () => {
    const route: RouteVO = {
      component: "Layout",
    };
    expect(route.component).toBe("Layout");
  });

  it("redirect 字段可赋值", () => {
    const route: RouteVO = {
      redirect: "/test/index",
    };
    expect(route.redirect).toBe("/test/index");
  });

  it("children 字段支持嵌套 RouteVO 数组", () => {
    const route: RouteVO = {
      path: "/parent",
      children: [{ path: "/parent/child", name: "Child" }],
    };
    expect(route.children).toHaveLength(1);
    expect(route.children![0].path).toBe("/parent/child");
  });

  it("meta 字段可以嵌入 Meta 对象", () => {
    const route: RouteVO = {
      path: "/test",
      meta: {
        title: "Test Page",
        hidden: false,
        icon: "el-icon-home",
      },
    };
    expect(route.meta?.title).toBe("Test Page");
    expect(route.meta?.hidden).toBe(false);
  });
});

describe("Meta 接口", () => {
  it("可以创建最简 Meta 对象（所有字段可选）", () => {
    const meta: Meta = {};
    expect(meta).toBeDefined();
  });

  it("alwaysShow 字段赋值", () => {
    const meta: Meta = { alwaysShow: true };
    expect(meta.alwaysShow).toBe(true);
  });

  it("hidden 字段赋值", () => {
    const meta: Meta = { hidden: true };
    expect(meta.hidden).toBe(true);
  });

  it("icon 字段赋值", () => {
    const meta: Meta = { icon: "el-icon-star" };
    expect(meta.icon).toBe("el-icon-star");
  });

  it("keepAlive 字段赋值", () => {
    const meta: Meta = { keepAlive: true };
    expect(meta.keepAlive).toBe(true);
  });

  it("roles 字段赋值为字符串数组", () => {
    const meta: Meta = { roles: ["admin", "editor"] };
    expect(meta.roles).toEqual(["admin", "editor"]);
  });

  it("params 字段赋值", () => {
    const meta: Meta = { params: "some-param" };
    expect(meta.params).toBe("some-param");
  });

  it("title 字段赋值", () => {
    const meta: Meta = { title: "Page Title" };
    expect(meta.title).toBe("Page Title");
  });

  it("所有字段组合赋值", () => {
    const meta: Meta = {
      alwaysShow: false,
      hidden: false,
      icon: "el-icon-setting",
      keepAlive: true,
      roles: ["admin"],
      params: null as any,
      title: "Settings",
    };
    expect(meta.title).toBe("Settings");
    expect(meta.keepAlive).toBe(true);
    expect(meta.roles).toContain("admin");
  });
});
