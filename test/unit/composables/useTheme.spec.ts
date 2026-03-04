/**
 * Unit tests for src/composables/useTheme.ts
 *
 * useTheme 依赖：
 *   - @vueuse/core  (useStorage → localStorage)
 *   - @/styles/themes/index  (themes, defaultTheme, getTheme, …)
 *   - @/store/modules/settings  (useSettingsStore)
 *   - @/enums/ThemeEnum
 *
 * 测试策略：
 *   jsdom 提供 document.documentElement 和 document.body，
 *   因此可以直接验证 CSS 自定义属性和 class/attribute 是否被正确设置。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockChangeTheme = vi.fn();
vi.mock("@/store/modules/settings", () => ({
  useSettingsStore: vi.fn(() => ({ changeTheme: mockChangeTheme })),
}));

vi.mock("@/store", async () => {
  const { createPinia: cp } = await import("pinia");
  return { store: cp() };
});

vi.mock("@/utils/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

// ── Tests ──────────────────────────────────────────────────────────────────

describe("useTheme", () => {
  let useTheme: typeof import("@/composables/useTheme").useTheme;
  let themes: typeof import("@/styles/themes/index").themes;
  let defaultTheme: typeof import("@/styles/themes/index").defaultTheme;
  let getTheme: typeof import("@/styles/themes/index").getTheme;

  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorage.clear();

    // Re-import with a clean localStorage so useStorage starts fresh
    vi.resetModules();
    vi.mock("@/store/modules/settings", () => ({
      useSettingsStore: vi.fn(() => ({ changeTheme: mockChangeTheme })),
    }));
    vi.mock("@/utils/logger", () => ({
      logger: { warn: vi.fn(), error: vi.fn() },
    }));

    ({ useTheme } = await import("@/composables/useTheme"));
    ({ themes, defaultTheme, getTheme } = await import("@/styles/themes/index"));
  });

  // ── Computed properties ──────────────────────────────────────────────────

  describe("computed properties", () => {
    it("currentTheme 返回默认主题", () => {
      const { currentTheme } = useTheme();
      expect(currentTheme.value).toBeDefined();
      expect(currentTheme.value.name).toBeTruthy();
    });

    it("availableThemes 返回所有主题列表", () => {
      const { availableThemes } = useTheme();
      expect(Array.isArray(availableThemes.value)).toBe(true);
      expect(availableThemes.value.length).toBeGreaterThan(0);
    });

    it("isDarkTheme 与 currentTheme.isDark 一致", () => {
      const { isDarkTheme, currentTheme } = useTheme();
      expect(isDarkTheme.value).toBe(currentTheme.value.isDark);
    });

    it("currentColors 与 currentTheme.colors 一致", () => {
      const { currentColors, currentTheme } = useTheme();
      expect(currentColors.value).toEqual(currentTheme.value.colors);
    });

    it("currentStyle 与 currentTheme.style 一致", () => {
      const { currentStyle, currentTheme } = useTheme();
      expect(currentStyle.value).toEqual(currentTheme.value.style);
    });

    it("currentThemeName 默认值与 defaultTheme.name 一致", () => {
      const { currentThemeName } = useTheme();
      expect(currentThemeName.value).toBe(defaultTheme.name);
    });
  });

  // ── setTheme ──────────────────────────────────────────────────────────────
  //
  // Branch supplement: lines 281-289
  // if (themeName === "modern-blue" && customPrimaryColor.value) { … }
  //
  describe("setTheme() — custom-color branch (lines 281-289)", () => {
    it("setTheme('modern-blue') with existing custom color applies custom shadow via generatePrimaryShadow", () => {
      const { setTheme, setCustomPrimaryColor } = useTheme();
      // Ensure we are on modern-blue so that setCustomPrimaryColor works
      setTheme("modern-blue");
      setCustomPrimaryColor("#FF6B35");

      // Remove the CSS variable so we can verify it is re-applied by setTheme
      document.documentElement.style.removeProperty("--shadow-primary");

      // Calling setTheme("modern-blue") again triggers lines 282-289 because
      // customPrimaryColor.value is now "#FF6B35" (truthy)
      setTheme("modern-blue");

      const shadow = document.documentElement.style.getPropertyValue("--shadow-primary");
      expect(shadow).toBeTruthy();
    });

    it("setTheme('modern-blue') with custom color calls applyTheme and applyColorVariables for custom colors", () => {
      const { setTheme, setCustomPrimaryColor } = useTheme();
      setTheme("modern-blue");
      setCustomPrimaryColor("#AA3399");

      // Verify no throw and CSS primary-color is set (applyColorVariables was invoked)
      expect(() => setTheme("modern-blue")).not.toThrow();
      const primary = document.documentElement.style.getPropertyValue("--primary-color");
      expect(primary).toBeTruthy();
    });

    it("setTheme to non-modern-blue theme takes the else branch (no custom colors)", () => {
      const { setTheme } = useTheme();
      const darkTheme = (globalThis as any).__themes__?.find((t: any) => t.isDark);

      // Get a non-modern-blue theme
      const { themes: allThemes } = (() => {
        // themes is available via the beforeEach import
        return { themes };
      })();
      const other = allThemes.find((t) => t.name !== "modern-blue");
      if (!other) return;

      // No custom color set → else branch is taken (just applyTheme)
      expect(() => setTheme(other.name)).not.toThrow();
      expect(document.body.getAttribute("data-theme")).toBe(other.name);
    });
  });

  describe("setTheme()", () => {
    it("切换到已知主题后 currentThemeName 更新", () => {
      const { setTheme, currentThemeName } = useTheme();
      const targetTheme = themes.find((t) => t.name !== defaultTheme.name);
      if (!targetTheme) return; // skip if only one theme

      setTheme(targetTheme.name);
      expect(currentThemeName.value).toBe(targetTheme.name);
    });

    it("切换到不存在的主题名时不更新 currentThemeName", () => {
      const { setTheme, currentThemeName } = useTheme();
      const before = currentThemeName.value;

      setTheme("non-existent-theme-xyz");
      expect(currentThemeName.value).toBe(before);
    });

    it("切换主题后 body[data-theme] 属性更新", () => {
      const { setTheme } = useTheme();
      const targetTheme = themes[0];

      setTheme(targetTheme.name);
      expect(document.body.getAttribute("data-theme")).toBe(targetTheme.name);
    });

    it("切换主题后 body 添加对应的 theme 类", () => {
      const { setTheme } = useTheme();
      const targetTheme = themes[0];

      setTheme(targetTheme.name);
      expect(document.body.classList.contains(`theme-${targetTheme.name}`)).toBe(true);
    });

    it("切换到深色主题后 body 添加 dark-mode 类", () => {
      const { setTheme } = useTheme();
      const darkTheme = themes.find((t) => t.isDark);
      if (!darkTheme) return;

      setTheme(darkTheme.name);
      expect(document.body.classList.contains("dark-mode")).toBe(true);
    });

    it("切换到浅色主题后 body 移除 dark-mode 类", () => {
      const { setTheme } = useTheme();
      const lightTheme = themes.find((t) => !t.isDark);
      const darkTheme = themes.find((t) => t.isDark);
      if (!lightTheme || !darkTheme) return;

      // First switch to dark
      setTheme(darkTheme.name);
      expect(document.body.classList.contains("dark-mode")).toBe(true);

      // Then switch to light
      setTheme(lightTheme.name);
      expect(document.body.classList.contains("dark-mode")).toBe(false);
    });

    it("切换主题后 documentElement 的 CSS 变量被设置", () => {
      const { setTheme } = useTheme();
      const targetTheme = themes[0];

      setTheme(targetTheme.name);

      // Verify at least one CSS variable was applied
      const primaryColor = document.documentElement.style.getPropertyValue("--primary-color");
      expect(primaryColor).toBeTruthy();
    });

    it("切换主题后同步更新 settingsStore", () => {
      const { setTheme } = useTheme();
      setTheme(themes[0].name);
      expect(mockChangeTheme).toHaveBeenCalled();
    });
  });

  // ── initTheme ─────────────────────────────────────────────────────────────

  describe("initTheme()", () => {
    it("调用不抛出异常", () => {
      const { initTheme } = useTheme();
      expect(() => initTheme()).not.toThrow();
    });

    it("初始化后 CSS 变量被应用到 documentElement", () => {
      const { initTheme } = useTheme();
      initTheme();

      const primaryColor = document.documentElement.style.getPropertyValue("--primary-color");
      expect(primaryColor).toBeTruthy();
    });

    it("初始化后 body[data-theme] 被设置", () => {
      const { initTheme } = useTheme();
      initTheme();

      expect(document.body.getAttribute("data-theme")).toBeTruthy();
    });
  });

  // ── setCustomPrimaryColor ─────────────────────────────────────────────────

  describe("setCustomPrimaryColor()", () => {
    it("非 modern-blue 主题时打印警告且不应用颜色", async () => {
      const { logger } = await import("@/utils/logger");
      const { setTheme, setCustomPrimaryColor } = useTheme();

      const nonModernTheme = themes.find((t) => t.name !== "modern-blue");
      if (!nonModernTheme) return;

      setTheme(nonModernTheme.name);
      setCustomPrimaryColor("#FF6B35");

      expect(logger.warn).toHaveBeenCalled();
    });

    it("modern-blue 主题下设置颜色后 getCustomPrimaryColor 返回该颜色", () => {
      const { setTheme, setCustomPrimaryColor, getCustomPrimaryColor } = useTheme();

      const modernTheme = getTheme("modern-blue");
      if (!modernTheme) return;

      setTheme("modern-blue");
      setCustomPrimaryColor("#FF6B35");

      expect(getCustomPrimaryColor()).toBe("#FF6B35");
    });

    it("传入 null 时 getCustomPrimaryColor 返回 null", () => {
      const { setTheme, setCustomPrimaryColor, getCustomPrimaryColor } = useTheme();

      const modernTheme = getTheme("modern-blue");
      if (!modernTheme) return;

      setTheme("modern-blue");
      setCustomPrimaryColor("#FF6B35");
      setCustomPrimaryColor(null);

      expect(getCustomPrimaryColor()).toBeNull();
    });
  });

  // ── getCustomPrimaryColor ─────────────────────────────────────────────────

  describe("getCustomPrimaryColor()", () => {
    it("默认返回 null", () => {
      const { getCustomPrimaryColor } = useTheme();
      expect(getCustomPrimaryColor()).toBeNull();
    });
  });

  // ── presetPrimaryColors ──────────────────────────────────────────────────

  describe("presetPrimaryColors", () => {
    it("返回预设颜色数组", () => {
      const { presetPrimaryColors } = useTheme();
      expect(Array.isArray(presetPrimaryColors)).toBe(true);
      expect(presetPrimaryColors.length).toBeGreaterThan(0);
    });

    it("每个预设颜色条目包含 name 和 color 字段", () => {
      const { presetPrimaryColors } = useTheme();
      presetPrimaryColors.forEach((entry) => {
        expect(typeof entry.name).toBe("string");
        expect(typeof entry.color).toBe("string");
        expect(entry.color).toMatch(/^#/);
      });
    });
  });

  // ── themes data integrity ────────────────────────────────────────────────

  describe("主题数据完整性", () => {
    it("每个主题都有 name、displayName、isDark、colors、style 字段", () => {
      themes.forEach((theme) => {
        expect(theme.name).toBeTruthy();
        expect(theme.displayName).toBeTruthy();
        expect(typeof theme.isDark).toBe("boolean");
        expect(theme.colors).toBeDefined();
        expect(theme.style).toBeDefined();
      });
    });

    it("defaultTheme 包含在 themes 数组中", () => {
      const found = themes.find((t) => t.name === defaultTheme.name);
      expect(found).toBeDefined();
    });

    it("getTheme 通过名称正确返回主题", () => {
      const theme = getTheme(defaultTheme.name);
      expect(theme).toBeDefined();
      expect(theme?.name).toBe(defaultTheme.name);
    });

    it("getTheme 对不存在的名称返回 undefined", () => {
      const theme = getTheme("this-does-not-exist");
      expect(theme).toBeUndefined();
    });
  });
});
