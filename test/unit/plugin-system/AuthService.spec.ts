import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { AuthService } from "@/plugin-system/services/AuthService";

// Mock the token store
vi.mock("@/store/modules/token", () => {
  let stored: {
    accessToken: string;
    token: string;
    refreshToken: string;
    expires: string;
  } | null = null;

  return {
    default: {
      getToken: vi.fn(() => stored),
      hasToken: vi.fn(() => stored !== null),
      setToken: vi.fn((t: typeof stored) => {
        stored = t;
      }),
      removeToken: vi.fn(() => {
        stored = null;
      }),
      /** Test-only: reset internal state */
      _reset: () => {
        stored = null;
      },
    },
  };
});

// Import the mocked module so we can manipulate it in tests
import tokenStore from "@/store/modules/token";

const mockedTokenStore = tokenStore as unknown as {
  getToken: ReturnType<typeof vi.fn>;
  hasToken: ReturnType<typeof vi.fn>;
  setToken: ReturnType<typeof vi.fn>;
  removeToken: ReturnType<typeof vi.fn>;
  _reset: () => void;
};

/** Helper to build a minimal TokenInfo-like object */
function makeTokenInfo(accessToken: string) {
  return {
    token: "tok",
    accessToken,
    refreshToken: "rt",
    expires: new Date().toISOString(),
  };
}

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(() => {
    vi.useFakeTimers();
    mockedTokenStore._reset();
  });

  afterEach(() => {
    service?.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("getAccessToken", () => {
    it("should return null when no token is stored", () => {
      service = new AuthService();
      expect(service.getAccessToken()).toBeNull();
    });

    it("should return the accessToken from the token store", () => {
      mockedTokenStore.setToken(makeTokenInfo("abc123"));
      service = new AuthService();
      expect(service.getAccessToken()).toBe("abc123");
    });
  });

  describe("isAuthenticated", () => {
    it("should return false when no token exists", () => {
      service = new AuthService();
      expect(service.isAuthenticated()).toBe(false);
    });

    it("should return true when a token exists", () => {
      mockedTokenStore.setToken(makeTokenInfo("abc123"));
      service = new AuthService();
      expect(service.isAuthenticated()).toBe(true);
    });
  });

  describe("onTokenChange", () => {
    it("should notify subscriber when token changes", () => {
      service = new AuthService(100);
      const callback = vi.fn();
      service.onTokenChange(callback);

      // Simulate token appearing
      mockedTokenStore.setToken(makeTokenInfo("new-token"));
      vi.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledWith("new-token");
    });

    it("should not notify when token has not changed", () => {
      mockedTokenStore.setToken(makeTokenInfo("same-token"));
      service = new AuthService(100);
      const callback = vi.fn();
      service.onTokenChange(callback);

      // Advance without changing token
      vi.advanceTimersByTime(300);

      expect(callback).not.toHaveBeenCalled();
    });

    it("should notify multiple subscribers", () => {
      service = new AuthService(100);
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      service.onTokenChange(cb1);
      service.onTokenChange(cb2);

      mockedTokenStore.setToken(makeTokenInfo("multi-token"));
      vi.advanceTimersByTime(100);

      expect(cb1).toHaveBeenCalledWith("multi-token");
      expect(cb2).toHaveBeenCalledWith("multi-token");
    });

    it("should return an unsubscribe function that stops notifications", () => {
      service = new AuthService(100);
      const callback = vi.fn();
      const unsub = service.onTokenChange(callback);

      unsub();

      mockedTokenStore.setToken(makeTokenInfo("after-unsub"));
      vi.advanceTimersByTime(100);

      expect(callback).not.toHaveBeenCalled();
    });

    it("should stop polling when last subscriber unsubscribes", () => {
      service = new AuthService(100);
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      const unsub1 = service.onTokenChange(cb1);
      const unsub2 = service.onTokenChange(cb2);

      unsub1();
      unsub2();

      // Token changes after all unsubscribed — no one should be notified
      mockedTokenStore.setToken(makeTokenInfo("orphan-token"));
      vi.advanceTimersByTime(200);

      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).not.toHaveBeenCalled();
    });

    it("should detect token refresh (value change)", () => {
      mockedTokenStore.setToken(makeTokenInfo("old-token"));
      service = new AuthService(100);
      const callback = vi.fn();
      service.onTokenChange(callback);

      // Simulate token refresh
      mockedTokenStore.setToken(makeTokenInfo("refreshed-token"));
      vi.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledWith("refreshed-token");
    });

    it("should not notify when token is removed (null)", () => {
      mockedTokenStore.setToken(makeTokenInfo("will-be-removed"));
      service = new AuthService(100);
      const callback = vi.fn();
      service.onTokenChange(callback);

      // Remove token
      mockedTokenStore.removeToken();
      vi.advanceTimersByTime(100);

      // onTokenChange only fires with a new non-null token
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("error isolation", () => {
    it("should not break other subscribers when one throws", () => {
      service = new AuthService(100);
      const badCallback = vi.fn(() => {
        throw new Error("boom");
      });
      const goodCallback = vi.fn();

      service.onTokenChange(badCallback);
      service.onTokenChange(goodCallback);

      mockedTokenStore.setToken(makeTokenInfo("error-test"));
      vi.advanceTimersByTime(100);

      expect(badCallback).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalledWith("error-test");
    });
  });

  describe("destroy", () => {
    it("should stop polling and clear subscribers", () => {
      service = new AuthService(100);
      const callback = vi.fn();
      service.onTokenChange(callback);

      service.destroy();

      mockedTokenStore.setToken(makeTokenInfo("after-destroy"));
      vi.advanceTimersByTime(200);

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
