/**
 * 管理后台路由模块
 * 包含：用户管理、Phototype 管理、Game 等
 */
import type { RouteRecordRaw } from "vue-router";

export const managerRoutes: RouteRecordRaw = {
  path: "/manager",
  component: null,
  name: "Manager",
  meta: {
    title: "manager.title",
    icon: "el-icon-Management",
    hidden: true,
    alwaysShow: false,
    params: null,
  },
  children: [
    {
      path: "/manager/user",
      component: () => import("@/views/manager/user.vue"),
      name: "ManagerUser",
      meta: {
        title: "manager.userManagement",
        icon: "cascader",
        hidden: true,
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
      },
    },
    {
      path: "/phototype/edit",
      name: "PhototypeEdit",
      meta: {
        title: "meta.edit",
        hidden: true,
        private: true,
      },
      component: () => import("@/views/phototype/edit.vue"),
    },
  ],
};

export const gameRoutes: RouteRecordRaw = {
  path: "/game",
  component: null,
  name: "Game",
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
