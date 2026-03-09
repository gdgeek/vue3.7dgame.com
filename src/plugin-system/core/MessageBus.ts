import { createLogger } from "@/utils/logger";

import type { PluginMessage } from "@/plugin-system/types";

const logger = createLogger("MessageBus");

/** Handler invoked when a message is received from a plugin */
export type MessageHandler = (pluginId: string, message: PluginMessage) => void;

/** Function that removes a subscription when called */
export type Unsubscribe = () => void;

/** Internal record for a registered plugin connection */
interface PluginConnection {
  iframe: HTMLIFrameElement;
  origin: string;
}

/**
 * PostMessage 双向通信总线
 *
 * 管理主框架与 iframe 插件之间的所有 PostMessage 通信。
 * 负责 origin 验证、消息路由和订阅分发。
 */
export class MessageBus {
  /** pluginId → iframe + origin */
  private connections: Map<string, PluginConnection> = new Map();

  /** General message handlers (receive all messages) */
  private handlers: Set<MessageHandler> = new Set();

  /** Type-specific message handlers keyed by message type */
  private typeHandlers: Map<string, Set<MessageHandler>> = new Map();

  /** Bound reference for cleanup */
  private readonly messageListener: (event: MessageEvent) => void;

  constructor() {
    this.messageListener = this.handleMessage.bind(this);
    window.addEventListener("message", this.messageListener);
    logger.info("MessageBus initialized");
  }

  /** 向指定插件发送消息 */
  sendToPlugin(pluginId: string, message: PluginMessage): void {
    const connection = this.connections.get(pluginId);
    if (!connection) {
      logger.warn(`Cannot send message: plugin "${pluginId}" not registered`);
      return;
    }

    connection.iframe.contentWindow?.postMessage(message, connection.origin);
  }

  /** 广播消息到所有活跃插件 */
  broadcast(message: PluginMessage): void {
    for (const [pluginId, connection] of this.connections) {
      connection.iframe.contentWindow?.postMessage(message, connection.origin);
      logger.debug(
        `Broadcast message to plugin "${pluginId}": ${message.type}`
      );
    }
  }

  /** 订阅来自插件的所有消息 */
  onMessage(handler: MessageHandler): Unsubscribe {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /** 订阅特定类型的消息 */
  onMessageType(type: string, handler: MessageHandler): Unsubscribe {
    let set = this.typeHandlers.get(type);
    if (!set) {
      set = new Set();
      this.typeHandlers.set(type, set);
    }
    set.add(handler);

    return () => {
      const current = this.typeHandlers.get(type);
      if (current) {
        current.delete(handler);
        if (current.size === 0) {
          this.typeHandlers.delete(type);
        }
      }
    };
  }

  /** 注册插件 iframe 连接 */
  registerPlugin(
    pluginId: string,
    iframe: HTMLIFrameElement,
    origin: string
  ): void {
    this.connections.set(pluginId, { iframe, origin });
    logger.info(
      `Plugin connection registered: ${pluginId} (origin: ${origin})`
    );
  }

  /** 注销插件连接 */
  unregisterPlugin(pluginId: string): void {
    const existed = this.connections.delete(pluginId);
    if (existed) {
      logger.info(`Plugin connection unregistered: ${pluginId}`);
    } else {
      logger.warn(`Plugin connection not found for unregister: ${pluginId}`);
    }
  }

  /** 销毁，移除所有监听器 */
  destroy(): void {
    window.removeEventListener("message", this.messageListener);
    this.connections.clear();
    this.handlers.clear();
    this.typeHandlers.clear();
    logger.info("MessageBus destroyed");
  }

  /**
   * Internal handler for incoming postMessage events.
   * Verifies origin against registered plugins before dispatching.
   */
  private handleMessage(event: MessageEvent): void {
    // Find the plugin whose registered origin matches the event origin
    const pluginId = this.findPluginByOrigin(event.origin);
    if (!pluginId) {
      logger.warn(
        `Message from unregistered origin discarded: ${event.origin}`
      );
      return;
    }

    const message = event.data as PluginMessage;

    // Dispatch to general handlers
    for (const handler of this.handlers) {
      try {
        handler(pluginId, message);
      } catch (err) {
        logger.error(`Error in general message handler:`, err);
      }
    }

    // Dispatch to type-specific handlers
    const typeSet = this.typeHandlers.get(message.type);
    if (typeSet) {
      for (const handler of typeSet) {
        try {
          handler(pluginId, message);
        } catch (err) {
          logger.error(`Error in type handler for "${message.type}":`, err);
        }
      }
    }
  }

  /** Resolve a pluginId from an event origin */
  private findPluginByOrigin(origin: string): string | undefined {
    for (const [pluginId, connection] of this.connections) {
      if (connection.origin === origin) {
        return pluginId;
      }
    }
    return undefined;
  }
}

export default MessageBus;
