import { afterEach, describe, expect, it, vi } from "vitest";
import type { TokenInfo } from "@/api/v1/types/auth";
import { createAuthClient } from "../authClient";
import { createSessionCoordinator } from "../sessionCoordinator";
import { SessionSupersededError } from "../sessionErrors";

const token = (name: string): TokenInfo => ({
  token: name,
  accessToken: name,
  refreshToken: `refresh-${name}`,
  expires: new Date(Date.now() + 3600000).toISOString(),
});
function store(initial = token("old")) {
  let value: TokenInfo | null = initial;
  return {
    getToken: () => value,
    setToken: (next: TokenInfo) => {
      value = next;
    },
    removeToken: () => {
      value = null;
    },
    hasToken: () => value !== null,
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
afterEach(() => {
  localStorage.clear();
});

describe("session continuity", () => {
  it("serializes two clients and reuses the successor instead of rotating the old token twice", async () => {
    const sharedStore = store();
    const reply = deferred<{ data: { token: TokenInfo } }>();
    const http = { get: vi.fn(), post: vi.fn(() => reply.promise) };
    const first = createAuthClient({
      http,
      tokenStore: sharedStore,
      coordinator: createSessionCoordinator(true),
    });
    const second = createAuthClient({
      http,
      tokenStore: sharedStore,
      coordinator: createSessionCoordinator(true),
    });
    const pending = [first.refresh(), second.refresh()];
    await vi.waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
    const next = token("new");
    reply.resolve({ data: { token: next } });
    expect(await Promise.all(pending)).toEqual([
      { token: next },
      { token: next },
    ]);
    expect(http.post).toHaveBeenCalledTimes(1);
    first.destroy();
    second.destroy();
  });

  it("does not restore a session when refresh completes after logout", async () => {
    const tokens = store();
    const reply = deferred<{ data: { token: TokenInfo } }>();
    const http = {
      get: vi.fn(),
      post: vi.fn((path) =>
        path === "/v1/auth/refresh"
          ? reply.promise
          : Promise.resolve({ data: {} })
      ),
    };
    const client = createAuthClient({ http, tokenStore: tokens });
    const pending = client.refresh().catch((error) => error);
    await vi.waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
    await client.logout();
    reply.resolve({ data: { token: token("late") } });
    expect(await pending).toBeInstanceOf(SessionSupersededError);
    expect(tokens.getToken()).toBeNull();
    client.destroy();
  });

  it("keeps an explicit SSO exchange separate from a pending old-account refresh", async () => {
    const tokens = store();
    const reply = deferred<{ data: { token: TokenInfo } }>();
    const http = {
      get: vi.fn(),
      post: vi.fn((_path, body) =>
        body.refreshToken === "sso-other"
          ? Promise.resolve({ data: { token: token("other") } })
          : reply.promise
      ),
    };
    const client = createAuthClient({ http, tokenStore: tokens });
    const old = client.refresh().catch((error) => error);
    await vi.waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
    await client.refresh("sso-other");
    reply.resolve({ data: { token: token("late-old") } });
    expect(await old).toBeInstanceOf(SessionSupersededError);
    expect(tokens.getToken()?.accessToken).toBe("other");
    client.destroy();
  });

  it("retries a drain response with the same idempotency key and never clears the session", async () => {
    const tokens = store();
    const next = token("new");
    const http = {
      get: vi.fn(),
      post: vi
        .fn()
        .mockRejectedValueOnce({
          response: { status: 503, headers: { "retry-after": "0" } },
        })
        .mockResolvedValue({ data: { token: next } }),
    };
    const client = createAuthClient({ http, tokenStore: tokens });
    await expect(client.refresh()).resolves.toEqual({ token: next });
    expect(http.post.mock.calls[0][2].headers).toEqual(
      http.post.mock.calls[1][2].headers
    );
    expect(tokens.getToken()).toBe(next);
    client.destroy();
  });

  it("notifies this tab's plugins when another tab publishes a token revision", () => {
    const tokens = store();
    const client = createAuthClient({
      http: { get: vi.fn(), post: vi.fn() },
      tokenStore: tokens,
      coordinator: createSessionCoordinator(true),
    });
    const changed = vi.fn();
    client.onTokenChanged(changed);
    tokens.setToken(token("other-tab"));
    window.dispatchEvent(
      new StorageEvent("storage", { key: "xrugc-auth-session-v1" })
    );
    expect(changed).toHaveBeenCalledWith(
      tokens.getToken(),
      expect.objectContaining({ reason: "external" })
    );
    client.destroy();
  });
});
