/**
 * Meta 相关路由模块
 * 包含：Meta 列表、编辑、脚本编辑器、场景编辑器
 */
import type { RouteRecordRaw } from "vue-router";

export const metaRoutes: RouteRecordRaw[] = [
  {
    path: "/meta/list",
    component: () => import("@/views/meta/list.vue"),
    name: "MetaList",
    meta: {
      title: "meta.title",
      icon: "el-icon-StarFilled",
      hidden: false,
      keepAlive: true,
      alwaysShow: false,
      params: null,
    },
  },
  {
    path: "/meta/prefabs",
    component: () => import("@/views/meta/prefabs.vue"),
    name: "Role",
    meta: {
      title: "meta.systemDefault",
      icon: "",
      hidden: true,
      private: true,
      keepAlive: true,
      alwaysShow: false,
      params: null,
    },
  },
  {
    path: "/meta/prefab-edit",
    name: "PrefabEdit",
    meta: {
      title: "meta.edit",
      hidden: true,
      private: true,
    },
    component: () => import("@/views/meta/prefab-edit.vue"),
  },
  {
    path: "/meta/meta-edit",
    name: "MetaEdit",
    meta: {
      title: "meta.edit",
      hidden: true,
      private: true,
    },
    component: () => import("@/views/meta/meta-edit.vue"),
  },
  {
    path: "/meta/script",
    name: "MetaScript",
    meta: {
      title: "meta.scriptEditor",
      keepAlive: true,
      hidden: true,
      private: true,
    },
    component: () => import("@/views/meta/script.vue"),
  },
  {
    path: "/meta/scene",
    name: "MetaSceneEditor",
    meta: {
      title: "meta.sceneEditor",
      keepAlive: true,
      hidden: true,
      private: true,
    },
    component: () => import("@/views/meta/scene.vue"),
  },
];
