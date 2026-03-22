/**
 * Unit tests for src/api/domain-query.ts
 * Covers: getDomainDefault and getDomainLanguage URL/param construction.
 * Note: Failover is now handled by Nginx, so no createFailoverAxios tests.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

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
  },
}));
vi.mock("@/environment", () => ({
  default: {
    domain_info: "https://domain.xrteeth.com",
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
});

describe("domain-query response interceptor", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockAxiosInstance.get.mockResolvedValue({});
    await import("@/api/domain-query");
  });

  it("extracts response.data on success", () => {
    const resInterceptor =
      mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[0];
    const response = { data: { domain: "example.com" } };
    expect(resInterceptor(response)).toBe(response.data);
  });
});
