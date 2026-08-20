/**
 * @vitest-environment-options {"url":"https://d.dev.xrugc.com/"}
 *
 * Tests for src/views/home/index.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, nextTick } from "vue";
import type { PropType } from "vue";
import { createRouter, createWebHistory, type Router } from "vue-router";

const requestMock = vi.hoisted(() => vi.fn());

vi.mock("@/utils/request", () => ({
  default: requestMock,
}));

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
  window.history.replaceState(null, "", "/");
  vi.clearAllMocks();
  vi.resetModules();
});

async function mount(
  props: Record<string, unknown> = {},
  activeRouter?: Router
) {
  const { default: HomePage } = await import("@/views/home/index.vue");
  const el = document.createElement("div");
  const app = createApp(HomePage as Parameters<typeof createApp>[0], props);
  if (activeRouter) {
    app.use(activeRouter);
  }
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

  it("consumes the approved query before dispatch and does not replay after remount", async () => {
    requestMock.mockRejectedValue({
      response: {
        status: 403,
        headers: {
          "x-identity-iam-authz-probe-evidence":
            "v1;binding=match;configured=legacy;rollout=off;source=legacy;decision=deny;reason=legacy_mode;selected=0;fallback=0;failClosed=0;severity=none;classification=not_compared;permissionUnion=0",
        },
      },
    });
    window.history.replaceState(
      null,
      "",
      "/home/index?lang=zh-CN&iamAuthzProbe=wp3-subject-binding-v1&theme=modern-blue"
    );
    const router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: "/home/index", component: { template: "<div />" } },
        { path: "/away", component: { template: "<div />" } },
      ],
    });
    await router.replace(
      `${window.location.pathname}${window.location.search}`
    );

    const first = await mount({}, router);
    await vi.waitFor(() => expect(requestMock).toHaveBeenCalledTimes(1));
    await nextTick();

    expect(window.location.search).toBe("?lang=zh-CN&theme=modern-blue");
    expect(
      first.el.querySelector("#iam-authz-subject-binding-probe")?.textContent
    ).toBe("completed");

    await router.push("/away");
    router.back();
    await vi.waitFor(() => {
      expect(router.currentRoute.value.path).toBe("/home/index");
      expect(router.currentRoute.value.query.iamAuthzProbe).toBeUndefined();
    });

    await mount({}, router);
    await nextTick();
    expect(requestMock).toHaveBeenCalledTimes(1);
  });
});
