/**
 * Unit tests for src/store/modules/settings.ts
 * Tests: changeSetting, changeTheme, changeThemeColor, changeLayout.
 *
 * The settings store uses a Vue `watch({ immediate: true })` to sync theme/color
 * to the DOM — we call `await nextTick()` after each mutation so the watcher
 * has a chance to flush before asserting DOM side effects.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import { useSettingsStore } from "@/store/modules/settings";

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
  // Wipe any lingering DOM state from previous tests
  document.documentElement.className = "";
  document.documentElement.removeAttribute("style");
});

// -----------------------------------------------------------------------
// changeSetting — pure state mutations
// -----------------------------------------------------------------------
describe("changeSetting()", () => {
  it("changes fixedHeader to false", () => {
    const store = useSettingsStore();
    store.changeSetting({ key: "fixedHeader", value: false });
    expect(store.fixedHeader).toBe(false);
  });

  it("changes tagsView to true", () => {
    const store = useSettingsStore();
    store.changeSetting({ key: "tagsView", value: true });
    expect(store.tagsView).toBe(true);
  });

  it("changes sidebarLogo to false", () => {
    const store = useSettingsStore();
    store.changeSetting({ key: "sidebarLogo", value: false });
    expect(store.sidebarLogo).toBe(false);
  });

  it("changes layout to top", () => {
    const store = useSettingsStore();
    store.changeSetting({ key: "layout", value: "top" });
    expect(store.layout).toBe("top");
  });

  it("changes watermarkEnabled to true", () => {
    const store = useSettingsStore();
    store.changeSetting({ key: "watermarkEnabled", value: true });
    expect(store.watermarkEnabled).toBe(true);
  });

  it("ignores unknown key (no throw, no state change)", () => {
    const store = useSettingsStore();
    const before = store.fixedHeader;
    store.changeSetting({ key: "unknownKey", value: true });
    expect(store.fixedHeader).toBe(before);
  });
});

// -----------------------------------------------------------------------
// changeTheme — state + DOM side-effects
// -----------------------------------------------------------------------
describe("changeTheme()", () => {
  it("updates theme value to dark", () => {
    const store = useSettingsStore();
    store.changeTheme("dark");
    expect(store.theme).toBe("dark");
  });

  it("updates theme value to light", () => {
    const store = useSettingsStore();
    store.changeTheme("light");
    expect(store.theme).toBe("light");
  });

  it("adds 'dark' class to documentElement after nextTick", async () => {
    const store = useSettingsStore();
    store.changeTheme("dark");
    await nextTick();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes 'dark' class after switching back to light", async () => {
    const store = useSettingsStore();
    store.changeTheme("dark");
    await nextTick();
    store.changeTheme("light");
    await nextTick();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("can toggle dark → light → dark", async () => {
    const store = useSettingsStore();
    store.changeTheme("dark");
    await nextTick();
    store.changeTheme("light");
    await nextTick();
    store.changeTheme("dark");
    await nextTick();
    expect(store.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});

// -----------------------------------------------------------------------
// changeThemeColor — state + CSS variable side-effects
// -----------------------------------------------------------------------
describe("changeThemeColor()", () => {
  it("updates themeColor value", () => {
    const store = useSettingsStore();
    store.changeThemeColor("#FF6B35");
    expect(store.themeColor).toBe("#FF6B35");
  });

  it("sets --el-color-primary CSS variable after nextTick", async () => {
    const store = useSettingsStore();
    store.changeThemeColor("#123456");
    await nextTick();
    const val =
      document.documentElement.style.getPropertyValue("--el-color-primary");
    expect(val).toBe("#123456");
  });

  it("subsequent color changes update the CSS variable", async () => {
    const store = useSettingsStore();
    store.changeThemeColor("#AABBCC");
    await nextTick();
    store.changeThemeColor("#112233");
    await nextTick();
    expect(store.themeColor).toBe("#112233");
    const val =
      document.documentElement.style.getPropertyValue("--el-color-primary");
    expect(val).toBe("#112233");
  });
});

// -----------------------------------------------------------------------
// changeLayout
// -----------------------------------------------------------------------
describe("changeLayout()", () => {
  it("updates layout to top", () => {
    const store = useSettingsStore();
    store.changeLayout("top");
    expect(store.layout).toBe("top");
  });

  it("updates layout to mix", () => {
    const store = useSettingsStore();
    store.changeLayout("mix");
    expect(store.layout).toBe("mix");
  });

  it("updates layout to left", () => {
    const store = useSettingsStore();
    store.changeLayout("left");
    expect(store.layout).toBe("left");
  });
});

// -----------------------------------------------------------------------
// settingsVisible
// -----------------------------------------------------------------------
describe("settingsVisible", () => {
  it("starts as false", () => {
    const store = useSettingsStore();
    expect(store.settingsVisible).toBe(false);
  });

  it("can be toggled to true", () => {
    const store = useSettingsStore();
    store.settingsVisible = true;
    expect(store.settingsVisible).toBe(true);
  });
});
