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
    alwaysShow: false,
    params: null,
  },
};
