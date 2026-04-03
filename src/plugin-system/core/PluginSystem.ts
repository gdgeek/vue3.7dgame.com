import { createLogger } from "@/utils/logger";
import { PluginRegistry } from "@/plugin-system/core/PluginRegistry";
import { PluginLoader } from "@/plugin-system/core/PluginLoader";
import type { PluginLoadOptions } from "@/plugin-system/core/PluginLoader";
import { MessageBus } from "@/plugin-system/core/MessageBus";
import { AuthService } from "@/plugin-system/services/AuthService";
import { ConfigService } from "@/plugin-system/services/ConfigService";

import type {
  PluginState,
  PluginInfo,
  PluginManifest,
} from "@/plugin-system/types";

const logger = createLogger("PluginSystem");

/** Valid state transitions: Map<fromState, Set<toState>> */
const VALID_TRANSITIONS: ReadonlyMap<
  PluginState,
  ReadonlySet<PluginState>
> = new Map<PluginState, ReadonlySet<PluginState>>([
  ["unloaded", new Set(["loading"])],
  ["loading", new Set(["active", "error"])],
  ["active", new Set(["unloaded", "error"])],
  ["error", new Set(["loading", "unloaded"])],
]);

/**
 * PluginSystem — 核心协调器
 *
 * 协调 PluginRegistry / PluginLoader / MessageBus / AuthService / ConfigService，
 * 管理插件生命周期和状态机。
 *
 * 状态机：unloaded → loading → active | error
 *         active → unloaded
 *         error → loading | unloaded
 */
export class PluginSystem {
  private readonly registry: PluginRegistry;
  private readonly loader: PluginLoader;
  private readonly messageBus: MessageBus;
  private readonly authService: AuthService;
  private readonly configService: ConfigService;

  /** Runtime plugin info keyed by pluginId */
  private plugins: Map<string, PluginInfo> = new Map();

  /** Token change unsubscribe handle */
  private tokenUnsubscribe: (() => void) | null = null;

  /** PLUGIN_READY message unsubscribe handle */
  private readyUnsubscribe: (() => void) | null = null;

  /** Whether initialize() has been called */
  private initialized = false;

  /** Deduplicates concurrent initialize() calls — stores the in-flight promise */
  private initPromise: Promise<void> | null = null;

  constructor(
    registry?: PluginRegistry,
    loader?: PluginLoader,
    messageBus?: MessageBus,
    authService?: AuthService,
    configService?: ConfigService
  ) {
    this.registry = registry ?? new PluginRegistry();
    this.loader = loader ?? new PluginLoader();
    this.messageBus = messageBus ?? new MessageBus();
    this.authService = authService ?? new AuthService();
    this.configService = configService ?? new ConfigService();
  }

  /**
   * 初始化插件系统：加载配置，注册所有启用的插件，设置 Token 变化监听。
   *
   * 并发安全：多个调用方同时 await initialize() 时，只会执行一次初始化逻辑，
   * 所有调用方都会等待同一个 promise 完成。
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn("PluginSystem already initialized");
      return;
    }

    // Deduplicate concurrent calls: return the in-flight promise if one exists
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async _doInitialize(): Promise<void> {
    logger.info("Initializing PluginSystem...");

    const config = await this.configService.loadConfig();

    // Register all enabled plugins from config
    for (const manifest of config.plugins) {
      if (!manifest.enabled) {
        logger.debug(`Skipping disabled plugin: ${manifest.id}`);
        continue;
      }

      try {
        this.registry.register(manifest);
        this.plugins.set(manifest.id, this.createPluginInfo(manifest));
        logger.info(
          `[${new Date().toISOString()}] Plugin "${manifest.id}" state: unloaded`
        );
      } catch (err) {
        logger.error(`Failed to register plugin "${manifest.id}":`, err);
      }
    }

    // Listen for token changes and broadcast to all active plugins
    this.tokenUnsubscribe = this.authService.onTokenChange((token) => {
      logger.info("Token changed, broadcasting TOKEN_UPDATE to active plugins");
      this.messageBus.broadcast({
        type: "TOKEN_UPDATE",
        id: `token-update-${Date.now()}`,
        payload: { token },
      });
    });

    // Listen for PLUGIN_READY messages from plugins
    this.readyUnsubscribe = this.messageBus.onMessageType(
      "PLUGIN_READY",
      (pluginId) => {
        this.handlePluginReady(pluginId);
      }
    );

    this.initialized = true;
    logger.info("PluginSystem initialized successfully");
  }

  /**
   * 加载并激活插件（创建 iframe）。
   *
   * 状态转换：unloaded → loading → active（或 → error）
   *
   * @param pluginId  插件唯一标识
   * @param container 挂载 iframe 的 DOM 容器
   * @param options   可选的 lang/theme 参数
   */
  async loadPlugin(
    pluginId: string,
    container: HTMLElement,
    options?: PluginLoadOptions
  ): Promise<void> {
    const pluginInfo = this.plugins.get(pluginId);
    if (!pluginInfo) {
      throw new Error(`Plugin "${pluginId}" is not registered`);
    }

    const manifest = this.registry.get(pluginId);
    if (!manifest) {
      throw new Error(`Plugin manifest not found for "${pluginId}"`);
    }

    console.log(
      `[PluginSystem:handshake] loadPlugin("${pluginId}") start, url=${manifest.url}, allowedOrigin=${manifest.allowedOrigin}`
    );

    // Transition: current → loading
    this.transitionState(pluginId, "loading");

    try {
      const loaded = await this.loader.load(
        pluginId,
        manifest,
        container,
        options,
        // Register in MessageBus as soon as iframe is in DOM (before load event),
        // so PLUGIN_READY from the plugin is not discarded.
        (iframe) => {
          console.log(
            `[PluginSystem:handshake] loadPlugin("${pluginId}") iframe created, registering in MessageBus early`
          );
          this.messageBus.registerPlugin(
            pluginId,
            iframe,
            manifest.allowedOrigin
          );
        }
      );

      console.log(
        `[PluginSystem:handshake] loadPlugin("${pluginId}") iframe loaded, origin=${loaded.origin}`
      );

      // Transition: loading → active
      this.transitionState(pluginId, "active");

      // Do NOT proactively send INIT here — the iframe may not have finished
      // loading its JS bundle yet. Instead, wait for PLUGIN_READY from the plugin,
      // which is handled by handlePluginReady → sendInitToPlugin.
      console.log(
        `[PluginSystem:handshake] loadPlugin("${pluginId}") waiting for PLUGIN_READY from plugin...`
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Transition: loading → error
      this.transitionState(pluginId, "error", errorMessage);

      logger.error(`Failed to load plugin "${pluginId}":`, err);
    }
  }

  /**
   * 卸载插件（销毁 iframe，清理资源）。
   *
   * 状态转换：active → unloaded 或 error → unloaded
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const pluginInfo = this.plugins.get(pluginId);
    if (!pluginInfo) {
      logger.warn(`Cannot unload: plugin "${pluginId}" not registered`);
      return;
    }

    if (pluginInfo.state === "unloaded") {
      logger.warn(`Plugin "${pluginId}" is already unloaded`);
      return;
    }

    // Send DESTROY message before unloading
    if (pluginInfo.state === "active") {
      this.messageBus.sendToPlugin(pluginId, {
        type: "DESTROY",
        id: `destroy-${pluginId}-${Date.now()}`,
      });
    }

    // Unload iframe
    this.loader.unload(pluginId);

    // Unregister from MessageBus
    this.messageBus.unregisterPlugin(pluginId);

    // Transition to unloaded
    this.transitionState(pluginId, "unloaded");
  }

  /** 获取插件运行状态 */
  getPluginState(pluginId: string): PluginState {
    const info = this.plugins.get(pluginId);
    if (!info) {
      throw new Error(`Plugin "${pluginId}" is not registered`);
    }
    return info.state;
  }

  /** 获取所有已注册插件 */
  getAllPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values());
  }

  /** 获取插件配置 */
  getConfig() {
    return this.configService.getConfig();
  }

  /** 销毁插件系统，卸载所有插件并清理资源 */
  async destroy(): Promise<void> {
    logger.info("Destroying PluginSystem...");

    // Unload all active/error plugins
    const unloadPromises: Promise<void>[] = [];
    for (const [pluginId, info] of this.plugins) {
      if (info.state !== "unloaded") {
        unloadPromises.push(this.unloadPlugin(pluginId));
      }
    }
    await Promise.all(unloadPromises);

    // Cleanup subscriptions
    if (this.tokenUnsubscribe) {
      this.tokenUnsubscribe();
      this.tokenUnsubscribe = null;
    }
    if (this.readyUnsubscribe) {
      this.readyUnsubscribe();
      this.readyUnsubscribe = null;
    }

    // Destroy sub-modules
    this.messageBus.destroy();
    this.authService.destroy();

    this.plugins.clear();
    this.initialized = false;

    logger.info("PluginSystem destroyed");
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Create initial PluginInfo from a manifest (state = unloaded) */
  private createPluginInfo(manifest: PluginManifest): PluginInfo {
    return {
      pluginId: manifest.id,
      name: manifest.name,
      nameI18n: manifest.nameI18n,
      description: manifest.description,
      icon: manifest.icon,
      group: manifest.group,
      state: "unloaded",
      enabled: manifest.enabled,
      order: manifest.order,
    };
  }

  /**
   * Transition a plugin to a new state, enforcing the state machine.
   * Logs every transition with pluginId and timestamp.
   */
  private transitionState(
    pluginId: string,
    newState: PluginState,
    errorMessage?: string
  ): void {
    const info = this.plugins.get(pluginId);
    if (!info) {
      throw new Error(`Plugin "${pluginId}" not found for state transition`);
    }

    const oldState = info.state;
    const allowed = VALID_TRANSITIONS.get(oldState);

    if (!allowed || !allowed.has(newState)) {
      throw new Error(
        `Invalid state transition for plugin "${pluginId}": ${oldState} → ${newState}`
      );
    }

    info.state = newState;

    if (newState === "error" && errorMessage) {
      info.lastError = errorMessage;
    }

    if (newState !== "error") {
      info.lastError = undefined;
    }

    logger.info(
      `[${new Date().toISOString()}] Plugin "${pluginId}" state: ${oldState} → ${newState}`
    );
  }

  /** Handle PLUGIN_READY message — transition loading → active if needed, then send INIT */
  private handlePluginReady(pluginId: string): void {
    console.log(`[PluginSystem:handshake] handlePluginReady("${pluginId}")`);
    const info = this.plugins.get(pluginId);
    if (!info) {
      logger.warn(`Received PLUGIN_READY from unknown plugin: ${pluginId}`);
      return;
    }

    console.log(
      `[PluginSystem:handshake] plugin state="${info.state}", sending INIT...`
    );

    // Only transition if still loading (proactive path already sets active)
    if (info.state === "loading") {
      this.transitionState(pluginId, "active");
    }

    this.sendInitToPlugin(pluginId);
  }

  /**
   * Send INIT message to an already-registered plugin.
   * Safe to call regardless of plugin state — no state transition performed.
   */
  private sendInitToPlugin(pluginId: string): void {
    const manifest = this.registry.get(pluginId);
    if (!manifest) {
      console.warn(
        `[PluginSystem:handshake] sendInit("${pluginId}") — no manifest found`
      );
      return;
    }

    const iframe = this.loader.getIframe(pluginId);
    if (!iframe) {
      console.warn(
        `[PluginSystem:handshake] sendInit("${pluginId}") — no iframe found`
      );
      return;
    }

    const token = this.authService.getAccessToken() || "";
    console.log(
      `[PluginSystem:handshake] sendInit("${pluginId}") token=${token ? token.slice(0, 20) + "..." : "(empty)"}, iframeSrc=${iframe.src}`
    );
    this.loader.sendInitMessage(iframe, manifest, token);
  }

  /**
   * 广播主题变更到所有活跃插件。
   * 供外部（如 PluginLayout）在主题切换时调用。
   */
  broadcastThemeChange(theme: string, dark: boolean): void {
    this.messageBus.broadcast({
      type: "THEME_CHANGE",
      id: `theme-change-${Date.now()}`,
      payload: { theme, dark },
    });
  }

  /**
   * 广播语言变更到所有活跃插件。
   * 供外部（如 PluginLayout）在语言切换时调用。
   */
  broadcastLangChange(lang: string): void {
    this.messageBus.broadcast({
      type: "LANG_CHANGE",
      id: `lang-change-${Date.now()}`,
      payload: { lang },
    });
  }

  /** 获取 PluginLoader 实例（供视图层获取 iframe 引用） */
  getLoader(): PluginLoader {
    return this.loader;
  }
}

export default PluginSystem;
