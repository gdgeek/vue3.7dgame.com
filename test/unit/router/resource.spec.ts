/**
 * 路由模块单元测试 - 资源管理路由 (resource.ts)
 * 验证 resourceRoutes 的结构完整性
 */
import { describe, it, expect } from "vitest";
import { resourceRoutes } from "@/router/modules/resource";

describe("resourceRoutes 路由模块", () => {
  describe("根路由基本属性", () => {
    it("path 为 /resource", () => {
      expect(resourceRoutes.path).toBe("/resource");
    });

    it("name 为 /resource", () => {
      expect(resourceRoutes.name).toBe("/resource");
    });

    it("component 为 null", () => {
      expect(resourceRoutes.component).toBeNull();
    });
  });

  describe("根路由 meta 属性", () => {
    it("meta.title 为 resourceManagement.title", () => {
      expect(resourceRoutes.meta?.title).toBe("resourceManagement.title");
    });

    it("meta.hidden 为 true", () => {
      expect(resourceRoutes.meta?.hidden).toBe(true);
    });

    it("meta.alwaysShow 为 false", () => {
      expect(resourceRoutes.meta?.alwaysShow).toBe(false);
    });
  });

  describe("子路由列表", () => {
    it("children 非空", () => {
      expect(Array.isArray(resourceRoutes.children)).toBe(true);
      expect(resourceRoutes.children!.length).toBeGreaterThan(0);
    });

    it("包含 /resource/voxel 嵌套路由", () => {
      const r = resourceRoutes.children!.find(
        (c) => c.path === "/resource/voxel"
      );
      expect(r).toBeDefined();
      expect(r?.name).toBe("Voxel");
      expect(r?.redirect).toBe("/resource/voxel/index");
    });

    it("Voxel 子路由包含 voxel/index 和 voxel/view", () => {
      const voxel = resourceRoutes.children!.find(
        (c) => c.path === "/resource/voxel"
      );
      const paths = voxel?.children?.map((c) => c.path);
      expect(paths).toContain("/resource/voxel/index");
      expect(paths).toContain("/resource/voxel/view");
    });

    it("包含 /resource/polygen/index 子路由", () => {
      const r = resourceRoutes.children!.find(
        (c) => c.path === "/resource/polygen/index"
      );
      expect(r).toBeDefined();
      expect(r?.name).toBe("PolygenIndex");
    });

    it("包含 /resource/picture/index 子路由", () => {
      const r = resourceRoutes.children!.find(
        (c) => c.path === "/resource/picture/index"
      );
      expect(r).toBeDefined();
    });

    it("包含 /resource/video/index 子路由", () => {
      const r = resourceRoutes.children!.find(
        (c) => c.path === "/resource/video/index"
      );
      expect(r).toBeDefined();
      expect(r?.name).toBe("VideoIndex");
    });

    it("包含 /resource/audio/index 子路由", () => {
      const r = resourceRoutes.children!.find(
        (c) => c.path === "/resource/audio/index"
      );
      expect(r).toBeDefined();
    });

    it("包含 /resource/particle 嵌套路由", () => {
      const r = resourceRoutes.children!.find(
        (c) => c.path === "/resource/particle"
      );
      expect(r).toBeDefined();
      expect(r?.name).toBe("Particle");
      expect(r?.redirect).toBe("/resource/particle/index");
    });

    it("Particle 子路由包含 particle/index 和 particle/view", () => {
      const particle = resourceRoutes.children!.find(
        (c) => c.path === "/resource/particle"
      );
      const paths = particle?.children?.map((c) => c.path);
      expect(paths).toContain("/resource/particle/index");
      expect(paths).toContain("/resource/particle/view");
    });

    it("private 路由 meta.private 为 true", () => {
      const voxelView = resourceRoutes
        .children!.find((c) => c.path === "/resource/voxel")
        ?.children?.find((c) => c.path === "/resource/voxel/view");
      expect((voxelView?.meta as any)?.private).toBe(true);
    });
  });
});
