import { describe, expect, it, vi } from "vitest";
import { createWebMcpDevSession } from "@/services/webmcp/dev-session";
import { WebMcpToolRegistry } from "@/services/webmcp/tool-registry";
import type { WebMcpTool } from "@/services/webmcp/model-context";
import type { WebMcpDevState } from "@/services/webmcp/dev-transport";

function setup() {
  let identity: string | null = "account:1";
  let identityChanged: (force?: boolean) => void = () => {};
  let tools: WebMcpTool[] = [];
  let state: WebMcpDevState = {
    status: "disconnected",
    error: null,
    canReconnect: false,
  };
  const registry = new WebMcpToolRegistry();
  const execute = vi.fn(() => ({ value: 1 }));
  registry.register(
    [
      {
        name: "read",
        description: "Read",
        inputSchema: { type: "object", additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute,
      },
    ],
    new AbortController()
  );
  const transport = {
    connect: vi.fn(async (_token: string) => {
      state = { status: "connected", error: null, canReconnect: true };
    }),
    reconnect: vi.fn(async () => {
      state = { status: "connected", error: null, canReconnect: true };
    }),
    disconnect: vi.fn((clearSession = true) => {
      state = {
        status: "disconnected",
        error: null,
        canReconnect: !clearSession,
      };
    }),
    getState: () => state,
    subscribe: vi.fn(() => () => {}),
  };
  const unsubscribe = vi.fn();
  const session = createWebMcpDevSession({
    registry,
    getIdentity: () => identity,
    subscribeIdentity: (listener) => {
      identityChanged = listener;
      return unsubscribe;
    },
    createTransport: (registered) => {
      tools = registered;
      return transport;
    },
  });
  return {
    registry,
    transport,
    session,
    execute,
    unsubscribe,
    tools,
    changeIdentity(value: string | null, force = false) {
      identity = value;
      identityChanged(force);
    },
    dropConnection() {
      state = { status: "error", error: "disconnected", canReconnect: true };
    },
  };
}

describe("webmcp.dev authenticated session", () => {
  it("requires login before touching the bridge", async () => {
    const f = setup();
    f.changeIdentity(null);
    await expect(f.session.connect("registration")).rejects.toThrow("登录");
    expect(f.transport.connect).not.toHaveBeenCalled();
  });
  it("lets a token refresh keep the same account and tools connected", async () => {
    const f = setup();
    await f.session.connect("registration");
    const context = f.registry.snapshot().contextToken;
    f.changeIdentity("account:1");
    expect(f.session.getState().status).toBe("connected");
    expect(f.registry.snapshot().contextToken).toBe(context);
    const result = await f.tools[0].execute({});
    expect(result).not.toHaveProperty("isError");
  });
  it.each([null, "account:2"])(
    "revokes tools and connection on identity %s",
    async (identity) => {
      const f = setup();
      await f.session.connect("registration");
      const oldTool = f.registry.lookup("read")!;
      f.changeIdentity(identity);
      expect(f.transport.disconnect).toHaveBeenCalledWith();
      expect(f.registry.snapshot().tools).toEqual([]);
      await expect(oldTool.execute({})).rejects.toThrow();
      expect(await f.tools[0].execute({})).toHaveProperty("isError", true);
    }
  );
  it("disconnects synchronously when logout starts, before token changes", async () => {
    const f = setup();
    await f.session.connect("registration");
    f.session.revokeIdentity();
    expect(f.session.getState().status).toBe("disconnected");
    expect(f.registry.snapshot().tools).toEqual([]);
  });
  it("preserves native page tools on ordinary disconnect and reconnect", async () => {
    const f = setup();
    await f.session.connect("registration");
    f.session.disconnect();
    expect(f.registry.snapshot().tools).toHaveLength(1);
    await expect(f.registry.lookup("read")!.execute({})).resolves.toEqual({
      value: 1,
    });
    expect(await f.tools[0].execute({})).toHaveProperty("isError", true);
    await f.session.connect("fresh-registration");
    expect(await f.tools[0].execute({})).not.toHaveProperty("isError");
  });
  it("supports explicit reconnection after a drop without replaying tools", async () => {
    const f = setup();
    await f.session.connect("registration");
    f.dropConnection();
    expect(await f.tools[0].execute({})).toHaveProperty("isError", true);
    await f.session.reconnect();
    expect(f.transport.reconnect).toHaveBeenCalledOnce();
    expect(f.execute).not.toHaveBeenCalled();
  });
  it("rejects a handshake that finishes after logout", async () => {
    const f = setup();
    let finish!: () => void;
    f.transport.connect.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const pending = f.session.connect("registration");
    f.changeIdentity(null);
    finish();
    await expect(pending).rejects.toThrow("登录状态已变化");
    expect(f.registry.snapshot().tools).toEqual([]);
  });
  it("revokes same-id credentials when a new login replaces the session", async () => {
    const f = setup();
    await f.session.connect("registration");
    f.changeIdentity("account:1", true);
    expect(f.registry.snapshot().tools).toEqual([]);
    expect(f.session.getState().status).toBe("disconnected");
  });
  it("disposal stops observation and disallows later connections", async () => {
    const f = setup();
    f.session.dispose();
    expect(f.unsubscribe).toHaveBeenCalledOnce();
    await expect(f.session.connect("registration")).rejects.toThrow("关闭");
  });
});
