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
    preserveComponentOnQueryKeys: ["pluginUrl"],
    alwaysShow: false,
    params: null,
  },
};

/**
 * 开发专用插件路由。
 *
 * 不要只用 hidden 隐藏调试页：Production route graph 必须完全不包含它，
 * 从而避免已登录用户通过直接 URL 读取插件配置和权限拓扑。
 */
export const shouldRegisterPluginDebugRoute = (isProduction: boolean) =>
  !isProduction;

export const createDevelopmentPluginRoutes = (
  isProduction: boolean
): RouteRecordRaw[] => {
  if (!shouldRegisterPluginDebugRoute(isProduction)) {
    return [];
  }

  return [
    {
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
    },
  ];
};

export const developmentPluginRoutes = createDevelopmentPluginRoutes(
  import.meta.env.PROD
);
