import type { App } from "vue";
import { createRouter, createWebHashHistory, RouteRecordRaw } from "vue-router";

export const Layout = () => import("@/layout/index.vue");

import Structure from "@/layout/structure/index.vue";
import { Meta, RouteVO } from "@/api/menu/model";
// 静态路由
export const constantRoutes: RouteRecordRaw[] = [
  {
    path: "/redirect",
    component: Layout,
    meta: { hidden: true },
    children: [
      {
        path: "/redirect/:path(.*)",
        component: () => import("@/views/redirect/index.vue"),
      },
    ],
  },

  {
    path: "/login",
    component: () => import("@/views/login/index.vue"),
    meta: { hidden: true },
  },

  {
    path: "/",
    name: "/",
    component: Layout,
    redirect: "/dashboard",
    children: [
      {
        path: "dashboard",
        component: () => import("@/views/dashboard/index.vue"),
        // 用于 keep-alive 功能，需要与 SFC 中自动推导或显式声明的组件名称一致
        // 参考文档: https://cn.vuejs.org/guide/built-ins/keep-alive.html#include-exclude
        name: "Dashboard",
        meta: {
          title: "dashboard",
          icon: "homepage",
          affix: true,
          keepAlive: true,
        },
      },

      {
        path: "ResourceAdmin",
        component: Layout,
        redirect: "/ResourceAdmin/index",
        name: "ResourceAdmin",
        meta: {
          title: "资源管理",
          icon: "system",
          hidden: false,
          alwaysShow: false,
          params: null,
        },
        children: [
          {
            path: "voxel",
            name: "",
            component: () => import("@/views/dashboard/index.vue"),
            meta: {
              title: "体素管理",
              icon: "",
              hidden: false,
              alwaysShow: false,
              params: null,
            },
            children: [
              {
                path: "index",
                name: "",
                component: () => import("@/views/dashboard/index.vue"),
                meta: {
                  title: "体素列表",
                  icon: "",
                  hidden: false,
                  alwaysShow: false,
                  params: null,
                },
              },
            ],
          },
          {
            path: "polygen",
            name: "",
            component: () => import("@/views/dashboard/index.vue"),
            meta: {
              title: "模型管理",
              icon: "",
              hidden: false,
              alwaysShow: false,
              params: null,
            },
            children: [
              {
                path: "index",
                name: "",
                component: () => import("@/views/dashboard/index.vue"),
                meta: {
                  title: "模型列表",
                  icon: "",
                  hidden: false,
                  alwaysShow: false,
                  params: null,
                },
              },
            ],
          },
        ],
      },

      {
        path: "401",
        component: () => import("@/views/error-page/401.vue"),
        meta: { hidden: true },
      },
      {
        path: "404",
        component: () => import("@/views/error-page/404.vue"),
        meta: { hidden: true },
      },
    ],
  },
];

/**
 * 创建路由
 */
const router = createRouter({
  history: createWebHashHistory(),
  routes: constantRoutes,
  // 刷新时，滚动条位置还原
  scrollBehavior: () => ({ left: 0, top: 0 }),
});

// 全局注册 router
export function setupRouter(app: App<Element>) {
  app.use(router);
}

/**
 * 重置路由
 */
export function resetRouter() {
  router.replace({ path: "/login" });
}

// 将路由转换为 RouteVO 格式的函数，只获取根路由 "/" 下的子路由数据，并且子路由路径前添加 "/"
function convertRoutes(routes: RouteRecordRaw[]): RouteVO[] {
  return routes.map((route) => {
    const { path, component, redirect, name, meta, children } = route;
    const formattedPath = path === "/" ? "/" : `/${path}`;
    return {
      path: formattedPath,
      component: component ? (component as any).name : undefined,
      redirect: (redirect as string) || undefined,
      name: typeof name === "string" ? name : undefined,
      meta: meta as Meta,
      children: children ? convertRoutes(children) : [],
    };
  });
}

// 提取 path 为 "/" 及其子路由的部分
const mainRoute = constantRoutes.find((route) => route.path === "/");
export const routerData: RouteVO[] = mainRoute
  ? convertRoutes(mainRoute.children || [])
  : [];

export default router;
