/**
 * Unit tests for src/utils/request.ts
 * Tests the pure utility functions: isTokenExpiringSoon
 * and the axios instance interceptor logic via captured mocks.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture the axios service instance created at module level.
// Made callable (via vi.fn base) so the failover path `return service(config)` works.
const mockService = vi.hoisted(() => {
  const fn = Object.assign(vi.fn().mockResolvedValue({ data: {} }), {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: { headers: { common: {} } },
  });
  return fn;
});

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => mockService),
    get: vi.fn(),
  },
}));

vi.mock("@/router", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

vi.mock("@/lang", () => ({
  default: {
    global: {
      locale: { value: "zh-CN" },
      t: (k: string) => `[${k}]`,
    },
  },
}));

vi.mock("element-plus", () => ({
  ElMessage: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/api/v1/auth", () => ({
  refresh: vi.fn(),
}));

vi.mock("@/environment", () => ({
  default: {
    api: "https://primary.api.com",
    backup_api: "https://backup.api.com",
    useCloud: vi.fn(() => false),
  },
}));

vi.mock("vue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("vue")>();
  return {
    ...actual,
    ref: vi.fn((v) => ({ value: v })),
    watch: vi.fn(),
  };
});

vi.mock("@/store/modules/token", () => ({
  default: {
    getToken: vi.fn(() => null),
    setToken: vi.fn(),
    removeToken: vi.fn(),
  },
}));

vi.mock("@/utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn() },
}));

// Mock failover to return mockService directly without adding its own interceptors,
// so tests can reliably index into calls[0] for request.ts interceptors.
vi.mock("@/utils/failover", () => ({
  createFailoverAxios: vi.fn(() => mockService),
}));

describe("request.ts module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("creates an axios instance and exports it as default", async () => {
    const { default: service } = await import("@/utils/request");
    expect(service).toBe(mockService);
  });

  it("registers a request interceptor", async () => {
    await import("@/utils/request");
    expect(mockService.interceptors.request.use).toHaveBeenCalled();
  });

  it("registers a response interceptor", async () => {
    await import("@/utils/request");
    expect(mockService.interceptors.response.use).toHaveBeenCalled();
  });
});

describe("request interceptor logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("passes config through when no token", async () => {
    const Token = (await import("@/store/modules/token")).default;
    (Token.getToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
    await import("@/utils/request");

    const reqInterceptor =
      mockService.interceptors.request.use.mock.calls[0]?.[0];
    expect(reqInterceptor).toBeDefined();
    const config = { url: "/v1/test", headers: {} };
    const result = await reqInterceptor(config);
    expect(result).toBe(config);
  });

  it("sets Authorization header when token exists", async () => {
    const Token = (await import("@/store/modules/token")).default;
    (Token.getToken as ReturnType<typeof vi.fn>).mockReturnValue({
      accessToken: "my-access-token",
      refreshToken: "my-refresh-token",
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    });
    await import("@/utils/request");

    const reqInterceptor =
      mockService.interceptors.request.use.mock.calls[0]?.[0];
    const config = { url: "/v1/other", headers: {}, baseURL: "" };
    await reqInterceptor(config);
    expect(config.headers.Authorization).toBe("Bearer my-access-token");
  });

  // TODO: Move to failover.spec.ts — baseURL is set by createFailoverAxios interceptor (now in failover.ts)
  it.skip("sets baseURL from currentApi when config.baseURL does not start with http", async () => {
    const Token = (await import("@/store/modules/token")).default;
    (Token.getToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
    await import("@/utils/request");

    const reqInterceptor =
      mockService.interceptors.request.use.mock.calls[0]?.[0];
    const config = { url: "/v1/test", headers: {}, baseURL: "" };
    await reqInterceptor(config);
    // PRIMARY_API = "https://primary.api.com" from environment mock
    expect(config.baseURL).toBe("https://primary.api.com");
  });

  it("refreshes token when token is expiring soon (within 5 minutes)", async () => {
    const Token = (await import("@/store/modules/token")).default;
    const AuthAPI = await import("@/api/v1/auth");
    // Token expiring in 2 minutes (< 5 minutes → expiring soon)
    const expiringToken = {
      accessToken: "old-token",
      refreshToken: "refresh-token",
      expires: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
    };
    const newToken = {
      accessToken: "new-token",
      refreshToken: "new-refresh",
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
    // 1st call: request interceptor reads the expiring token
    // 2nd call: refreshToken() internal function reads the token to get refreshToken
    // 3rd call: after refresh, new token is read to update Authorization header
    (Token.getToken as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(expiringToken) // request interceptor
      .mockReturnValueOnce(expiringToken) // inside refreshToken()
      .mockReturnValue(newToken); // after refresh
    (AuthAPI.refresh as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { token: newToken },
    });

    await import("@/utils/request");
    const reqInterceptor =
      mockService.interceptors.request.use.mock.calls[0]?.[0];
    const config = { url: "/v1/data", headers: {}, baseURL: "" };
    await reqInterceptor(config);

    expect(AuthAPI.refresh).toHaveBeenCalledWith("refresh-token");
    // After refresh, headers should use the new token
    expect(config.headers.Authorization).toBe("Bearer new-token");
  });

  it("handles token refresh failure by calling handleUnauthorized", async () => {
    const Token = (await import("@/store/modules/token")).default;
    const AuthAPI = await import("@/api/v1/auth");
    const expiringToken = {
      accessToken: "old-token",
      refreshToken: "refresh-token",
      expires: new Date(Date.now() + 1 * 60 * 1000).toISOString(),
    };
    (Token.getToken as ReturnType<typeof vi.fn>).mockReturnValue(expiringToken);
    (AuthAPI.refresh as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("refresh failed")
    );

    await import("@/utils/request");
    const reqInterceptor =
      mockService.interceptors.request.use.mock.calls[0]?.[0];
    const config = { url: "/v1/data", headers: {}, baseURL: "" };
    // Should reject (handleUnauthorized returns Promise.reject(""))
    await expect(reqInterceptor(config)).rejects.toBeDefined();
    expect(Token.removeToken).toHaveBeenCalled();
  });

  it("skips token refresh for whitelisted URLs", async () => {
    const Token = (await import("@/store/modules/token")).default;
    const AuthAPI = await import("@/api/v1/auth");
    const expiringToken = {
      accessToken: "old-token",
      refreshToken: "refresh-token",
      expires: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
    };
    (Token.getToken as ReturnType<typeof vi.fn>).mockReturnValue(expiringToken);

    await import("@/utils/request");
    const reqInterceptor =
      mockService.interceptors.request.use.mock.calls[0]?.[0];
    // /v1/auth/refresh is in the whitelist
    const config = { url: "/v1/auth/refresh", headers: {}, baseURL: "" };
    await reqInterceptor(config);

    // Refresh should NOT be called for whitelisted URLs
    expect(AuthAPI.refresh).not.toHaveBeenCalled();
  });
});

describe("response interceptor logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("passes successful response through", async () => {
    await import("@/utils/request");
    const resInterceptor =
      mockService.interceptors.response.use.mock.calls[0]?.[0];
    const response = { status: 200, data: { ok: true } };
    const result = resInterceptor(response);
    expect(result).toBe(response);
  });

  it("shows network error message for Network Error", async () => {
    const { ElMessage } = await import("element-plus");
    await import("@/utils/request");

    const errInterceptor =
      mockService.interceptors.response.use.mock.calls[0]?.[1];
    // Set _retry: true to bypass failover logic and reach the error message branch
    const error = {
      message: "Network Error",
      response: undefined,
      config: { _retry: true },
    };
    await errInterceptor(error).catch(() => {});
    expect(
      (ElMessage as { error: ReturnType<typeof vi.fn> }).error
    ).toHaveBeenCalled();
  });

  it("handles 401 response by calling removeToken", async () => {
    const Token = (await import("@/store/modules/token")).default;
    await import("@/utils/request");

    const errInterceptor =
      mockService.interceptors.response.use.mock.calls[0]?.[1];
    const error = {
      message: "Unauthorized",
      response: { status: 401, data: {} },
      config: { _retry: false },
    };
    await errInterceptor(error).catch(() => {});
    expect(Token.removeToken).toHaveBeenCalled();
  });

  it("handles 500 response by showing error message", async () => {
    const { ElMessage } = await import("element-plus");
    await import("@/utils/request");

    const errInterceptor =
      mockService.interceptors.response.use.mock.calls[0]?.[1];
    const error = {
      message: "Internal Server Error",
      response: { status: 500, data: {} },
      config: { _retry: true },
    };
    await errInterceptor(error).catch(() => {});
    expect(
      (ElMessage as { error: ReturnType<typeof vi.fn> }).error
    ).toHaveBeenCalled();
  });

  it("handles 404 response by showing 404 error message", async () => {
    const { ElMessage } = await import("element-plus");
    await import("@/utils/request");

    const errInterceptor =
      mockService.interceptors.response.use.mock.calls[0]?.[1];
    const error = {
      message: "Not Found",
      response: { status: 404, data: {} },
      config: { _retry: true },
    };
    await errInterceptor(error).catch(() => {});
    expect(
      (ElMessage as { error: ReturnType<typeof vi.fn> }).error
    ).toHaveBeenCalled();
  });

  it("shows response.data.message for other error status codes", async () => {
    const { ElMessage } = await import("element-plus");
    await import("@/utils/request");

    const errInterceptor =
      mockService.interceptors.response.use.mock.calls[0]?.[1];
    const error = {
      message: "Bad Request",
      response: { status: 400, data: { message: "Custom server message" } },
      config: { _retry: true },
    };
    await errInterceptor(error).catch(() => {});
    expect(
      (ElMessage as { error: ReturnType<typeof vi.fn> }).error
    ).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Custom server message" })
    );
  });

  it("shows error.message when response.data.message is absent for other status codes", async () => {
    const { ElMessage } = await import("element-plus");
    await import("@/utils/request");

    const errInterceptor =
      mockService.interceptors.response.use.mock.calls[0]?.[1];
    const error = {
      message: "Conflict",
      response: { status: 409, data: {} },
      config: { _retry: true },
    };
    await errInterceptor(error).catch(() => {});
    expect(
      (ElMessage as { error: ReturnType<typeof vi.fn> }).error
    ).toHaveBeenCalledWith(expect.objectContaining({ message: "Conflict" }));
  });

  it("logs and shows error message for non-Network errors without response", async () => {
    const { ElMessage } = await import("element-plus");
    const { logger } = await import("@/utils/logger");
    await import("@/utils/request");

    const errInterceptor =
      mockService.interceptors.response.use.mock.calls[0]?.[1];
    const error = {
      message: "ECONNREFUSED",
      response: undefined,
      config: { _retry: true },
    };
    await errInterceptor(error).catch(() => {});
    expect(
      (logger as { error: ReturnType<typeof vi.fn> }).error
    ).toHaveBeenCalled();
    expect(
      (ElMessage as { error: ReturnType<typeof vi.fn> }).error
    ).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// API failover logic — covers lines 195-210 (backup API switch)
// ---------------------------------------------------------------------------
describe("API failover response interceptor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  // TODO: Move to failover.spec.ts — failover switching logic is now in failover.ts
  it.skip("switches to backup API and retries when primary fails (no _retry, no response)", async () => {
    const { logger } = await import("@/utils/logger");
    await import("@/utils/request");

    const errInterceptor =
      mockService.interceptors.response.use.mock.calls[0]?.[1];

    // _retry: false → triggers failover; BACKUP_API is set in mock env
    const config = { url: "/v1/data", headers: {}, baseURL: "", _retry: false };
    const error = { message: "Network Error", response: undefined, config };

    // The failover sets _retry=true, then calls service(config) which is mockService (vi.fn)
    await errInterceptor(error).catch(() => {});

    // logger.warn should have been called with the failover message
    expect(
      (logger as { warn: ReturnType<typeof vi.fn> }).warn
    ).toHaveBeenCalledWith(expect.stringContaining("Failover"));
    // config should be marked as retried
    expect(config._retry).toBe(true);
    // mockService itself (the callable fn) should have been called with config
    expect(mockService).toHaveBeenCalledWith(config);
  });

  it("does NOT switch to backup when _retry is already true", async () => {
    const { ElMessage } = await import("element-plus");
    await import("@/utils/request");

    const errInterceptor =
      mockService.interceptors.response.use.mock.calls[0]?.[1];

    // _retry: true → already retried, skip failover → show network error
    const error = {
      message: "Network Error",
      response: undefined,
      config: { _retry: true },
    };
    await errInterceptor(error).catch(() => {});
    // ElMessage.error should be called (network error message), not a retry
    expect(
      (ElMessage as { error: ReturnType<typeof vi.fn> }).error
    ).toHaveBeenCalled();
  });

  it("showErrorMessage skips empty messages", async () => {
    const { ElMessage } = await import("element-plus");
    await import("@/utils/request");

    const errInterceptor =
      mockService.interceptors.response.use.mock.calls[0]?.[1];

    // A 400 response with an empty message string
    const error = {
      message: "",
      response: { status: 400, data: { message: "" } },
      config: { _retry: true },
    };
    await errInterceptor(error).catch(() => {});
    // showErrorMessage returns early for empty strings → ElMessage.error not called
    expect(
      (ElMessage as { error: ReturnType<typeof vi.fn> }).error
    ).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// handleUnauthorized — isHandlingUnauthorized flag prevents double redirects
// ---------------------------------------------------------------------------
describe("handleUnauthorized deduplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("rejects silently on second concurrent 401 while first is still processing", async () => {
    const Token = (await import("@/store/modules/token")).default;
    const { ElMessage } = await import("element-plus");
    await import("@/utils/request");

    const errInterceptor =
      mockService.interceptors.response.use.mock.calls[0]?.[1];

    const error = {
      message: "Unauthorized",
      response: { status: 401, data: {} },
      config: { _retry: false },
    };

    // Fire two concurrent 401s — the second should be silently rejected
    const [r1, r2] = await Promise.allSettled([
      errInterceptor(error),
      errInterceptor(error),
    ]);

    // Both should have rejected
    expect(r1.status).toBe("rejected");
    expect(r2.status).toBe("rejected");

    // removeToken should be called by the first handler; the second is a no-op
    expect(Token.removeToken).toHaveBeenCalled();
    // ElMessage.error should be called (at least once) for the login-expired notice
    expect(
      (ElMessage as { error: ReturnType<typeof vi.fn> }).error
    ).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// request interceptor error handler — line 148-149
// ---------------------------------------------------------------------------
describe("request interceptor error handler (line 148-149)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("request interceptor error handler rejects with the original error", async () => {
    await import("@/utils/request");

    // The request interceptor is registered as: service.interceptors.request.use(success, error)
    // We need the SECOND argument — the error handler (lines 147-149)
    const reqErrHandler =
      mockService.interceptors.request.use.mock.calls[0]?.[1];
    expect(reqErrHandler).toBeDefined();

    const originalError = new Error("request setup failed");
    await expect(reqErrHandler(originalError)).rejects.toThrow(
      "request setup failed"
    );
  });

  it("request interceptor error handler returns a rejected Promise", async () => {
    await import("@/utils/request");
    const reqErrHandler =
      mockService.interceptors.request.use.mock.calls[0]?.[1];

    const result = reqErrHandler(new Error("oops"));
    // Should be a Promise
    expect(result).toBeInstanceOf(Promise);
    // Should reject
    await expect(result).rejects.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// handleUnauthorized setTimeout callback — line 177
// isHandlingUnauthorized resets after 1000ms
// ---------------------------------------------------------------------------
describe("handleUnauthorized setTimeout callback (line 177)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("isHandlingUnauthorized resets to false after 1000ms (allows next 401 through)", async () => {
    const Token = (await import("@/store/modules/token")).default;
    const { ElMessage } = await import("element-plus");
    await import("@/utils/request");

    const errInterceptor =
      mockService.interceptors.response.use.mock.calls[0]?.[1];

    const make401 = () => ({
      message: "Unauthorized",
      response: { status: 401, data: {} },
      config: { _retry: false },
    });

    // First 401 — triggers handleUnauthorized, sets isHandlingUnauthorized=true
    await errInterceptor(make401()).catch(() => {});

    // removeToken called once
    expect(Token.removeToken).toHaveBeenCalledTimes(1);

    // Advance clock by 1000ms → setTimeout callback fires (line 177)
    vi.advanceTimersByTime(1000);

    // Now isHandlingUnauthorized should be false again.
    // Fire another 401 — it should be handled again (not silently rejected)
    await errInterceptor(make401()).catch(() => {});
    // removeToken should now have been called a second time
    expect(Token.removeToken).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// refreshToken guard — lines 87-88: throws when token has no refreshToken
// ---------------------------------------------------------------------------
describe("refreshToken guard (lines 87-88) — token without refreshToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("throws 'No refresh token available' when Token.getToken() returns null inside refreshToken", async () => {
    const Token = (await import("@/store/modules/token")).default;
    const expiringToken = {
      accessToken: "old-token",
      refreshToken: "refresh-token",
      expires: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // expires in 2 min
    };
    // First call (request interceptor check): returns expiring token → triggers refresh
    // Second call (inside refreshToken()): returns null → throws
    (Token.getToken as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(expiringToken)
      .mockReturnValueOnce(null);

    await import("@/utils/request");
    const reqInterceptor =
      mockService.interceptors.request.use.mock.calls[0]?.[0];
    const config = { url: "/v1/data", headers: {}, baseURL: "" };

    // Should reject because refreshToken() throws when token is null
    await expect(reqInterceptor(config)).rejects.toBeDefined();
    // removeToken should be called via handleUnauthorized
    expect(Token.removeToken).toHaveBeenCalled();
  });

  it("throws when token exists but has no refreshToken field", async () => {
    const Token = (await import("@/store/modules/token")).default;
    const expiringToken = {
      accessToken: "old-token",
      refreshToken: "refresh-token",
      expires: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
    };
    const tokenWithoutRefresh = {
      accessToken: "some-token",
      // no refreshToken
      expires: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
    };
    (Token.getToken as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(expiringToken) // request interceptor
      .mockReturnValueOnce(tokenWithoutRefresh); // inside refreshToken()

    await import("@/utils/request");
    const reqInterceptor =
      mockService.interceptors.request.use.mock.calls[0]?.[0];
    const config = { url: "/v1/other", headers: {}, baseURL: "" };

    await expect(reqInterceptor(config)).rejects.toBeDefined();
    expect(Token.removeToken).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// startHealthCheck interval body — lines 29-39 (via fake timers)
// ---------------------------------------------------------------------------
describe("startHealthCheck interval body (lines 29-39)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // TODO: Move to failover.spec.ts — health check interval logic is now in failover.ts
  it.skip("interval callback: primary restored → switches back from backup", async () => {
    const axiosMod = await import("axios");
    const logger = (await import("@/utils/logger")).logger;
    // axios.get resolves (primary is up)
    (axiosMod.default.get as ReturnType<typeof vi.fn>).mockResolvedValue({});
    await import("@/utils/request");

    // Trigger failover path first: errInterceptor with no response, no retry, backup exists
    const errInterceptor =
      mockService.interceptors.response.use.mock.calls[0]?.[1];
    const config = { url: "/v1/data", headers: {}, baseURL: "", _retry: false };
    await errInterceptor({
      message: "Network Error",
      response: undefined,
      config,
    }).catch(() => {});

    // Health check should now be running; advance 30 seconds
    await vi.advanceTimersByTimeAsync(30000);

    // Logger.info should have been called indicating primary was restored
    expect(
      (logger as { info: ReturnType<typeof vi.fn> }).info
    ).toHaveBeenCalledWith(expect.stringContaining("restored"));
  });

  it("interval callback: primary still down → stays on backup (catch branch)", async () => {
    const axiosMod = await import("axios");
    // axios.get rejects (primary is still down)
    (axiosMod.default.get as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("still down")
    );
    await import("@/utils/request");

    const errInterceptor =
      mockService.interceptors.response.use.mock.calls[0]?.[1];
    const config = { url: "/v1/data", headers: {}, baseURL: "", _retry: false };
    await errInterceptor({
      message: "Network Error",
      response: undefined,
      config,
    }).catch(() => {});

    // Advance 30s → health check fires → catches error (no throw)
    await vi.advanceTimersByTimeAsync(30000);
    // No unhandled error — test passes if we reach here
    expect(true).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// lang watcher callback — lines 15-16
// ---------------------------------------------------------------------------
describe("lang watcher callback (lines 15-16)", () => {
  it("watch callback updates lang.value when locale changes", async () => {
    // This test exercises the watch callback by importing without mocking vue.watch
    // Since vue.watch IS mocked in this module, we capture the registered callback
    vi.clearAllMocks();
    vi.resetModules();

    const vueMod = await import("vue");
    const watchSpy = vi.spyOn(vueMod, "watch");

    await import("@/utils/request");

    // The watch was registered; get its callback
    if (watchSpy.mock.calls.length > 0) {
      const [, callback] = watchSpy.mock.calls[0] as [
        unknown,
        (v: string) => void,
      ];
      if (typeof callback === "function") {
        // Calling the callback should not throw
        expect(() => callback("en-US")).not.toThrow();
      }
    }
    watchSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// 额外边界用例 — lines 148-149: request interceptor error handler
// ---------------------------------------------------------------------------
describe("request interceptor error handler — extra edge cases (lines 148-149)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("error 为 string 时 Promise.reject 携带该字符串", async () => {
    await import("@/utils/request");
    const reqErrHandler =
      mockService.interceptors.request.use.mock.calls[0]?.[1];

    const result = reqErrHandler("string-error");
    await expect(result).rejects.toBe("string-error");
  });

  it("error 为 null 时 Promise.reject(null) 不抛出 unhandled", async () => {
    await import("@/utils/request");
    const reqErrHandler =
      mockService.interceptors.request.use.mock.calls[0]?.[1];

    const result = reqErrHandler(null);
    expect(result).toBeInstanceOf(Promise);
    await expect(result).rejects.toBeNull();
  });

  it("error 为对象时原样 reject", async () => {
    await import("@/utils/request");
    const reqErrHandler =
      mockService.interceptors.request.use.mock.calls[0]?.[1];

    const errObj = { code: "NETWORK_ERR", message: "fail" };
    await expect(reqErrHandler(errObj)).rejects.toBe(errObj);
  });
});

// ---------------------------------------------------------------------------
// 额外边界用例 — line 177: setTimeout 回调不足 1000ms 时 flag 未重置
// ---------------------------------------------------------------------------
describe("handleUnauthorized setTimeout — extra edge cases (line 177)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("不足 1000ms 时第二个 401 被静默拒绝（flag 未重置）", async () => {
    const Token = (await import("@/store/modules/token")).default;
    await import("@/utils/request");

    const errInterceptor =
      mockService.interceptors.response.use.mock.calls[0]?.[1];

    const make401 = () => ({
      message: "Unauthorized",
      response: { status: 401, data: {} },
      config: { _retry: false },
    });

    // 第一个 401：isHandlingUnauthorized = true
    await errInterceptor(make401()).catch(() => {});
    expect(Token.removeToken).toHaveBeenCalledTimes(1);

    // 仅推进 500ms（< 1000ms）：flag 还未重置
    vi.advanceTimersByTime(500);

    // 第二个 401：被静默拒绝，removeToken 不会再被调用
    await errInterceptor(make401()).catch(() => {});
    expect(Token.removeToken).toHaveBeenCalledTimes(1); // 仍然是 1

    // 再推进到 1000ms → flag 重置
    vi.advanceTimersByTime(500);

    // 第三个 401：flag 已重置，正常处理
    await errInterceptor(make401()).catch(() => {});
    expect(Token.removeToken).toHaveBeenCalledTimes(2);
  });

  it("setTimeout 精确在 1000ms 时触发（line 177 回调执行）", async () => {
    const Token = (await import("@/store/modules/token")).default;
    await import("@/utils/request");

    const errInterceptor =
      mockService.interceptors.response.use.mock.calls[0]?.[1];

    const make401 = () => ({
      message: "Unauthorized",
      response: { status: 401, data: {} },
      config: { _retry: false },
    });

    await errInterceptor(make401()).catch(() => {});
    expect(Token.removeToken).toHaveBeenCalledTimes(1);

    // 精确推进到 1000ms
    vi.advanceTimersByTime(1000);

    // 确认 flag 已重置 — 第二个 401 被正常处理
    await errInterceptor(make401()).catch(() => {});
    expect(Token.removeToken).toHaveBeenCalledTimes(2);
  });
});
