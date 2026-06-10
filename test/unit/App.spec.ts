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
const mockLoggerWarn = vi.fn();
const mockLoggerError = vi.fn();
const mockAuthClient = {
  clearToken: vi.fn(),
  getAccessToken: vi.fn(() => null),
  getTokenInfo: vi.fn(() => null),
  refresh: vi.fn(async () => ({})),
};

vi.mock("@/utils/ability", () => ({
  UpdateAbility: mockUpdateAbility,
}));

vi.mock("@/utils/logger", () => ({
  logger: {
    error: mockLoggerError,
    warn: mockLoggerWarn,
  },
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

vi.mock("@/services/auth/authClient", () => ({
  default: mockAuthClient,
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
    mockLoggerWarn.mockReset();
    mockLoggerError.mockReset();
    mockAuthClient.clearToken.mockReset();
    mockAuthClient.getAccessToken.mockReset();
    mockAuthClient.getAccessToken.mockReturnValue(null);
    mockAuthClient.getTokenInfo.mockReset();
    mockAuthClient.getTokenInfo.mockReturnValue(null);
    mockAuthClient.refresh.mockReset();
    mockAuthClient.refresh.mockResolvedValue({});
    mockRoute.fullPath =
      "/resource/polygen/index?lang=zh-CN&theme=edu-friendly&resourceId=5391&open=1";
    mockRoute.path = "/resource/polygen/index";
    mockRoute.params = {};
    mockRoute.meta = {};
  });

  afterEach(() => {
    cleanups
      .splice(0)
      .reverse()
      .forEach((fn) => fn());
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function flushAll() {
    await nextTick();
    await Promise.resolve();
    await Promise.resolve();
    await nextTick();
  }

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

    await flushAll();
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

  it("does not request user info when startup has no access token", async () => {
    await mountApp();

    expect(mockFetchDomainInfo).toHaveBeenCalledTimes(1);
    expect(mockGetUserInfo).not.toHaveBeenCalled();
    expect(mockAuthClient.refresh).not.toHaveBeenCalled();
  });

  it("refreshes an expired access token before requesting user info", async () => {
    mockAuthClient.getAccessToken.mockReturnValue("access-token");
    mockAuthClient.getTokenInfo.mockReturnValue({
      accessToken: "access-token",
      expires: "2000-01-01T00:00:00.000Z",
      refreshToken: "refresh-token",
      token: "access-token",
    });

    await mountApp();

    expect(mockAuthClient.refresh).toHaveBeenCalledTimes(1);
    expect(mockGetUserInfo).toHaveBeenCalledTimes(1);
  });

  it("clears stale auth when startup user info is unauthorized", async () => {
    mockAuthClient.getAccessToken.mockReturnValue("access-token");
    mockAuthClient.getTokenInfo.mockReturnValue({
      accessToken: "access-token",
      expires: "2999-01-01T00:00:00.000Z",
      refreshToken: "refresh-token",
      token: "access-token",
    });
    mockGetUserInfo.mockRejectedValueOnce({
      response: { status: 401 },
    });

    await mountApp();

    expect(mockAuthClient.clearToken).toHaveBeenCalledWith("unauthorized");
    expect(mockLoggerError).not.toHaveBeenCalledWith(
      "Failed to bootstrap user info:",
      expect.anything()
    );
  });
});
