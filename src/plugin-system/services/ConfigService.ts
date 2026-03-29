import { createLogger } from "@/utils/logger";
import request from "@/utils/request";

import type {
  PluginsConfig,
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
 * ConfigService — 插件配置加载服务
 *
 * 合并策略（本地与 DB 完全平行，互不覆盖）：
 * 1. 本地 `/config/plugins.json` — 本地内置插件，保留声明的分组
 *    `builtins` 分组为保留 id，DB 无法覆盖
 * 2. 后端 API `GET /v1/plugin/list?domain={hostname}` — DB 插件，保留各自分组
 *    DB 中与本地同 group id 的分组定义被忽略（本地优先）
 * 3. 两边插件全部显示，各自属于声明的分组，不去重
 *
 * 任意一层加载失败都不影响其他层，确保最大可用性。
 */
export class ConfigService {
  /** Cached merged config */
  private cachedConfig: PluginsConfig | null = null;

  constructor() {
    logger.info("ConfigService initialized");
  }

  /**
   * 加载配置：本地与 DB 完全平行，互不覆盖。
   * 分组：本地优先（本地声明的 group id 不被 DB 覆盖）；DB 独有分组追加。
   * 插件：本地 + DB 全部显示，各自保留声明的 group。
   */
  async loadConfig(): Promise<PluginsConfig> {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    const apiConfig = await this.loadApiConfig();
    const localConfig = await this.loadLocalConfig();

    // 分组：本地优先，DB 中与本地同 id 的分组定义被忽略
    const localGroupIds = new Set(localConfig.menuGroups.map((g) => g.id));
    const dbOnlyGroups = apiConfig.menuGroups.filter((g) => !localGroupIds.has(g.id));
    const menuGroups = [...localConfig.menuGroups, ...dbOnlyGroups];

    // 插件：两边全部显示，各自保留声明的 group，不去重
    const plugins = [...localConfig.plugins, ...apiConfig.plugins];

    const merged: PluginsConfig = {
      version: apiConfig.version !== EMPTY_CONFIG.version
        ? apiConfig.version
        : localConfig.version,
      menuGroups,
      plugins,
    };

    logger.info(
      `Config loaded: local(${localConfig.plugins.length}) + DB(${apiConfig.plugins.length}) = ${merged.plugins.length} total`
    );

    this.cachedConfig = merged;
    return this.cachedConfig;
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
