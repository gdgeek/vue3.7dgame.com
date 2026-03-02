/**
 * Unit tests for src/utils/wp.ts
 * Tests the axios instance creation and interceptors.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Shared mock objects defined at module level so they survive vi.clearAllMocks()
const mockElMessage = { error: vi.fn() };
const mockPush = vi.fn();

// Capture the created axios instance
const mockAxiosInstance = vi.hoisted(() => ({
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
  defaults: { baseURL: "" },
}));

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

vi.mock("@/store/modules/domain", () => ({
  useDomainStoreHook: vi.fn(() => ({ blog: null })),
}));

vi.mock("@/lang", () => ({
  default: {
    global: {
      locale: { value: "zh-CN" },
      t: (k: string) => k,
    },
  },
}));

vi.mock("vue-router", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
}));

vi.mock("vue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("vue")>();
  return {
    ...actual,
    ref: vi.fn((v) => ({ value: v })),
    watch: vi.fn(),
  };
});

describe("wp axios instance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("registers request and response interceptors and exports instance", async () => {
    const { default: service } = await import("@/utils/wp");
    expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    expect(service).toBe(mockAxiosInstance);
  });

  it("calls axios.create to create the instance", async () => {
    const axios = await import("axios");
    await import("@/utils/wp");
    expect(axios.default.create).toHaveBeenCalled();
  });

  it("exports the same instance that axios.create returns", async () => {
    const { default: service } = await import("@/utils/wp");
    expect(service).toBe(mockAxiosInstance);
  });
});

describe("wp request interceptor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("sets baseURL from domainStore.blog when blog is set", async () => {
    const { useDomainStoreHook } = await import("@/store/modules/domain");
    (useDomainStoreHook as ReturnType<typeof vi.fn>).mockReturnValue({
      blog: "https://myblog.example.com/",
    });
    await import("@/utils/wp");

    const reqInterceptorFn =
      mockAxiosInstance.interceptors.request.use.mock.calls[0]?.[0];
    expect(reqInterceptorFn).toBeDefined();
    const config = { baseURL: "old" };
    const result = await reqInterceptorFn(config);
    expect(result.baseURL).toContain("myblog.example.com");
    expect(result.baseURL).toContain("wp-json/wp/v2/");
  });

  it("leaves baseURL unchanged when blog is falsy", async () => {
    const { useDomainStoreHook } = await import("@/store/modules/domain");
    (useDomainStoreHook as ReturnType<typeof vi.fn>).mockReturnValue({
      blog: null,
    });
    await import("@/utils/wp");

    const reqInterceptorFn =
      mockAxiosInstance.interceptors.request.use.mock.calls[0]?.[0];
    const config = { baseURL: "https://original.com" };
    const result = await reqInterceptorFn(config);
    expect(result.baseURL).toBe("https://original.com");
  });

  it("handles store initialization error gracefully", async () => {
    const { useDomainStoreHook } = await import("@/store/modules/domain");
    (useDomainStoreHook as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("store not ready");
    });
    await import("@/utils/wp");

    const reqInterceptorFn =
      mockAxiosInstance.interceptors.request.use.mock.calls[0]?.[0];
    const config = { baseURL: "https://fallback.com" };
    const result = await reqInterceptorFn(config);
    expect(result.baseURL).toBe("https://fallback.com");
  });

  it("rejects with error from request error handler", async () => {
    await import("@/utils/wp");
    const reqErrHandler =
      mockAxiosInstance.interceptors.request.use.mock.calls[0]?.[1];
    expect(reqErrHandler).toBeDefined();
    const err = new Error("Request setup failed");
    await expect(reqErrHandler(err)).rejects.toBe(err);
  });
});

describe("wp response interceptor - success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal("ElMessage", mockElMessage);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the response unchanged", async () => {
    await import("@/utils/wp");
    const successFn =
      mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[0];
    const response = { status: 200, data: { id: 1 } };
    const result = successFn(response);
    expect(result).toBe(response);
  });
});

describe("wp response interceptor - error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal("ElMessage", mockElMessage);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows networkError message when response is absent and message is 'Network Error'", async () => {
    await import("@/utils/wp");
    const errFn =
      mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[1];
    const error = { message: "Network Error", response: undefined };
    await errFn(error).catch(() => {});
    expect(mockElMessage.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: "request.networkError" })
    );
  });

  it("shows custom error message when response is absent and message is not 'Network Error'", async () => {
    await import("@/utils/wp");
    const errFn =
      mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[1];
    const error = { message: "Custom timeout error", response: undefined };
    await errFn(error).catch(() => {});
    expect(mockElMessage.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Custom timeout error" })
    );
  });

  it("rejects with the original error when response is absent", async () => {
    await import("@/utils/wp");
    const errFn =
      mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[1];
    const error = { message: "Network Error", response: undefined };
    await expect(errFn(error)).rejects.toBe(error);
  });

  it("shows loginExpired message and navigates to login for 401 responses", async () => {
    await import("@/utils/wp");
    const errFn =
      mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[1];
    const error = {
      message: "Unauthorized",
      response: { status: 401, data: {} },
    };
    await errFn(error).catch(() => {});
    expect(mockElMessage.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: "request.loginExpired" })
    );
    expect(mockPush).toHaveBeenCalledWith({ path: "/site/login" });
  });

  it("rejects with empty string for 401 responses", async () => {
    await import("@/utils/wp");
    const errFn =
      mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[1];
    const error = {
      message: "Unauthorized",
      response: { status: 401, data: {} },
    };
    await expect(errFn(error)).rejects.toBe("");
  });

  it("shows serverError message for 5xx responses", async () => {
    await import("@/utils/wp");
    const errFn =
      mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[1];
    const error = {
      message: "Server error",
      response: { status: 500, data: {} },
    };
    await errFn(error).catch(() => {});
    expect(mockElMessage.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: "request.serverError" })
    );
  });

  it("shows response.data.message for other error statuses when present", async () => {
    await import("@/utils/wp");
    const errFn =
      mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[1];
    const error = {
      message: "Fallback",
      response: { status: 400, data: { message: "Validation failed" } },
    };
    await errFn(error).catch(() => {});
    expect(mockElMessage.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Validation failed" })
    );
  });

  it("falls back to error.message when response.data.message is absent", async () => {
    await import("@/utils/wp");
    const errFn =
      mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[1];
    const error = {
      message: "Forbidden",
      response: { status: 403, data: {} },
    };
    await errFn(error).catch(() => {});
    expect(mockElMessage.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Forbidden" })
    );
  });

  it("rejects with the response object for non-401 error responses", async () => {
    await import("@/utils/wp");
    const errFn =
      mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[1];
    const response = { status: 500, data: {} };
    const error = { message: "Server error", response };
    await expect(errFn(error)).rejects.toBe(response);
  });
});
