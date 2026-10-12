/**
 * 路由配置主入口
 * 路由定义已拆分到 modules 目录下，按功能模块组织
 */
import type { App } from "vue";
import { ref } from "vue";
import {
  createRouter,
  createWebHistory,
  RouteLocationNormalized,
  RouteRecordRaw,
} from "vue-router";
import { Meta, RouteVO } from "@/api/menu/model";

// 布局组件
export const Layout = () => import("@/layout/index.vue");

// 导入路由模块
import { publicRoutes } from "./modules/public";
import { homeRoutes, settingsRoutes } from "./modules/home";
import { resourceRoutes } from "./modules/resource";
import { metaRoutes } from "./modules/meta";
import { verseRoutes } from "./modules/verse";
import { managerRoutes, environmentGameRoutes } from "./modules/manager";
import { pluginRoutes, developmentPluginRoutes } from "./modules/plugin";

export const TASK51_MEMORY_RUNNER_ROUTE_NAME =
  "InternalTask51MemoryIsolatedRunner";
export const TASK51_MEMORY_RUNNER_PATH =
  "/internal/task51/memory-isolated-runner";
export const TASK51_MEMORY_RUNNER_ORIGIN = "https://d.xrugc.com";

export const isPermanentlyHiddenRoute = (route: Pick<RouteRecordRaw, "name">) =>
  route.name === TASK51_MEMORY_RUNNER_ROUTE_NAME;

export const shouldRegisterTask51MemoryRunnerRoute = (
  isProduction: boolean,
  origin: string
) => isProduction && origin === TASK51_MEMORY_RUNNER_ORIGIN;

export const isWarmTask51Navigation = (
  from: Pick<RouteLocationNormalized, "matched">
) => from.matched.length > 0;

export const getTask51PrimaryRole = (
  roles: readonly string[] | null | undefined
) => {
  if (!roles) return null;
  if (roles.includes("root")) return "root";
  if (roles.includes("admin")) return "admin";
  if (roles.includes("manager")) return "manager";
  if (roles.includes("user")) return "user";
  return null;
};

type Task51RouteGuardDependencies = {
  origin: () => string;
  loadFreshRoles: () => Promise<readonly string[] | null | undefined>;
};

const task51RouteGuardDependencies: Task51RouteGuardDependencies = {
  origin: () => (typeof window === "undefined" ? "" : window.location.origin),
  loadFreshRoles: async () => {
    const { useUserStore } = await import("@/store");
    const userStore = useUserStore();
    const userInfo = await userStore.getUserInfo();
    return userInfo?.roles;
  },
};

export const createTask51MemoryRunnerBeforeEnter = (
  dependencies: Task51RouteGuardDependencies = task51RouteGuardDependencies
) => {
  return async (
    _to: RouteLocationNormalized,
    from: RouteLocationNormalized
  ) => {
    if (dependencies.origin() !== TASK51_MEMORY_RUNNER_ORIGIN) {
      return "/404";
    }

    if (!isWarmTask51Navigation(from)) {
      return "/404";
    }

    try {
      const roles = await dependencies.loadFreshRoles();
      return getTask51PrimaryRole(roles) === "root" ? true : "/401";
    } catch {
      return "/401";
    }
  };
};

export const task51MemoryRunnerRoute: RouteRecordRaw = {
  path: TASK51_MEMORY_RUNNER_PATH,
  name: TASK51_MEMORY_RUNNER_ROUTE_NAME,
  component: () => import("@/views/internal/task51/MemoryIsolatedRunner.vue"),
  beforeEnter: createTask51MemoryRunnerBeforeEnter(),
  meta: {
    hidden: true,
    private: true,
    roles: ["root"],
  },
};

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
      // 游戏（数据契约恢复前不进入 Production route graph）
      ...environmentGameRoutes,
      // 插件系统
      pluginRoutes,
      // 开发专用调试页面（Production route graph 中不存在）
      ...developmentPluginRoutes,

      // Task 5.1 one-shot evidence runner. It has no menu/link and rejects
      // cold deep-links in its route guard.
      ...(shouldRegisterTask51MemoryRunnerRoute(
        import.meta.env.PROD,
        typeof window === "undefined" ? "" : window.location.origin
      )
        ? [task51MemoryRunnerRoute]
        : []),

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
      route.meta.hidden = isPermanentlyHiddenRoute(route)
        ? true
        : !can("open", new AbilityRouter(route.path));
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
