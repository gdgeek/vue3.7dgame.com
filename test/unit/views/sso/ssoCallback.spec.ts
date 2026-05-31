import { describe, expect, it, vi } from "vitest";
import {
  clearSsoCallbackUrl,
  normalizeSsoLanguage,
  readSsoCallbackParams,
  sanitizeSsoRedirect,
} from "@/views/sso/ssoCallback";

describe("ssoCallback", () => {
  it("prefers fragment params over query params", () => {
    const result = readSsoCallbackParams(
      { refreshToken: "query-token", lang: "zh-CN" },
      "#refreshToken=hash-token&lang=zh-TW"
    );

    expect(result).toEqual({
      refreshToken: "hash-token",
      lang: "zh-TW",
      redirect: undefined,
    });
  });

  it("normalizes supported language aliases", () => {
    expect(normalizeSsoLanguage("en")).toBe("en-US");
    expect(normalizeSsoLanguage("ja")).toBe("ja-JP");
    expect(normalizeSsoLanguage("zh-TW")).toBe("zh-TW");
    expect(normalizeSsoLanguage("bad-locale")).toBeUndefined();
  });

  it("keeps safe local redirects", () => {
    expect(sanitizeSsoRedirect("/verse/index?id=1#top")).toBe(
      "/verse/index?id=1#top"
    );
  });

  it("rejects external or loop redirects", () => {
    expect(sanitizeSsoRedirect("https://evil.example")).toBe("/home/index");
    expect(sanitizeSsoRedirect("//evil.example/path")).toBe("/home/index");
    expect(sanitizeSsoRedirect("/sso?refreshToken=again")).toBe("/home/index");
  });

  it("removes sensitive query and fragment values from the address bar", () => {
    window.history.replaceState(
      null,
      "",
      "/sso?refreshToken=query-token#refreshToken=hash-token"
    );
    const replaceSpy = vi.spyOn(window.history, "replaceState");

    clearSsoCallbackUrl();

    expect(replaceSpy).toHaveBeenCalledWith(null, document.title, "/sso");
    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("");
  });
});
