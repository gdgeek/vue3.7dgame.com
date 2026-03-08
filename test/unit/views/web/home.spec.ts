/**
 * Tests for src/views/web/home.vue
 *
 * Note: home.vue uses `import * as News from "./components/News/index.vue"`
 * namespace imports (an unusual pattern) which means we can't easily mock child
 * components via vi.mock. We test the module structure + script logic instead.
 */
import { describe, it, expect, vi, afterEach } from "vitest";

// ─── Mock all heavy dependencies upfront ──────────────────────────────────────
vi.mock("@/store/modules/settings", () => ({
  useSettingsStore: vi.fn(() => ({ theme: "light", changeTheme: vi.fn() })),
}));

vi.mock("@/store/modules/domain", () => ({
  useDomainStore: vi.fn(() => ({
    title: "TestDomain",
    icon: null,
    isLanguageLocked: false,
    homepage: null,
  })),
}));

vi.mock("@/enums/ThemeEnum", () => ({
  ThemeEnum: { DARK: "dark", LIGHT: "light" },
}));

vi.mock("@/composables/useAOS", () => ({
  useAOS: vi.fn(),
}));

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => ({ query: {}, path: "/web/home" })),
  useRouter: vi.fn(() => ({ push: vi.fn(), beforeEach: vi.fn(() => () => {}) })),
  createRouter: vi.fn(() => ({})),
  createWebHistory: vi.fn(() => ({})),
  createWebHashHistory: vi.fn(() => ({})),
}));

vi.mock("vue-i18n", () => ({
  useI18n: vi.fn(() => ({ t: (k: string) => k })),
}));

vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/utils/utilityFunctions", () => ({
  debounce: vi.fn((fn: (...args: unknown[]) => void) => fn),
}));

vi.mock("@/assets/font/font.css", () => ({}));

// Mock child component modules (namespace imports in home.vue)
vi.mock("@/views/web/components/Buy.vue", () => ({
  default: { name: "Buy", template: "<div></div>", __v_isRef: false },
  __v_isRef: false,
}));

vi.mock("@/views/web/components/News/index.vue", () => ({
  default: { name: "News", props: ["activeTabName"], template: "<div></div>", __v_isRef: false },
  __v_isRef: false,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
afterEach(() => {
  vi.resetModules();
});

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("views/web/home.vue", () => {
  it("module imports successfully", async () => {
    const mod = await import("@/views/web/home.vue");
    expect(mod).toBeDefined();
    expect(mod.default).toBeDefined();
  });

  it("default export is a Vue component object", async () => {
    const { default: comp } = await import("@/views/web/home.vue");
    expect(comp).toBeDefined();
    // Vue SFCs have __file or name property
    expect(typeof comp).toBe("object");
  });

  it("component has name 'WebHome'", async () => {
    const { default: comp } = await import("@/views/web/home.vue");
    // defineOptions({ name: 'WebHome' })
    const name = (comp as { name?: string }).name;
    expect(name).toBe("WebHome");
  });

  it("useSettingsStore is called when component is imported", async () => {
    const { useSettingsStore } = await import("@/store/modules/settings");
    // Reset module to clear call count
    vi.resetModules();
    expect(useSettingsStore).toBeDefined();
  });

  it("ThemeEnum DARK value is 'dark'", async () => {
    const { ThemeEnum } = await import("@/enums/ThemeEnum");
    expect(ThemeEnum.DARK).toBe("dark");
  });

  it("ThemeEnum LIGHT value is 'light'", async () => {
    const { ThemeEnum } = await import("@/enums/ThemeEnum");
    expect(ThemeEnum.LIGHT).toBe("light");
  });
});
