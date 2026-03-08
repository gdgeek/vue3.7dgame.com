/**
 * Tests for src/layout/components/Sidebar/index.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent } from "vue";

const mockSettingsStore = { sidebarLogo: true, layout: "left" };
const mockAppStore = { sidebar: { opened: true } };

vi.mock("@/store", () => ({
  useSettingsStore: vi.fn(() => mockSettingsStore),
  useAppStore: vi.fn(() => mockAppStore),
}));

vi.mock("@/router", () => ({
  routerData: { value: [] },
}));

vi.mock("@/layout/components/Sidebar/SidebarLeft.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "SidebarLeft",
      props: ["collapsed"],
      template: '<div class="sidebar-left-stub" :data-collapsed="String(collapsed)"></div>',
    }),
  };
});

// Stubs for auto-imported components used in the template
const SidebarLogoStub = defineComponent({
  name: "SidebarLogo",
  props: ["collapse"],
  template: '<div class="sidebar-logo-stub"></div>',
});
const SidebarMixTopMenuStub = defineComponent({
  name: "SidebarMixTopMenu",
  template: '<div class="sidebar-mix-topmenu-stub"></div>',
});
const NavbarRightStub = defineComponent({
  name: "NavbarRight",
  template: '<div class="navbar-right-stub"></div>',
});
const SidebarMenuStub = defineComponent({
  name: "SidebarMenu",
  props: ["menuList", "basePath"],
  template: '<div class="sidebar-menu-stub"></div>',
});
const ElScrollbarStub = defineComponent({
  name: "ElScrollbar",
  template: "<div class='el-scrollbar-stub'><slot /></div>",
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

async function mount(storeOverride: Partial<typeof mockSettingsStore> = {}) {
  Object.assign(mockSettingsStore, storeOverride);
  const { default: Sidebar } = await import(
    "@/layout/components/Sidebar/index.vue"
  );
  const el = document.createElement("div");
  const app = createApp(Sidebar as Parameters<typeof createApp>[0]);
  app.component("SidebarLogo", SidebarLogoStub);
  app.component("SidebarMixTopMenu", SidebarMixTopMenuStub);
  app.component("NavbarRight", NavbarRightStub);
  app.component("SidebarMenu", SidebarMenuStub);
  app.component("el-scrollbar", ElScrollbarStub);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("layout/components/Sidebar/index.vue", () => {
  it("mounts without throwing (left layout)", async () => {
    await expect(mount({ layout: "left" })).resolves.toBeDefined();
  });

  it("renders SidebarLeft stub when layout is left", async () => {
    const { el } = await mount({ layout: "left" });
    expect(el.querySelector(".sidebar-left-stub")).not.toBeNull();
  });

  it("passes collapsed=false to SidebarLeft when sidebar is open", async () => {
    mockAppStore.sidebar.opened = true;
    const { el } = await mount({ layout: "left" });
    const stub = el.querySelector<HTMLElement>(".sidebar-left-stub");
    expect(stub?.dataset.collapsed).toBe("false");
  });

  it("mounts without throwing in mix layout", async () => {
    await expect(mount({ layout: "mix" })).resolves.toBeDefined();
  });

  it("renders SidebarMixTopMenu stub in mix layout", async () => {
    const { el } = await mount({ layout: "mix" });
    expect(el.querySelector(".sidebar-mix-topmenu-stub")).not.toBeNull();
  });

  it("renders SidebarMenu stub in top layout", async () => {
    const { el } = await mount({ layout: "top" });
    expect(el.querySelector(".sidebar-menu-stub")).not.toBeNull();
  });
});
