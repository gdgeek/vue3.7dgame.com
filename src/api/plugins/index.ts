/**
 * 插件相关 API 调用
 *
 * 当前插件配置通过静态 plugins.json 和 domain 信息加载。
 * 此文件预留后端接口扩展点。
 */
import request from "@/utils/request";
import type { PluginsConfig } from "@/plugin-system/types";

/** 从后端获取插件配置（预留接口） */
export function getPluginsConfig() {
  return request<PluginsConfig>({
    url: "/api/v1/plugins/config",
    method: "get",
  });
}

/** 更新单个插件的启用状态（预留接口） */
export function updatePluginEnabled(pluginId: string, enabled: boolean) {
  return request({
    url: `/api/v1/plugins/${pluginId}/enabled`,
    method: "put",
    data: { enabled },
  });
}
