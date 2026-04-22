import type { App } from "vue";
import { PluginSystem } from "./core/PluginSystem";

/** Singleton PluginSystem instance */
const pluginSystem = new PluginSystem();

/** Vue plugin install method — use via `app.use(pluginSystemPlugin)` */
function install(app: App): void {
  app.provide("pluginSystem", pluginSystem);
  app.config.globalProperties.$pluginSystem = pluginSystem;
}

export { pluginSystem, install };
export { resolveI18nName } from "./utils/i18n";
export type { PluginSystem };
export type { PluginLoadOptions } from "./core/PluginLoader";

// Re-export types for convenience
export type {
  PluginAccessScope,
  PluginState,
  PluginInfo,
  PluginMessage,
  PluginMessageType,
  PluginManifest,
  PluginsConfig,
  MenuGroup,
  ValidationResult,
} from "./types";
