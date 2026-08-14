/**
 * 管理后台路由模块
 * 包含：用户管理、Phototype 管理、Game 等
 */
import type { RouteRecordRaw } from "vue-router";

export const shouldRegisterVueFormDemoRoute = (isProduction: boolean) =>
  !isProduction;

const managerChildren: RouteRecordRaw[] = [
  {
    path: "/manager/user",
    component: () => import("@/views/manager/user.vue"),
    name: "ManagerUser",
    meta: {
      title: "manager.userManagement",
      icon: "cascader",
      hidden: true,
      roles: ["admin", "root"],
      requiredCapabilities: ["platform.users.manage"],
    },
  },
  {
    path: "/phototype/list",
    component: () => import("@/views/phototype/list.vue"),
    name: "PhototypeList",
    meta: {
      title: "phototype.title",
      icon: "el-icon-Management",
      hidden: false,
      roles: ["root"],
      requiredCapabilities: ["platform.phototypes.manage"],
    },
  },
  {
    path: "/phototype/edit",
    name: "PhototypeEdit",
    meta: {
      title: "meta.edit",
      hidden: true,
      private: true,
      roles: ["root"],
      requiredCapabilities: ["platform.phototypes.manage"],
    },
    component: () => import("@/views/phototype/edit.vue"),
  },
];

if (!import.meta.env.PROD) {
  managerChildren.push({
    path: "/test/vue-form-demo",
    name: "VueFormDemo",
    meta: {
      title: "VueForm 测试",
      hidden: false,
    },
    component: () => import("@/views/test/VueFormDemo.vue"),
  });
}

export const managerRoutes: RouteRecordRaw = {
  path: "/manager",
  component: null,
  name: "Manager",
  redirect: "/manager/user",
  meta: {
    title: "manager.title",
    icon: "el-icon-Management",
    hidden: true,
    alwaysShow: false,
    params: null,
    roles: ["admin", "root"],
    requiredCapabilities: ["platform.users.manage"],
  },
  children: managerChildren,
};

export const gameRoutes: RouteRecordRaw = {
  path: "/game",
  component: null,
  name: "Game",
  redirect: "/game/index",
  meta: {
    title: "game.title",
    icon: "el-icon-monitor",
    hidden: true,
    private: true,
    alwaysShow: false,
    params: null,
  },
  children: [
    {
      path: "/game/index",
      component: () => import("@/views/game/index.vue"),
      name: "GameIndex",
      meta: {
        title: "game.gameIndex",
        icon: "cascader",
        hidden: true,
      },
    },
    {
      path: "/game/map",
      component: () => import("@/views/game/map.vue"),
      name: "GameMap",
      meta: {
        title: "game.gameMap",
        icon: "cascader",
        hidden: true,
      },
    },
  ],
};

/** Game 的后端数据契约尚未恢复；Production 不注册空壳/失败路由。 */
export const shouldRegisterGameRoutes = (isProduction: boolean) =>
  !isProduction;

export const environmentGameRoutes: RouteRecordRaw[] = import.meta.env.PROD
  ? []
  : [gameRoutes];
