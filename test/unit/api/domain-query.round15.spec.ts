import { describe, it, expect, vi, beforeEach } from "vitest";

const mockService = vi.hoisted(() => ({
  get: vi.fn(),
  interceptors: {
    response: { use: vi.fn() },
  },
}));

const stringifySpy = vi.hoisted(() =>
  vi.fn((obj: Record<string, string>, prefix?: boolean) => {
    const query = new URLSearchParams(obj).toString();
    return prefix ? `?${query}` : query;
  })
);

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => mockService),
  },
}));
vi.mock("querystringify", () => ({
  default: {
    stringify: stringifySpy,
  },
}));
vi.mock("@/environment", () => ({
  default: {
    domain_info: "https://domain.primary.example",
  },
}));

describe("src/api/domain-query.ts round15", () => {
  let getDomainDefault: typeof import("@/api/domain-query").getDomainDefault;
  let getDomainLanguage: typeof import("@/api/domain-query").getDomainLanguage;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockService.get.mockResolvedValue({});
    ({ getDomainDefault, getDomainLanguage } = await import(
      "@/api/domain-query"
    ));
  });

  it("registers response interceptor extracting response.data", () => {
    const handler = mockService.interceptors.response.use.mock.calls[0][0];
    expect(handler({ data: { ok: 1 } })).toEqual({ ok: 1 });
  });

  it("getDomainDefault uses provided domain", async () => {
    await getDomainDefault("foo.com");
    expect(mockService.get).toHaveBeenCalledWith(
      "/api/query/default?domain=foo.com"
    );
  });

  it("getDomainDefault falls back to window.location.hostname", async () => {
    const oldLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { hostname: "fallback.com" },
      configurable: true,
    });
    await getDomainDefault();
    expect(mockService.get).toHaveBeenCalledWith(
      "/api/query/default?domain=fallback.com"
    );
    Object.defineProperty(window, "location", {
      value: oldLocation,
      configurable: true,
    });
  });

  it("getDomainLanguage uses provided domain and lang", async () => {
    await getDomainLanguage("bar.com", "en-US");
    expect(mockService.get).toHaveBeenCalledWith(
      "/api/query/language?domain=bar.com&lang=en-US"
    );
  });

  it("getDomainLanguage defaults lang to zh-CN", async () => {
    await getDomainLanguage("bar.com");
    expect(mockService.get).toHaveBeenCalledWith(
      "/api/query/language?domain=bar.com&lang=zh-CN"
    );
  });

  it("getDomainLanguage falls back domain from window hostname", async () => {
    const oldLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { hostname: "host.local" },
      configurable: true,
    });
    await getDomainLanguage(undefined, "ja-JP");
    expect(mockService.get).toHaveBeenCalledWith(
      "/api/query/language?domain=host.local&lang=ja-JP"
    );
    Object.defineProperty(window, "location", {
      value: oldLocation,
      configurable: true,
    });
  });

  it("delegates query formatting to stringify with prefix", async () => {
    await getDomainDefault("x.com");
    expect(stringifySpy).toHaveBeenCalledWith({ domain: "x.com" }, true);
  });
});
