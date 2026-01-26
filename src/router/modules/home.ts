/**
 * 首页和设置相关路由模块
 */
import type { RouteRecordRaw } from "vue-router";

const Structure = () => import("@/layout/structure/index.vue");
const Empty = () => import("@/layout/empty/index.vue");

export const homeRoutes: RouteRecordRaw = {
  path: "/home",
  component: Structure,
  name: "Home",
  redirect: "/home/index",
  meta: {
    title: "personalCenter.title",
    icon: "homepage",
    hidden: false,
    alwaysShow: true,
  },
  children: [
    {
      meta: {
        title: "personalCenter.myHomepage",
        affix: true,
        keepAlive: true,
        hidden: true,
      },
      path: "/home/index",
      name: "HomeIndex",
      component: () => import("@/views/home/index.vue"),
    },
    {
      meta: {
        title: "personalCenter.document",
        hidden: true,
        private: true,
      },
      path: "/home/document",
      name: "HomeDocument",
      component: () => import("@/views/home/document.vue"),
    },
    {
      meta: {
        title: "personalCenter.category",
        hidden: true,
        private: true,
      },
      path: "/home/category",
      name: "HomeCategory",
      component: () => import("@/views/home/category.vue"),
    },
  ],
};

export const settingsRoutes: RouteRecordRaw = {
  path: "/settings",
  name: "Settings",
  meta: {
    title: "settings.title",
    hidden: true,
    private: true,
  },
  component: Empty,
  children: [
    {
      meta: {
        title: "settings.personalData",
        hidden: true,
        private: true,
      },
      path: "/settings/edit",
      name: "SettingsEdit",
      component: () => import("@/views/settings/edit.vue"),
    },
    {
      meta: {
        title: "settings.userPresentation",
        hidden: true,
        private: true,
      },
      path: "/settings/people",
      name: "SettingsPeople",
      component: () => import("@/views/settings/people.vue"),
    },
  ],
};
