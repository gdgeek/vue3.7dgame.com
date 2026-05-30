/**
 * Unit tests for src/api/domain-query.ts.
 * The domain query layer must stay static-only and never call /api-domain.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const staticDefault = vi.hoisted(() => vi.fn());
const staticLanguage = vi.hoisted(() => vi.fn());

vi.mock("@/api/domain-static-config", () => ({
  getStaticDomainDefault: staticDefault,
  getStaticDomainLanguage: staticLanguage,
}));

describe("getDomainDefault()", () => {
  let getDomainDefault: typeof import("@/api/domain-query").getDomainDefault;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    staticDefault.mockResolvedValue({
      data: {
        homepage: "https://example.com",
        lang: "zh-CN",
        style: 1,
        blog: "",
        icon: "/icon.png",
      },
    });
    ({ getDomainDefault } = await import("@/api/domain-query"));
  });

  it("returns static default_config data for the provided domain", async () => {
    const response = await getDomainDefault("example.com");

    expect(staticDefault).toHaveBeenCalledWith("example.com");
    expect(response.data.homepage).toBe("https://example.com");
  });

  it("uses window.location.hostname when domain is undefined", async () => {
    Object.defineProperty(window, "location", {
      value: { hostname: "mysite.com" },
      writable: true,
      configurable: true,
    });

    await getDomainDefault();

    expect(staticDefault).toHaveBeenCalledWith("mysite.com");
  });

  it("throws instead of falling back to /api-domain when static data is missing", async () => {
    staticDefault.mockResolvedValue(null);

    await expect(getDomainDefault("missing.com")).rejects.toThrow(
      "Static domain default config not found: missing.com"
    );
  });
});

describe("getDomainLanguage()", () => {
  let getDomainLanguage: typeof import("@/api/domain-query").getDomainLanguage;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    staticLanguage.mockResolvedValue({
      data: {
        domain: "example.com",
        title: "Example",
        description: "",
        keywords: "",
        author: "",
        links: [],
      },
    });
    ({ getDomainLanguage } = await import("@/api/domain-query"));
  });

  it("returns static language config data for the provided domain and lang", async () => {
    const response = await getDomainLanguage("example.com", "en-US");

    expect(staticLanguage).toHaveBeenCalledWith("example.com", "en-US");
    expect(response.data.title).toBe("Example");
  });

  it("defaults lang to zh-CN when not provided", async () => {
    await getDomainLanguage("example.com");

    expect(staticLanguage).toHaveBeenCalledWith("example.com", "zh-CN");
  });

  it("uses window.location.hostname when domain is undefined", async () => {
    Object.defineProperty(window, "location", {
      value: { hostname: "testhost.com" },
      writable: true,
      configurable: true,
    });

    await getDomainLanguage(undefined, "ja-JP");

    expect(staticLanguage).toHaveBeenCalledWith("testhost.com", "ja-JP");
  });

  it("throws instead of falling back to /api-domain when static data is missing", async () => {
    staticLanguage.mockResolvedValue(null);

    await expect(getDomainLanguage("missing.com", "en-US")).rejects.toThrow(
      "Static domain language config not found: missing.com (en-US)"
    );
  });
});
