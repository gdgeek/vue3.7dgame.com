/**
 * Unit tests for src/store/modules/app.ts
 * Tests: toggleSidebar, closeSideBar, openSideBar, toggleDevice,
 *        changeSize, activeTopMenu, changeLanguage.
 *
 * NOTE: app.ts has a circular import chain:
 *   app.ts → @/store → (other modules) → request.ts → lang/index.ts
 *            → useAppStoreHook() [called at module-level in lang/index.ts]
 * We break the chain by mocking the problematic modules.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// Break the circular import chain BEFORE any imports of app.ts
vi.mock("@/utils/request", () => ({ default: vi.fn() }));
vi.mock("@/lang", () => ({
  default: {
    global: { locale: { value: "zh-CN" }, t: (k: string) => k },
  },
}));
vi.mock("@/store", async () => {
  const { createPinia: cp } = await import("pinia");
  return { store: cp() };
});
vi.mock("element-plus/es/locale/lang/en", () => ({ default: { name: "en" } }));
vi.mock("element-plus/es/locale/lang/ja", () => ({ default: { name: "ja" } }));
vi.mock("element-plus/es/locale/lang/th", () => ({ default: { name: "th" } }));
vi.mock("element-plus/es/locale/lang/zh-tw", () => ({
  default: { name: "zh-tw" },
}));

// Static import — resolved after mocks are set up
import { useAppStore, useAppStoreHook } from "@/store/modules/app";

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
});

// -----------------------------------------------------------------------
// Sidebar
// -----------------------------------------------------------------------
describe("toggleSidebar()", () => {
  it("opens a closed sidebar", () => {
    const store = useAppStore();
    store.closeSideBar();
    store.toggleSidebar();
    expect(store.sidebar.opened).toBe(true);
  });

  it("closes an open sidebar", () => {
    const store = useAppStore();
    store.openSideBar();
    store.toggleSidebar();
    expect(store.sidebar.opened).toBe(false);
  });

  it("sidebar.opened is true after toggle from closed", () => {
    const store = useAppStore();
    store.closeSideBar();
    store.toggleSidebar();
    // Check in-memory state (useStorage → localStorage sync is async)
    expect(store.sidebar.opened).toBe(true);
  });

  it("sidebar.opened is false after double-toggle from closed", () => {
    const store = useAppStore();
    store.closeSideBar();
    store.toggleSidebar(); // open
    store.toggleSidebar(); // close
    expect(store.sidebar.opened).toBe(false);
  });
});

describe("closeSideBar()", () => {
  it("sets sidebar.opened to false", () => {
    const store = useAppStore();
    store.openSideBar();
    store.closeSideBar();
    expect(store.sidebar.opened).toBe(false);
  });
});

describe("openSideBar()", () => {
  it("sets sidebar.opened to true", () => {
    const store = useAppStore();
    store.closeSideBar();
    store.openSideBar();
    expect(store.sidebar.opened).toBe(true);
  });
});

// -----------------------------------------------------------------------
// toggleDevice
// -----------------------------------------------------------------------
describe("toggleDevice()", () => {
  it("changes device to mobile", () => {
    const store = useAppStore();
    store.toggleDevice("mobile");
    expect(store.device).toBe("mobile");
  });

  it("changes device back to desktop", () => {
    const store = useAppStore();
    store.toggleDevice("mobile");
    store.toggleDevice("desktop");
    expect(store.device).toBe("desktop");
  });
});

// -----------------------------------------------------------------------
// changeSize
// -----------------------------------------------------------------------
describe("changeSize()", () => {
  it("updates size to small", () => {
    const store = useAppStore();
    store.changeSize("small");
    expect(store.size).toBe("small");
  });

  it("updates size to large", () => {
    const store = useAppStore();
    store.changeSize("large");
    expect(store.size).toBe("large");
  });
});

// -----------------------------------------------------------------------
// activeTopMenu
// -----------------------------------------------------------------------
describe("activeTopMenu()", () => {
  it("sets activeTopMenuPath", () => {
    const store = useAppStore();
    store.activeTopMenu("/dashboard");
    expect(store.activeTopMenuPath).toBe("/dashboard");
  });

  it("overwrites previous top menu path", () => {
    const store = useAppStore();
    store.activeTopMenu("/a");
    store.activeTopMenu("/b");
    expect(store.activeTopMenuPath).toBe("/b");
  });
});

// -----------------------------------------------------------------------
// changeLanguage
// -----------------------------------------------------------------------
describe("changeLanguage()", () => {
  it("updates language to en-US", async () => {
    const store = useAppStore();
    await store.changeLanguage("en-US");
    expect(store.language).toBe("en-US");
  });

  it("updates language to ja-JP", async () => {
    const store = useAppStore();
    await store.changeLanguage("ja-JP");
    expect(store.language).toBe("ja-JP");
  });

  it("updates language to th-TH", async () => {
    const store = useAppStore();
    await store.changeLanguage("th-TH");
    expect(store.language).toBe("th-TH");
  });

  it("updates language to zh-TW", async () => {
    const store = useAppStore();
    await store.changeLanguage("zh-TW");
    expect(store.language).toBe("zh-TW");
  });

  it("updates language to zh-CN (default case)", async () => {
    const store = useAppStore();
    await store.changeLanguage("en-US"); // change away from zh-CN first
    await store.changeLanguage("zh-CN");
    expect(store.language).toBe("zh-CN");
  });

  it("locale is defined after language switch", async () => {
    const store = useAppStore();
    await store.changeLanguage("en-US");
    expect(store.locale).toBeDefined();
  });
});

// -----------------------------------------------------------------------
// Initial state
// -----------------------------------------------------------------------
describe("initial state", () => {
  it("device starts as desktop", () => {
    const store = useAppStore();
    expect(store.device).toBe("desktop");
  });

  it("size starts as default value", () => {
    const store = useAppStore();
    expect(store.size).toBeTruthy();
  });

  it("activeTopMenuPath starts as empty string", () => {
    const store = useAppStore();
    expect(store.activeTopMenuPath).toBe("");
  });
});

// -----------------------------------------------------------------------
// Edge cases
// -----------------------------------------------------------------------
describe("openSideBar() when already open is idempotent", () => {
  it("stays open after calling openSideBar twice", () => {
    const store = useAppStore();
    store.openSideBar();
    store.openSideBar();
    expect(store.sidebar.opened).toBe(true);
  });
});

describe("closeSideBar() when already closed is idempotent", () => {
  it("stays closed after calling closeSideBar twice", () => {
    const store = useAppStore();
    store.closeSideBar();
    store.closeSideBar();
    expect(store.sidebar.opened).toBe(false);
  });
});

// -----------------------------------------------------------------------
// useAppStoreHook (lines 104-105)
// -----------------------------------------------------------------------
describe("useAppStoreHook()", () => {
  it("返回合法的 store 实例（有 sidebar 属性）", () => {
    const hook = useAppStoreHook();
    expect(hook).toBeDefined();
    expect(typeof hook.sidebar).toBe("object");
    expect(typeof hook.sidebar.opened).toBe("boolean");
  });

  it("返回的实例包含 toggleSidebar 方法", () => {
    const hook = useAppStoreHook();
    expect(typeof hook.toggleSidebar).toBe("function");
  });

  it("返回的实例包含 changeLanguage 方法", () => {
    const hook = useAppStoreHook();
    expect(typeof hook.changeLanguage).toBe("function");
  });

  it("useAppStoreHook 与 useAppStore 返回相同类型的实例", () => {
    const hook = useAppStoreHook();
    // 两者都暴露相同的公开属性
    expect(Object.keys(hook)).toEqual(
      expect.arrayContaining([
        "device",
        "sidebar",
        "language",
        "locale",
        "size",
        "activeTopMenuPath",
      ])
    );
  });

  it("useAppStoreHook 返回的实例可以正常操作 sidebar", () => {
    const hook = useAppStoreHook();
    hook.openSideBar();
    expect(hook.sidebar.opened).toBe(true);
    hook.closeSideBar();
    expect(hook.sidebar.opened).toBe(false);
  });
});
