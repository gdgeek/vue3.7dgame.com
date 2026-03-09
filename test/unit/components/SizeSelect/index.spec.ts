/**
 * Tests for src/components/SizeSelect/index.vue
 * Dropdown to change UI size (default/large/small) using appStore.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent } from "vue";

const mockChangeSize = vi.fn();
const mockAppStore = { size: "default", changeSize: mockChangeSize };

vi.mock("@/store/modules/app", () => ({
  useAppStore: vi.fn(() => mockAppStore),
}));

vi.mock("@/enums/SizeEnum", () => ({
  SizeEnum: { DEFAULT: "default", LARGE: "large", SMALL: "small" },
}));

vi.mock("vue-i18n", () => ({
  useI18n: vi.fn(() => ({ t: (k: string) => k })),
}));

// Stub Element Plus and global APIs
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
  props: ["iconClass"],
  template: "<span class='svg-icon-stub'></span>",
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
  mockChangeSize.mockClear();
});

async function mount() {
  const { default: SizeSelect } = await import(
    "@/components/SizeSelect/index.vue"
  );
  const el = document.createElement("div");
  const app = createApp(SizeSelect as Parameters<typeof createApp>[0]);
  app.component("ElDropdown", ElDropdownStub);
  app.component("ElDropdownMenu", ElDropdownMenuStub);
  app.component("ElDropdownItem", ElDropdownItemStub);
  app.component("SvgIcon", SvgIconStub);
  // Stub globals used by component
  app.config.globalProperties.$t = (k: string) => k;
  (globalThis as Record<string, unknown>).ElMessage = { success: vi.fn() };
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("components/SizeSelect/index.vue", () => {
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

  it("renders three size option items", async () => {
    const { el } = await mount();
    const items = el.querySelectorAll(".el-dropdown-item");
    expect(items.length).toBe(3);
  });

  it("renders i18n keys for size options", async () => {
    const { el } = await mount();
    const text = el.textContent;
    expect(text).toContain("sizeSelect.default");
    expect(text).toContain("sizeSelect.large");
    expect(text).toContain("sizeSelect.small");
  });

  it("dropdown item commands match SizeEnum values", async () => {
    const { el } = await mount();
    const commands = Array.from(el.querySelectorAll(".el-dropdown-item")).map(
      (item) => item.getAttribute("data-command")
    );
    expect(commands).toContain("default");
    expect(commands).toContain("large");
    expect(commands).toContain("small");
  });
});
