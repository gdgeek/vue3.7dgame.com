/**
 * Tests for src/components/LangSelect/index.vue
 * Language selection dropdown that integrates with appStore and i18n.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent } from "vue";

const mockAppStore = { language: "zh-CN" };
const mockDomainStore = {
  refreshFromAPI: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/store/modules/app", () => ({
  useAppStore: vi.fn(() => mockAppStore),
}));

vi.mock("@/store/modules/domain", () => ({
  useDomainStore: vi.fn(() => mockDomainStore),
}));

vi.mock("@/enums/LanguageEnum", () => ({
  LanguageEnum: {
    ZH_CN: "zh-CN",
    EN: "en",
    JA: "ja",
    ZH_TW: "zh-TW",
    TH: "th",
  },
}));

vi.mock("@/lang/index", () => ({
  loadLanguageAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("vue-i18n", () => ({
  useI18n: vi.fn(() => ({ t: (k: string) => k })),
}));

const ElDropdownStub = defineComponent({
  name: "ElDropdown",
  emits: ["command"],
  template: "<div class='el-dropdown'><slot /><slot name='dropdown' /></div>",
});
const ElDropdownMenuStub = defineComponent({
  name: "ElDropdownMenu",
  template: "<div class='el-dropdown-menu'><slot /></div>",
});
const ElDropdownItemStub = defineComponent({
  name: "ElDropdownItem",
  props: ["disabled", "command"],
  template:
    "<div class='el-dropdown-item' :data-command='command'><slot /></div>",
});
const SvgIconStub = defineComponent({
  name: "SvgIcon",
  props: ["iconClass", "size"],
  template: "<span class='svg-icon-stub'></span>",
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
  mockDomainStore.refreshFromAPI.mockClear();
});

async function mount(props: Record<string, unknown> = {}) {
  const { default: LangSelect } = await import(
    "@/components/LangSelect/index.vue"
  );
  const el = document.createElement("div");
  const app = createApp(LangSelect as Parameters<typeof createApp>[0], props);
  app.component("ElDropdown", ElDropdownStub);
  app.component("ElDropdownMenu", ElDropdownMenuStub);
  app.component("ElDropdownItem", ElDropdownItemStub);
  app.component("SvgIcon", SvgIconStub);
  (globalThis as Record<string, unknown>).ElMessage = { success: vi.fn() };
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("components/LangSelect/index.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders el-dropdown stub", async () => {
    const { el } = await mount();
    expect(el.querySelector(".el-dropdown")).not.toBeNull();
  });

  it("renders svg-icon stub", async () => {
    const { el } = await mount();
    expect(el.querySelector(".svg-icon-stub")).not.toBeNull();
  });

  it("renders 5 language options", async () => {
    const { el } = await mount();
    const items = el.querySelectorAll(".el-dropdown-item");
    expect(items.length).toBe(5);
  });

  it("all language commands are present", async () => {
    const { el } = await mount();
    const commands = Array.from(el.querySelectorAll(".el-dropdown-item")).map(
      (i) => i.getAttribute("data-command")
    );
    expect(commands).toContain("zh-CN");
    expect(commands).toContain("en");
    expect(commands).toContain("ja");
  });

  it("renders lang-trigger container", async () => {
    const { el } = await mount();
    expect(el.querySelector(".lang-trigger")).not.toBeNull();
  });

  it("renders lang-text span", async () => {
    const { el } = await mount();
    expect(el.querySelector(".lang-text")).not.toBeNull();
  });
});
