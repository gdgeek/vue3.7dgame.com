import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  reactive,
} from "vue";

const mockRoute = reactive({
  fullPath:
    "/resource/polygen/index?lang=zh-CN&theme=edu-friendly&resourceId=5391&open=1",
  path: "/resource/polygen/index",
  params: {} as Record<string, string>,
  meta: {} as Record<string, unknown>,
});

const probeStats = {
  mounted: 0,
  unmounted: 0,
};

const ProbePage = defineComponent({
  name: "ProbePage",
  setup() {
    onMounted(() => {
      probeStats.mounted += 1;
    });
    onUnmounted(() => {
      probeStats.unmounted += 1;
    });
    return () => h("div", { class: "probe-page" }, "probe");
  },
});

const RouterViewStub = defineComponent({
  name: "RouterView",
  setup(_props, { slots }) {
    return () =>
      slots.default?.({
        Component: ProbePage,
        route: mockRoute,
      });
  },
});

const TransitionStub = defineComponent({
  name: "Transition",
  setup(_props, { slots }) {
    return () => slots.default?.();
  },
});

const mockUpdateAbility = vi.fn();
const mockUpdateRoutes = vi.fn();
const mockFetchDomainInfo = vi.fn(async () => {});
const mockGetUserInfo = vi.fn(async () => {});
const mockDisposeKTX2Loader = vi.fn();

vi.mock("@/utils/ability", () => ({
  UpdateAbility: mockUpdateAbility,
}));

vi.mock("@casl/vue", () => ({
  useAbility: () => ({}),
}));

vi.mock("element-plus", () => ({
  ElConfigProvider: {
    name: "ElConfigProvider",
    template: "<div class='el-config-provider-stub'><slot /></div>",
  },
}));

vi.mock("element-plus/es/locale/lang/en", () => ({ default: {} }));
vi.mock("element-plus/es/locale/lang/ja", () => ({ default: {} }));
vi.mock("element-plus/es/locale/lang/th", () => ({ default: {} }));
vi.mock("element-plus/es/locale/lang/zh-cn", () => ({ default: {} }));
vi.mock("element-plus/es/locale/lang/zh-tw", () => ({ default: {} }));

vi.mock("@/store/modules/app", () => ({
  useAppStore: () => ({
    language: "zh-CN",
  }),
}));

vi.mock("@/store/modules/user", () => ({
  useUserStore: () => ({
    userInfo: null,
    getUserInfo: mockGetUserInfo,
  }),
}));

vi.mock("@/store/modules/domain", () => ({
  useDomainStore: () => ({
    fetchDomainInfo: mockFetchDomainInfo,
  }),
}));

vi.mock("@/router", () => ({
  UpdateRoutes: mockUpdateRoutes,
}));

vi.mock("@/store/modules/token", () => ({
  default: {
    getToken: () => false,
  },
}));

vi.mock("@/lib/three/loaders", () => ({
  disposeKTX2Loader: mockDisposeKTX2Loader,
}));

describe("App.vue route transition key", () => {
  const cleanups: Array<() => void> = [];

  beforeEach(() => {
    vi.stubGlobal("__APP_VERSION__", "test-version");
    probeStats.mounted = 0;
    probeStats.unmounted = 0;
    mockUpdateAbility.mockReset();
    mockUpdateRoutes.mockReset();
    mockFetchDomainInfo.mockClear();
    mockGetUserInfo.mockClear();
    mockDisposeKTX2Loader.mockReset();
    mockRoute.fullPath =
      "/resource/polygen/index?lang=zh-CN&theme=edu-friendly&resourceId=5391&open=1";
    mockRoute.path = "/resource/polygen/index";
    mockRoute.params = {};
    mockRoute.meta = {};
  });

  afterEach(() => {
    cleanups.splice(0).reverse().forEach((fn) => fn());
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function mountApp() {
    const { default: App } = await import("@/App.vue");
    const el = document.createElement("div");
    document.body.appendChild(el);

    const app = createApp(App);
    app.component("RouterView", RouterViewStub);
    app.component("Transition", TransitionStub);
    app.mount(el);

    cleanups.push(() => {
      app.unmount();
      el.remove();
    });

    await nextTick();
    await nextTick();
  }

  it("does not remount opted-in pages when only the query string changes", async () => {
    mockRoute.meta = {
      preserveComponentOnQueryChange: true,
    };

    await mountApp();

    expect(probeStats.mounted).toBe(1);

    mockRoute.fullPath =
      "/resource/polygen/index?lang=zh-CN&theme=edu-friendly";
    await nextTick();
    await nextTick();

    expect(probeStats.mounted).toBe(1);
    expect(probeStats.unmounted).toBe(0);
  });

  it("still remounts normal pages when the query string changes", async () => {
    await mountApp();

    expect(probeStats.mounted).toBe(1);

    mockRoute.fullPath =
      "/resource/polygen/index?lang=zh-CN&theme=edu-friendly";
    await nextTick();
    await nextTick();

    expect(probeStats.mounted).toBe(2);
    expect(probeStats.unmounted).toBe(1);
  });
});
