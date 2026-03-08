/**
 * Tests for src/layout/components/Sidebar/components/SidebarMenu.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent, nextTick } from "vue";

// ─── Mock stores ───────────────────────────────────────────────────────────────
vi.mock("@/store", () => ({
  useSettingsStore: vi.fn(() => ({ layout: "left" })),
  useAppStore: vi.fn(() => ({ sidebar: { opened: true } })),
}));

// ─── Mock utilities ────────────────────────────────────────────────────────────
vi.mock("@/utils/index", () => ({
  isExternal: vi.fn((path: string) => path.startsWith("http")),
}));

vi.mock("path-browserify", () => ({
  default: { resolve: vi.fn((...parts: string[]) => parts.join("/")) },
}));

vi.mock("@/styles/variables.module.scss", () => ({
  default: {
    "menu-background": "#304156",
    "menu-text": "#bfcbd9",
    "menu-active-text": "#409EFF",
  },
}));

vi.mock("@/enums/LayoutEnum", () => ({
  LayoutEnum: { TOP: "top", LEFT: "left" },
}));

// ─── Mock vue-router ───────────────────────────────────────────────────────────
vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => ({ path: "/dashboard" })),
}));

// ─── Stubs ────────────────────────────────────────────────────────────────────
const ElMenuStub = defineComponent({
  name: "ElMenu",
  props: [
    "defaultActive",
    "collapse",
    "backgroundColor",
    "textColor",
    "activeTextColor",
    "uniqueOpened",
    "collapseTransition",
    "mode",
  ],
  template: '<nav class="el-menu-stub" :data-mode="mode"><slot /></nav>',
});

const SidebarMenuItemStub = defineComponent({
  name: "SidebarMenuItem",
  props: ["item", "basePath"],
  template: '<li class="sidebar-menu-item-stub"></li>',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

async function mount(props: Record<string, unknown> = {}) {
  const { default: SidebarMenu } = await import(
    "@/layout/components/Sidebar/components/SidebarMenu.vue"
  );
  const el = document.createElement("div");
  const app = createApp(SidebarMenu as Parameters<typeof createApp>[0], {
    menuList: [],
    basePath: "/",
    ...props,
  });
  app.component("el-menu", ElMenuStub);
  app.component("SidebarMenuItem", SidebarMenuItemStub);
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("layout/components/Sidebar/components/SidebarMenu.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders el-menu stub", async () => {
    const { el } = await mount();
    expect(el.querySelector(".el-menu-stub")).not.toBeNull();
  });

  it("renders in vertical mode by default (layout=left)", async () => {
    const { el } = await mount();
    const menu = el.querySelector(".el-menu-stub");
    expect(menu?.getAttribute("data-mode")).toBe("vertical");
  });

  it("renders menu items for provided menuList", async () => {
    const { el } = await mount({
      menuList: [
        { path: "/dashboard", meta: { title: "Dashboard" } },
        { path: "/users", meta: { title: "Users" } },
      ],
      basePath: "/",
    });
    const items = el.querySelectorAll(".sidebar-menu-item-stub");
    expect(items.length).toBe(2);
  });

  it("renders no items for empty menuList", async () => {
    const { el } = await mount({ menuList: [], basePath: "/" });
    const items = el.querySelectorAll(".sidebar-menu-item-stub");
    expect(items.length).toBe(0);
  });
});
