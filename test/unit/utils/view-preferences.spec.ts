import { beforeEach, describe, expect, it } from "vitest";

function replaceUrl(url: string) {
  window.history.replaceState({}, "", url);
}

describe("view preference utils", () => {
  beforeEach(() => {
    replaceUrl("/home/index");
  });

  it("reads lang and theme from url query", async () => {
    replaceUrl("/home/index?lang=ja-JP&theme=deep-space");
    const { getViewPreferenceQuery } = await import("@/utils/view-preferences");
    expect(getViewPreferenceQuery()).toEqual({
      lang: "ja-JP",
      theme: "deep-space",
    });
  });

  it("ignores unsupported url query values", async () => {
    replaceUrl("/home/index?lang=fr-FR&theme=unknown");
    const { getViewPreferenceQuery } = await import("@/utils/view-preferences");
    expect(getViewPreferenceQuery()).toEqual({
      lang: undefined,
      theme: undefined,
    });
  });

  it("updates url query without dropping current path", async () => {
    const { updateViewPreferenceQuery } = await import(
      "@/utils/view-preferences"
    );
    updateViewPreferenceQuery({ lang: "zh-CN", theme: "modern-blue" });
    expect(window.location.pathname).toBe("/home/index");
    expect(window.location.search).toContain("lang=zh-CN");
    expect(window.location.search).toContain("theme=modern-blue");
  });

  it("preserves the other query param when only one preference changes", async () => {
    replaceUrl("/home/index?lang=ja-JP&theme=deep-space");
    const { updateViewPreferenceQuery } = await import(
      "@/utils/view-preferences"
    );

    updateViewPreferenceQuery({ theme: "modern-blue" });
    expect(window.location.search).toContain("lang=ja-JP");
    expect(window.location.search).toContain("theme=modern-blue");

    updateViewPreferenceQuery({ lang: "zh-CN" });
    expect(window.location.search).toContain("lang=zh-CN");
    expect(window.location.search).toContain("theme=modern-blue");
  });
});
