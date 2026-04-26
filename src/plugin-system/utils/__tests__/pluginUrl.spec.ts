import { describe, expect, it } from "vitest";

import {
  buildPluginIframeUrl,
  normalizePluginUrlParam,
} from "../pluginUrl";

describe("plugin URL helpers", () => {
  it("normalizes relative pluginUrl values", () => {
    expect(normalizePluginUrlParam("/sample?tab=detail#top")).toBe(
      "/sample?tab=detail#top"
    );
    expect(normalizePluginUrlParam("settings")).toBe("/settings");
    expect(normalizePluginUrlParam("?tab=detail")).toBe("/?tab=detail");
    expect(normalizePluginUrlParam("#preview")).toBe("/#preview");
  });

  it("removes host-controlled iframe query params from pluginUrl values", () => {
    expect(
      normalizePluginUrlParam(
        "/not-allowed?reason=root&lang=zh-CN&theme=modern-blue&v=1.0.0&cb=123#top"
      )
    ).toBe("/not-allowed?reason=root#top");
  });

  it("rejects external and malformed pluginUrl values", () => {
    expect(normalizePluginUrlParam("https://example.com/sample")).toBeNull();
    expect(normalizePluginUrlParam("//example.com/sample")).toBeNull();
    expect(normalizePluginUrlParam("javascript:alert(1)")).toBeNull();
    expect(normalizePluginUrlParam(["/sample"])).toBeNull();
  });

  it("applies pluginUrl before host-controlled query params", () => {
    expect(
      buildPluginIframeUrl("https://plugin.example.com/app/", {
        pluginUrl: "/sample?tab=detail#top",
        lang: "zh-CN",
        theme: "modern-blue",
        version: "1.2.3",
        cacheBust: "abc",
      })
    ).toBe(
      "https://plugin.example.com/sample?tab=detail&lang=zh-CN&theme=modern-blue&v=1.2.3&cb=abc#top"
    );
  });

  it("ignores unsafe pluginUrl values when building the iframe URL", () => {
    expect(
      buildPluginIframeUrl("https://plugin.example.com/app?existing=1", {
        pluginUrl: "https://evil.example.com/",
        lang: "zh-CN",
      })
    ).toBe("https://plugin.example.com/app?existing=1&lang=zh-CN");
  });
});
