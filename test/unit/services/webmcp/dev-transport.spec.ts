import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WebMcpDevTransport,
  type WebMcpDevTransportOptions,
} from "@/services/webmcp/dev-transport";
import type { WebMcpTool } from "@/services/webmcp/model-context";

class FakeSocket extends EventTarget {
  readyState = WebSocket.CONNECTING;
  sent: string[] = [];
  constructor(readonly url: string) {
    super();
  }
  open() {
    this.readyState = WebSocket.OPEN;
    this.dispatchEvent(new Event("open"));
  }
  receive(data: unknown) {
    this.dispatchEvent(
      new MessageEvent("message", { data: JSON.stringify(data) })
    );
  }
  send(data: string) {
    if (this.readyState !== WebSocket.OPEN) throw new Error("closed");
    this.sent.push(data);
  }
  close() {
    if (this.readyState === WebSocket.CLOSED) return;
    this.readyState = WebSocket.CLOSED;
    this.dispatchEvent(new Event("close"));
  }
}

const host = "xrugc.example:3001";
const channel = "/xrugc_example_3001";
const registrationSecret = "a".repeat(64);
const sessionSecret = "b".repeat(64);
const registrationToken = (server = "ws://localhost:4797") =>
  btoa(JSON.stringify({ server, token: registrationSecret }));

const flush = async () => {
  for (let count = 0; count < 8; count++) await Promise.resolve();
};

const createLocks = () => {
  let occupied = false;
  const request = vi.fn(async (_name, _options, callback) => {
    if (occupied) return callback(null);
    occupied = true;
    try {
      return await callback({ name: "connection", mode: "exclusive" });
    } finally {
      occupied = false;
    }
  });
  return { request } as unknown as Pick<LockManager, "request">;
};

const active: WebMcpDevTransport[] = [];
const createHarness = (
  options: Partial<WebMcpDevTransportOptions> = {},
  execute: WebMcpTool["execute"] = () => ({ status: "ready" })
) => {
  const sockets: FakeSocket[] = [];
  const tools: WebMcpTool[] = [
    {
      name: "xrugc_webmcp_list_tools",
      description: "Discover current page tools",
      inputSchema: { type: "object", properties: {} },
      execute,
    },
    {
      name: "xrugc_webmcp_call_tool",
      description: "Execute with current contextToken",
      inputSchema: { type: "object", required: ["contextToken"] },
      execute,
    },
  ];
  const transport = new WebMcpDevTransport({
    tools,
    host,
    locks: createLocks(),
    createWebSocket(url) {
      const socket = new FakeSocket(url);
      sockets.push(socket);
      return socket as unknown as WebSocket;
    },
    ...options,
  });
  active.push(transport);
  const acknowledge = (socket: FakeSocket) => {
    socket.open();
    socket.receive({ type: "welcome", channel });
    tools.forEach((tool) =>
      socket.receive({
        type: "toolRegistered",
        name: tool.name,
        toolId: `${channel.slice(1)}-${tool.name}`,
      })
    );
  };
  const connect = async () => {
    const promise = transport.connect(registrationToken());
    await flush();
    const registration = sockets.at(-1)!;
    registration.open();
    registration.receive({
      type: "registerSuccess",
      channel,
      token: sessionSecret,
    });
    await flush();
    const socket = sockets.at(-1)!;
    acknowledge(socket);
    await promise;
    return socket;
  };
  return { transport, sockets, tools, connect, acknowledge };
};

afterEach(() => {
  active.splice(0).forEach((transport) => transport.disconnect());
  vi.useRealTimers();
});

describe("webmcp.dev 0.1.13 transport", () => {
  it("sends registration and tool frames, waiting for all matching acknowledgments", async () => {
    const { transport, sockets, tools } = createHarness();
    const updates = vi.fn();
    transport.subscribe(updates);
    const connected = transport.connect(registrationToken());
    await flush();
    const registration = sockets[0];
    expect(registration.url).toBe("ws://localhost:4797/register");
    registration.open();
    expect(JSON.parse(atob(registration.sent[0]))).toEqual({
      server: "ws://localhost:4797",
      token: registrationSecret,
      host: channel.slice(1),
    });
    registration.receive({
      type: "registerSuccess",
      channel,
      token: sessionSecret,
    });
    await flush();
    const socket = sockets[1];
    expect(socket.url).toBe(
      `ws://localhost:4797${channel}?token=${sessionSecret}`
    );
    socket.open();
    expect(transport.getState().status).toBe("connecting");
    socket.receive({ type: "welcome", channel });
    expect(socket.sent.map((frame) => JSON.parse(frame))).toEqual(
      tools.map(({ name, description, inputSchema }) => ({
        type: "registerTool",
        name,
        description,
        inputSchema,
      }))
    );
    socket.receive({
      type: "toolRegistered",
      name: tools[0].name,
      toolId: `${channel.slice(1)}-${tools[0].name}`,
    });
    expect(transport.getState().status).toBe("connecting");
    socket.receive({
      type: "toolRegistered",
      name: tools[1].name,
      toolId: `${channel.slice(1)}-${tools[1].name}`,
    });
    await connected;
    expect(transport.getState()).toEqual({
      status: "connected",
      error: null,
      canReconnect: true,
    });
    expect(JSON.stringify(updates.mock.calls)).not.toContain(sessionSecret);
    expect(JSON.stringify(updates.mock.calls)).not.toContain(
      registrationSecret
    );
  });

  it.each([
    "wss://attacker.example",
    "ws://localhost.attacker.example:4797",
    "ws://localhost:4797@attacker.example",
    "ws://user@localhost:4797",
    "https://localhost:4797",
    "ws://127.1:4797",
    "ws://2130706433:4797",
    "ws://127.0.0.1:4797/path",
    "ws://localhost:4797?token=secret",
    "ws://localhost:4797#fragment",
    "ws://localhost:65536",
    "ws://localhost:0",
    "ws://[::ffff:127.0.0.1]:4797",
  ])("rejects unsafe endpoint %s without creating a socket", async (server) => {
    const { transport, sockets } = createHarness();
    await expect(transport.connect(registrationToken(server))).rejects.toThrow(
      "本机桥接"
    );
    expect(sockets).toHaveLength(0);
    expect(transport.getState().error).not.toContain(server);
  });

  it.each(["ws://127.0.0.1:4797", "ws://[::1]:4797", "wss://localhost:4797/"])(
    "accepts canonical loopback endpoint %s",
    async (server) => {
      const { transport, sockets } = createHarness();
      const connected = transport.connect(registrationToken(server));
      const assertion = expect(connected).rejects.toThrow("已取消");
      await flush();
      expect(sockets).toHaveLength(1);
      transport.disconnect();
      await assertion;
    }
  );

  it("fails closed without Web Locks and prevents a second tab until disconnect", async () => {
    const unsupported = createHarness({ locks: null });
    await expect(
      unsupported.transport.connect(registrationToken())
    ).rejects.toThrow("Web Locks");
    expect(unsupported.sockets).toHaveLength(0);
    const locks = createLocks();
    const first = createHarness({ locks });
    const second = createHarness({ locks });
    await first.connect();
    await expect(second.transport.connect(registrationToken())).rejects.toThrow(
      "其他标签页"
    );
    expect(second.sockets).toHaveLength(0);
    first.transport.disconnect();
    await flush();
    await second.connect();
    expect(second.transport.getState().status).toBe("connected");
  });

  it("times out stalled registration and releases its lock", async () => {
    vi.useFakeTimers();
    const locks = createLocks();
    const first = createHarness({ locks, handshakeTimeoutMs: 100 });
    const connected = first.transport.connect(registrationToken());
    const assertion = expect(connected).rejects.toThrow("超时");
    await flush();
    await vi.advanceTimersByTimeAsync(101);
    await assertion;
    expect(first.sockets[0].readyState).toBe(WebSocket.CLOSED);
    const second = createHarness({ locks });
    await second.connect();
  });

  it("rejects a registration for a different channel without opening it", async () => {
    const { transport, sockets } = createHarness();
    const connected = transport.connect(registrationToken());
    const assertion = expect(connected).rejects.toThrow("配对失败");
    await flush();
    sockets[0].open();
    sockets[0].receive({
      type: "registerSuccess",
      channel: "/mcp",
      token: sessionSecret,
    });
    await assertion;
    expect(sockets).toHaveLength(1);
  });

  it("times out a session lacking its tool acknowledgments", async () => {
    vi.useFakeTimers();
    const { transport, sockets } = createHarness({ handshakeTimeoutMs: 100 });
    const connected = transport.connect(registrationToken());
    const assertion = expect(connected).rejects.toThrow("超时");
    await flush();
    sockets[0].open();
    sockets[0].receive({
      type: "registerSuccess",
      channel,
      token: sessionSecret,
    });
    await flush();
    sockets[1].open();
    sockets[1].receive({ type: "welcome", channel });
    await vi.advanceTimersByTimeAsync(101);
    await assertion;
    expect(transport.getState()).toMatchObject({
      status: "error",
      canReconnect: true,
    });
    expect(sockets[1].readyState).toBe(WebSocket.CLOSED);
  });

  it("never starts a socket if logout happens while a lock callback is queued", async () => {
    let callback!: (lock: Lock) => unknown;
    const locks = {
      request: vi.fn((_name, _options, onLock) => {
        callback = onLock;
        return Promise.resolve();
      }),
    } as unknown as Pick<LockManager, "request">;
    const { transport, sockets } = createHarness({ locks });
    const connected = transport.connect(registrationToken());
    const assertion = expect(connected).rejects.toThrow("已取消");
    await flush();
    transport.disconnect();
    callback({ name: "connection", mode: "exclusive" });
    await assertion;
    await flush();
    expect(sockets).toHaveLength(0);
    expect(transport.getState().status).toBe("disconnected");
  });

  it("does not allow a stale rejected connection to replace the new connection state", async () => {
    const { transport, sockets, acknowledge } = createHarness();
    const first = transport.connect(registrationToken());
    const firstAssertion = expect(first).rejects.toThrow("已取消");
    await flush();
    const staleSocket = sockets[0];
    const second = transport.connect(registrationToken());
    await flush();
    await firstAssertion;
    staleSocket.receive({
      type: "registerSuccess",
      channel,
      token: sessionSecret,
    });
    const currentSocket = sockets[1];
    currentSocket.open();
    currentSocket.receive({
      type: "registerSuccess",
      channel,
      token: sessionSecret,
    });
    await flush();
    acknowledge(sockets[2]);
    await second;
    expect(transport.getState().status).toBe("connected");
    expect(sockets).toHaveLength(3);
  });

  it("ignores a late registration after logout/disconnect", async () => {
    const { transport, sockets } = createHarness();
    const connected = transport.connect(registrationToken());
    const assertion = expect(connected).rejects.toThrow("已取消");
    await flush();
    sockets[0].open();
    transport.disconnect();
    sockets[0].receive({
      type: "registerSuccess",
      channel,
      token: sessionSecret,
    });
    await assertion;
    await flush();
    expect(sockets).toHaveLength(1);
    expect(transport.getState()).toEqual({
      status: "disconnected",
      error: null,
      canReconnect: false,
    });
  });

  it("rejects forged tool acknowledgments", async () => {
    vi.useFakeTimers();
    const { transport, sockets } = createHarness({ handshakeTimeoutMs: 100 });
    const connected = transport.connect(registrationToken());
    const assertion = expect(connected).rejects.toThrow("回执");
    await flush();
    sockets[0].open();
    sockets[0].receive({
      type: "registerSuccess",
      channel,
      token: sessionSecret,
    });
    await flush();
    sockets[1].open();
    sockets[1].receive({ type: "welcome", channel });
    sockets[1].receive({
      type: "toolRegistered",
      name: "xrugc_webmcp_list_tools",
      toolId: "wrong-channel-xrugc_webmcp_list_tools",
    });
    await assertion;
    expect(transport.getState().status).toBe("error");
  });

  it("preserves MCP business states and JSON, and converts exceptions to isError", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({
        status: "awaiting_confirmation",
        operationId: "op-1",
      })
      .mockResolvedValueOnce({
        content: [{ type: "text", text: '{"status":"partial"}' }],
        isError: false,
      })
      .mockRejectedValueOnce(new Error(`secret ${sessionSecret}`));
    const { connect } = createHarness({}, execute);
    const socket = await connect();
    for (let index = 1; index <= 3; index++) {
      socket.receive({
        type: "callTool",
        id: String(index),
        tool: "xrugc_webmcp_call_tool",
        arguments: { index },
      });
      await flush();
    }
    const responses = socket.sent
      .map((frame) => JSON.parse(frame))
      .filter((frame) => frame.type === "toolResponse");
    expect(responses[0]).toEqual({
      type: "toolResponse",
      id: "1",
      result: {
        content: [
          {
            type: "text",
            text: '{"status":"awaiting_confirmation","operationId":"op-1"}',
          },
        ],
      },
    });
    expect(responses[1].result).toEqual({
      content: [{ type: "text", text: '{"status":"partial"}' }],
      isError: false,
    });
    expect(responses[2].result.isError).toBe(true);
    expect(JSON.stringify(responses)).not.toContain(sessionSecret);
    expect(execute).toHaveBeenCalledWith({ index: 1 });
  });

  it("does not replay duplicate requests or deliver old results after reconnect", async () => {
    let complete!: (value: unknown) => void;
    const execute = vi.fn(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        })
    );
    const { transport, sockets, connect, acknowledge } = createHarness(
      {},
      execute
    );
    const oldSocket = await connect();
    const request = {
      type: "callTool",
      id: "write-1",
      tool: "xrugc_webmcp_call_tool",
      arguments: {},
    };
    oldSocket.receive(request);
    oldSocket.receive(request);
    expect(execute).toHaveBeenCalledTimes(1);
    oldSocket.close();
    await flush();
    expect(transport.getState()).toMatchObject({
      status: "error",
      canReconnect: true,
    });
    expect(sockets).toHaveLength(2);
    const reconnect = transport.reconnect();
    await flush();
    const newSocket = sockets[2];
    expect(newSocket.url).toBe(
      `ws://localhost:4797${channel}?token=${sessionSecret}`
    );
    acknowledge(newSocket);
    await reconnect;
    complete({ status: "succeeded", operationId: "op-1" });
    await flush();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(newSocket.sent).toHaveLength(2);
    expect(oldSocket.sent).toHaveLength(2);
    transport.disconnect();
    await expect(transport.reconnect()).rejects.toThrow("重新配对");
  });
});
