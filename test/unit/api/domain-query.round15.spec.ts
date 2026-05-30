import { describe, it, expect, vi, beforeEach } from "vitest";

const staticDefault = vi.hoisted(() => vi.fn());
const staticLanguage = vi.hoisted(() => vi.fn());

vi.mock("@/api/domain-static-config", () => ({
  getStaticDomainDefault: staticDefault,
  getStaticDomainLanguage: staticLanguage,
}));

describe("src/api/domain-query.ts round15", () => {
  let getDomainDefault: typeof import("@/api/domain-query").getDomainDefault;
  let getDomainLanguage: typeof import("@/api/domain-query").getDomainLanguage;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    staticDefault.mockResolvedValue({
      data: {
        homepage: "https://foo.com",
        lang: "",
        style: 0,
        blog: "",
        icon: "",
      },
    });
    staticLanguage.mockResolvedValue({
      data: {
        domain: "bar.com",
        title: "Bar",
        description: "",
        keywords: "",
        author: "",
        links: [],
      },
    });
    ({ getDomainDefault, getDomainLanguage } = await import(
      "@/api/domain-query"
    ));
  });

  it("getDomainDefault uses provided domain for static lookup", async () => {
    await getDomainDefault("foo.com");

    expect(staticDefault).toHaveBeenCalledWith("foo.com");
  });

  it("getDomainDefault falls back to window.location.hostname", async () => {
    const oldLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { hostname: "fallback.com" },
      configurable: true,
    });

    await getDomainDefault();

    expect(staticDefault).toHaveBeenCalledWith("fallback.com");
    Object.defineProperty(window, "location", {
      value: oldLocation,
      configurable: true,
    });
  });

  it("getDomainLanguage uses provided domain and lang for static lookup", async () => {
    await getDomainLanguage("bar.com", "en-US");

    expect(staticLanguage).toHaveBeenCalledWith("bar.com", "en-US");
  });

  it("getDomainLanguage defaults lang to zh-CN", async () => {
    await getDomainLanguage("bar.com");

    expect(staticLanguage).toHaveBeenCalledWith("bar.com", "zh-CN");
  });

  it("getDomainLanguage falls back domain from window hostname", async () => {
    const oldLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { hostname: "host.local" },
      configurable: true,
    });

    await getDomainLanguage(undefined, "ja-JP");

    expect(staticLanguage).toHaveBeenCalledWith("host.local", "ja-JP");
    Object.defineProperty(window, "location", {
      value: oldLocation,
      configurable: true,
    });
  });

  it("does not import axios or querystringify fallback behavior", async () => {
    staticDefault.mockResolvedValue(null);

    await expect(getDomainDefault("x.com")).rejects.toThrow(
      "Static domain default config not found: x.com"
    );
  });
});
