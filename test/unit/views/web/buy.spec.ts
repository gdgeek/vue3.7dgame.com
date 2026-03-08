/**
 * Tests for src/views/web/buy.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent } from "vue";

vi.mock("@/assets/font/font.css", () => ({}));
vi.mock("@/composables/useAOS", () => ({ useAOS: vi.fn() }));

const mockSettingsStore = { theme: "light" };
vi.mock("@/store/modules/settings", () => ({
  useSettingsStore: vi.fn(() => mockSettingsStore),
}));

vi.mock("@/views/web/components/Buy.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "Buy",
      template: '<div class="buy-stub"></div>',
    }),
  };
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

async function mount() {
  const { default: BuyView } = await import("@/views/web/buy.vue");
  const el = document.createElement("div");
  const app = createApp(BuyView as Parameters<typeof createApp>[0]);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("views/web/buy.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders .app-container wrapper", async () => {
    const { el } = await mount();
    expect(el.querySelector(".app-container")).not.toBeNull();
  });

  it("renders Buy child component stub", async () => {
    const { el } = await mount();
    expect(el.querySelector(".buy-stub")).not.toBeNull();
  });

  it("does not apply dark-theme class when theme is light", async () => {
    mockSettingsStore.theme = "light";
    const { el } = await mount();
    const container = el.querySelector(".app-container");
    expect(container?.classList.contains("dark-theme")).toBe(false);
  });

  it("applies dark-theme class when theme is dark", async () => {
    mockSettingsStore.theme = "dark";
    const { el } = await mount();
    const container = el.querySelector(".app-container");
    expect(container?.classList.contains("dark-theme")).toBe(true);
    // reset
    mockSettingsStore.theme = "light";
  });
});
