import { createLogger } from "@/utils/logger";
import { useDomainStoreHook } from "@/store/modules/domain";

import type { PluginsConfig, PluginManifest } from "@/plugin-system/types";

const logger = createLogger("ConfigService");

/** Empty config used as fallback when loading fails */
const EMPTY_CONFIG: PluginsConfig = {
  version: "0.0.0",
  menuGroups: [],
  plugins: [],
};

/**
 * Type guard: checks whether a value looks like a valid PluginsConfig.
 */
function isPluginsConfig(value: unknown): value is PluginsConfig {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.version === "string" &&
    Array.isArray(obj.plugins) &&
    Array.isArray(obj.menuGroups)
  );
}

/**
 * Merge two plugin lists by `id`.
 * `override` entries replace `base` entries with the same id;
 * new ids from `override` are appended.
 */
function mergePlugins(
  base: PluginManifest[],
  override: PluginManifest[]
): PluginManifest[] {
  const overrideMap = new Map(override.map((p) => [p.id, p]));
  const merged: PluginManifest[] = base.map((p) => overrideMap.get(p.id) ?? p);
  // Append plugins from override that don't exist in base
  const baseIds = new Set(base.map((p) => p.id));
  for (const p of override) {
    if (!baseIds.has(p.id)) {
      merged.push(p);
    }
  }
  return merged;
}

/**
 * Replace `__VITE_*__` placeholders in plugin config with actual env values.
 * `public/` files are copied as-is by Vite, so we resolve them at runtime.
 */
function resolveEnvPlaceholders(config: PluginsConfig): PluginsConfig {
  const envMap: Record<string, string> = {
    __VITE_PLUGIN_USER_MGMT_URL__:
      import.meta.env.VITE_PLUGIN_USER_MGMT_URL ?? "",
  };

  const replace = (value: string): string => {
    let result = value;
    for (const [placeholder, envValue] of Object.entries(envMap)) {
      result = result.replaceAll(placeholder, envValue);
    }
    return result;
  };

  return {
    ...config,
    plugins: config.plugins.map((p) => ({
      ...p,
      url: replace(p.url),
      allowedOrigin: p.allowedOrigin
        ? replace(p.allowedOrigin)
        : p.allowedOrigin,
    })),
  };
}

/**
 * ConfigService — 插件配置加载服务
 *
 * 加载策略：
 * 1. 从 `public/config/plugins.json` 加载静态默认配置
 * 2. 检查 `useDomainStore().defaultInfo` 中是否有 `plugins` 字段
 * 3. 如果 domain 有插件配置：按 id 合并，domain 覆盖静态配置
 * 4. 如果 domain 无插件配置：直接使用静态配置
 * 5. domain 信息尚未加载时不阻塞，降级使用静态配置
 * 6. 所有配置加载后，替换 `__VITE_*__` 占位符为实际环境变量值
 */
export class ConfigService {
  /** Cached merged config */
  private cachedConfig: PluginsConfig | null = null;

  constructor() {
    logger.info("ConfigService initialized");
  }

  /** 加载配置：先加载静态 plugins.json，再检查 domain 信息合并 */
  async loadConfig(): Promise<PluginsConfig> {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    const staticConfig = await this.loadStaticConfig();
    const domainConfig = this.getDomainPluginConfig();

    let finalConfig: PluginsConfig;

    if (domainConfig?.plugins && Array.isArray(domainConfig.plugins)) {
      const mergedPlugins = mergePlugins(
        staticConfig.plugins,
        domainConfig.plugins
      );
      finalConfig = {
        version: domainConfig.version ?? staticConfig.version,
        menuGroups: domainConfig.menuGroups ?? staticConfig.menuGroups,
        plugins: mergedPlugins,
      };
      logger.info(
        `Config loaded with domain merge: ${finalConfig.plugins.length} plugins`
      );
    } else {
      finalConfig = staticConfig;
      logger.info(
        `Config loaded (static only): ${staticConfig.plugins.length} plugins`
      );
    }

    this.cachedConfig = resolveEnvPlaceholders(finalConfig);
    return this.cachedConfig;
  }

  /** 获取已加载的配置（合并后的结果） */
  getConfig(): PluginsConfig | null {
    return this.cachedConfig;
  }

  /** 仅加载静态默认配置 */
  async loadStaticConfig(): Promise<PluginsConfig> {
    try {
      const response = await fetch("/config/plugins.json");
      if (!response.ok) {
        logger.warn(
          `Failed to fetch plugins.json: ${response.status} ${response.statusText}`
        );
        return { ...EMPTY_CONFIG };
      }
      const data: unknown = await response.json();
      if (!isPluginsConfig(data)) {
        logger.warn("plugins.json has invalid format, using empty config");
        return { ...EMPTY_CONFIG };
      }
      return data;
    } catch (err) {
      logger.error("Error loading plugins.json:", err);
      return { ...EMPTY_CONFIG };
    }
  }

  /** 从 domain 信息中提取插件配置（如果有） */
  getDomainPluginConfig(): Partial<PluginsConfig> | null {
    try {
      const domainStore = useDomainStoreHook();
      const defaultInfo = domainStore.defaultInfo;
      if (!defaultInfo) {
        logger.debug("Domain info not loaded yet, skipping domain config");
        return null;
      }

      // DomainDefaultInfo currently has no `plugins` field.
      // When the backend adds it, it will appear here.
      const info = defaultInfo as Record<string, unknown>;
      if (!("plugins" in info) || info.plugins === undefined) {
        return null;
      }

      const pluginsData = info.plugins;
      if (
        typeof pluginsData !== "object" ||
        pluginsData === null ||
        !Array.isArray((pluginsData as Record<string, unknown>).plugins)
      ) {
        logger.warn("Domain plugins data has invalid format, ignoring");
        return null;
      }

      const partial = pluginsData as Record<string, unknown>;
      return {
        version:
          typeof partial.version === "string" ? partial.version : undefined,
        menuGroups: Array.isArray(partial.menuGroups)
          ? (partial.menuGroups as PluginsConfig["menuGroups"])
          : undefined,
        plugins: partial.plugins as PluginManifest[],
      };
    } catch (err) {
      logger.warn("Error reading domain plugin config:", err);
      return null;
    }
  }

  /** 强制刷新配置 */
  async refreshConfig(): Promise<PluginsConfig> {
    this.cachedConfig = null;
    logger.info("Config cache cleared, reloading...");
    return this.loadConfig();
  }
}

export default ConfigService;
