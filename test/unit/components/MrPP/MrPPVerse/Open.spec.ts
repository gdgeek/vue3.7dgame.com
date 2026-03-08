/**
 * Tests for src/components/MrPP/MrPPVerse/Open.vue
 * Shows two el-card panels: one for opening scene to project,
 * one for generating a share code.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent } from "vue";

vi.mock("vue-i18n", () => ({
  useI18n: vi.fn(() => ({ t: (k: string) => k })),
}));

const ElCardStub = defineComponent({
  name: "ElCard",
  template: "<div class='el-card'><slot /><slot name='header' /></div>",
});
const ElButtonStub = defineComponent({
  name: "ElButton",
  props: ["type", "size"],
  template: "<button class='el-button'><slot /></button>",
});
const FontAwesomeIconStub = defineComponent({
  name: "FontAwesomeIcon",
  props: ["icon"],
  template: "<span class='fa-icon'></span>",
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

async function mount() {
  const { default: Open } = await import(
    "@/components/MrPP/MrPPVerse/Open.vue"
  );
  const el = document.createElement("div");
  const app = createApp(Open as Parameters<typeof createApp>[0]);
  app.component("ElCard", ElCardStub);
  app.component("ElButton", ElButtonStub);
  app.component("FontAwesomeIcon", FontAwesomeIconStub);
  app.config.globalProperties.$t = (k: string) => k;
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("components/MrPP/MrPPVerse/Open.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders outer div container", async () => {
    const { el } = await mount();
    expect(el.querySelector("div")).not.toBeNull();
  });

  it("renders two el-card panels", async () => {
    const { el } = await mount();
    const cards = el.querySelectorAll(".el-card");
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });

  it("renders el-button elements", async () => {
    const { el } = await mount();
    const buttons = el.querySelectorAll(".el-button");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("contains font-awesome-icon stubs", async () => {
    const { el } = await mount();
    const icons = el.querySelectorAll(".fa-icon");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("renders i18n key for verseOpen", async () => {
    const { el } = await mount();
    expect(el.textContent).toContain("verse.view.verseOpen");
  });
});
