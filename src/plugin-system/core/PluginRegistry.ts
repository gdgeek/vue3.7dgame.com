import { createLogger } from "@/utils/logger";

import type { PluginManifest, ValidationResult } from "@/plugin-system/types";

const logger = createLogger("PluginRegistry");

/** 插件清单必需字段及其期望类型 */
const REQUIRED_FIELDS: ReadonlyArray<{
  key: keyof PluginManifest;
  type: string;
}> = [
  { key: "id", type: "string" },
  { key: "name", type: "string" },
  { key: "url", type: "string" },
  { key: "allowedOrigin", type: "string" },
  { key: "version", type: "string" },
  { key: "group", type: "string" },
  { key: "icon", type: "string" },
  { key: "description", type: "string" },
  { key: "enabled", type: "boolean" },
  { key: "order", type: "number" },
];

/**
 * 插件元数据注册表
 *
 * 存储和查询已注册插件的元数据，数据来源于 plugins.json 配置。
 * 注册前会验证清单格式，无效清单将被拒绝。
 */
export class PluginRegistry {
  private plugins: Map<string, PluginManifest> = new Map();

  /** 注册插件（验证清单后存入注册表） */
  register(config: PluginManifest): void {
    const result = this.validateManifest(config);
    if (!result.valid) {
      const errorMsg = `Invalid manifest for plugin "${config.id ?? "unknown"}": ${result.errors.join("; ")}`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    this.plugins.set(config.id, config);
    logger.info(`Plugin registered: ${config.id} (${config.name})`);
  }

  /** 注销插件 */
  unregister(pluginId: string): void {
    const existed = this.plugins.delete(pluginId);
    if (existed) {
      logger.info(`Plugin unregistered: ${pluginId}`);
    } else {
      logger.warn(`Plugin not found for unregister: ${pluginId}`);
    }
  }

  /** 获取插件配置 */
  get(pluginId: string): PluginManifest | undefined {
    return this.plugins.get(pluginId);
  }

  /** 获取所有插件 */
  getAll(): PluginManifest[] {
    return Array.from(this.plugins.values());
  }

  /** 按分组查询 */
  getByGroup(group: string): PluginManifest[] {
    return this.getAll().filter((plugin) => plugin.group === group);
  }

  /** 验证清单格式 */
  validateManifest(manifest: PluginManifest): ValidationResult {
    const errors: string[] = [];

    for (const { key, type } of REQUIRED_FIELDS) {
      const value = manifest[key];

      if (value === undefined || value === null) {
        errors.push(`Missing required field: "${key}"`);
      } else if (typeof value !== type) {
        errors.push(
          `Field "${key}" must be of type "${type}", got "${typeof value}"`
        );
      } else if (type === "string" && (value as string).trim() === "") {
        errors.push(`Field "${key}" must not be empty`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

export default PluginRegistry;
