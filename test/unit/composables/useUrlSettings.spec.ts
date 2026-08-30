import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  appStore: { language: "zh-CN" },
  currentThemeName: { value: "modern-blue" },
  initTheme: vi.fn(),
  loadLanguageAsync: vi.fn(async (language: string) => {
    mocks.appStore.language = language;
    window.localStorage.setItem("language", language);
  }),
  setTheme: vi.fn((theme: string) => {
    mocks.currentThemeName.value = theme;
    window.localStorage.setItem("appTheme", theme);
  }),
  watch: vi.fn(),
}));

vi.mock("vue", () => ({
  watch: mocks.watch,
}));

vi.mock("@/store/modules/app", () => ({
  useAppStoreHook: vi.fn(() => mocks.appStore),
}));

vi.mock("@/lang", () => ({
  loadLanguageAsync: mocks.loadLanguageAsync,
}));

vi.mock("@/composables/useTheme", () => ({
  useTheme: vi.fn(() => ({
    currentThemeName: mocks.currentThemeName,
    initTheme: mocks.initTheme,
    setTheme: mocks.setTheme,
  })),
}));

vi.mock("@/styles/themes", () => ({
  getTheme: vi.fn((name: string) =>
    ["modern-blue", "deep-space", "cyber-tech"].includes(name)
      ? { name }
      : undefined
  ),
}));

vi.mock("@/enums/LanguageEnum", () => ({
  LanguageEnum: {
    ZH_CN: "zh-CN",
    EN: "en-US",
    JA: "ja-JP",
    TH: "th-TH",
    ZH_TW: "zh-TW",
  },
}));

async function importSubject() {
  return import("@/composables/useUrlSettings");
}

describe("useUrlSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    localStorage.clear();
    mocks.appStore.language = "zh-CN";
    mocks.currentThemeName.value = "modern-blue";
    window.history.replaceState({}, "", "/");
  });

  it("treats URL values as explicit preferences even when they equal global defaults", async () => {
    window.history.replaceState({}, "", "/?lang=zh-CN&theme=modern-blue");
    const { initUrlSettings } = await importSubject();

    await initUrlSettings();

    expect(mocks.loadLanguageAsync).toHaveBeenCalledWith("zh-CN");
    expect(mocks.setTheme).toHaveBeenCalledWith("modern-blue");
    expect(localStorage.getItem("language")).toBe("zh-CN");
    expect(localStorage.getItem("appTheme")).toBe("modern-blue");
  });

  it("applies valid URL preferences before domain defaults load", async () => {
    window.history.replaceState(
      {},
      "",
      "/?lang=en-US&theme=deep-space&keep=1#section"
    );
    const { initUrlSettings } = await importSubject();

    await initUrlSettings();

    expect(mocks.appStore.language).toBe("en-US");
    expect(mocks.currentThemeName.value).toBe("deep-space");
    expect(mocks.initTheme).toHaveBeenCalledOnce();
  });

  it("leaves preferences unset when the initial URL has no overrides", async () => {
    const { initUrlSettings } = await importSubject();

    await initUrlSettings();

    expect(mocks.loadLanguageAsync).not.toHaveBeenCalled();
    expect(mocks.setTheme).not.toHaveBeenCalled();
    expect(localStorage.getItem("language")).toBeNull();
    expect(localStorage.getItem("appTheme")).toBeNull();
  });

  it("ignores invalid URL values so they do not block domain defaults", async () => {
    window.history.replaceState({}, "", "/?lang=fr-FR&theme=missing-theme");
    const { initUrlSettings } = await importSubject();

    await initUrlSettings();

    expect(mocks.loadLanguageAsync).not.toHaveBeenCalled();
    expect(mocks.setTheme).not.toHaveBeenCalled();
    expect(localStorage.getItem("language")).toBeNull();
    expect(localStorage.getItem("appTheme")).toBeNull();
  });

  it("keeps language and theme in the URL while preserving other query and hash values", async () => {
    window.history.replaceState({}, "", "/workspace?keep=1#section");
    mocks.appStore.language = "zh-TW";
    mocks.currentThemeName.value = "cyber-tech";
    const { watchUrlSettings } = await importSubject();

    watchUrlSettings();

    const url = new URL(window.location.href);
    expect(url.searchParams.get("keep")).toBe("1");
    expect(url.searchParams.get("lang")).toBe("zh-TW");
    expect(url.searchParams.get("theme")).toBe("cyber-tech");
    expect(url.hash).toBe("#section");
  });

  it("restores both preferences after router navigation", async () => {
    const guards: (() => void)[] = [];
    const router = {
      afterEach: vi.fn((guard: () => void) => guards.push(guard)),
    };
    mocks.appStore.language = "en-US";
    mocks.currentThemeName.value = "deep-space";
    const { installRouterGuard } = await importSubject();

    installRouterGuard(router);
    guards[0]?.();

    const url = new URL(window.location.href);
    expect(url.searchParams.get("lang")).toBe("en-US");
    expect(url.searchParams.get("theme")).toBe("deep-space");
  });
});
