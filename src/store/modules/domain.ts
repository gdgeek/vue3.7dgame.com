import { logger } from "@/utils/logger";
import { defineStore } from "pinia";
import {
  getDomainDefault,
  getDomainLanguage,
  type DomainDefaultInfo,
  type DomainLanguageInfo,
} from "@/api/domain-query";
import { store } from "@/store";
import { getDomainForQuery } from "@/utils/domain";

// 支持的语言列表（与 LanguageEnum 保持一致）
const SUPPORTED_LANGUAGES = new Set([
  "zh-CN",
  "en-US",
  "ja-JP",
  "th-TH",
  "zh-TW",
]);

const DOMAIN_COOKIE_KEY_PREFIX = "domain_info_";
const COOKIE_EXPIRY_DAYS = 7;

// Cookie helper functions
function setCookie(name: string, value: string, days: number) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name: string): string | null {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let c of ca) {
    c = c.trim();
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length));
    }
  }
  return null;
}

// Get cookie key for specific language
function getLangCookieKey(lang: string): string {
  return `${DOMAIN_COOKIE_KEY_PREFIX}${getDomainForQuery()}_${lang}`;
}

function getDefaultCookieKey(): string {
  return `domain_default_info_${getDomainForQuery()}`;
}

interface DomainState {
  defaultInfo: DomainDefaultInfo | null;
  langInfo: DomainLanguageInfo | null;
  loading: boolean;
  error: string | null;
  currentLang: string | null;
}

export const useDomainStore = defineStore("domain", {
  state: (): DomainState => ({
    defaultInfo: null,
    langInfo: null,
    loading: false,
    error: null,
    currentLang: null,
  }),

  getters: {
    title: (state) => state.langInfo?.title || "",
    description: (state) => state.langInfo?.description || "",
    keywords: (state) => state.langInfo?.keywords || "",
    author: (state) => state.langInfo?.author || "",
    homepage: (state) => state.defaultInfo?.homepage || "",
    domain: (state) => state.langInfo?.domain || "",
    links: (state) => state.langInfo?.links || [],
    defaultLang: (state) => state.defaultInfo?.lang || "",
    /** 域名指定了支持的语言时，锁定语言，隐藏切换 */
    isLanguageLocked: (state) => {
      const lang = state.defaultInfo?.lang;
      return !!lang && SUPPORTED_LANGUAGES.has(lang);
    },
    /** 域名指定了有效样式（style > 0）时，锁定样式，隐藏切换 */
    isStyleLocked: (state) => {
      const style = state.defaultInfo?.style;
      return !!style && style > 0;
    },
    /** WordPress 博客地址 */
    blog: (state) => state.defaultInfo?.blog || "",
    /** 域名自定义图标 */
    icon: (state) => state.defaultInfo?.icon || "",
    isLoaded: (state) =>
      state.defaultInfo !== null && state.langInfo !== null && !state.loading,
  },

  actions: {
    /**
     * 启动时调用一次，获取基础信息（homepage, lang）
     */
    async fetchDefaultInfo() {
      // Try cookie cache first
      const cachedData = getCookie(getDefaultCookieKey());
      if (cachedData) {
        try {
          this.defaultInfo = JSON.parse(cachedData);
        } catch (e) {
          logger.warn("Failed to parse cached default domain info:", e);
        }
      }

      try {
        const domain = getDomainForQuery();
        const response: { data: DomainDefaultInfo } =
          await getDomainDefault(domain);
        this.defaultInfo = response.data;
        setCookie(
          getDefaultCookieKey(),
          JSON.stringify(this.defaultInfo),
          COOKIE_EXPIRY_DAYS
        );
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch default info";
        logger.error("Failed to fetch default domain info:", err);
        this.error = message;
      }

      // 域名指定了支持的语言 → 强制锁定
      if (this.isLanguageLocked && this.defaultInfo?.lang) {
        const { loadLanguageAsync } = await import("@/lang");
        await loadLanguageAsync(this.defaultInfo.lang);
      }

      // 域名指定了有效样式 → 强制切换到对应主题（style 从 1 开始，themes 数组从 0 开始）
      if (this.isStyleLocked && this.defaultInfo?.style) {
        const { useTheme } = await import("@/composables/useTheme");
        const { availableThemes, setTheme } = useTheme();
        const themeIndex = this.defaultInfo.style - 1;
        const targetTheme = availableThemes.value[themeIndex];
        if (targetTheme) {
          setTheme(targetTheme.name, { syncUrl: false });
        }
      }

      // 域名指定了自定义图标 → 替换 favicon
      if (this.defaultInfo?.icon) {
        let iconLink =
          document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (!iconLink) {
          iconLink = document.createElement("link");
          iconLink.setAttribute("rel", "icon");
          document.head.appendChild(iconLink);
        }
        iconLink.setAttribute("href", this.defaultInfo.icon);
      }
    },

    /**
     * 获取语言相关信息，启动时和切换语言时调用
     */
    async fetchDomainInfo() {
      // 先获取基础信息（仅首次）
      if (!this.defaultInfo) {
        await this.fetchDefaultInfo();
      }

      // 获取语言信息
      await this.refreshFromAPI();
    },

    /**
     * 刷新语言相关数据（切换语言时调用）
     */
    async refreshFromAPI() {
      const { useAppStore } = await import("@/store/modules/app");
      const appStore = useAppStore();
      const lang = appStore.language || "zh-CN";

      // If already loaded for this language, skip
      if (this.langInfo !== null && this.currentLang === lang) {
        return this.langInfo;
      }

      // Try cookie cache
      const cookieKey = getLangCookieKey(lang);
      const cachedData = getCookie(cookieKey);
      if (cachedData) {
        try {
          this.langInfo = JSON.parse(cachedData);
          this.currentLang = lang;
          this.updateDocumentMeta();
        } catch (e) {
          logger.warn("Failed to parse cached lang domain info:", e);
          this.langInfo = null;
        }
      }

      this.loading = true;
      this.error = null;

      try {
        const domain = getDomainForQuery();
        const response: { data: DomainLanguageInfo } = await getDomainLanguage(
          domain,
          lang
        );
        this.langInfo = response.data;
        this.currentLang = lang;

        setCookie(cookieKey, JSON.stringify(this.langInfo), COOKIE_EXPIRY_DAYS);
        this.updateDocumentMeta();

        return this.langInfo;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch domain info";
        logger.error("Failed to fetch domain info:", err);
        this.error = message;
        return null;
      } finally {
        this.loading = false;
      }
    },

    updateDocumentMeta() {
      if (!this.langInfo) return;

      if (this.langInfo.title) {
        document.title = this.langInfo.title;
      }

      let descMeta = document.querySelector('meta[name="description"]');
      if (!descMeta) {
        descMeta = document.createElement("meta");
        descMeta.setAttribute("name", "description");
        document.head.appendChild(descMeta);
      }
      descMeta.setAttribute("content", this.langInfo.description || "");

      let keywordsMeta = document.querySelector('meta[name="keywords"]');
      if (!keywordsMeta) {
        keywordsMeta = document.createElement("meta");
        keywordsMeta.setAttribute("name", "keywords");
        document.head.appendChild(keywordsMeta);
      }
      keywordsMeta.setAttribute("content", this.langInfo.keywords || "");

      let authorMeta = document.querySelector('meta[name="author"]');
      if (!authorMeta) {
        authorMeta = document.createElement("meta");
        authorMeta.setAttribute("name", "author");
        document.head.appendChild(authorMeta);
      }
      authorMeta.setAttribute("content", this.langInfo.author || "");
    },
  },
});

// 非setup
export function useDomainStoreHook() {
  return useDomainStore(store);
}
