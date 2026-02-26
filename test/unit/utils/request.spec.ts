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
  default: { refresh: vi.fn() },
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
});
