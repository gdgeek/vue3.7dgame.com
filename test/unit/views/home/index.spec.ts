/**
 * Tests for src/views/home/index.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, nextTick } from "vue";
import type { PropType } from "vue";

// ─── Mock stores ───────────────────────────────────────────────────────────────
vi.mock("@/store/modules/domain", () => ({
  useDomainStore: vi.fn(() => ({ title: "TestDomain" })),
}));

// ─── Mock environment ──────────────────────────────────────────────────────────
vi.mock("@/environment", () => ({
  default: { api: "https://api.test", local: () => false },
}));

// ─── Mock vue-i18n ────────────────────────────────────────────────────────────
vi.mock("vue-i18n", () => ({
  useI18n: vi.fn(() => ({ t: (k: string) => k })),
}));

// ─── Mock child components ────────────────────────────────────────────────────
vi.mock("@/components/Home/PlatformOverview.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "PlatformOverview",
      template: '<div class="platform-overview-stub"></div>',
    }),
  };
});
vi.mock("@/components/Home/LocalPage.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "LocalPage",
      template: '<div class="local-page-stub"></div>',
    }),
  };
});
vi.mock("@/components/Home/HomeHeader.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "HomeHeader",
      template: '<div class="home-header-stub"></div>',
    }),
  };
});
vi.mock("@/components/Home/QuickStart.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "QuickStart",
      template: '<div class="quick-start-stub"></div>',
    }),
  };
});
vi.mock("@/components/TransitionWrapper.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({ name: "TransitionWrapper", template: "<div><slot /></div>" }),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

async function mount(props: Record<string, unknown> = {}) {
  const { default: HomePage } = await import("@/views/home/index.vue");
  const el = document.createElement("div");
  const app = createApp(HomePage as Parameters<typeof createApp>[0], props);
  app.component("FontAwesomeIcon", {
    name: "FontAwesomeIcon",
    props: {
      icon: {
        type: [Array, String] as PropType<string | string[]>,
        default: "",
      },
    },
    template: '<i class="fa-stub"></i>',
  });
  app.component("ElDivider", {
    name: "ElDivider",
    template: '<div class="el-divider-stub"><slot /></div>',
  });
  app.component("ElSkeleton", {
    name: "ElSkeleton",
    template: '<div class="el-skeleton-stub"></div>',
  });
  app.component("ElButton", {
    name: "ElButton",
    template: '<button class="el-button-stub"><slot /></button>',
  });
  app.component("ElEmpty", {
    name: "ElEmpty",
    template: '<div class="el-empty-stub"><slot /></div>',
  });
  app.component("ElTabPane", {
    name: "ElTabPane",
    template: '<div class="el-tab-pane-stub"><slot /></div>',
  });
  app.component("ElTabs", {
    name: "ElTabs",
    template: '<div class="el-tabs-stub"><slot /></div>',
  });
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("views/home/index.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders .home-page container", async () => {
    const { el } = await mount();
    expect(el.querySelector(".home-page")).not.toBeNull();
  });

  it("renders HomeHeader stub", async () => {
    const { el } = await mount();
    expect(el.querySelector(".home-header-stub")).not.toBeNull();
  });

  it("renders section-header element", async () => {
    const { el } = await mount();
    expect(el.querySelector(".section-header")).not.toBeNull();
  });

  it("renders platform overview content", async () => {
    const { el } = await mount();
    expect(el.querySelector(".platform-overview-stub")).not.toBeNull();
  });
});
