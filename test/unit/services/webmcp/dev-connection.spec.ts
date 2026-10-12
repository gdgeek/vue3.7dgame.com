import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TokenChangedListener } from "@/services/auth/authClient";
import type { WebMcpDevState } from "@/services/webmcp/dev-transport";

const dispose: (() => void)[] = [];
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_WEBMCP_DEV_ENABLED", "true");
});
afterEach(() => {
  for (const stop of dispose.splice(0)) stop();
  vi.unstubAllEnvs();
});

async function setup() {
  const { reactive, effectScope } = await import("vue");
  const user = reactive({ userInfo: { id: 1 } });
  let accessToken: string | null = "test-access";
  let tokenChanged: TokenChangedListener = () => {};
  const unsubscribe = vi.fn();
  vi.doMock("@/store/modules/user", () => ({ useUserStore: () => user }));
  vi.doMock("@/services/auth/authClient", () => ({
    default: {
      provider: "legacy",
      getAccessToken: () => accessToken,
      onTokenChanged(listener: TokenChangedListener) {
        tokenChanged = listener;
        return unsubscribe;
      },
    },
  }));
  let state: WebMcpDevState = {
    status: "disconnected",
    error: null,
    canReconnect: false,
  };
  const listeners = new Set<(value: WebMcpDevState) => void>();
  const changeState = (value: WebMcpDevState) => {
    state = value;
    for (const listener of listeners) listener(value);
  };
  const transport = {
    connect: vi.fn(async () => {
      changeState({ status: "connected", error: null, canReconnect: true });
    }),
    reconnect: vi.fn(),
    disconnect: vi.fn(() => {
      changeState({ status: "disconnected", error: null, canReconnect: false });
    }),
    getState: () => state,
    subscribe(listener: (value: WebMcpDevState) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  vi.doMock("@/services/webmcp/dev-transport", () => ({
    WebMcpDevTransport: vi.fn(() => transport),
  }));
  const { getWebMcpToolRegistry } = await import(
    "@/services/webmcp/tool-registry"
  );
  const registry = getWebMcpToolRegistry()!;
  const owner = new AbortController();
  dispose.push(() => owner.abort());
  registry.register(
    [
      {
        name: "read",
        description: "Read",
        inputSchema: { type: "object" },
        annotations: { readOnlyHint: true },
        execute: () => ({ ready: true }),
      },
    ],
    owner
  );
  const { getWebMcpDevConnection } = await import(
    "@/services/webmcp/dev-connection"
  );
  const menuScope = effectScope();
  const connection = menuScope.run(getWebMcpDevConnection)!;
  dispose.push(
    () => connection.dispose(),
    () => menuScope.stop()
  );
  await connection.connect("test-registration");
  return {
    user,
    registry,
    connection,
    transport,
    unsubscribe,
    menuScope,
    async startLogout() {
      const { revokeWebMcpDevIdentity } = await import(
        "@/services/webmcp/dev-feature"
      );
      revokeWebMcpDevIdentity();
    },
    notify(
      reason: Parameters<TokenChangedListener>[1]["reason"],
      present = true
    ) {
      accessToken = present ? "replacement-access" : null;
      tokenChanged(
        present ? ({} as Parameters<TokenChangedListener>[0]) : null,
        { reason, provider: "legacy" }
      );
    },
  };
}

describe("connection lifetime across menu and authentication changes", () => {
  it("still revokes the old account's callbacks after the menu scope closes", async () => {
    const f = await setup();
    const oldCallback = f.registry.lookup("read")!;
    f.menuScope.stop();
    f.user.userInfo = { id: 2 };
    expect(f.connection.state.value.status).toBe("disconnected");
    expect(f.connection.toolCount.value).toBe(0);
    await expect(oldCallback.execute({})).rejects.toThrow();
  });

  it("keeps the session and context when the auth client rotates a token", async () => {
    const f = await setup();
    const context = f.registry.snapshot().contextToken;
    f.menuScope.stop();
    f.notify("refresh");
    expect(f.connection.state.value.status).toBe("connected");
    expect(f.registry.snapshot().contextToken).toBe(context);
    expect(f.transport.disconnect).not.toHaveBeenCalled();
  });

  it.each(["login", "unauthorized"] as const)(
    "revokes same-account callbacks for %s rather than treating it as refresh",
    async (reason) => {
      const f = await setup();
      const context = f.registry.snapshot().contextToken;
      f.notify(reason, reason === "login");
      expect(f.connection.state.value.status).toBe("disconnected");
      expect(f.registry.snapshot().contextToken).not.toBe(context);
      expect(f.connection.toolCount.value).toBe(0);
    }
  );

  it("revokes at logout start before the asynchronous auth request clears tokens", async () => {
    const f = await setup();
    await f.startLogout();
    expect(f.user.userInfo.id).toBe(1);
    expect(f.connection.state.value.status).toBe("disconnected");
    expect(f.connection.toolCount.value).toBe(0);
  });
});
