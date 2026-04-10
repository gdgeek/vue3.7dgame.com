import { createLogger } from "@/utils/logger";
import { PluginRegistry } from "@/plugin-system/core/PluginRegistry";
import { PluginLoader } from "@/plugin-system/core/PluginLoader";
import type { PluginLoadOptions } from "@/plugin-system/core/PluginLoader";
import { MessageBus } from "@/plugin-system/core/MessageBus";
import { AuthService } from "@/plugin-system/services/AuthService";
import { ConfigService } from "@/plugin-system/services/ConfigService";
import { useFileStore } from "@/store/modules/config";
import { postFile } from "@/api/v1/files";
import { postPolygen } from "@/api/v1/resources/index";
import { processModel } from "@/utils/modelProcessor";
import { useRouter } from "@/router";

import type {
  PluginState,
  PluginInfo,
  PluginManifest,
  PluginMessage,
} from "@/plugin-system/types";

const logger = createLogger("PluginSystem");
const HOST_UPLOAD_PLUGIN_ID = "3d-model-optimizer";
const HOST_UPLOAD_ACTION = "UPLOAD_POLYGEN_TO_LIBRARY";
const HOST_OPEN_LIBRARY_ACTION = "OPEN_POLYGEN_LIBRARY";
const HOST_PICK_RESOURCE_ACTION = "PICK_POLYGEN_RESOURCE";

type FileStoreLike = {
  fileMD5: (
    file: File,
    progress?: (progress: number) => void
  ) => Promise<string>;
  publicHandler: () => Promise<unknown>;
  fileHas: (
    md5: string,
    extension: string,
    handler: unknown,
    dir: string
  ) => Promise<boolean>;
  fileUpload: (
    md5: string,
    extension: string,
    file: File,
    progress: (progress: number) => void,
    handler: unknown,
    dir: string
  ) => Promise<unknown>;
  fileUrl: (
    name: string,
    extension: string,
    handler: unknown,
    dir: string
  ) => string;
};

type UploadPolygenRequestPayload = {
  action?: string;
  resourceName?: string;
  optimizedFile?: unknown;
  info?: string;
  path?: string;
  lang?: string;
  theme?: string;
};

type HostRequestHandler = (
  pluginId: string,
  action: string,
  payload: Record<string, unknown>
) => Promise<Record<string, unknown> | null | undefined>;

/** Valid state transitions: Map<fromState, Set<toState>> */
const VALID_TRANSITIONS: ReadonlyMap<
  PluginState,
  ReadonlySet<PluginState>
> = new Map<PluginState, ReadonlySet<PluginState>>([
  ["unloaded", new Set(["loading"])],
  ["loading", new Set(["active", "error", "unloaded"])],
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

  private hostRequestHandler: HostRequestHandler | null = null;

  /** Runtime plugin info keyed by pluginId */
  private plugins: Map<string, PluginInfo> = new Map();

  /** Token change unsubscribe handle */
  private tokenUnsubscribe: (() => void) | null = null;

  /** PLUGIN_READY message unsubscribe handle */
  private readyUnsubscribe: (() => void) | null = null;

  /** REQUEST message unsubscribe handle */
  private requestUnsubscribe: (() => void) | null = null;

  /** Whether initialize() has been called */
  private initialized = false;

  /** Deduplicates concurrent initialize() calls — stores the in-flight promise */
  private initPromise: Promise<void> | null = null;

  /** Deduplicates concurrent loadPlugin() calls per plugin */
  private loadPromises: Map<string, Promise<void>> = new Map();

  /** Monotonic version per plugin used to ignore stale async load completions */
  private loadVersions: Map<string, number> = new Map();

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

  setHostRequestHandler(handler: HostRequestHandler | null): void {
    this.hostRequestHandler = handler;
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

    this.requestUnsubscribe = this.messageBus.onMessageType(
      "REQUEST",
      (pluginId, message) => {
        void this.handlePluginRequest(pluginId, message);
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

    if (pluginInfo.state === "active" && this.loader.isLoaded(pluginId)) {
      this.loader.reattach(pluginId, container);
      this.sendInitToPlugin(pluginId);
      logger.debug(`loadPlugin("${pluginId}") skipped: already active`);
      return;
    }

    const existingPromise = this.loadPromises.get(pluginId);
    if (existingPromise) {
      logger.debug(`loadPlugin("${pluginId}") joining existing in-flight load`);
      return existingPromise;
    }

    logger.debug(`loadPlugin("${pluginId}") start`);

    const loadVersion = this.bumpLoadVersion(pluginId);
    const loadPromise = this.doLoadPlugin(
      pluginId,
      manifest,
      container,
      options,
      loadVersion
    ).finally(() => {
      if (this.loadPromises.get(pluginId) === loadPromise) {
        this.loadPromises.delete(pluginId);
      }
    });

    this.loadPromises.set(pluginId, loadPromise);
    return loadPromise;
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

    // Invalidate any in-flight load so its completion cannot reactivate the plugin.
    this.bumpLoadVersion(pluginId);

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

    // Reset handshake dedup so re-load can send INIT again
    this.initSentPlugins.delete(pluginId);

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
    if (this.requestUnsubscribe) {
      this.requestUnsubscribe();
      this.requestUnsubscribe = null;
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

  private async doLoadPlugin(
    pluginId: string,
    manifest: PluginManifest,
    container: HTMLElement,
    options: PluginLoadOptions | undefined,
    loadVersion: number
  ): Promise<void> {
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
          this.messageBus.registerPlugin(
            pluginId,
            iframe,
            manifest.allowedOrigin
          );
        }
      );

      logger.debug(
        `loadPlugin("${pluginId}") iframe loaded, origin=${loaded.origin}`
      );

      if (this.getLoadVersion(pluginId) !== loadVersion) {
        logger.debug(`loadPlugin("${pluginId}") stale completion ignored`);
        return;
      }

      const info = this.plugins.get(pluginId);
      if (info?.state === "loading") {
        this.transitionState(pluginId, "active");
      }

      // Send INIT after load as a fallback in case PLUGIN_READY arrived too early
      // or the iframe was reattached during route stabilization.
      this.sendInitToPlugin(pluginId);
    } catch (err) {
      if (this.getLoadVersion(pluginId) !== loadVersion) {
        logger.debug(`loadPlugin("${pluginId}") stale failure ignored`);
        return;
      }

      const errorMessage = err instanceof Error ? err.message : String(err);
      const info = this.plugins.get(pluginId);
      if (info?.state === "loading") {
        this.transitionState(pluginId, "error", errorMessage);
      }

      logger.error(`Failed to load plugin "${pluginId}":`, err);
    }
  }

  private getLoadVersion(pluginId: string): number {
    return this.loadVersions.get(pluginId) ?? 0;
  }

  private bumpLoadVersion(pluginId: string): number {
    const nextVersion = this.getLoadVersion(pluginId) + 1;
    this.loadVersions.set(pluginId, nextVersion);
    return nextVersion;
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
  /** Track plugins that have already completed handshake to avoid duplicate INIT */
  private initSentPlugins: Set<string> = new Set();

  private handlePluginReady(pluginId: string): void {
    const info = this.plugins.get(pluginId);
    if (!info) {
      logger.warn(`Received PLUGIN_READY from unknown plugin: ${pluginId}`);
      return;
    }

    // Re-send INIT when the plugin asks again. This helps iframe plugins recover
    // after reattachment or delayed bootstrapping without forcing a manual reopen.
    if (this.initSentPlugins.has(pluginId)) {
      logger.debug(
        `Re-sending INIT for duplicate PLUGIN_READY from "${pluginId}"`
      );
      this.sendInitToPlugin(pluginId);
      return;
    }

    // Only transition if still loading (proactive path already sets active)
    if (info.state === "loading") {
      this.transitionState(pluginId, "active");
    }

    this.initSentPlugins.add(pluginId);
    this.sendInitToPlugin(pluginId);
  }

  /**
   * Send INIT message to an already-registered plugin.
   * Safe to call regardless of plugin state — no state transition performed.
   */
  private sendInitToPlugin(pluginId: string): void {
    const manifest = this.registry.get(pluginId);
    if (!manifest) {
      logger.warn(`sendInit("${pluginId}") — no manifest found`);
      return;
    }

    const iframe = this.loader.getIframe(pluginId);
    if (!iframe) {
      logger.warn(`sendInit("${pluginId}") — no iframe found`);
      return;
    }

    const token = this.authService.getAccessToken() || "";
    logger.debug(
      `sendInit("${pluginId}") token=${token ? "(present)" : "(empty)"}`
    );
    this.loader.sendInitMessage(iframe, manifest, token);
  }

  private async handlePluginRequest(
    pluginId: string,
    message: PluginMessage
  ): Promise<void> {
    const payload = (message.payload ?? {}) as UploadPolygenRequestPayload &
      Record<string, unknown>;
    const action = typeof payload.action === "string" ? payload.action : "";

    try {
      let result: Record<string, unknown> = {};

      if (pluginId === HOST_UPLOAD_PLUGIN_ID && action === HOST_UPLOAD_ACTION) {
        result = await this.uploadPolygenFromPlugin(payload);
      } else if (
        pluginId === HOST_UPLOAD_PLUGIN_ID &&
        action === HOST_OPEN_LIBRARY_ACTION
      ) {
        result = await this.openPolygenLibraryFromPlugin(payload);
      } else if (
        pluginId === HOST_UPLOAD_PLUGIN_ID &&
        action === HOST_PICK_RESOURCE_ACTION &&
        this.hostRequestHandler
      ) {
        const handlerResult = await this.hostRequestHandler(
          pluginId,
          action,
          payload
        );
        if (!handlerResult) {
          return;
        }
        result = handlerResult;
      } else {
        return;
      }

      this.sendPluginResponse(pluginId, message.id, {
        ok: true,
        result,
      });
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "上传素材库失败";
      logger.error(`Host request failed for plugin "${pluginId}":`, error);
      this.sendPluginResponse(pluginId, message.id, {
        ok: false,
        error: messageText,
      });
    }
  }

  private async openPolygenLibraryFromPlugin(
    payload: UploadPolygenRequestPayload
  ) {
    const router = useRouter();
    const path =
      typeof payload.path === "string" && payload.path.trim()
        ? payload.path.trim()
        : "/resource/polygen/index";
    const query: Record<string, string> = {};

    if (typeof payload.lang === "string" && payload.lang.trim()) {
      query.lang = payload.lang.trim();
    }
    if (typeof payload.theme === "string" && payload.theme.trim()) {
      query.theme = payload.theme.trim();
    }

    await router.push({
      path,
      ...(Object.keys(query).length ? { query } : {}),
    });

    return {
      path,
    };
  }

  private sendPluginResponse(
    pluginId: string,
    requestId: string,
    payload: Record<string, unknown>
  ): void {
    this.messageBus.sendToPlugin(pluginId, {
      type: "RESPONSE",
      id: `response-${pluginId}-${Date.now()}`,
      requestId,
      payload,
    });
  }

  private async uploadPolygenFromPlugin(payload: UploadPolygenRequestPayload) {
    const optimizedFile = this.asFile(payload.optimizedFile);
    if (!optimizedFile) {
      throw new Error("缺少待上传的优化模型文件");
    }

    const resourceName =
      typeof payload.resourceName === "string" && payload.resourceName.trim()
        ? payload.resourceName.trim()
        : optimizedFile.name;
    const info =
      typeof payload.info === "string" && payload.info.trim()
        ? payload.info
        : undefined;

    let finalInfo = info;
    let imageId: number | undefined;

    try {
      const processed = await processModel(optimizedFile);
      finalInfo = processed.info || finalInfo;
      const imageUpload = await this.uploadFileRecord(
        processed.image,
        "screenshot/polygen"
      );
      imageId = imageUpload.fileId;
    } catch (error) {
      logger.warn(
        `Auto-generating polygen thumbnail failed for plugin "${HOST_UPLOAD_PLUGIN_ID}"`,
        error
      );
    }

    const modelUpload = await this.uploadFileRecord(optimizedFile, "polygen");
    const resourceResponse = await postPolygen({
      name: resourceName,
      file_id: modelUpload.fileId,
      ...(finalInfo ? { info: finalInfo } : {}),
      ...(imageId ? { image_id: imageId } : {}),
    });

    return {
      fileId: modelUpload.fileId,
      imageId: imageId ?? null,
      resourceId: resourceResponse.data?.id ?? null,
    };
  }

  private async uploadFileRecord(file: File, directory: string) {
    const fileStore = useFileStore().store as unknown as FileStoreLike;
    const handler = await fileStore.publicHandler();
    const extension = this.getFileExtension(file);
    const md5 = await fileStore.fileMD5(file);
    const has = await fileStore.fileHas(md5, extension, handler, directory);

    if (!has) {
      await fileStore.fileUpload(
        md5,
        extension,
        file,
        () => {},
        handler,
        directory
      );
    }

    const response = await postFile({
      filename: file.name,
      md5,
      key: `${md5}${extension}`,
      url: fileStore.fileUrl(md5, extension, handler, directory),
    });

    return {
      fileId: response.data.id,
      md5,
      extension,
    };
  }

  private getFileExtension(file: File): string {
    const name = file.name || "";
    const lastDotIndex = name.lastIndexOf(".");
    return lastDotIndex >= 0 ? name.slice(lastDotIndex) : "";
  }

  private asFile(value: unknown): File | null {
    if (
      value &&
      typeof value === "object" &&
      typeof (value as File).name === "string" &&
      typeof (value as File).size === "number" &&
      typeof (value as File).slice === "function"
    ) {
      return value as File;
    }

    return null;
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
