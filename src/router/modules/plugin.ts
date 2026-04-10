/**
 * 插件系统路由模块
 * 插件布局页面，支持可选的 pluginId 参数
 */
import type { RouteRecordRaw } from "vue-router";

export const pluginRoutes: RouteRecordRaw = {
  path: "/plugins/:pluginId?",
  component: () => import("@/plugin-system/views/PluginLayout.vue"),
  name: "Plugins",
  meta: {
    title: "plugin.title",
    icon: "el-icon-Menu",
    hidden: false,
    keepAlive: false,
    disableTransition: true,
    alwaysShow: false,
    params: null,
  },
};

/** 插件系统调试页面 — 显示所有插件信息，仅开发环境使用 */
export const pluginDebugRoute: RouteRecordRaw = {
  path: "/plugin-debug",
  component: () => import("@/plugin-system/views/PluginDebug.vue"),
  name: "PluginDebug",
  meta: {
    title: "插件调试",
    icon: "el-icon-Setting",
    hidden: true,
    keepAlive: false,
    alwaysShow: false,
    params: null,
  },
};
