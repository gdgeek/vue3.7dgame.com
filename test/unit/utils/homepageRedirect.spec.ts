import { describe, expect, it } from "vitest";
import {
  buildHomepageRedirectUrl,
  normalizeHomepageRedirectLanguage,
} from "@/utils/homepageRedirect";

describe("homepageRedirect", () => {
  it("adds the selected main-platform language to homepage redirects", () => {
    const result = buildHomepageRedirectUrl(
      "https://www.example.com/",
      "zh-TW"
    );
    const url = new URL(result);

    expect(`${url.origin}${url.pathname}`).toBe("https://www.example.com/");
    expect(url.searchParams.get("lang")).toBe("zh-TW");
  });

  it("preserves existing query and hash while replacing lang", () => {
    const result = buildHomepageRedirectUrl(
      "https://www.example.com/?utm=nav&lang=en-US#top",
      "ja-JP"
    );
    const url = new URL(result);

    expect(url.searchParams.get("utm")).toBe("nav");
    expect(url.searchParams.get("lang")).toBe("ja-JP");
    expect(url.hash).toBe("#top");
  });

  it("normalizes supported aliases", () => {
    expect(normalizeHomepageRedirectLanguage("en")).toBe("en-US");
    expect(normalizeHomepageRedirectLanguage("ja")).toBe("ja-JP");
    expect(normalizeHomepageRedirectLanguage("th")).toBe("th-TH");
  });

  it("leaves the homepage URL unchanged for unsupported language values", () => {
    const homepageUrl = "https://www.example.com/?utm=nav";

    expect(buildHomepageRedirectUrl(homepageUrl, "javascript:alert(1)")).toBe(
      homepageUrl
    );
    expect(buildHomepageRedirectUrl(homepageUrl)).toBe(homepageUrl);
  });
});
