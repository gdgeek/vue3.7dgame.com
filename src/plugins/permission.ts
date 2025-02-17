import {
  NavigationGuardNext,
  RouteLocationNormalized,
  RouteRecordRaw,
} from "vue-router";

import NProgress from "@/utils/nprogress";
import { TOKEN_KEY } from "@/enums/CacheEnum";
import { useRouter } from "@/router";
import Token from "@/store/modules/token";
import { UserInfoType, _UserDataType } from "@/api/user/model";
const router = useRouter();
import { usePermissionStore, useUserStore } from "@/store";

export function setupPermission() {
  // 白名单路由
  const whiteList = [
    "/site/login",
    "/site",
    "/introduce",
    "/site/register",
    "/site/logout",
    "/privacy-policy",
    "/404",
    "/401",
  ];

  router.beforeEach(async (to, from, next) => {
    NProgress.start();
    // alert(to.path);

    // next({ path: "/404" });
    if (Token.hasToken()) {
      if (to.path === "/site/login") {
        // 如果已登录，跳转到首页
        next({ path: "/404" });
        NProgress.done();
      } else {
        /*
        const userStore = useUserStore();
        let hasRoles: boolean = !(
          userStore == null ||
          userStore.userInfo == null ||
          userStore.userInfo.roles == null ||
          userStore.userInfo.roles.length == 0
        );*/

        // hasRoles = true;
        //   if (hasRoles) {
        // 如果未匹配到任何路由，跳转到404页面
        if (to.matched.length === 0) {
          next(from.name ? { name: from.name } : "/404");
        } else {
          // 如果路由参数中有 title，覆盖路由元信息中的 title
          const title =
            (to.params.title as string) || (to.query.title as string);
          if (title) {
            to.meta.title = title;
          }
          next();
        }
        // }
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
            Token.removeToken();
            // await userStore.resetToken();
            redirectToLogin(to, next);
            NProgress.done();
          }*/
      }
    } else {
      return;
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
  next(`/site/login?redirect=${encodeURIComponent(redirect)}`);
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
