import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthClient = vi.hoisted(() => ({
  getAccessToken: vi.fn(() => null),
  onTokenChanged: vi.fn(),
}));

vi.mock("@/services/auth/authClient", () => ({
  default: mockAuthClient,
}));

vi.mock("@/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}));

describe("AuthService", () => {
  beforeEach(() => {
    mockAuthClient.getAccessToken.mockReset().mockReturnValue(null);
    mockAuthClient.onTokenChanged.mockReset();
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
});
