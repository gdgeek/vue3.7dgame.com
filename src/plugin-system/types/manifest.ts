/** 插件清单 - plugins.json 中每个插件的配置 */
export interface PluginManifest {
  /** 插件唯一标识 */
  id: string;
  /** 显示名称（默认/回退） */
  name: string;
  /** 多语言名称（可选） */
  nameI18n?: Record<string, string>;
  /** 插件描述 */
  description: string;
  /** 插件入口 URL（外部应用地址） */
  url: string;
  /** 插件图标（Element Plus icon 名称或 URL） */
  icon: string;
  /** 所属菜单分组 */
  group: string;
  /** 是否启用 */
  enabled: boolean;
  /** 排序权重（越小越靠前） */
  order: number;
  /** 允许的 PostMessage origin（用于安全校验） */
  allowedOrigin: string;
  /** 插件版本 */
  version: string;
  /** iframe sandbox 属性（可选，默认 'allow-scripts allow-same-origin'） */
  sandbox?: string;
  /** 额外配置，透传给插件 */
  extraConfig?: Record<string, string | number | boolean>;
}

/** plugins.json 顶层结构 */
export interface PluginsConfig {
  /** 配置版本 */
  version: string;
  /** 菜单分组定义 */
  menuGroups: MenuGroup[];
  /** 插件列表 */
  plugins: PluginManifest[];
}

export interface MenuGroup {
  /** 分组标识 */
  id: string;
  /** 分组显示名称（默认/回退） */
  name: string;
  /** 分组多语言名称（可选） */
  nameI18n?: Record<string, string>;
  /** 分组图标 */
  icon: string;
  /** 排序权重 */
  order: number;
}
