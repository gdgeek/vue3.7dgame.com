import { logger } from "@/utils/logger";
import { defineStore } from "pinia";
import { getDomainInfo, type DomainInfo } from "@/api/v1/domain";

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
function getDomainCookieKey(lang: string): string {
  return `${DOMAIN_COOKIE_KEY_PREFIX}${lang}`;
}

interface DomainState {
  info: DomainInfo | null;
  loading: boolean;
  error: string | null;
  currentLang: string | null;
}

export const useDomainStore = defineStore("domain", {
  state: (): DomainState => ({
    info: null,
    loading: false,
    error: null,
    currentLang: null,
  }),

  getters: {
    title: (state) => state.info?.title || "",
    description: (state) => state.info?.description || "",
    keywords: (state) => state.info?.keywords || "",
    author: (state) => state.info?.author || "",
    domain: (state) => state.info?.domain || "",
    links: (state) => state.info?.links || [],
    isLoaded: (state) => state.info !== null && !state.loading,
  },

  actions: {
    async fetchDomainInfo() {
      // Get current language
      const { useAppStore } = await import("@/store/modules/app");
      const appStore = useAppStore();
      const lang = appStore.language || "zh-CN";

      // If already loaded for this language, skip
      if (this.info !== null && this.currentLang === lang) {
        return this.info;
      }

      // Try to load from language-specific cookie first
      const cookieKey = getDomainCookieKey(lang);
      const cachedData = getCookie(cookieKey);
      if (cachedData) {
        try {
          this.info = JSON.parse(cachedData);
          this.currentLang = lang;
          this.updateDocumentMeta();
          // Still fetch from API in background to refresh cache
          this.refreshFromAPI();
          return this.info;
        } catch (e) {
          logger.warn("Failed to parse cached domain info:", e);
        }
      }

      // Fetch from API
      return await this.refreshFromAPI();
    },

    async refreshFromAPI() {
      // Get current language from app store
      const { useAppStore } = await import("@/store/modules/app");
      const appStore = useAppStore();
      const lang = appStore.language || "zh-CN";

      // Check if we have cached data for this language
      const cookieKey = getDomainCookieKey(lang);
      const cachedData = getCookie(cookieKey);

      // Immediately update: if cache exists, show it; otherwise clear to show loading
      if (cachedData) {
        try {
          // Immediately show cached content for this language
          this.info = JSON.parse(cachedData);
          this.currentLang = lang;
          this.updateDocumentMeta();
        } catch (e) {
          logger.warn("Failed to parse cached domain info:", e);
          this.info = null;
        }
      } else {
        // No cache - immediately show loading state
        this.info = null;
        this.currentLang = null;
      }

      this.loading = true;
      this.error = null;

      try {
        const response = await getDomainInfo(window.location.origin, lang);
        this.info = response.data;
        this.currentLang = lang;

        // Save to language-specific cookie
        setCookie(cookieKey, JSON.stringify(this.info), COOKIE_EXPIRY_DAYS);

        // Update document meta tags
        this.updateDocumentMeta();

        return this.info;
      } catch (err: any) {
        logger.error("Failed to fetch domain info:", err);
        this.error = err.message || "Failed to fetch domain info";
        return null;
      } finally {
        this.loading = false;
      }
    },

    updateDocumentMeta() {
      if (!this.info) return;

      // Update document title
      if (this.info.title) {
        document.title = this.info.title;
      }

      // Update meta description
      let descMeta = document.querySelector('meta[name="description"]');
      if (!descMeta) {
        descMeta = document.createElement("meta");
        descMeta.setAttribute("name", "description");
        document.head.appendChild(descMeta);
      }
      descMeta.setAttribute("content", this.info.description || "");

      // Update meta keywords
      let keywordsMeta = document.querySelector('meta[name="keywords"]');
      if (!keywordsMeta) {
        keywordsMeta = document.createElement("meta");
        keywordsMeta.setAttribute("name", "keywords");
        document.head.appendChild(keywordsMeta);
      }
      keywordsMeta.setAttribute("content", this.info.keywords || "");

      // Update meta author
      let authorMeta = document.querySelector('meta[name="author"]');
      if (!authorMeta) {
        authorMeta = document.createElement("meta");
        authorMeta.setAttribute("name", "author");
        document.head.appendChild(authorMeta);
      }
      authorMeta.setAttribute("content", this.info.author || "");
    },
  },
});
