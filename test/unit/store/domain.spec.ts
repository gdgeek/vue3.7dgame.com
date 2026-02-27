/**
 * Unit tests for src/store/modules/domain.ts — useDomainStore
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/utils/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/api/domain-query", () => ({
  getDomainDefault: vi.fn(),
  getDomainLanguage: vi.fn(),
}));

vi.mock("@/store", async () => {
  const { createPinia: cp } = await import("pinia");
  return { store: cp() };
});

vi.mock("@/store/modules/app", () => ({
  useAppStore: vi.fn(() => ({ language: "zh-CN" })),
}));

vi.mock("@/lang", () => ({
  loadLanguageAsync: vi.fn(),
}));

vi.mock("@/composables/useTheme", () => ({
  useTheme: vi.fn(() => ({
    availableThemes: { value: [{ name: "modern-blue" }, { name: "dark" }] },
    setTheme: vi.fn(),
  })),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeLangInfo(overrides = {}) {
  return {
    title: "Test Title",
    description: "Test Description",
    keywords: "test, keywords",
    author: "Test Author",
    domain: "test.com",
    links: [{ name: "Home", url: "/" }],
    ...overrides,
  };
}

function makeDefaultInfo(overrides = {}) {
  return {
    homepage: "https://test.com",
    lang: "",
    style: 0,
    blog: "https://blog.test.com",
    icon: "",
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("useDomainStore", () => {
  let getDomainDefault: ReturnType<typeof vi.fn>;
  let getDomainLanguage: ReturnType<typeof vi.fn>;
  let useAppStore: ReturnType<typeof vi.fn>;
  let useDomainStore: typeof import("@/store/modules/domain").useDomainStore;

  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    // Clear document cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
    });

    ({ getDomainDefault, getDomainLanguage } = await import("@/api/domain-query"));
    ({ useAppStore } = await import("@/store/modules/app"));
    ({ useDomainStore } = await import("@/store/modules/domain"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Initial state ────────────────────────────────────────────────────────

  describe("初始状态", () => {
    it("defaultInfo 初始为 null", () => {
      const store = useDomainStore();
      expect(store.defaultInfo).toBeNull();
    });

    it("langInfo 初始为 null", () => {
      const store = useDomainStore();
      expect(store.langInfo).toBeNull();
    });

    it("loading 初始为 false", () => {
      const store = useDomainStore();
      expect(store.loading).toBe(false);
    });

    it("error 初始为 null", () => {
      const store = useDomainStore();
      expect(store.error).toBeNull();
    });

    it("currentLang 初始为 null", () => {
      const store = useDomainStore();
      expect(store.currentLang).toBeNull();
    });
  });

  // ── Getters (with no data) ───────────────────────────────────────────────

  describe("Getters — 无数据时返回默认值", () => {
    it("title 返回空字符串", () => {
      const store = useDomainStore();
      expect(store.title).toBe("");
    });

    it("description 返回空字符串", () => {
      const store = useDomainStore();
      expect(store.description).toBe("");
    });

    it("keywords 返回空字符串", () => {
      const store = useDomainStore();
      expect(store.keywords).toBe("");
    });

    it("author 返回空字符串", () => {
      const store = useDomainStore();
      expect(store.author).toBe("");
    });

    it("homepage 返回空字符串", () => {
      const store = useDomainStore();
      expect(store.homepage).toBe("");
    });

    it("domain 返回空字符串", () => {
      const store = useDomainStore();
      expect(store.domain).toBe("");
    });

    it("links 返回空数组", () => {
      const store = useDomainStore();
      expect(store.links).toEqual([]);
    });

    it("defaultLang 返回空字符串", () => {
      const store = useDomainStore();
      expect(store.defaultLang).toBe("");
    });

    it("blog 返回空字符串", () => {
      const store = useDomainStore();
      expect(store.blog).toBe("");
    });

    it("icon 返回空字符串", () => {
      const store = useDomainStore();
      expect(store.icon).toBe("");
    });

    it("isLoaded 在没有数据时返回 false", () => {
      const store = useDomainStore();
      expect(store.isLoaded).toBe(false);
    });
  });

  // ── Getters (with data) ──────────────────────────────────────────────────

  describe("Getters — 有数据时返回正确值", () => {
    it("title 返回 langInfo.title", () => {
      const store = useDomainStore();
      store.langInfo = makeLangInfo({ title: "我的标题" });
      expect(store.title).toBe("我的标题");
    });

    it("description 返回 langInfo.description", () => {
      const store = useDomainStore();
      store.langInfo = makeLangInfo({ description: "产品描述" });
      expect(store.description).toBe("产品描述");
    });

    it("keywords 返回 langInfo.keywords", () => {
      const store = useDomainStore();
      store.langInfo = makeLangInfo({ keywords: "vue, test" });
      expect(store.keywords).toBe("vue, test");
    });

    it("homepage 返回 defaultInfo.homepage", () => {
      const store = useDomainStore();
      store.defaultInfo = makeDefaultInfo({ homepage: "https://example.com" });
      expect(store.homepage).toBe("https://example.com");
    });

    it("blog 返回 defaultInfo.blog", () => {
      const store = useDomainStore();
      store.defaultInfo = makeDefaultInfo({ blog: "https://blog.example.com" });
      expect(store.blog).toBe("https://blog.example.com");
    });

    it("icon 返回 defaultInfo.icon", () => {
      const store = useDomainStore();
      store.defaultInfo = makeDefaultInfo({ icon: "/favicon.png" });
      expect(store.icon).toBe("/favicon.png");
    });

    it("links 返回 langInfo.links", () => {
      const links = [{ name: "About", url: "/about" }];
      const store = useDomainStore();
      store.langInfo = makeLangInfo({ links });
      expect(store.links).toEqual(links);
    });

    it("isLoaded 在 defaultInfo 和 langInfo 都存在且 loading=false 时返回 true", () => {
      const store = useDomainStore();
      store.defaultInfo = makeDefaultInfo();
      store.langInfo = makeLangInfo();
      store.loading = false;
      expect(store.isLoaded).toBe(true);
    });

    it("isLoaded 在 loading=true 时返回 false", () => {
      const store = useDomainStore();
      store.defaultInfo = makeDefaultInfo();
      store.langInfo = makeLangInfo();
      store.loading = true;
      expect(store.isLoaded).toBe(false);
    });
  });

  // ── isLanguageLocked ─────────────────────────────────────────────────────

  describe("isLanguageLocked", () => {
    it("无 defaultInfo 时返回 false", () => {
      const store = useDomainStore();
      expect(store.isLanguageLocked).toBe(false);
    });

    it("lang 为空字符串时返回 false", () => {
      const store = useDomainStore();
      store.defaultInfo = makeDefaultInfo({ lang: "" });
      expect(store.isLanguageLocked).toBe(false);
    });

    it("lang 为有效支持语言时返回 true", () => {
      const store = useDomainStore();
      store.defaultInfo = makeDefaultInfo({ lang: "zh-CN" });
      expect(store.isLanguageLocked).toBe(true);
    });

    it("lang 为 'en-US' 时返回 true", () => {
      const store = useDomainStore();
      store.defaultInfo = makeDefaultInfo({ lang: "en-US" });
      expect(store.isLanguageLocked).toBe(true);
    });

    it("lang 为 'ja-JP' 时返回 true", () => {
      const store = useDomainStore();
      store.defaultInfo = makeDefaultInfo({ lang: "ja-JP" });
      expect(store.isLanguageLocked).toBe(true);
    });

    it("lang 为不支持的语言时返回 false", () => {
      const store = useDomainStore();
      store.defaultInfo = makeDefaultInfo({ lang: "fr-FR" });
      expect(store.isLanguageLocked).toBe(false);
    });
  });

  // ── isStyleLocked ────────────────────────────────────────────────────────

  describe("isStyleLocked", () => {
    it("无 defaultInfo 时返回 false", () => {
      const store = useDomainStore();
      expect(store.isStyleLocked).toBe(false);
    });

    it("style 为 0 时返回 false", () => {
      const store = useDomainStore();
      store.defaultInfo = makeDefaultInfo({ style: 0 });
      expect(store.isStyleLocked).toBe(false);
    });

    it("style 为 1 时返回 true", () => {
      const store = useDomainStore();
      store.defaultInfo = makeDefaultInfo({ style: 1 });
      expect(store.isStyleLocked).toBe(true);
    });

    it("style 为 2 时返回 true", () => {
      const store = useDomainStore();
      store.defaultInfo = makeDefaultInfo({ style: 2 });
      expect(store.isStyleLocked).toBe(true);
    });
  });

  // ── fetchDefaultInfo ─────────────────────────────────────────────────────

  describe("fetchDefaultInfo()", () => {
    it("成功时更新 defaultInfo", async () => {
      const info = makeDefaultInfo({ homepage: "https://fetched.com" });
      getDomainDefault.mockResolvedValue({ data: info });

      const store = useDomainStore();
      await store.fetchDefaultInfo();

      expect(store.defaultInfo).toEqual(info);
    });

    it("失败时设置 error", async () => {
      getDomainDefault.mockRejectedValue(new Error("Network error"));

      const store = useDomainStore();
      await store.fetchDefaultInfo();

      expect(store.error).toBe("Network error");
    });

    it("失败时不抛出异常", async () => {
      getDomainDefault.mockRejectedValue(new Error("timeout"));
      const store = useDomainStore();
      await expect(store.fetchDefaultInfo()).resolves.not.toThrow();
    });

    it("有 icon 时更新页面 favicon", async () => {
      const info = makeDefaultInfo({ icon: "https://example.com/icon.png" });
      getDomainDefault.mockResolvedValue({ data: info });

      const store = useDomainStore();
      await store.fetchDefaultInfo();

      const iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      expect(iconLink?.getAttribute("href")).toBe("https://example.com/icon.png");
    });
  });

  // ── refreshFromAPI ────────────────────────────────────────────────────────

  describe("refreshFromAPI()", () => {
    it("成功时更新 langInfo", async () => {
      const langInfo = makeLangInfo({ title: "刷新后的标题" });
      getDomainLanguage.mockResolvedValue({ data: langInfo });

      const store = useDomainStore();
      await store.refreshFromAPI();

      expect(store.langInfo).toEqual(langInfo);
    });

    it("成功时设置 currentLang", async () => {
      const langInfo = makeLangInfo();
      getDomainLanguage.mockResolvedValue({ data: langInfo });
      useAppStore.mockReturnValue({ language: "en-US" });

      const store = useDomainStore();
      await store.refreshFromAPI();

      expect(store.currentLang).toBe("en-US");
    });

    it("loading 在请求结束后恢复为 false", async () => {
      getDomainLanguage.mockResolvedValue({ data: makeLangInfo() });
      const store = useDomainStore();
      await store.refreshFromAPI();
      expect(store.loading).toBe(false);
    });

    it("失败时设置 error 并返回 null", async () => {
      getDomainLanguage.mockRejectedValue(new Error("API 故障"));

      const store = useDomainStore();
      const result = await store.refreshFromAPI();

      expect(result).toBeNull();
      expect(store.error).toBe("API 故障");
    });

    it("失败时 loading 也恢复为 false", async () => {
      getDomainLanguage.mockRejectedValue(new Error("fail"));
      const store = useDomainStore();
      await store.refreshFromAPI();
      expect(store.loading).toBe(false);
    });

    it("相同语言已加载时跳过 API 请求", async () => {
      getDomainLanguage.mockResolvedValue({ data: makeLangInfo() });
      useAppStore.mockReturnValue({ language: "zh-CN" });

      const store = useDomainStore();
      // 预设已加载状态
      store.langInfo = makeLangInfo();
      store.currentLang = "zh-CN";

      await store.refreshFromAPI();

      // 不应再次调用 API
      expect(getDomainLanguage).not.toHaveBeenCalled();
    });

    it("语言切换后重新请求 API", async () => {
      const langInfo = makeLangInfo({ title: "English Title" });
      getDomainLanguage.mockResolvedValue({ data: langInfo });
      useAppStore.mockReturnValue({ language: "en-US" });

      const store = useDomainStore();
      // 先模拟已加载 zh-CN
      store.langInfo = makeLangInfo({ title: "中文标题" });
      store.currentLang = "zh-CN";

      await store.refreshFromAPI();

      expect(getDomainLanguage).toHaveBeenCalledOnce();
      expect(store.langInfo?.title).toBe("English Title");
    });

    it("成功后更新 document.title", async () => {
      const langInfo = makeLangInfo({ title: "New Page Title" });
      getDomainLanguage.mockResolvedValue({ data: langInfo });

      const store = useDomainStore();
      await store.refreshFromAPI();

      expect(document.title).toBe("New Page Title");
    });
  });

  // ── fetchDomainInfo ──────────────────────────────────────────────────────

  describe("fetchDomainInfo()", () => {
    it("defaultInfo 为 null 时先调用 fetchDefaultInfo", async () => {
      const defaultInfo = makeDefaultInfo();
      const langInfo = makeLangInfo();
      getDomainDefault.mockResolvedValue({ data: defaultInfo });
      getDomainLanguage.mockResolvedValue({ data: langInfo });

      const store = useDomainStore();
      await store.fetchDomainInfo();

      expect(getDomainDefault).toHaveBeenCalledOnce();
      expect(store.defaultInfo).toEqual(defaultInfo);
    });

    it("defaultInfo 已存在时跳过 fetchDefaultInfo", async () => {
      getDomainLanguage.mockResolvedValue({ data: makeLangInfo() });

      const store = useDomainStore();
      store.defaultInfo = makeDefaultInfo();

      await store.fetchDomainInfo();

      expect(getDomainDefault).not.toHaveBeenCalled();
    });

    it("完成后 langInfo 也被更新", async () => {
      const langInfo = makeLangInfo({ title: "完整加载" });
      getDomainDefault.mockResolvedValue({ data: makeDefaultInfo() });
      getDomainLanguage.mockResolvedValue({ data: langInfo });

      const store = useDomainStore();
      await store.fetchDomainInfo();

      expect(store.langInfo?.title).toBe("完整加载");
    });
  });

  // ── updateDocumentMeta ───────────────────────────────────────────────────

  describe("updateDocumentMeta()", () => {
    it("langInfo 为 null 时不做任何操作", () => {
      const store = useDomainStore();
      store.langInfo = null;
      expect(() => store.updateDocumentMeta()).not.toThrow();
    });

    it("更新 description meta 标签", () => {
      const store = useDomainStore();
      store.langInfo = makeLangInfo({ description: "SEO Description" });
      store.updateDocumentMeta();

      const descMeta = document.querySelector('meta[name="description"]');
      expect(descMeta?.getAttribute("content")).toBe("SEO Description");
    });

    it("更新 keywords meta 标签", () => {
      const store = useDomainStore();
      store.langInfo = makeLangInfo({ keywords: "keyword1, keyword2" });
      store.updateDocumentMeta();

      const keywordsMeta = document.querySelector('meta[name="keywords"]');
      expect(keywordsMeta?.getAttribute("content")).toBe("keyword1, keyword2");
    });

    it("更新 author meta 标签", () => {
      const store = useDomainStore();
      store.langInfo = makeLangInfo({ author: "Test Author" });
      store.updateDocumentMeta();

      const authorMeta = document.querySelector('meta[name="author"]');
      expect(authorMeta?.getAttribute("content")).toBe("Test Author");
    });
  });
});
