/**
 * domain2.spec.ts
 *
 * Covers src/store/modules/domain.ts lines not reached in domain.spec.ts:
 *   - lines 141-143: fetchDefaultInfo when isLanguageLocked=true
 *     → dynamic import("@/lang") + loadLanguageAsync(lang)
 *   - lines 147-154: fetchDefaultInfo when isStyleLocked=true
 *     → dynamic import("@/composables/useTheme") + setTheme(targetTheme.name)
 *     → line 152 false branch: theme not found (style index out of bounds)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/utils/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
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

const mockLoadLanguageAsync = vi.hoisted(() => vi.fn());
vi.mock("@/lang", () => ({
  loadLanguageAsync: mockLoadLanguageAsync,
  default: {},
}));

const mockSetTheme = vi.hoisted(() => vi.fn());
vi.mock("@/composables/useTheme", () => ({
  useTheme: vi.fn(() => ({
    availableThemes: {
      value: [{ name: "modern-blue" }, { name: "dark" }, { name: "nature" }],
    },
    setTheme: mockSetTheme,
  })),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeDefaultInfo(overrides = {}) {
  return {
    homepage: "https://test.com",
    lang: "",
    style: 0,
    blog: "",
    icon: "",
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("useDomainStore — fetchDefaultInfo language & style lock (domain2)", () => {
  let getDomainDefault: ReturnType<typeof vi.fn>;
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

    ({ getDomainDefault } = await import("@/api/domain-query"));
    ({ useDomainStore } = await import("@/store/modules/domain"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Language lock (lines 141-143) ──────────────────────────────────────

  describe("fetchDefaultInfo() — isLanguageLocked=true", () => {
    it("lang='zh-CN' triggers loadLanguageAsync('zh-CN')", async () => {
      const info = makeDefaultInfo({ lang: "zh-CN" });
      getDomainDefault.mockResolvedValue({ data: info });

      const store = useDomainStore();
      await store.fetchDefaultInfo();

      expect(mockLoadLanguageAsync).toHaveBeenCalledWith("zh-CN");
    });

    it("lang='en-US' triggers loadLanguageAsync('en-US')", async () => {
      const info = makeDefaultInfo({ lang: "en-US" });
      getDomainDefault.mockResolvedValue({ data: info });

      const store = useDomainStore();
      await store.fetchDefaultInfo();

      expect(mockLoadLanguageAsync).toHaveBeenCalledWith("en-US");
    });

    it("lang='ja-JP' triggers loadLanguageAsync('ja-JP')", async () => {
      const info = makeDefaultInfo({ lang: "ja-JP" });
      getDomainDefault.mockResolvedValue({ data: info });

      const store = useDomainStore();
      await store.fetchDefaultInfo();

      expect(mockLoadLanguageAsync).toHaveBeenCalledWith("ja-JP");
    });

    it("unsupported lang does NOT trigger loadLanguageAsync", async () => {
      const info = makeDefaultInfo({ lang: "fr-FR" });
      getDomainDefault.mockResolvedValue({ data: info });

      const store = useDomainStore();
      await store.fetchDefaultInfo();

      expect(mockLoadLanguageAsync).not.toHaveBeenCalled();
    });

    it("empty lang does NOT trigger loadLanguageAsync", async () => {
      const info = makeDefaultInfo({ lang: "" });
      getDomainDefault.mockResolvedValue({ data: info });

      const store = useDomainStore();
      await store.fetchDefaultInfo();

      expect(mockLoadLanguageAsync).not.toHaveBeenCalled();
    });

    it("fetchDefaultInfo still updates defaultInfo when lang is locked", async () => {
      const info = makeDefaultInfo({
        lang: "zh-CN",
        homepage: "https://locked.com",
      });
      getDomainDefault.mockResolvedValue({ data: info });

      const store = useDomainStore();
      await store.fetchDefaultInfo();

      expect(store.defaultInfo?.homepage).toBe("https://locked.com");
    });
  });

  // ── Style lock (lines 147-154) ────────────────────────────────────────

  describe("fetchDefaultInfo() — isStyleLocked=true", () => {
    it("style=1 triggers setTheme with first available theme (index 0)", async () => {
      const info = makeDefaultInfo({ style: 1 });
      getDomainDefault.mockResolvedValue({ data: info });

      const store = useDomainStore();
      await store.fetchDefaultInfo();

      expect(mockSetTheme).toHaveBeenCalledWith("modern-blue");
    });

    it("style=2 triggers setTheme with second available theme (index 1)", async () => {
      const info = makeDefaultInfo({ style: 2 });
      getDomainDefault.mockResolvedValue({ data: info });

      const store = useDomainStore();
      await store.fetchDefaultInfo();

      expect(mockSetTheme).toHaveBeenCalledWith("dark");
    });

    it("style=3 triggers setTheme with third available theme (index 2)", async () => {
      const info = makeDefaultInfo({ style: 3 });
      getDomainDefault.mockResolvedValue({ data: info });

      const store = useDomainStore();
      await store.fetchDefaultInfo();

      expect(mockSetTheme).toHaveBeenCalledWith("nature");
    });

    it("style=99 (out of bounds) does NOT call setTheme (targetTheme is undefined)", async () => {
      const info = makeDefaultInfo({ style: 99 });
      getDomainDefault.mockResolvedValue({ data: info });

      const store = useDomainStore();
      await store.fetchDefaultInfo();

      // themes array only has 3 items, index 98 is undefined → no setTheme call
      expect(mockSetTheme).not.toHaveBeenCalled();
    });

    it("style=0 does NOT trigger setTheme", async () => {
      const info = makeDefaultInfo({ style: 0 });
      getDomainDefault.mockResolvedValue({ data: info });

      const store = useDomainStore();
      await store.fetchDefaultInfo();

      expect(mockSetTheme).not.toHaveBeenCalled();
    });

    it("style=1 still updates defaultInfo correctly", async () => {
      const info = makeDefaultInfo({
        style: 1,
        homepage: "https://styled.com",
      });
      getDomainDefault.mockResolvedValue({ data: info });

      const store = useDomainStore();
      await store.fetchDefaultInfo();

      expect(store.defaultInfo?.homepage).toBe("https://styled.com");
    });
  });

  // ── Both language lock and style lock ────────────────────────────────

  describe("fetchDefaultInfo() — both language lock AND style lock", () => {
    it("both loadLanguageAsync and setTheme are called", async () => {
      const info = makeDefaultInfo({ lang: "zh-CN", style: 1 });
      getDomainDefault.mockResolvedValue({ data: info });

      const store = useDomainStore();
      await store.fetchDefaultInfo();

      expect(mockLoadLanguageAsync).toHaveBeenCalledWith("zh-CN");
      expect(mockSetTheme).toHaveBeenCalledWith("modern-blue");
    });
  });
});
