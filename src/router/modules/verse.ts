/**
 * Verse/项目相关路由模块
 */
import type { RouteRecordRaw } from "vue-router";

export const verseRoutes: RouteRecordRaw = {
  path: "/verse",
  component: null,
  redirect: "/verse/index",
  name: "Verse",
  meta: {
    title: "project.title",
    icon: "el-icon-sunrise",
    hidden: true,
    alwaysShow: false,
    params: null,
  },
  children: [
    {
      path: "/verse/index",
      component: () => import("@/views/meta-verse/index.vue"),
      name: "VerseIndex",
      meta: {
        title: "project.selfGenerated",
        icon: "cascader",
        hidden: true,
      },
    },
    {
      path: "/verse/public",
      component: () => import("@/views/meta-verse/public.vue"),
      name: "VersePublic",
      meta: {
        title: "project.systemRecommendation",
        icon: "cascader",
        hidden: true,
      },
    },
    {
      path: "/verse/view",
      name: "VerseView",
      meta: {
        title: "project.viewTitle",
        hidden: true,
        private: true,
      },
      component: () => import("@/views/verse/view.vue"),
    },
    {
      path: "/verse/script",
      name: "Script",
      meta: {
        title: "project.scriptEditor",
        keepAlive: true,
        hidden: true,
        private: true,
      },
      component: (): any => import("@/views/verse/script.vue"),
    },
    {
      path: "/verse/scene",
      name: "VerseSceneEditor",
      meta: {
        title: "project.sceneEditor",
        keepAlive: true,
        hidden: true,
        private: true,
      },
      component: () => import("@/views/verse/scene.vue"),
    },
  ],
};

/**
 * AI 相关路由
 */
export const aiRoutes: RouteRecordRaw = {
  path: "/ai",
  component: null,
  name: "AI",
  meta: {
    title: "ai.title",
    icon: "el-icon-opportunity",
    hidden: true,
    private: true,
    alwaysShow: false,
    params: null,
  },
  children: [
    {
      path: "/ai/list",
      component: () => import("@/views/ai/index.vue"),
      name: "AIList",
      meta: {
        title: "ai.list",
        icon: "cascader",
        hidden: true,
        keepAlive: true,
        alwaysShow: false,
        params: null,
      },
    },
    {
      path: "/ai/generation",
      component: () => import("@/views/ai/generation.vue"),
      name: "AIGeneration",
      meta: {
        title: "ai.generation",
        icon: "cascader",
        hidden: true,
        keepAlive: true,
        alwaysShow: false,
        params: null,
      },
    },
  ],
};
