import { themes } from "@/styles/themes";

const SUPPORTED_LANGUAGES = new Set([
  "zh-CN",
  "en-US",
  "ja-JP",
  "th-TH",
  "zh-TW",
]);

const SUPPORTED_THEMES = new Set(themes.map((theme) => theme.name));

export interface ViewPreferenceQuery {
  lang?: string;
  theme?: string;
}

export function getViewPreferenceQuery(): ViewPreferenceQuery {
  const url = new URL(window.location.href);
  const lang = url.searchParams.get("lang") || undefined;
  const theme = url.searchParams.get("theme") || undefined;

  return {
    lang: lang && SUPPORTED_LANGUAGES.has(lang) ? lang : undefined,
    theme: theme && SUPPORTED_THEMES.has(theme) ? theme : undefined,
  };
}

export function updateViewPreferenceQuery(
  preference: ViewPreferenceQuery,
  mode: "replace" | "push" = "replace"
) {
  const url = new URL(window.location.href);
  const currentPreference = getViewPreferenceQuery();
  const nextPreference: ViewPreferenceQuery = {
    lang: preference.lang ?? currentPreference.lang,
    theme: preference.theme ?? currentPreference.theme,
  };

  if (nextPreference.lang) {
    url.searchParams.set("lang", nextPreference.lang);
  } else {
    url.searchParams.delete("lang");
  }

  if (nextPreference.theme) {
    url.searchParams.set("theme", nextPreference.theme);
  } else {
    url.searchParams.delete("theme");
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history[mode === "replace" ? "replaceState" : "pushState"](
    window.history.state,
    "",
    nextUrl
  );
}

export function getValidTheme(themeName: string | undefined | null) {
  return themeName && SUPPORTED_THEMES.has(themeName) ? themeName : undefined;
}

export function getValidLanguage(lang: string | undefined | null) {
  return lang && SUPPORTED_LANGUAGES.has(lang) ? lang : undefined;
}
