/**
 * Tests for src/layout/components/NavBar/index.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { computed, createApp, nextTick } from "vue";

const mockToggleSidebar = vi.fn();
const mockAppStore = {
  sidebar: { opened: true },
  toggleSidebar: mockToggleSidebar,
};

vi.mock("@/store", () => ({
  useAppStore: vi.fn(() => mockAppStore),
}));

vi.mock("@/composables/useIdentityDisplay", () => ({
  useIdentityDisplay: vi.fn(() =>
    computed(() => ({
      siteLabel: "Rokid AR Studio",
      organizations: [
        { id: 1, name: "north-campus", title: "North Campus" },
        { id: 2, name: "research-lab", title: "Research Lab" },
        { id: 3, name: "teachers-team", title: "Teachers Team" },
      ],
      visibleOrganizations: [
        { id: 1, name: "north-campus", title: "North Campus" },
        { id: 2, name: "research-lab", title: "Research Lab" },
      ],
      overflowCount: 1,
      hasOrganizations: true,
    }))
  ),
}));

vi.mock("vue-i18n", () => ({
  useI18n: vi.fn(() => ({
    t: (key: string) => key,
  })),
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

vi.mock("@/layout/components/NavBar/components/IdentityChips.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "IdentityChips",
      props: ["siteLabel", "visibleOrganizations", "overflowCount"],
      template:
        "<div class='identity-chips-stub' :data-site='siteLabel' :data-overflow='overflowCount'>{{ visibleOrganizations.map((organization) => organization.title).join('|') }}</div>",
    }),
  };
});

vi.mock(
  "@/layout/components/NavBar/components/EditorVersionToolbar.vue",
  async () => {
    const { defineComponent: dc } = await import("vue");
    return {
      default: dc({
        name: "EditorVersionToolbar",
        template: '<div class="editor-version-toolbar-stub"></div>',
      }),
    };
  }
);

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

  it("renders IdentityChips before the breadcrumb and passes site + organization summary", async () => {
    const { el } = await mount();
    const chips = el.querySelector(".identity-chips-stub") as HTMLDivElement;
    const navbarLeft = el.querySelector(".navbar-left") as HTMLDivElement;

    expect(chips).not.toBeNull();
    expect(chips.dataset.site).toBe("Rokid AR Studio");
    expect(chips.dataset.overflow).toBe("1");
    expect(chips.textContent).toContain("North Campus");
    expect(chips.textContent).toContain("Research Lab");

    const children = Array.from(navbarLeft.children).map((node) =>
      (node as HTMLElement).className || node.tagName.toLowerCase()
    );
    expect(children[1]).toContain("identity-chips-stub");
    expect(children[2]).toContain("breadcrumb-stub");
  });

  it("renders HeaderActions stub", async () => {
    const { el } = await mount();
    expect(el.querySelector(".header-actions-stub")).not.toBeNull();
  });

  it("renders EditorVersionToolbar stub", async () => {
    const { el } = await mount();
    expect(el.querySelector(".editor-version-toolbar-stub")).not.toBeNull();
  });

  it("clicking hamburger calls appStore.toggleSidebar", async () => {
    const { el } = await mount();
    const hamburger = el.querySelector<HTMLButtonElement>(".hamburger-stub");
    hamburger?.click();
    await nextTick();
    expect(mockToggleSidebar).toHaveBeenCalledTimes(1);
  });
});
