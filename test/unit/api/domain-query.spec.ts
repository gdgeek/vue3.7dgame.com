/**
 * Unit tests for src/api/domain-query.ts
 * Covers: getDomainDefault and getDomainLanguage URL/param construction.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture the mock axios instance so we can inspect calls
const mockAxiosInstance = vi.hoisted(() => ({
  get: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
  defaults: { baseURL: "https://domain.xrteeth.com" },
}));

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
    get: vi.fn(),
  },
}));
vi.mock("@/utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/environment", () => ({
  default: {
    domain_info: "https://domain.xrteeth.com",
    domain_info_backup: "",
  },
}));

describe("getDomainDefault()", () => {
  let getDomainDefault: typeof import("@/api/domain-query").getDomainDefault;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAxiosInstance.get.mockResolvedValue({});
    ({ getDomainDefault } = await import("@/api/domain-query"));
  });

  it("calls GET /api/query/default with current hostname when domain not provided", async () => {
    // jsdom sets window.location.hostname to 'localhost' by default
    await getDomainDefault();
    const url: string = mockAxiosInstance.get.mock.calls[0][0];
    expect(url).toContain("/api/query/default");
    expect(url).toContain("domain=");
  });

  it("calls GET with the provided domain in query string", async () => {
    await getDomainDefault("example.com");
    const url: string = mockAxiosInstance.get.mock.calls[0][0];
    expect(url).toContain("domain=example.com");
  });

  it("uses window.location.hostname as fallback when domain is undefined", async () => {
    Object.defineProperty(window, "location", {
      value: { hostname: "mysite.com" },
      writable: true,
      configurable: true,
    });
    await getDomainDefault();
    const url: string = mockAxiosInstance.get.mock.calls[0][0];
    expect(url).toContain("domain=mysite.com");
  });
});

describe("getDomainLanguage()", () => {
  let getDomainLanguage: typeof import("@/api/domain-query").getDomainLanguage;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAxiosInstance.get.mockResolvedValue({});
    ({ getDomainLanguage } = await import("@/api/domain-query"));
  });

  it("calls GET /api/query/language with domain and lang", async () => {
    await getDomainLanguage("example.com", "en-US");
    const url: string = mockAxiosInstance.get.mock.calls[0][0];
    expect(url).toContain("/api/query/language");
    expect(url).toContain("domain=example.com");
    expect(url).toContain("lang=en-US");
  });

  it("defaults lang to zh-CN when not provided", async () => {
    await getDomainLanguage("example.com");
    const url: string = mockAxiosInstance.get.mock.calls[0][0];
    expect(url).toContain("lang=zh-CN");
  });

  it("defaults domain to window.location.hostname when not provided", async () => {
    Object.defineProperty(window, "location", {
      value: { hostname: "testhost.com" },
      writable: true,
      configurable: true,
    });
    await getDomainLanguage(undefined, "ja-JP");
    const url: string = mockAxiosInstance.get.mock.calls[0][0];
    expect(url).toContain("domain=testhost.com");
    expect(url).toContain("lang=ja-JP");
  });

  it("includes both domain and lang when both provided", async () => {
    await getDomainLanguage("7dgame.com", "zh-TW");
    const url: string = mockAxiosInstance.get.mock.calls[0][0];
    expect(url).toContain("7dgame.com");
    expect(url).toContain("zh-TW");
  });
});

describe("domain-query response interceptor", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockAxiosInstance.get.mockResolvedValue({});
    await import("@/api/domain-query");
  });

  it("passes through successful response", () => {
    const resInterceptor =
      mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[0];
    const response = { data: { domain: "example.com" } };
    expect(resInterceptor(response)).toBe(response.data);
  });

  it("rejects on network error when retry already attempted", async () => {
    const errInterceptor =
      mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[1];
    const error = {
      config: { _retry: true },
      response: undefined,
    };
    await expect(errInterceptor(error)).rejects.toBe(error);
  });

  it("rejects on response error (non-network)", async () => {
    const errInterceptor =
      mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[1];
    const error = {
      config: { _retry: false },
      response: { status: 404, data: {} },
    };
    await expect(errInterceptor(error)).rejects.toBe(error);
  });
});
