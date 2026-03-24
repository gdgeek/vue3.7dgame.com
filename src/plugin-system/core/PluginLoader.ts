import { createLogger } from "@/utils/logger";

import type { PluginManifest, PluginState } from "@/plugin-system/types";

const logger = createLogger("PluginLoader");

/** Default sandbox attributes for plugin iframes */
const DEFAULT_SANDBOX = "allow-scripts allow-same-origin";

/** Timeout in milliseconds for iframe load */
const LOAD_TIMEOUT_MS = 30_000;

/** Represents a plugin that has been loaded into an iframe */
export interface LoadedPlugin {
  pluginId: string;
  iframe: HTMLIFrameElement;
  origin: string;
  state: PluginState;
  loadedAt: number;
}

/**
 * PluginLoader — iframe 创建 + Token 注入
 *
 * 负责创建 iframe、设置 sandbox/src、等待加载完成、
 * 发送 INIT 消息注入 Token，以及卸载时销毁 iframe。
 */
export class PluginLoader {
  private loaded: Map<string, LoadedPlugin> = new Map();

  /**
   * 加载插件：创建 iframe，等待加载，注入 Token。
   *
   * @param pluginId  插件唯一标识
   * @param manifest  插件清单
   * @param container 挂载 iframe 的 DOM 容器
   * @returns 已加载的插件记录
   */
  async load(
    pluginId: string,
    manifest: PluginManifest,
    container: HTMLElement
  ): Promise<LoadedPlugin> {
    if (this.loaded.has(pluginId)) {
      logger.warn(`Plugin "${pluginId}" is already loaded, skipping`);
      return this.loaded.get(pluginId)!;
    }

    logger.info(`Loading plugin "${pluginId}" from ${manifest.url}`);

    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", manifest.sandbox ?? DEFAULT_SANDBOX);
    iframe.src = manifest.url;

    // Style: fill container
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";

    container.appendChild(iframe);

    // Wait for iframe to finish loading with timeout
    await this.waitForLoad(iframe, pluginId);

    const record: LoadedPlugin = {
      pluginId,
      iframe,
      origin: manifest.allowedOrigin,
      state: "active",
      loadedAt: Date.now(),
    };

    this.loaded.set(pluginId, record);
    logger.info(`Plugin "${pluginId}" loaded successfully`);

    return record;
  }

  /** 卸载插件：销毁 iframe，释放资源 */
  unload(pluginId: string): void {
    const record = this.loaded.get(pluginId);
    if (!record) {
      logger.warn(`Cannot unload: plugin "${pluginId}" not found`);
      return;
    }

    record.iframe.parentElement?.removeChild(record.iframe);
    this.loaded.delete(pluginId);
    logger.info(`Plugin "${pluginId}" unloaded`);
  }

  /** 获取已加载的插件 */
  getLoaded(pluginId: string): LoadedPlugin | undefined {
    return this.loaded.get(pluginId);
  }

  /** 检查是否已加载 */
  isLoaded(pluginId: string): boolean {
    return this.loaded.has(pluginId);
  }

  /**
   * Wait for the iframe 'load' event, rejecting on timeout.
   */
  private waitForLoad(
    iframe: HTMLIFrameElement,
    pluginId: string
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        iframe.removeEventListener("load", onLoad);
        reject(
          new Error(
            `Plugin "${pluginId}" iframe load timed out after ${LOAD_TIMEOUT_MS}ms`
          )
        );
      }, LOAD_TIMEOUT_MS);

      const onLoad = () => {
        clearTimeout(timer);
        resolve();
      };

      iframe.addEventListener("load", onLoad, { once: true });
    });
  }

  /**
   * Send the INIT postMessage to the plugin iframe with token and config.
   * Public so that external callers (e.g. PluginLayout, PluginSystem) can
   * trigger INIT after receiving PLUGIN_READY from the plugin.
   */
  public sendInitMessage(
    iframe: HTMLIFrameElement,
    manifest: PluginManifest
  ): void {
    const message = {
      type: "INIT" as const,
      id: `init-${manifest.id}-${Date.now()}`,
      payload: {
        token: this.getToken(),
        config: manifest.extraConfig ?? {},
      },
    };

    iframe.contentWindow?.postMessage(message, manifest.allowedOrigin);
    logger.debug(`INIT message sent to plugin "${manifest.id}"`);
  }

  /**
   * Retrieve the current access token.
   * Extracted as a method so it can be overridden or extended
   * when AuthService integration is wired up.
   */
  public getToken(): string {
    // Placeholder — PluginSystem will coordinate with AuthService
    // to provide the real token. For now return empty string.
    return "";
  }
}

export default PluginLoader;
