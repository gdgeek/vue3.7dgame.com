import type { LocationQuery, LocationQueryValue } from "vue-router";

const DEFAULT_REDIRECT = "/home/index";
const SUPPORTED_LANGUAGES = new Set([
  "zh-CN",
  "zh-TW",
  "en-US",
  "th-TH",
  "ja-JP",
]);

const LANGUAGE_ALIASES: Record<string, string> = {
  en: "en-US",
  ja: "ja-JP",
  th: "th-TH",
};

export interface SsoCallbackParams {
  refreshToken?: string;
  lang?: string;
  redirect?: string;
}

function firstQueryValue(
  value: LocationQueryValue | LocationQueryValue[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value.find((item): item is string => typeof item === "string");
  }

  return typeof value === "string" ? value : undefined;
}

function hashParams(hash: string): URLSearchParams {
  const rawHash = hash.replace(/^#\??/, "");
  return new URLSearchParams(rawHash);
}

export function readSsoCallbackParams(
  query: LocationQuery,
  hash = window.location.hash
): SsoCallbackParams {
  const params = hashParams(hash);

  return {
    refreshToken:
      params.get("refreshToken") ?? firstQueryValue(query.refreshToken),
    lang: params.get("lang") ?? firstQueryValue(query.lang),
    redirect: params.get("redirect") ?? firstQueryValue(query.redirect),
  };
}

export function normalizeSsoLanguage(lang?: string): string | undefined {
  if (!lang) return undefined;

  const normalized = LANGUAGE_ALIASES[lang] ?? lang;
  return SUPPORTED_LANGUAGES.has(normalized) ? normalized : undefined;
}

export function sanitizeSsoRedirect(
  redirect?: string,
  fallback = DEFAULT_REDIRECT
): string {
  const target = redirect?.trim() || fallback;

  if (
    !target.startsWith("/") ||
    target.startsWith("//") ||
    /[\u0000-\u001f\u007f]/.test(target) ||
    /^\/sso(?:[/?#]|$)/.test(target)
  ) {
    return fallback;
  }

  const url = new URL(target, window.location.origin);

  if (url.origin !== window.location.origin) {
    return fallback;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function clearSsoCallbackUrl() {
  window.history.replaceState(
    window.history.state,
    document.title,
    window.location.pathname
  );
}
