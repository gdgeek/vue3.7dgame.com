import { createLogger } from "@/utils/logger";
import request from "@/utils/request";

import type {
  PluginsConfig,
  PluginManifest,
  PluginPublicManifest,
} from "@/plugin-system/types";

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
 * Type guard: checks whether a value looks like a PluginPublicManifest.
 */
function isPluginPublicManifest(value: unknown): value is PluginPublicManifest {
  if (typeof value !== "object" || value === null) return false;
  return typeof (value as Record<string, unknown>).id === "string";
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
  if (override.length === 0) return base;
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
 * Merge two menu group lists by `id`.
 * `override` entries replace `base` entries with the same id;
 * new ids from `override` are appended.
 */
function mergeMenuGroups(
  base: PluginsConfig["menuGroups"],
  override: PluginsConfig["menuGroups"]
): PluginsConfig["menuGroups"] {
  if (override.length === 0) return base;
  const overrideMap = new Map(override.map((g) => [g.id, g]));
  const merged = base.map((g) => overrideMap.get(g.id) ?? g);
  const baseIds = new Set(base.map((g) => g.id));
  for (const g of override) {
    if (!baseIds.has(g.id)) {
      merged.push(g);
    }
  }
  return merged;
}

/**
 * ConfigService — 插件配置加载服务
 *
 * 两层合并策略（优先级从低到高）：
 * 1. 本地配置 `/config/plugins.json`：基础兜底插件，随前端部署，后端未配置也能用
 * 2. 后端 API `GET /v1/plugin/list?domain={hostname}`：按 id 覆盖/追加本地配置
 *
 * 任意一层加载失败都不影响其他层，确保最大可用性。
 */
export class ConfigService {
  /** Cached merged config */
  private cachedConfig: PluginsConfig | null = null;

  constructor() {
    logger.info("ConfigService initialized");
  }

  /** 加载配置：API → 本地两层合并（本地配置优先级更高，可覆盖 API 配置，方便本地开发用 localhost URL 覆盖生产地址） */
  async loadConfig(): Promise<PluginsConfig> {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    // Layer 1: API baseline
    const apiConfig = await this.loadApiConfig();
    // Layer 2: local override（同 id 时本地配置覆盖 API 配置）
    const localConfig = await this.loadLocalConfig();

    const merged: PluginsConfig = {
      version:
        localConfig.version !== EMPTY_CONFIG.version
          ? localConfig.version
          : apiConfig.version,
      menuGroups: mergeMenuGroups(apiConfig.menuGroups, localConfig.menuGroups),
      plugins: mergePlugins(apiConfig.plugins, localConfig.plugins),
    };

    // Layer 3: 从各插件自身的 plugin-manifest.json 拉取 i18n 数据并覆盖
    await this.enrichWithPluginManifests(merged);

    logger.info(
      `Config loaded: local(${localConfig.plugins.length}) + API(${apiConfig.plugins.length}) = ${merged.plugins.length} plugins`
    );

    this.cachedConfig = merged;
    return this.cachedConfig;
  }

  /**
   * Layer 3：并行 fetch 各插件的 `plugin-manifest.json`，
   * 用插件自己声明的 nameI18n / descriptionI18n / group.nameI18n 覆盖 merged 配置。
   *
   * 约定：每个插件在 `{plugin.url}plugin-manifest.json` 暴露自身元数据。
   * fetch 失败时静默跳过，不影响整体可用性。
   */
  private async enrichWithPluginManifests(
    config: PluginsConfig
  ): Promise<void> {
    const groupMap = new Map(config.menuGroups.map((g) => [g.id, g]));

    // 判断当前页面是否在本地开发环境
    const currentHostname = window.location.hostname;
    const isLocalEnv =
      currentHostname === "localhost" || currentHostname === "127.0.0.1";

    const jobs = config.plugins.map(async (plugin) => {
      // 解析插件 URL 的 hostname
      let pluginHostname: string;
      try {
        pluginHostname = new URL(plugin.url).hostname;
      } catch {
        return; // URL 格式非法，跳过
      }

      const pluginIsLocal =
        pluginHostname === "localhost" || pluginHostname === "127.0.0.1";

      // 跳过跨环境 fetch：本地开发时不拉生产插件的 manifest（避免证书错误），
      // 生产环境时不拉 localhost 插件的 manifest（无意义且会报错）
      if (isLocalEnv !== pluginIsLocal) {
        logger.debug(`Plugin manifest skipped (cross-env): ${plugin.id}`);
        return;
      }

      const manifestUrl =
        plugin.url.replace(/\/?$/, "/") + "plugin-manifest.json";
      try {
        const res = await fetch(manifestUrl, {
          signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) return;
        const data: unknown = await res.json();
        if (!isPluginPublicManifest(data) || data.id !== plugin.id) return;

        // 覆盖插件 nameI18n
        if (data.nameI18n) {
          plugin.nameI18n = data.nameI18n;
        }
        // 覆盖插件 descriptionI18n（存到 extraConfig 供 UI 使用）
        if (data.descriptionI18n) {
          plugin.extraConfig = {
            ...plugin.extraConfig,
            _descriptionI18n: JSON.stringify(data.descriptionI18n),
          };
        }
        // 覆盖所属分组的 nameI18n
        if (data.group?.nameI18n) {
          const group = groupMap.get(data.group.id);
          if (group) {
            group.nameI18n = data.group.nameI18n;
          }
        }

        logger.info(`Plugin manifest fetched: ${plugin.id}`);
      } catch {
        // 网络不通或插件未实现 manifest，静默跳过
        logger.debug(
          `Plugin manifest not available: ${plugin.id} (${manifestUrl})`
        );
      }
    });

    await Promise.allSettled(jobs);
  }

  /** 获取已加载的配置（合并后的结果） */
  getConfig(): PluginsConfig | null {
    return this.cachedConfig;
  }

  /** 从本地 /config/plugins.json 加载基础插件配置 */
  async loadLocalConfig(): Promise<PluginsConfig> {
    try {
      const response = await fetch("/config/plugins.json");
      if (!response.ok) {
        logger.warn(
          `Local plugins.json not found (${response.status}), skipping`
        );
        return { ...EMPTY_CONFIG };
      }
      const data: unknown = await response.json();
      if (!isPluginsConfig(data)) {
        logger.warn("Local plugins.json has invalid format, skipping");
        return { ...EMPTY_CONFIG };
      }
      logger.info(`Local config loaded: ${data.plugins.length} plugins`);
      return data;
    } catch (err) {
      logger.warn("Error loading local plugins.json:", err);
      return { ...EMPTY_CONFIG };
    }
  }

  /** 从后端 API 加载插件列表（自动附带当前域名） */
  async loadApiConfig(): Promise<PluginsConfig> {
    try {
      const domain = window.location.hostname;
      const res = await request.get("/v1/plugin/list", {
        params: { domain },
        skipErrorMessage: true,
      });
      const data: unknown = res.data?.data ?? res.data;
      if (!isPluginsConfig(data)) {
        logger.warn("Plugin list API returned invalid format, skipping");
        return { ...EMPTY_CONFIG };
      }
      return data;
    } catch (err) {
      logger.warn("Error loading plugin list API:", err);
      return { ...EMPTY_CONFIG };
    }
  }

  /** @deprecated 改名为 loadApiConfig，保留以兼容旧调用方 */
  async loadStaticConfig(): Promise<PluginsConfig> {
    return this.loadApiConfig();
  }

  /** 强制刷新配置 */
  async refreshConfig(): Promise<PluginsConfig> {
    this.cachedConfig = null;
    logger.info("Config cache cleared, reloading...");
    return this.loadConfig();
  }
}

export default ConfigService;
