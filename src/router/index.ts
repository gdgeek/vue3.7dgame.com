/**
 * 路由配置主入口
 * 路由定义已拆分到 modules 目录下，按功能模块组织
 */
import type { App } from "vue";
import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import { Meta, RouteVO } from "@/api/menu/model";

// 布局组件
export const Layout = () => import("@/layout/index.vue");

// 导入路由模块
import { publicRoutes } from "./modules/public";
import { homeRoutes, settingsRoutes } from "./modules/home";
import { resourceRoutes } from "./modules/resource";
import { metaRoutes } from "./modules/meta";
import { verseRoutes, aiRoutes } from "./modules/verse";
import { campusRoutes } from "./modules/campus";
import { managerRoutes, gameRoutes } from "./modules/manager";

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
      // AI 相关
      aiRoutes,
      // Verse/项目相关
      verseRoutes,
      // 校园管理
      campusRoutes,
      // 管理后台
      managerRoutes,
      // 游戏
      gameRoutes,

      // 登出
      {
        path: "/site/logout",
        name: "LogOut",
        component: null,
        redirect: "/logout",
        meta: {
          title: "logout.title",
          icon: "el-icon-back",
          hidden: false,
          private: false,
          alwaysShow: false,
          params: null,
        },
        children: [],
      },

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

export let constantRoutes: RouteRecordRaw[] = routes;

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

// 将路由转换为 RouteVO 格式的函数
const convertRoutes = (routes: RouteRecordRaw[], isRoot = false): RouteVO[] => {
  return routes.map((route) => {
    const { path, component, redirect, name, meta, children } = route;
    const formattedPath = isRoot ? `/${path}` : path;

    return {
      path: formattedPath,
      component: component ? (component as any).name : undefined,
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
      // // 临时跳过校园相关路由的权限检查
      // if (!route.path.startsWith("/campus")) {
      //   route.meta.hidden = !can("open", new AbilityRouter(route.path));
      // }
      route.meta.hidden = !can("open", new AbilityRouter(route.path));
    }
    if (route.children) {
      check(route.children, ability);
    }
  });
};

export const UpdateRoutes = async (ability: AnyAbility) => {
  constantRoutes = JSON.parse(JSON.stringify(routes));
  check(constantRoutes, ability);
  initRoutes();
};

export const useRouter = () => {
  initRoutes();
  return router;
};
