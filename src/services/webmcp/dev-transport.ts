import type { WebMcpTool } from "./model-context";

export type WebMcpDevState = {
  status: "disconnected" | "connecting" | "connected" | "error";
  error: string | null;
  canReconnect: boolean;
};

export type WebMcpDevTransportOptions = {
  tools: WebMcpTool[];
  host?: string;
  createWebSocket?: (url: string) => WebSocket;
  locks?: Pick<LockManager, "request"> | null;
  handshakeTimeoutMs?: number;
};

type Session = { server: string; token: string; channel: string };
type Attempt = {
  lifecycle: AbortController;
  sockets: Set<WebSocket>;
};
type Message = Record<string, unknown>;

const LOCK_NAME = "xrugc-webmcp-dev-connection";
const CANCELLED = "连接已取消。";
const TIMEOUT = "连接超时，请确认本机桥接程序已启动后重新配对。";
const CONNECTION_FAILED = "本机桥接连接失败，请重新连接或获取新令牌。";
const INVALID_RESPONSE = "本机桥接返回了无效的握手或工具注册回执。";

const isRecord = (value: unknown): value is Message =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseMessage = (data: unknown): Message => {
  if (typeof data !== "string") throw new Error(INVALID_RESPONSE);
  const message: unknown = JSON.parse(data);
  if (!isRecord(message)) throw new Error(INVALID_RESPONSE);
  return message;
};

const isToken = (token: unknown): token is string =>
  typeof token === "string" && /^[a-f\d]{16,256}$/i.test(token);

/** Parse only a local bridge endpoint; never echo token or URL in errors. */
const parseRegistration = (encoded: string): Omit<Session, "channel"> => {
  try {
    if (encoded.length > 4096) throw new Error();
    const data: unknown = JSON.parse(atob(encoded.trim()));
    if (!isRecord(data) || !isToken(data.token)) throw new Error();
    if (typeof data.server !== "string") throw new Error();
    // Check the literal authority too: URL normalizes alternate IP encodings.
    if (
      !/^wss?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?\/?$/.test(
        data.server
      )
    ) {
      throw new Error();
    }
    const server = new URL(data.server);
    if (server.port === "0") throw new Error();
    return { server: server.origin, token: data.token };
  } catch {
    throw new Error(
      "连接令牌无效；仅支持 localhost、127.0.0.1 或 [::1] 本机桥接。"
    );
  }
};

const toolDefinition = ({ name, description, inputSchema }: WebMcpTool) => ({
  name,
  description,
  inputSchema,
});

const asMcpResult = (value: unknown) => {
  if (isRecord(value) && Array.isArray(value.content)) return value;
  return {
    content: [{ type: "text", text: JSON.stringify(value ?? null) }],
  };
};

/**
 * Browser half of @jason.today/webmcp@0.1.13. Tokens and the session live only
 * in this instance. Losing a socket never retries a tool or cancels a write.
 */
export class WebMcpDevTransport {
  private state: WebMcpDevState = {
    status: "disconnected",
    error: null,
    canReconnect: false,
  };
  private readonly listeners = new Set<(state: WebMcpDevState) => void>();
  private readonly tools: Map<string, WebMcpTool>;
  private session: Session | null = null;
  private attempt: Attempt | null = null;
  private lockRequest: Promise<unknown> = Promise.resolve();

  constructor(private readonly options: WebMcpDevTransportOptions) {
    this.tools = new Map(options.tools.map((tool) => [tool.name, tool]));
  }

  getState(): WebMcpDevState {
    return { ...this.state };
  }

  subscribe(listener: (state: WebMcpDevState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  async connect(registrationToken: string): Promise<void> {
    this.disconnect();
    const attempt = this.begin();
    try {
      const registration = parseRegistration(registrationToken);
      const host = (this.options.host ?? window.location.host).replace(
        /[.:]/g,
        "_"
      );
      if (!/^[\w[\]-]+$/.test(host)) throw new Error(INVALID_RESPONSE);
      await this.acquireLock(attempt);
      this.assertCurrent(attempt);
      const session = await this.register(attempt, registration, host);
      this.assertCurrent(attempt);
      this.session = session;
      await this.openChannel(attempt, session);
    } catch (error) {
      this.fail(attempt, error);
      throw error;
    }
  }

  async reconnect(): Promise<void> {
    const session = this.session;
    if (!session) throw new Error("没有可重连的会话，请获取新令牌重新配对。");
    this.disconnect(false);
    const attempt = this.begin();
    try {
      await this.acquireLock(attempt);
      this.assertCurrent(attempt);
      await this.openChannel(attempt, session);
    } catch (error) {
      this.fail(attempt, error);
      throw error;
    }
  }

  disconnect(clearSession = true): void {
    this.disposeAttempt();
    if (clearSession) this.session = null;
    this.update("disconnected", null);
  }

  private begin(): Attempt {
    const attempt = {
      lifecycle: new AbortController(),
      sockets: new Set<WebSocket>(),
    };
    this.attempt = attempt;
    this.update("connecting", null);
    return attempt;
  }

  private update(status: WebMcpDevState["status"], error: string | null): void {
    this.state = { status, error, canReconnect: this.session !== null };
    this.listeners.forEach((listener) => listener(this.getState()));
  }

  private isCurrent(attempt: Attempt): boolean {
    return this.attempt === attempt && !attempt.lifecycle.signal.aborted;
  }

  private assertCurrent(attempt: Attempt): void {
    if (!this.isCurrent(attempt)) throw new Error(CANCELLED);
  }

  private disposeAttempt(): void {
    const attempt = this.attempt;
    this.attempt = null;
    if (!attempt) return;
    attempt.lifecycle.abort();
    attempt.sockets.forEach((socket) => socket.close());
    attempt.sockets.clear();
  }

  private fail(attempt: Attempt, error: unknown): void {
    if (!this.isCurrent(attempt)) return;
    this.disposeAttempt();
    this.update(
      "error",
      error instanceof Error ? error.message : CONNECTION_FAILED
    );
  }

  private async acquireLock(attempt: Attempt): Promise<void> {
    // Releasing Web Locks is asynchronous. A same-tab reconnect must wait for
    // its previous lock callback to settle before using ifAvailable again.
    await this.lockRequest;
    this.assertCurrent(attempt);
    const locks =
      this.options.locks === undefined ? navigator.locks : this.options.locks;
    if (!locks) {
      return Promise.reject(
        new Error("浏览器不支持 Web Locks，请在安全上下文中使用 Chrome。")
      );
    }
    const { signal } = attempt.lifecycle;
    return new Promise((resolve, reject) => {
      const abort = () => reject(new Error(CANCELLED));
      signal.addEventListener("abort", abort, { once: true });
      this.lockRequest = locks
        .request(
          LOCK_NAME,
          { ifAvailable: true, mode: "exclusive" },
          (lock) => {
            signal.removeEventListener("abort", abort);
            if (!this.isCurrent(attempt)) {
              reject(new Error(CANCELLED));
              return;
            }
            if (!lock) {
              reject(
                new Error("已有其他标签页连接 AI 工具，请先在该页面断开。")
              );
              return;
            }
            const held = new Promise<void>((release) =>
              signal.addEventListener("abort", () => release(), { once: true })
            );
            resolve();
            return held;
          }
        )
        .catch(() => {
          signal.removeEventListener("abort", abort);
          reject(new Error("无法获取 AI 工具连接锁，请重新打开页面。"));
        });
    });
  }

  private socket(attempt: Attempt, url: string): WebSocket {
    try {
      const socket = this.options.createWebSocket
        ? this.options.createWebSocket(url)
        : new WebSocket(url);
      attempt.sockets.add(socket);
      return socket;
    } catch {
      throw new Error(CONNECTION_FAILED);
    }
  }

  private register(
    attempt: Attempt,
    registration: Omit<Session, "channel">,
    host: string
  ): Promise<Session> {
    const socket = this.socket(attempt, `${registration.server}/register`);
    return new Promise((resolve, reject) => {
      const finish = (error?: Error, session?: Session) => {
        clearTimeout(timer);
        socket.removeEventListener("open", opened);
        socket.removeEventListener("message", message);
        socket.removeEventListener("close", failed);
        socket.removeEventListener("error", failed);
        attempt.lifecycle.signal.removeEventListener("abort", cancelled);
        attempt.sockets.delete(socket);
        socket.close();
        if (error) reject(error);
        else if (session) resolve(session);
      };
      const failed = () => finish(new Error(CONNECTION_FAILED));
      const cancelled = () => finish(new Error(CANCELLED));
      const opened = () => {
        if (!this.isCurrent(attempt)) return cancelled();
        try {
          socket.send(btoa(JSON.stringify({ ...registration, host })));
        } catch {
          failed();
        }
      };
      const message = (event: MessageEvent) => {
        if (!this.isCurrent(attempt)) return cancelled();
        try {
          const data = parseMessage(event.data);
          if (
            data.type !== "registerSuccess" ||
            data.channel !== `/${host}` ||
            !isToken(data.token)
          ) {
            throw new Error(INVALID_RESPONSE);
          }
          finish(undefined, {
            server: registration.server,
            channel: data.channel,
            token: data.token,
          });
        } catch {
          finish(new Error("桥接配对失败，请从客户端获取新令牌重试。"));
        }
      };
      const timer = setTimeout(
        () => finish(new Error(TIMEOUT)),
        this.options.handshakeTimeoutMs ?? 10000
      );
      socket.addEventListener("open", opened);
      socket.addEventListener("message", message);
      socket.addEventListener("close", failed);
      socket.addEventListener("error", failed);
      attempt.lifecycle.signal.addEventListener("abort", cancelled, {
        once: true,
      });
    });
  }

  private openChannel(attempt: Attempt, session: Session): Promise<void> {
    const socket = this.socket(
      attempt,
      `${session.server}${session.channel}?token=${session.token}`
    );
    const send = (message: Message) => {
      if (!this.isCurrent(attempt) || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      try {
        socket.send(JSON.stringify(message));
      } catch {
        this.fail(attempt, new Error(CONNECTION_FAILED));
      }
    };
    return new Promise((resolve, reject) => {
      let welcomed = false;
      let registered = false;
      const pending = new Set(this.tools.keys());
      const requests = new Set<unknown>();
      const finish = (error?: Error) => {
        clearTimeout(timer);
        if (error) reject(error);
        else resolve();
      };
      const failed = () => {
        finish(new Error(CONNECTION_FAILED));
        this.fail(attempt, new Error(CONNECTION_FAILED));
      };
      const cancelled = () => {
        attempt.lifecycle.signal.removeEventListener("abort", cancelled);
        socket.removeEventListener("message", message);
        socket.removeEventListener("close", failed);
        socket.removeEventListener("error", failed);
        finish(new Error(CANCELLED));
      };
      const message = (event: MessageEvent) => {
        if (!this.isCurrent(attempt)) return;
        try {
          const data = parseMessage(event.data);
          if (data.type === "welcome") {
            if (welcomed || data.channel !== session.channel) {
              throw new Error(INVALID_RESPONSE);
            }
            welcomed = true;
            this.tools.forEach((tool) =>
              send({ type: "registerTool", ...toolDefinition(tool) })
            );
          } else if (data.type === "toolRegistered") {
            if (
              !welcomed ||
              typeof data.name !== "string" ||
              data.toolId !== `${session.channel.slice(1)}-${data.name}` ||
              !this.tools.has(data.name)
            ) {
              throw new Error(INVALID_RESPONSE);
            }
            pending.delete(data.name);
          } else if (data.type === "error") {
            throw new Error(CONNECTION_FAILED);
          } else if (registered && data.type === "callTool") {
            if (
              (typeof data.id !== "string" && typeof data.id !== "number") ||
              requests.has(data.id)
            ) {
              return;
            }
            requests.add(data.id);
            void this.execute(data).then((result) =>
              send({ type: "toolResponse", id: data.id, result })
            );
          } else if (registered && data.type === "listTools") {
            send({
              type: "listToolsResponse",
              id: data.id,
              tools: [...this.tools.values()].map(toolDefinition),
            });
          } else if (data.type === "ping") {
            send({ type: "pong", id: data.id, timestamp: Date.now() });
          }
          if (welcomed && pending.size === 0 && !registered) {
            registered = true;
            this.update("connected", null);
            finish();
          }
        } catch {
          finish(new Error(INVALID_RESPONSE));
          this.fail(attempt, new Error(INVALID_RESPONSE));
        }
      };
      const timer = setTimeout(() => {
        finish(new Error(TIMEOUT));
        this.fail(attempt, new Error(TIMEOUT));
      }, this.options.handshakeTimeoutMs ?? 10000);
      socket.addEventListener("message", message);
      socket.addEventListener("close", failed);
      socket.addEventListener("error", failed);
      attempt.lifecycle.signal.addEventListener("abort", cancelled, {
        once: true,
      });
    });
  }

  private async execute(message: Message): Promise<unknown> {
    const tool =
      typeof message.tool === "string"
        ? this.tools.get(message.tool)
        : undefined;
    if (!tool) {
      return {
        isError: true,
        content: [{ type: "text", text: '{"error":"UNKNOWN_TOOL"}' }],
      };
    }
    try {
      // Business/page lifecycles own execution cancellation. A socket loss must
      // not abort a submitted write or claim it failed: discard only delivery.
      return asMcpResult(await tool.execute(message.arguments ?? {}));
    } catch {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "TOOL_EXECUTION_FAILED",
              nextStep:
                "重新查询当前工具；若已提交写入，请查询操作回执后再决定是否重试。",
            }),
          },
        ],
      };
    }
  }
}
