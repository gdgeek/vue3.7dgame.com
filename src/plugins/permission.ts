import { NavigationGuardNext, RouteLocationNormalized } from "vue-router";

import NProgress from "@/utils/nprogress";
import { useRouter } from "@/router";
import authClient from "@/services/auth/authClient";
const router = useRouter();
import { useUserStore } from "@/store";

type RouteAccessUser = {
  roles?: string[] | null;
  perms?: string[] | null;
} | null;

const ROUTE_CAPABILITY_ROLES: Readonly<Record<string, readonly string[]>> = {
  "platform.users.manage": ["admin", "root"],
  "platform.phototypes.manage": ["root"],
};

/** 路由角色采用任一匹配语义；空要求不构成授权。 */
export function hasRouteRoleAccess(
  userInfo: RouteAccessUser,
  requiredRoles: readonly string[]
): boolean {
  if (!userInfo || requiredRoles.length === 0) return false;
  const roles = Array.isArray(userInfo.roles) ? userInfo.roles : [];
  return requiredRoles.some((role) => roles.includes(role));
}

/** 路由能力采用全部满足语义；未知能力与空要求均 fail closed。 */
export function hasRouteCapabilityAccess(
  userInfo: RouteAccessUser,
  requiredCapabilities: readonly string[]
): boolean {
  if (!userInfo || requiredCapabilities.length === 0) return false;
  const roles = Array.isArray(userInfo.roles) ? userInfo.roles : [];
  const perms = Array.isArray(userInfo.perms) ? userInfo.perms : [];

  return requiredCapabilities.every((capability) => {
    if (perms.includes(capability)) return true;
    const allowedRoles = ROUTE_CAPABILITY_ROLES[capability];
    return Boolean(
      allowedRoles && allowedRoles.some((role) => roles.includes(role))
    );
  });
}

export function setupPermission() {
  // 白名单路由
  const whiteList = [
    "/site/login",
    "/sso",
    "/site/register",
    "/site",
    "/web",
    "/web/news",
    "/web/buy",
    "/web/category",
    "/web/document",
    "/web/news/document",
    "/web/news/category",
    "/web/bbs",
    "/web/docment",
    "/web/category",
    "/web/home",
    "/web/rokid",
    "/web/index",
    "/site/register",
    "/site/logout",
    "/privacy-policy",
    "/404",
    "/401",
  ];

  router.beforeEach(async (to, from, next) => {
    NProgress.start(); //开始进度条

    // next({ path: "/404" });
    if (authClient.getAccessToken()) {
      // 判断是否有token
      if (to.path === "/site/login") {
        // 如果已登录，跳转到首页
        next({ path: "/home/index" });
        NProgress.done();
      } else {
        if (to.matched.length === 0) {
          //   alert(JSON.stringify(to));
          next(from.name ? { name: from.name } : "/404");
        } else {
          const requiredRoles = Array.isArray(to.meta.roles)
            ? to.meta.roles.filter(
                (role): role is string =>
                  typeof role === "string" && role.length > 0
              )
            : [];

          const requiredCapabilities = Array.isArray(
            to.meta.requiredCapabilities
          )
            ? to.meta.requiredCapabilities.filter(
                (capability): capability is string =>
                  typeof capability === "string" && capability.length > 0
              )
            : [];

          if (requiredCapabilities.length > 0 || requiredRoles.length > 0) {
            const userStore = useUserStore();
            let userInfo = userStore.userInfo;

            if (!userInfo && typeof userStore.getUserInfo === "function") {
              try {
                const loadedUserInfo = await userStore.getUserInfo();
                if (loadedUserInfo) userInfo = loadedUserInfo;
              } catch {
                next("/401");
                NProgress.done();
                return;
              }
            }

            const hasAccess =
              requiredCapabilities.length > 0
                ? hasRouteCapabilityAccess(userInfo, requiredCapabilities)
                : hasRouteRoleAccess(userInfo, requiredRoles);

            if (!hasAccess) {
              next("/401");
              NProgress.done();
              return;
            }
          }

          // 如果路由参数中有 title，覆盖路由元信息中的 title
          const title =
            (to.params.title as string) || (to.query.title as string);
          if (title) {
            to.meta.title = title;
          }
          next();
        }
        NProgress.done();
        /*else {
          const permissionStore = usePermissionStore();
          try {
            // await userStore.getUserInfo();
            const dynamicRoutes = await permissionStore.generateRoutes();
            dynamicRoutes.forEach((route: RouteRecordRaw) =>
              router.addRoute(route)
            );
            next({ ...to, replace: true });
          } catch (error) {
            // 移除 token 并重定向到登录页，携带当前页面路由作为跳转参数
            authClient.clearToken("unauthorized");
            // await userStore.resetToken();
            redirectToLogin(to, next);
            NProgress.done();
          }*/
      }
    } else {
      if (whiteList.includes(to.path)) {
        next();
      } else {
        redirectToLogin(to, next);
      }
      NProgress.done();
    }
  });

  router.afterEach(() => {
    NProgress.done();
  });
}

/** 重定向到登录页 */
function redirectToLogin(
  to: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  const params = new URLSearchParams(to.query as Record<string, string>);
  const queryString = params.toString();
  const redirect = queryString ? `${to.path}?${queryString}` : to.path;
  next(`/web/index?redirect=${encodeURIComponent(redirect)}`);
}

/** 判断是否有权限 */
export function hasAuth(
  value: string | string[],
  type: "button" | "role" = "button"
) {
  const userInfo = useUserStore().userInfo;
  if (userInfo === null) {
    return false;
  }
  const roles = userInfo.roles;
  const perms = userInfo.perms;
  // 超级管理员 拥有所有权限
  if (type === "button" && roles?.includes("manager")) {
    return true;
  }

  const auths = type === "button" ? perms : roles;
  return typeof value === "string"
    ? auths!.includes(value)
    : value.some((perm) => auths!.includes(perm));
}
