/**
 * Tests for src/layout/components/NavBar/index.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent, nextTick } from "vue";

const mockToggleSidebar = vi.fn();
const mockAppStore = {
  sidebar: { opened: true },
  toggleSidebar: mockToggleSidebar,
};

vi.mock("@/store", () => ({
  useAppStore: vi.fn(() => mockAppStore),
}));

vi.mock("@/layout/components/NavBar/components/Breadcrumb.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "Breadcrumb",
      template: '<div class="breadcrumb-stub"></div>',
    }),
  };
});

vi.mock("@/layout/components/NavBar/components/HeaderActions.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "HeaderActions",
      template: '<div class="header-actions-stub"></div>',
    }),
  };
});

vi.mock("@/layout/components/NavBar/components/UserDropdown.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "UserDropdown",
      template: '<div class="user-dropdown-stub"></div>',
    }),
  };
});

vi.mock("@/components/Hamburger/index.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "Hamburger",
      props: ["isActive"],
      emits: ["toggle-click"],
      template:
        '<button class="hamburger-stub" @click="$emit(\'toggle-click\')"></button>',
    }),
  };
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
  mockToggleSidebar.mockClear();
});

async function mount() {
  const { default: NavBar } = await import(
    "@/layout/components/NavBar/index.vue"
  );
  const el = document.createElement("div");
  const app = createApp(NavBar as Parameters<typeof createApp>[0]);
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el };
}

describe("layout/components/NavBar/index.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders header.navbar-container element", async () => {
    const { el } = await mount();
    expect(el.querySelector("header.navbar-container")).not.toBeNull();
  });

  it("renders Hamburger stub", async () => {
    const { el } = await mount();
    expect(el.querySelector(".hamburger-stub")).not.toBeNull();
  });

  it("renders Breadcrumb stub", async () => {
    const { el } = await mount();
    expect(el.querySelector(".breadcrumb-stub")).not.toBeNull();
  });

  it("renders HeaderActions stub", async () => {
    const { el } = await mount();
    expect(el.querySelector(".header-actions-stub")).not.toBeNull();
  });

  it("clicking hamburger calls appStore.toggleSidebar", async () => {
    const { el } = await mount();
    const hamburger = el.querySelector<HTMLButtonElement>(".hamburger-stub");
    hamburger?.click();
    await nextTick();
    expect(mockToggleSidebar).toHaveBeenCalledTimes(1);
  });
});
