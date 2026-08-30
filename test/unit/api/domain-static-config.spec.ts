import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  clearStaticDomainConfigCache,
  getStaticDomainDefault,
  getStaticDomainLanguage,
  normalizeStaticDomainName,
} from "@/api/domain-static-config";
import bujiabanConfig from "../../../public/config/domains/bujiaban.com.json";
import devXrugcConfig from "../../../public/config/domains/dev.xrugc.com.json";
import xiadingConfig from "../../../public/config/domains/xiading.hxgxonline.com.json";

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

  it("loads top-level homepage with current domain default_config", async () => {
    const fetchMock = makeFetch({
      "/config/domains/example.com.json": {
        name: "example.com",
        homepage: "https://example.com",
        default_config: {
          lang: "zh-CN",
          style: 1,
        },
        configs: {},
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getStaticDomainDefault("example.com");

    expect(fetchMock).toHaveBeenCalledWith(
      "/config/domains/example.com.json",
      expect.objectContaining({
        cache: "no-store",
        headers: { Accept: "application/json" },
      })
    );
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
          homepage: "https://example.com",
          default_config: {},
          configs: {
            "zh-CN": {
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
        title: "中文标题",
      },
    });
  });

  it("falls back to default.json for language config", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetch({
        "/config/domains/child.example.com.json": {
          name: "child.example.com",
          homepage: "https://child.example.com",
          default_config: {},
          configs: {},
        },
        "/config/domains/default.json": {
          name: "default",
          default_config: {},
          configs: {
            "en-US": {
              title: "Fallback Title",
            },
          },
        },
      })
    );

    const result = await getStaticDomainLanguage("child.example.com", "en-US");

    expect(result).toMatchObject({
      domain: "child.example.com",
      actual_domain: "default",
      language: "en-US",
      requested_language: "en-US",
      is_fallback: false,
      is_domain_fallback: true,
      data: {
        title: "Fallback Title",
      },
    });
  });

  it("falls back to default.json default_config", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetch({
        "/config/domains/child.example.com.json": {
          name: "child.example.com",
          default_config: {},
          configs: {},
        },
        "/config/domains/default.json": {
          name: "default",
          homepage: "https://default.example.com",
          default_config: {},
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
          homepage: "https://default.example.com",
          default_config: {},
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
          homepage: "https://xrugc.com/",
          default_config: {},
          configs: {
            "zh-CN": {
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
        title: "XR UGC",
      },
    });
  });

  it("prefers the complete hostname before parent-domain configs", async () => {
    const fetchMock = makeFetch({
      "/config/domains/d.dev.xrugc.com.json": {
        name: "d.dev.xrugc.com",
        homepage: "https://d.dev.xrugc.com/",
        default_config: {},
        configs: {},
      },
      "/config/domains/dev.xrugc.com.json": {
        name: "dev.xrugc.com",
        homepage: "https://dev.xrugc.com/",
        default_config: {},
        configs: {},
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getStaticDomainDefault("d.dev.xrugc.com");

    expect(result).toMatchObject({
      actual_domain: "d.dev.xrugc.com",
      is_domain_fallback: false,
      data: { homepage: "https://d.dev.xrugc.com/" },
    });
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/config/domains/dev.xrugc.com.json",
      expect.anything()
    );
  });

  it("loads bujiaban.com default and all localized configs from static JSON", async () => {
    const fetchMock = makeFetch({
      "/config/domains/bujiaban.com.json": bujiabanConfig,
    });
    vi.stubGlobal("fetch", fetchMock);

    const defaultResult = await getStaticDomainDefault("www.bujiaban.com");

    expect(fetchMock).toHaveBeenCalledWith(
      "/config/domains/www.bujiaban.com.json",
      expect.anything()
    );
    expect(defaultResult).toMatchObject({
      domain: "www.bujiaban.com",
      actual_domain: "bujiaban.com",
      language: "default",
      requested_language: null,
      is_fallback: false,
      is_domain_fallback: true,
      data: {
        homepage: "https://www.bujiaban.com/",
        icon: "/config/domains/bujiaban-icon.png",
      },
    });

    for (const language of ["zh-CN", "zh-TW", "en-US", "ja-JP", "th-TH"]) {
      const result = await getStaticDomainLanguage(
        "studio.bujiaban.com",
        language
      );

      expect(result).toMatchObject({
        domain: "studio.bujiaban.com",
        actual_domain: "bujiaban.com",
        language,
        requested_language: language,
        is_fallback: false,
        is_domain_fallback: true,
      });

      expect(result?.data.title).toBeTruthy();
      expect(result?.data.description).toContain("AR");
      expect(result?.data.keywords).toContain("AR");
      expect(result?.data.author).toBeTruthy();
      expect(result?.data.links).toHaveLength(2);
    }
  });

  it("loads dev.xrugc.com with xrugc.com business content", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetch({
        "/config/domains/dev.xrugc.com.json": devXrugcConfig,
      })
    );

    const defaultResult = await getStaticDomainDefault("d.dev.xrugc.com");

    expect(defaultResult).toMatchObject({
      domain: "d.dev.xrugc.com",
      actual_domain: "dev.xrugc.com",
      language: "default",
      is_domain_fallback: true,
      data: {
        homepage: "https://dev.xrugc.com/",
      },
    });

    const languageResult = await getStaticDomainLanguage(
      "d.dev.xrugc.com",
      "en-US"
    );

    expect(languageResult).toMatchObject({
      domain: "d.dev.xrugc.com",
      actual_domain: "dev.xrugc.com",
      language: "zh-CN",
      requested_language: "en-US",
      is_fallback: true,
      is_domain_fallback: true,
      data: {
        title: "XR UGC Dev",
      },
    });
  });

  it("loads d.xiading.hxgxonline.com from the parent xiading domain config", async () => {
    const fetchMock = makeFetch({
      "/config/domains/xiading.hxgxonline.com.json": xiadingConfig,
    });
    vi.stubGlobal("fetch", fetchMock);

    const defaultResult = await getStaticDomainDefault(
      "d.xiading.hxgxonline.com"
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/config/domains/xiading.hxgxonline.com.json",
      expect.anything()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/config/domains/d.xiading.hxgxonline.com.json",
      expect.anything()
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/config/domains/default.json",
      expect.anything()
    );
    expect(defaultResult).toMatchObject({
      domain: "d.xiading.hxgxonline.com",
      actual_domain: "xiading.hxgxonline.com",
      language: "default",
      is_domain_fallback: true,
      data: {
        homepage: "https://xiading.hxgxonline.com",
      },
    });

    const languageResult = await getStaticDomainLanguage(
      "d.xiading.hxgxonline.com",
      "zh-TW"
    );

    expect(languageResult).toMatchObject({
      domain: "d.xiading.hxgxonline.com",
      actual_domain: "xiading.hxgxonline.com",
      language: "zh-TW",
      requested_language: "zh-TW",
      is_fallback: false,
      is_domain_fallback: true,
      data: {
        title: "夏鼎AI/AR教育平台",
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
