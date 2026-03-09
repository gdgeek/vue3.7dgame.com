/**
 * Tests for src/views/web/bbs.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, nextTick } from "vue";

// ─── CSS mock ─────────────────────────────────────────────────────────────────
vi.mock("@/assets/font/font.css", () => ({}));

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockRouter = { beforeEach: vi.fn() };
vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => ({ query: {} })),
  useRouter: vi.fn(() => mockRouter),
}));

vi.mock("@/store/modules/settings", () => ({
  useSettingsStore: vi.fn(() => ({ theme: "light" })),
}));

vi.mock("@/enums/ThemeEnum", () => ({
  ThemeEnum: { DARK: "dark", LIGHT: "light" },
}));

vi.mock("@/composables/useAOS", () => ({
  useAOS: vi.fn(),
}));

vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/utils/utilityFunctions", () => ({
  debounce: vi.fn((fn: unknown) => fn),
}));

vi.mock("element-plus", () => ({
  ElMessageBox: { alert: vi.fn().mockResolvedValue(undefined) },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
  mockRouter.beforeEach.mockClear();
});

async function mount() {
  const { default: BbsView } = await import("@/views/web/bbs.vue");
  const el = document.createElement("div");
  const app = createApp(BbsView as Parameters<typeof createApp>[0]);
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("views/web/bbs.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders .app-container", async () => {
    const { el } = await mount();
    expect(el.querySelector(".app-container")).not.toBeNull();
  });

  it("renders iframe pointing to forum", async () => {
    const { el } = await mount();
    const iframe = el.querySelector("iframe.full-height");
    expect(iframe).not.toBeNull();
    expect((iframe as HTMLIFrameElement).src).toContain("rokid");
  });

  it("registers resize listener on mount", async () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    await mount();
    expect(addSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    addSpy.mockRestore();
  });

  it("removes event listeners on unmount", async () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { default: BbsView } = await import("@/views/web/bbs.vue");
    const el = document.createElement("div");
    const app = createApp(BbsView as Parameters<typeof createApp>[0]);
    app.mount(el);
    await nextTick();
    app.unmount();
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    removeSpy.mockRestore();
  });

  it("does not have dark-theme class when light theme", async () => {
    const { el } = await mount();
    expect(
      el.querySelector(".app-container")!.classList.contains("dark-theme")
    ).toBe(false);
  });
});
