import { createLogger } from "@/utils/logger";

import type { PluginManifest, PluginState } from "@/plugin-system/types";

const logger = createLogger("PluginLoader");

/** Default sandbox attributes for plugin iframes */
const DEFAULT_SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox";

/** Timeout in milliseconds for iframe load */
const _LOAD_TIMEOUT_MS = 30_000;

/** Represents a plugin that has been loaded into an iframe */
export interface LoadedPlugin {
  pluginId: string;
  iframe: HTMLIFrameElement;
  origin: string;
  state: PluginState;
  loadedAt: number;
}

/** Options passed when loading a plugin to customise the iframe URL */
export interface PluginLoadOptions {
  /** Current UI language code, e.g. "zh-CN" */
  lang?: string;
  /** Current theme name, e.g. "edu-friendly" */
  theme?: string;
  /** Plugin version string, appended as ?v=xxx to bust cache */
  version?: string;
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
   * Ensure an already-loaded iframe is attached to the current visible container.
   */
  reattach(pluginId: string, container: HTMLElement): boolean {
    const record = this.loaded.get(pluginId);
    if (!record) {
      return false;
    }

    if (record.iframe.parentElement !== container) {
      container.appendChild(record.iframe);
      logger.info(
        `Plugin "${pluginId}" iframe reattached to the current container`
      );
    }

    return true;
  }

  /**
   * 加载插件：创建 iframe，等待加载，注入 Token。
   *
   * @param pluginId  插件唯一标识
   * @param manifest  插件清单
   * @param container 挂载 iframe 的 DOM 容器
   * @param options   可选的 lang/theme 参数，会附加到 iframe URL
   * @returns 已加载的插件记录
   */
  async load(
    pluginId: string,
    manifest: PluginManifest,
    container: HTMLElement,
    options?: PluginLoadOptions,
    onIframeCreated?: (iframe: HTMLIFrameElement) => void
  ): Promise<LoadedPlugin> {
    const existing = this.loaded.get(pluginId);
    if (existing) {
      // If the origin changed (e.g. local config overriding production URL),
      // unload the stale iframe so the new URL is loaded fresh.
      if (existing.origin !== manifest.allowedOrigin) {
        logger.info(
          `Plugin "${pluginId}" origin changed (${existing.origin} → ${manifest.allowedOrigin}), reloading`
        );
        this.unload(pluginId);
      } else {
        this.reattach(pluginId, container);
        logger.warn(`Plugin "${pluginId}" is already loaded, skipping`);
        return existing;
      }
    }

    // Build iframe URL with optional lang/theme/version query params
    const iframeUrl = this.buildPluginUrl(manifest.url, {
      ...options,
      version: options?.version ?? manifest.version,
    });

    logger.info(`Loading plugin "${pluginId}" from ${iframeUrl}`);

    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", manifest.sandbox ?? DEFAULT_SANDBOX);
    iframe.setAttribute("allow", "clipboard-write; clipboard-read");
    iframe.title = manifest.name;

    // Style: fill container
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";

    // Attach the load/error listeners before setting src to avoid missing
    // a fast load event on cached resources.
    const waitForLoadPromise = this.waitForLoad(iframe, pluginId);

    // Set the final src before appending so the first load event is for the
    // real plugin document instead of the implicit about:blank page.
    iframe.src = iframeUrl;

    const record: LoadedPlugin = {
      pluginId,
      iframe,
      origin: manifest.allowedOrigin,
      state: "loading",
      loadedAt: Date.now(),
    };

    this.loaded.set(pluginId, record);
    container.appendChild(iframe);

    // Register in MessageBus IMMEDIATELY after iframe is appended to DOM,
    // BEFORE waiting for load. The plugin sends PLUGIN_READY during onMounted
    // which fires before the iframe 'load' event. If we register after load,
    // PLUGIN_READY is discarded because the origin isn't registered yet.
    onIframeCreated?.(iframe);

    // Wait for iframe to finish loading before exposing it as active.
    try {
      await waitForLoadPromise;
      record.state = "active";
      record.loadedAt = Date.now();
      logger.info(`Plugin "${pluginId}" loaded successfully`);
      return record;
    } catch (error) {
      this.loaded.delete(pluginId);
      iframe.parentElement?.removeChild(iframe);
      throw error;
    }
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
      const onLoad = () => {
        cleanup();
        logger.debug(`waitForLoad("${pluginId}") load event received`);
        resolve();
      };

      const onError = () => {
        cleanup();
        reject(new Error(`Plugin "${pluginId}" iframe failed to load`));
      };

      const cleanup = () => {
        clearTimeout(timer);
        iframe.removeEventListener("load", onLoad);
        iframe.removeEventListener("error", onError);
      };

      iframe.addEventListener("load", onLoad, { once: true });
      iframe.addEventListener("error", onError, { once: true });

      const timer = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            `Plugin "${pluginId}" iframe load timed out after ${_LOAD_TIMEOUT_MS}ms`
          )
        );
      }, _LOAD_TIMEOUT_MS);
    });
  }

  /**
   * Send the INIT postMessage to the plugin iframe with token and config.
   * Public so that external callers (e.g. PluginSystem) can
   * trigger INIT after receiving PLUGIN_READY from the plugin.
   */
  public sendInitMessage(
    iframe: HTMLIFrameElement,
    manifest: PluginManifest,
    token?: string
  ): void {
    const jwt = token ?? this.getToken();
    const message = {
      type: "INIT" as const,
      id: `init-${manifest.id}-${Date.now()}`,
      payload: {
        token: jwt,
        config: JSON.parse(JSON.stringify(manifest.extraConfig ?? {})),
      },
    };

    iframe.contentWindow?.postMessage(message, manifest.allowedOrigin);
    logger.debug(`INIT message sent to plugin "${manifest.id}"`);
  }

  /**
   * Retrieve the current access token from the Token store.
   */
  public getToken(): string {
    try {
      // Dynamic import to avoid circular dependency at module level
      const tokenStore =
        require("@/store/modules/token").default ??
        require("@/store/modules/token");
      const tokenInfo = tokenStore.getToken?.();
      return tokenInfo?.accessToken || tokenInfo?.token || "";
    } catch {
      return "";
    }
  }

  /** Get the loaded iframe element for a plugin */
  public getIframe(pluginId: string): HTMLIFrameElement | undefined {
    return this.loaded.get(pluginId)?.iframe;
  }

  /**
   * Build the full iframe URL by appending lang/theme/version query parameters.
   */
  private buildPluginUrl(baseUrl: string, options?: PluginLoadOptions): string {
    if (!options) return baseUrl;
    const separator = baseUrl.includes("?") ? "&" : "?";
    const params: string[] = [];
    if (options.lang) params.push(`lang=${encodeURIComponent(options.lang)}`);
    if (options.theme)
      params.push(`theme=${encodeURIComponent(options.theme)}`);
    if (options.version)
      params.push(`v=${encodeURIComponent(options.version)}`);
    return params.length > 0
      ? `${baseUrl}${separator}${params.join("&")}`
      : baseUrl;
  }
}

export default PluginLoader;
