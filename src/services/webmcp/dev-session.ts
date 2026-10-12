import { createWebMcpDevFacade } from "./dev-facade";
import { WebMcpDevTransport, type WebMcpDevState } from "./dev-transport";
import type { WebMcpTool } from "./model-context";
import type { WebMcpToolRegistry } from "./tool-registry";

type SessionTransport = Pick<
  WebMcpDevTransport,
  "connect" | "reconnect" | "disconnect" | "getState" | "subscribe"
>;

export type WebMcpDevSessionOptions = {
  registry: WebMcpToolRegistry;
  getIdentity: () => string | null;
  subscribeIdentity: (listener: (force?: boolean) => void) => () => void;
  createTransport?: (tools: WebMcpTool[]) => SessionTransport;
};

/** Auth belongs to the application; only its opaque identity enters this layer. */
export function createWebMcpDevSession(options: WebMcpDevSessionOptions) {
  let boundIdentity: string | null = null;
  let observedIdentity = options.getIdentity();
  let generation = 0;
  let disposed = false;
  const assertActive = () => {
    if (
      disposed ||
      !boundIdentity ||
      boundIdentity !== options.getIdentity() ||
      transport.getState().status !== "connected"
    ) {
      throw new Error("AI 连接已失效，请重新连接并查询当前工具。");
    }
  };
  const tools = createWebMcpDevFacade(options.registry, assertActive);
  const transport = options.createTransport
    ? options.createTransport(tools)
    : new WebMcpDevTransport({ tools });

  const disconnect = () => {
    generation += 1;
    boundIdentity = null;
    transport.disconnect();
  };
  const revokeIdentity = () => {
    disconnect();
    options.registry.invalidate();
  };
  const unsubscribe = options.subscribeIdentity((force = false) => {
    const identity = options.getIdentity();
    if (force || identity !== observedIdentity) revokeIdentity();
    observedIdentity = identity;
  });

  const connect = async (registrationToken?: string) => {
    if (disposed) throw new Error("AI 连接已关闭。");
    const identity = options.getIdentity();
    if (!identity) throw new Error("请登录后再连接 AI 工具。");
    if (transport.getState().status === "connecting") {
      throw new Error("正在连接，请稍候。");
    }
    if (transport.getState().status === "connected") {
      throw new Error("请先断开当前连接。");
    }
    const currentGeneration = ++generation;
    boundIdentity = identity;
    try {
      if (registrationToken === undefined) await transport.reconnect();
      else await transport.connect(registrationToken);
      if (
        disposed ||
        generation !== currentGeneration ||
        identity !== options.getIdentity()
      ) {
        throw new Error("连接期间登录状态已变化，请重新连接。");
      }
    } catch (error) {
      // Do not tear down a newer connection when an older attempt completes late.
      if (generation === currentGeneration) {
        boundIdentity = null;
        transport.disconnect(false);
      }
      throw error;
    }
  };

  return {
    connect: (token: string) => connect(token),
    reconnect: () => connect(),
    disconnect,
    revokeIdentity,
    getState: () => transport.getState(),
    subscribe: (listener: (state: WebMcpDevState) => void) =>
      transport.subscribe(listener),
    dispose() {
      disposed = true;
      disconnect();
      unsubscribe();
    },
  };
}
