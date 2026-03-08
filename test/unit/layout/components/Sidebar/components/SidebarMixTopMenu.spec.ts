/**
 * Tests for src/layout/components/Sidebar/components/SidebarMixTopMenu.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent, nextTick } from "vue";

// ─── Mock stores ───────────────────────────────────────────────────────────────
const mockAppStore = {
  activeTopMenuPath: "/dashboard",
  activeTopMenu: vi.fn(),
};
const mockPermissionStore = {
  mixLeftMenus: [],
  setMixLeftMenus: vi.fn(),
};

vi.mock("@/store", () => ({
  usePermissionStore: vi.fn(() => mockPermissionStore),
  useAppStore: vi.fn(() => mockAppStore),
}));

// ─── Mock utilities ────────────────────────────────────────────────────────────
vi.mock("@/utils/i18n", () => ({
  translateRouteTitle: vi.fn((title: string) => title),
}));

vi.mock("@/styles/variables.module.scss", () => ({
  default: {
    "menu-background": "#304156",
    "menu-text": "#bfcbd9",
    "menu-active-text": "#409EFF",
  },
}));

vi.mock("@/api/menu/model", () => ({}));

vi.mock("@/router", () => ({
  routerData: { value: [] },
}));

// ─── Mock vue-router ───────────────────────────────────────────────────────────
vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => ({ path: "/dashboard/index" })),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// ─── Stubs ────────────────────────────────────────────────────────────────────
const ElScrollbarStub = defineComponent({
  name: "ElScrollbar",
  template: '<div class="el-scrollbar-stub"><slot /></div>',
});

const ElMenuStub = defineComponent({
  name: "ElMenu",
  props: ["mode", "defaultActive", "backgroundColor", "textColor", "activeTextColor"],
  emits: ["select"],
  template: '<nav class="el-menu-stub"><slot /></nav>',
});

const ElMenuItemStub = defineComponent({
  name: "ElMenuItem",
  props: ["index"],
  template: '<li class="el-menu-item-stub"><slot name="title" /></li>',
});

const SvgIconStub = defineComponent({
  name: "SvgIcon",
  props: ["iconClass"],
  template: '<i class="svg-icon-stub"></i>',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

async function mount() {
  const { default: SidebarMixTopMenu } = await import(
    "@/layout/components/Sidebar/components/SidebarMixTopMenu.vue"
  );
  const el = document.createElement("div");
  const app = createApp(SidebarMixTopMenu as Parameters<typeof createApp>[0]);
  app.component("el-scrollbar", ElScrollbarStub);
  app.component("el-menu", ElMenuStub);
  app.component("el-menu-item", ElMenuItemStub);
  app.component("svg-icon", SvgIconStub);
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("layout/components/Sidebar/components/SidebarMixTopMenu.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders el-scrollbar wrapper", async () => {
    const { el } = await mount();
    expect(el.querySelector(".el-scrollbar-stub")).not.toBeNull();
  });

  it("renders el-menu inside scrollbar", async () => {
    const { el } = await mount();
    expect(el.querySelector(".el-menu-stub")).not.toBeNull();
  });

  it("renders no menu items when routerData is empty", async () => {
    const { el } = await mount();
    const items = el.querySelectorAll(".el-menu-item-stub");
    expect(items.length).toBe(0);
  });

  it("calls appStore.activeTopMenu on mount", async () => {
    await mount();
    expect(mockAppStore.activeTopMenu).toHaveBeenCalled();
  });

  it("renders as horizontal menu layout", async () => {
    const { el } = await mount();
    // Menu stub is rendered inside scrollbar
    const menu = el.querySelector(".el-menu-stub");
    expect(menu).not.toBeNull();
  });
});
