/**
 * Unit tests for src/utils/request.ts
 * Tests the pure utility functions: isTokenExpiringSoon
 * and the axios instance interceptor logic via captured mocks.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture the axios service instance created at module level
const mockService = vi.hoisted(() => {
  const inst = {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: { headers: { common: {} } },
  };
  return inst;
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
    email_api: "",
    auth_api: "",
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

  it("sets baseURL from currentApi when config.baseURL does not start with http", async () => {
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
      .mockReturnValue(newToken);          // after refresh
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
    (AuthAPI.refresh as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("refresh failed"));

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
    const error = { message: "Network Error", response: undefined, config: { _retry: true } };
    await errInterceptor(error).catch(() => {});
    expect((ElMessage as { error: ReturnType<typeof vi.fn> }).error).toHaveBeenCalled();
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
    expect((ElMessage as { error: ReturnType<typeof vi.fn> }).error).toHaveBeenCalled();
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
    expect((ElMessage as { error: ReturnType<typeof vi.fn> }).error).toHaveBeenCalled();
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
    expect((ElMessage as { error: ReturnType<typeof vi.fn> }).error).toHaveBeenCalledWith(
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
    expect((ElMessage as { error: ReturnType<typeof vi.fn> }).error).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Conflict" })
    );
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
    expect((logger as { error: ReturnType<typeof vi.fn> }).error).toHaveBeenCalled();
    expect((ElMessage as { error: ReturnType<typeof vi.fn> }).error).toHaveBeenCalled();
  });
});
