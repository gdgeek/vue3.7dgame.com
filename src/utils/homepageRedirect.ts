const SUPPORTED_HOMEPAGE_LANGUAGES = new Set([
  "zh-CN",
  "zh-TW",
  "en-US",
  "th-TH",
  "ja-JP",
]);

const HOMEPAGE_LANGUAGE_ALIASES: Record<string, string> = {
  en: "en-US",
  ja: "ja-JP",
  th: "th-TH",
};

export function normalizeHomepageRedirectLanguage(
  lang?: string | null
): string | undefined {
  if (!lang) return undefined;

  const normalized = HOMEPAGE_LANGUAGE_ALIASES[lang] ?? lang;
  return SUPPORTED_HOMEPAGE_LANGUAGES.has(normalized) ? normalized : undefined;
}

export function buildHomepageRedirectUrl(
  homepageUrl: string,
  lang?: string | null,
  baseOrigin?: string
): string {
  const normalizedLang = normalizeHomepageRedirectLanguage(lang);
  if (!normalizedLang) return homepageUrl;

  const base =
    baseOrigin ??
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost");
  const url = new URL(homepageUrl, base);
  url.searchParams.set("lang", normalizedLang);

  return url.toString();
}

export function pointsToCurrentSiteRoot(
  homepageUrl: string,
  currentHref?: string
): boolean {
  const current =
    currentHref ??
    (typeof window !== "undefined"
      ? window.location.href
      : "http://localhost/");

  const currentUrl = new URL(current);
  const targetUrl = new URL(homepageUrl, currentUrl.origin);
  const normalizedPath = targetUrl.pathname.replace(/\/+$/, "") || "/";

  return targetUrl.origin === currentUrl.origin && normalizedPath === "/";
}
