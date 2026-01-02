/**
 * 公共路由模块
 * 包含：Web 首页、登录、SSO、隐私政策等公共页面
 */
import type { RouteRecordRaw } from "vue-router";

export const publicRoutes: RouteRecordRaw[] = [
  {
    path: "/web",
    meta: { hidden: true, private: true },
    component: () => import("@/views/web/index.vue"),
    redirect: "/web/index",
    children: [
      {
        path: "/web/index",
        name: "WebIndex",
        component: () => import("@/views/web/home.vue"),
      },
      {
        path: "/web/bbs",
        name: "WebBBS",
        component: () => import("@/views/web/bbs.vue"),
      },
      {
        path: "/web/category",
        name: "WebCategory",
        component: () => import("@/views/web/category.vue"),
      },
      {
        path: "/web/buy",
        name: "WebBuy",
        component: () => import("@/views/web/buy.vue"),
      },
      {
        path: "/web/document",
        name: "WebDocument",
        component: () => import("@/views/web/document.vue"),
      },
    ],
  },

  {
    path: "/site",
    meta: { hidden: true, private: true },
    children: [
      {
        path: "/site/login",
        redirect: "/web/index",
      },
      {
        path: "/site/logout",
        component: () => import("@/views/site/logout/index.vue"),
      },
      {
        path: "/site/register",
        component: () => import("@/views/site/register/index.vue"),
      },
    ],
  },

  {
    path: "/sso",
    component: () => import("@/views/sso/index.vue"),
    meta: { hidden: true, private: true },
  },

  { path: "/login", redirect: "/web/index" },

  {
    path: "/privacy-policy",
    component: () => import("@/views/privacy-policy/index.vue"),
    meta: { hidden: true, private: true },
    name: "PrivacyPolicy",
  },
  { path: "/terms", redirect: "/privacy-policy?tab=terms" },
  { path: "/privacy", redirect: "/privacy-policy?tab=privacy" },
];
