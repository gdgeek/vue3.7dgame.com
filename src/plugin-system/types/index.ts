// Re-export manifest types
export type { PluginManifest, PluginsConfig, MenuGroup, PluginPublicManifest } from "./manifest";

/** 插件运行状态 */
export type PluginState = "unloaded" | "loading" | "active" | "error";

/** 运行时插件信息，供 UI 和 Store 使用 */
export interface PluginInfo {
  pluginId: string;
  name: string;
  nameI18n?: Record<string, string>;
  description: string;
  icon: string;
  group: string;
  state: PluginState;
  enabled: boolean;
  order: number;
  /** 最后一次错误信息 */
  lastError?: string;
}

/** 主框架与插件之间的 PostMessage 消息格式 */
export interface PluginMessage {
  /** 消息类型 */
  type: PluginMessageType;
  /** 消息唯一 ID（用于请求-响应配对） */
  id: string;
  /** 消息负载 */
  payload?: Record<string, unknown>;
  /** 关联的请求 ID（响应消息使用） */
  requestId?: string;
}

export type PluginMessageType =
  | "INIT"
  | "PLUGIN_READY"
  | "TOKEN_UPDATE"
  | "THEME_CHANGE"
  | "REQUEST"
  | "RESPONSE"
  | "EVENT"
  | "DESTROY";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
