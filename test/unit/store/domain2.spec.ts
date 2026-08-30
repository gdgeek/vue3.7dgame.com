/**
 * domain2.spec.ts
 *
 * Covers domain-provided language and style defaults:
 *   - fresh visitors receive supported domain defaults
 *   - saved user preferences take priority over domain defaults
 *   - invalid or out-of-range defaults are ignored
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

describe("useDomainStore — language and style defaults (domain2)", () => {
  let getDomainDefault: ReturnType<typeof vi.fn>;
  let useDomainStore: typeof import("@/store/modules/domain").useDomainStore;

  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorage.clear();

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

  // ── Language default ────────────────────────────────────────────────────

  describe("fetchDefaultInfo() — domain language default", () => {
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

    it("saved language preference is not overwritten", async () => {
      localStorage.setItem("language", "en-US");
      const info = makeDefaultInfo({ lang: "zh-CN" });
      getDomainDefault.mockResolvedValue({ data: info });

      const store = useDomainStore();
      await store.fetchDefaultInfo();

      expect(mockLoadLanguageAsync).not.toHaveBeenCalled();
      expect(localStorage.getItem("language")).toBe("en-US");
    });

    it("invalid saved language does not block the domain default", async () => {
      localStorage.setItem("language", "fr-FR");
      const info = makeDefaultInfo({ lang: "zh-CN" });
      getDomainDefault.mockResolvedValue({ data: info });

      const store = useDomainStore();
      await store.fetchDefaultInfo();

      expect(mockLoadLanguageAsync).toHaveBeenCalledWith("zh-CN");
    });

    it("fetchDefaultInfo still updates defaultInfo when lang has a default", async () => {
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

  // ── Style default ───────────────────────────────────────────────────────

  describe("fetchDefaultInfo() — domain style default", () => {
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

    it("saved theme preference is not overwritten", async () => {
      localStorage.setItem("appTheme", "nature");
      const info = makeDefaultInfo({ style: 1 });
      getDomainDefault.mockResolvedValue({ data: info });

      const store = useDomainStore();
      await store.fetchDefaultInfo();

      expect(mockSetTheme).not.toHaveBeenCalled();
      expect(localStorage.getItem("appTheme")).toBe("nature");
    });

    it("invalid saved theme does not block the domain default", async () => {
      localStorage.setItem("appTheme", "missing-theme");
      const info = makeDefaultInfo({ style: 1 });
      getDomainDefault.mockResolvedValue({ data: info });

      const store = useDomainStore();
      await store.fetchDefaultInfo();

      expect(mockSetTheme).toHaveBeenCalledWith("modern-blue");
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

  // ── Both defaults ───────────────────────────────────────────────────────

  describe("fetchDefaultInfo() — both language and style defaults", () => {
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
