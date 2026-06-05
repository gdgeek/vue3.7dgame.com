import { describe, expect, it, vi } from "vitest";

import type { TokenInfo } from "@/api/v1/types/auth";
import { createAuthClient } from "../authClient";

function createToken(value: Partial<TokenInfo> = {}): TokenInfo {
  return {
    token: value.token ?? value.accessToken ?? "access-token",
    accessToken: value.accessToken ?? value.token ?? "access-token",
    refreshToken: value.refreshToken ?? "refresh-token",
    expires:
      value.expires ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    tokenType: value.tokenType,
  };
}

function createTokenStore(initialToken: TokenInfo | null = null) {
  let token = initialToken;

  return {
    getToken: vi.fn(() => token),
    hasToken: vi.fn(() => token !== null),
    removeToken: vi.fn(() => {
      token = null;
    }),
    setToken: vi.fn((nextToken: TokenInfo) => {
      token = nextToken;
    }),
  };
}

describe("authClient", () => {
  it("logs in through legacy API, stores the token, and notifies subscribers", async () => {
    const token = createToken({ accessToken: "login-token" });
    const tokenStore = createTokenStore();
    const http = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({
        data: { success: true, token },
      }),
    };
    const listener = vi.fn();
    const client = createAuthClient({
      http,
      tokenStore,
      provider: "legacy",
    });

    client.onTokenChanged(listener);

    const response = await client.login({
      username: "guanfei",
      password: "123456",
    });

    expect(response.success).toBe(true);
    expect(http.post).toHaveBeenCalledWith("/v1/auth/login", {
      username: "guanfei",
      password: "123456",
    });
    expect(tokenStore.setToken).toHaveBeenCalledWith(token);
    expect(client.getAccessToken()).toBe("login-token");
    expect(listener).toHaveBeenCalledWith(token, {
      reason: "login",
      provider: "legacy",
    });
  });

  it("deduplicates concurrent refresh calls and stores the returned token", async () => {
    const oldToken = createToken({
      accessToken: "old-token",
      refreshToken: "old-refresh",
    });
    const newToken = createToken({
      accessToken: "new-token",
      refreshToken: "new-refresh",
    });
    const tokenStore = createTokenStore(oldToken);
    let resolveRefresh:
      | ((value: { data: { token: TokenInfo } }) => void)
      | undefined;
    const http = {
      get: vi.fn(),
      post: vi.fn(
        () =>
          new Promise<{ data: { token: TokenInfo } }>((resolve) => {
            resolveRefresh = resolve;
          })
      ),
    };
    const client = createAuthClient({
      http,
      tokenStore,
      provider: "legacy",
    });

    const first = client.refresh();
    const second = client.refresh();

    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledWith("/v1/auth/refresh", {
      refreshToken: "old-refresh",
    });

    resolveRefresh?.({ data: { token: newToken } });

    await expect(Promise.all([first, second])).resolves.toEqual([
      { token: newToken },
      { token: newToken },
    ]);
    expect(tokenStore.setToken).toHaveBeenCalledTimes(1);
    expect(client.getAccessToken()).toBe("new-token");
  });

  it("clears local token on logout even when backend revoke fails", async () => {
    const token = createToken({ accessToken: "logout-token" });
    const tokenStore = createTokenStore(token);
    const http = {
      get: vi.fn(),
      post: vi.fn().mockRejectedValue(new Error("backend unavailable")),
    };
    const listener = vi.fn();
    const client = createAuthClient({
      http,
      tokenStore,
      provider: "legacy",
    });

    client.onTokenChanged(listener);

    await expect(client.logout()).rejects.toThrow("backend unavailable");

    expect(http.post).toHaveBeenCalledWith(
      "/v1/auth/logout",
      { refreshToken: "refresh-token" },
      { headers: { Authorization: "Bearer logout-token" } }
    );
    expect(tokenStore.removeToken).toHaveBeenCalled();
    expect(client.getAccessToken()).toBeNull();
    expect(listener).toHaveBeenCalledWith(null, {
      reason: "logout",
      provider: "legacy",
    });
  });

  it("loads the current user with the stored access token", async () => {
    const token = createToken({ accessToken: "current-user-token" });
    const tokenStore = createTokenStore(token);
    const currentUser = {
      id: 1,
      username: "guanfei",
      roles: [],
    };
    const http = {
      get: vi.fn().mockResolvedValue({ data: currentUser }),
      post: vi.fn(),
    };
    const client = createAuthClient({
      http,
      tokenStore,
      provider: "legacy",
    });

    await expect(client.getCurrentUser()).resolves.toEqual(currentUser);

    expect(http.get).toHaveBeenCalledWith("/v1/user/info", {
      headers: { Authorization: "Bearer current-user-token" },
    });
  });
});
