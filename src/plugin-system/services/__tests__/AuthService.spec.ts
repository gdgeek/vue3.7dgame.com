import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthClient = vi.hoisted(() => ({
  getAccessToken: vi.fn(() => null),
  onTokenChanged: vi.fn(),
  refresh: vi.fn(),
}));

const mockLogger = vi.hoisted(() => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("@/services/auth/authClient", () => ({
  default: mockAuthClient,
}));

vi.mock("@/utils/logger", () => ({
  createLogger: () => mockLogger,
}));

describe("AuthService", () => {
  beforeEach(() => {
    mockAuthClient.getAccessToken.mockReset().mockReturnValue(null);
    mockAuthClient.onTokenChanged.mockReset();
    mockAuthClient.refresh.mockReset();
    mockLogger.debug.mockReset();
    mockLogger.error.mockReset();
    mockLogger.info.mockReset();
    mockLogger.warn.mockReset();
  });

  it("reads the current access token from authClient", async () => {
    mockAuthClient.getAccessToken.mockReturnValue("host-token");
    const { AuthService } = await import("../AuthService");

    const service = new AuthService();

    expect(service.getAccessToken()).toBe("host-token");
    expect(service.isAuthenticated()).toBe(true);
  });

  it("bridges authClient token changes and cleans up subscriptions", async () => {
    const unsubscribe = vi.fn();
    mockAuthClient.onTokenChanged.mockReturnValue(unsubscribe);
    const { AuthService } = await import("../AuthService");
    const service = new AuthService();
    const listener = vi.fn();

    const stop = service.onTokenChange(listener);
    const authClientListener = mockAuthClient.onTokenChanged.mock.calls[0]?.[0];

    authClientListener?.(
      {
        token: "new-token",
        accessToken: "new-token",
        refreshToken: "new-refresh",
        expires: new Date(Date.now() + 60_000).toISOString(),
      },
      { reason: "refresh", provider: "legacy" }
    );

    expect(listener).toHaveBeenCalledWith("new-token");

    stop();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("delegates refresh to the canonical deduplicated auth client", async () => {
    mockAuthClient.refresh.mockResolvedValue({
      token: {
        token: "fresh-token",
        accessToken: "fresh-token",
        refreshToken: "fresh-refresh",
        expires: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    const { AuthService } = await import("../AuthService");
    const service = new AuthService();

    await expect(service.refreshAccessToken()).resolves.toBeUndefined();

    expect(mockAuthClient.refresh).toHaveBeenCalledOnce();
  });

  it("does not log access or refresh token values", async () => {
    const unsubscribe = vi.fn();
    mockAuthClient.onTokenChanged.mockReturnValue(unsubscribe);
    const { AuthService } = await import("../AuthService");
    const service = new AuthService();

    service.onTokenChange(vi.fn());
    const authClientListener = mockAuthClient.onTokenChanged.mock.calls[0]?.[0];
    authClientListener?.(
      {
        token: "opaque-access-secret",
        accessToken: "opaque-access-secret",
        refreshToken: "opaque-refresh-secret",
        expires: new Date(Date.now() + 60_000).toISOString(),
      },
      { reason: "refresh", provider: "legacy" }
    );

    const serializedLogs = JSON.stringify({
      debug: mockLogger.debug.mock.calls,
      error: mockLogger.error.mock.calls,
      info: mockLogger.info.mock.calls,
      warn: mockLogger.warn.mock.calls,
    });
    expect(serializedLogs).not.toContain("opaque-access-secret");
    expect(serializedLogs).not.toContain("opaque-refresh-secret");
    expect(mockLogger.info).toHaveBeenCalledWith("Token changed");
  });
});
