import { defineStore } from "pinia";
import { getDomainInfo, type DomainInfo } from "@/api/v1/domain";

interface DomainState {
  info: DomainInfo | null;
  loading: boolean;
  error: string | null;
}

export const useDomainStore = defineStore("domain", {
  state: (): DomainState => ({
    info: null,
    loading: false,
    error: null,
  }),

  getters: {
    title: (state) => state.info?.title || "",
    description: (state) => state.info?.description || "",
    keywords: (state) => state.info?.keywords || "",
    author: (state) => state.info?.author || "",
    domain: (state) => state.info?.domain || "",
    links: (state) => state.info?.links || [],
    isLoaded: (state) => state.info !== null,
  },

  actions: {
    async fetchDomainInfo() {
      // Skip if already loaded
      if (this.info !== null) {
        return this.info;
      }

      this.loading = true;
      this.error = null;

      try {
        const response = await getDomainInfo(window.location.origin);
        this.info = response.data;

        // Update document meta tags
        this.updateDocumentMeta();

        return this.info;
      } catch (err: any) {
        console.error("Failed to fetch domain info:", err);
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
