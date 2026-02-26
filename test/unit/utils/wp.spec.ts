/**
 * Unit tests for src/utils/wp.ts
 * Tests the axios instance creation and interceptors.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

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
});
