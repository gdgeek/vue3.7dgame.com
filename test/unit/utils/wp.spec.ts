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

  it.each(["Network Error", "timeout"])(
    "rejects %s without opening a global notification",
    async (message) => {
      await import("@/utils/wp");
      const reject =
        mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      const error = new Error(message);
      await expect(reject(error)).rejects.toBe(error);
      expect(mockElMessage.error).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    }
  );

  it.each([401, 403, 404, 500, 502])(
    "passes HTTP %i to the feature without a toast or login redirect",
    async (status) => {
      await import("@/utils/wp");
      const reject =
        mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      const response = { status, data: "proxy response" };
      await expect(reject({ message: "HTTP error", response })).rejects.toBe(
        response
      );
      expect(mockElMessage.error).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    }
  );
});
