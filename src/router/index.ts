/**
 * 路由配置主入口
 * 路由定义已拆分到 modules 目录下，按功能模块组织
 */
import type { App } from "vue";
import { ref } from "vue";
import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import { Meta, RouteVO } from "@/api/menu/model";

// 布局组件
export const Layout = () => import("@/layout/index.vue");

// 导入路由模块
import { publicRoutes } from "./modules/public";
import { homeRoutes, settingsRoutes } from "./modules/home";
import { resourceRoutes } from "./modules/resource";
import { metaRoutes } from "./modules/meta";
import { verseRoutes } from "./modules/verse";
import { managerRoutes, gameRoutes } from "./modules/manager";
import { pluginRoutes, pluginDebugRoute } from "./modules/plugin";

// 静态路由
const routes: RouteRecordRaw[] = [
  // 重定向路由
  {
    path: "/redirect",
    component: Layout,
    meta: { hidden: true, private: true },
    children: [
      {
        path: "/redirect/:path(.*)",
        component: () => import("@/views/redirect/index.vue"),
      },
    ],
  },

  // 公共路由（Web 首页、登录、SSO 等）
  ...publicRoutes,

  // 主布局下的路由
  {
    path: "/",
    name: "/",
    meta: { hidden: true },
    redirect: "/home",
    component: Layout,
    children: [
      // 首页
      homeRoutes,
      // 设置
      settingsRoutes,
      // 资源管理
      resourceRoutes,
      // Meta 相关
      ...metaRoutes,
      // Verse/项目相关
      verseRoutes,
      // 管理后台
      managerRoutes,
      // 游戏
      gameRoutes,
      // 插件系统
      pluginRoutes,
      // 插件调试页面
      pluginDebugRoute,

      // 错误页面
      {
        path: "/401",
        component: () => import("@/views/error-page/401.vue"),
        meta: { hidden: true, private: true },
      },
      {
        path: "/404",
        component: () => import("@/views/error-page/404.vue"),
        meta: { hidden: true, private: true },
      },
    ],
  },
];

export const constantRoutes: RouteRecordRaw[] = routes;

/**
 * 创建路由
 */
const router = createRouter({
  history: createWebHistory(),
  routes: constantRoutes,
  // 刷新时，滚动条位置还原
  scrollBehavior: () => ({ left: 0, top: 0 }),
});

// 全局注册 router
export function setupRouter(app: App<Element>) {
  app.use(router);
}

const getComponentName = (
  component: RouteRecordRaw["component"]
): string | undefined => {
  if (!component) {
    return undefined;
  }
  if (typeof component === "function") {
    return component.name || undefined;
  }
  if (typeof component === "object" && "name" in component) {
    return (component as { name?: string }).name;
  }
  return undefined;
};

// 将路由转换为 RouteVO 格式的函数
const convertRoutes = (routes: RouteRecordRaw[], isRoot = false): RouteVO[] => {
  return routes.map((route) => {
    const { path, component, redirect, name, meta, children } = route;
    const formattedPath = isRoot ? `/${path}` : path;

    return {
      path: formattedPath,
      component: getComponentName(component),
      redirect: (redirect as string) || undefined,
      name: typeof name === "string" ? name : undefined,
      meta: meta as Meta,
      children: children ? convertRoutes(children) : [],
    };
  });
};

export const routerData = ref<RouteVO[]>([]);

// 初始化路由
const initRoutes = async () => {
  const mainRoute = constantRoutes.find((route) => route.path === "/");
  if (mainRoute) {
    routerData.value = convertRoutes(mainRoute.children || [], true);
  } else {
    routerData.value = [];
  }
};

import type { AnyAbility } from "@casl/ability";
import { AbilityRouter } from "@/utils/ability";

const check = (route: RouteRecordRaw[], ability: AnyAbility) => {
  const can = ability.can.bind(ability);
  route.forEach((route) => {
    if (route.meta) {
      route.meta.hidden = !can("open", new AbilityRouter(route.path));
    }
    if (route.children) {
      check(route.children, ability);
    }
  });
};

const cloneRouteRecord = (route: RouteRecordRaw): RouteRecordRaw => {
  const cloned: RouteRecordRaw = {
    ...route,
    meta: route.meta
      ? { ...(route.meta as Record<string, unknown>) }
      : route.meta,
  };

  if (route.children) {
    cloned.children = route.children.map((child) => cloneRouteRecord(child));
  }

  return cloned;
};

const cloneRoutes = (source: RouteRecordRaw[]) =>
  source.map((route) => cloneRouteRecord(route));

export const UpdateRoutes = async (ability: AnyAbility) => {
  const nextRoutes = cloneRoutes(routes);
  constantRoutes.splice(0, constantRoutes.length, ...nextRoutes);
  check(constantRoutes, ability);
  initRoutes();
};

export const useRouter = () => {
  initRoutes();
  return router;
};
