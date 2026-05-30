import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  clearStaticDomainConfigCache,
  getStaticDomainDefault,
  getStaticDomainLanguage,
  normalizeStaticDomainName,
} from "@/api/domain-static-config";

function makeFetch(configs: Record<string, unknown>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const data = configs[url];

    if (!data) {
      return new Response(null, { status: 404 });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}

describe("domain-static-config", () => {
  beforeEach(() => {
    clearStaticDomainConfigCache();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("loads current domain default_config", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetch({
        "/config/domains/example.com.json": {
          name: "example.com",
          is_active: true,
          fallback_domain: "default",
          default_config: {
            homepage: "https://example.com",
            lang: "zh-CN",
            style: 1,
          },
          configs: {},
        },
      })
    );

    const result = await getStaticDomainDefault("example.com");

    expect(result).toMatchObject({
      domain: "example.com",
      actual_domain: "example.com",
      language: "default",
      requested_language: null,
      is_fallback: false,
      is_domain_fallback: false,
      data: {
        homepage: "https://example.com",
        lang: "zh-CN",
        style: 1,
      },
    });
  });

  it("falls back to zh-CN when requested language is missing", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetch({
        "/config/domains/example.com.json": {
          name: "example.com",
          is_active: true,
          fallback_domain: "default",
          default_config: { homepage: "https://example.com" },
          configs: {
            "zh-CN": {
              domain: "example.com",
              title: "中文标题",
            },
          },
        },
      })
    );

    const result = await getStaticDomainLanguage("example.com", "en-US");

    expect(result).toMatchObject({
      domain: "example.com",
      actual_domain: "example.com",
      language: "zh-CN",
      requested_language: "en-US",
      is_fallback: true,
      is_domain_fallback: false,
      data: {
        domain: "example.com",
        title: "中文标题",
      },
    });
  });

  it("falls back to fallback_domain for language config", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetch({
        "/config/domains/child.example.com.json": {
          name: "child.example.com",
          is_active: true,
          fallback_domain: "default",
          default_config: { homepage: "https://child.example.com" },
          configs: {},
        },
        "/config/domains/default.json": {
          name: "default",
          is_active: true,
          default_config: { homepage: "" },
          configs: {
            "en-US": {
              domain: "default",
              title: "Fallback Title",
            },
          },
        },
      })
    );

    const result = await getStaticDomainLanguage(
      "child.example.com",
      "en-US"
    );

    expect(result).toMatchObject({
      domain: "child.example.com",
      actual_domain: "default",
      language: "en-US",
      requested_language: "en-US",
      is_fallback: false,
      is_domain_fallback: true,
      data: {
        domain: "default",
        title: "Fallback Title",
      },
    });
  });

  it("falls back to fallback_domain default_config", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetch({
        "/config/domains/child.example.com.json": {
          name: "child.example.com",
          is_active: true,
          fallback_domain: "default",
          default_config: {},
          configs: {},
        },
        "/config/domains/default.json": {
          name: "default",
          is_active: true,
          default_config: {
            homepage: "https://default.example.com",
          },
          configs: {},
        },
      })
    );

    const result = await getStaticDomainDefault("child.example.com");

    expect(result).toMatchObject({
      domain: "child.example.com",
      actual_domain: "default",
      language: "default",
      is_domain_fallback: true,
      data: {
        homepage: "https://default.example.com",
      },
    });
  });

  it("uses default.json when domain JSON does not exist", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetch({
        "/config/domains/default.json": {
          name: "default",
          is_active: true,
          default_config: {
            homepage: "https://default.example.com",
          },
          configs: {},
        },
      })
    );

    const result = await getStaticDomainDefault("missing.example.com");

    expect(result).toMatchObject({
      domain: "missing.example.com",
      actual_domain: "default",
      is_domain_fallback: true,
      data: {
        homepage: "https://default.example.com",
      },
    });
  });

  it("matches the base domain config for any subdomain", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetch({
        "/config/domains/xrugc.com.json": {
          name: "xrugc.com",
          is_active: true,
          default_config: {
            homepage: "https://xrugc.com/",
          },
          configs: {
            "zh-CN": {
              domain: "xrugc.com",
              title: "XR UGC",
            },
          },
        },
      })
    );

    const result = await getStaticDomainLanguage("www.d.xrugc.com", "zh-CN");

    expect(result).toMatchObject({
      domain: "www.d.xrugc.com",
      actual_domain: "xrugc.com",
      is_domain_fallback: true,
      data: {
        domain: "xrugc.com",
        title: "XR UGC",
      },
    });
  });

  it("uses VITE_APP_DEV_DOMAIN_FALLBACK for local domains", () => {
    vi.stubEnv("VITE_APP_DEV_DOMAIN_FALLBACK", "example.com");

    expect(normalizeStaticDomainName("localhost")).toBe("example.com");
    expect(normalizeStaticDomainName("127.0.0.1")).toBe("example.com");
    expect(normalizeStaticDomainName("192.168.1.10")).toBe("example.com");
  });
});
