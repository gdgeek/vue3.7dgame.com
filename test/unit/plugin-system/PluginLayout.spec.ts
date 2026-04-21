import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, nextTick, reactive, ref } from "vue";

const mockRoute = reactive({
  params: {
    pluginId: "ai-3d-generator-v3" as string | undefined,
  },
});

const mockActivatePlugin = vi.fn();
const mockDeactivatePlugin = vi.fn();
const mockInit = vi.fn();
const mockEnsurePluginAccess = vi.fn();
const mockBroadcastThemeChange = vi.fn();
const mockBroadcastLangChange = vi.fn();
const mockRouterPush = vi.fn();

const mockPlugins = new Map([
  [
    "ai-3d-generator-v3",
    {
      pluginId: "ai-3d-generator-v3",
      state: "unloaded",
      lastError: undefined as string | undefined,
    },
  ],
  [
    "plugin-b",
    {
      pluginId: "plugin-b",
      state: "unloaded",
      lastError: undefined as string | undefined,
    },
  ],
]);

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => mockRoute),
  useRouter: vi.fn(() => ({
    push: mockRouterPush,
  })),
}));

vi.mock("@/store/modules/plugin-system", () => ({
  usePluginSystemStore: vi.fn(() => ({
    init: mockInit,
    ensurePluginAccess: mockEnsurePluginAccess,
    activatePlugin: mockActivatePlugin,
    deactivatePlugin: mockDeactivatePlugin,
    plugins: mockPlugins,
  })),
}));

vi.mock("@/store/modules/app", () => ({
  useAppStoreHook: vi.fn(() => ({
    language: "zh-CN",
  })),
}));

vi.mock("@/composables/useTheme", () => ({
  useTheme: vi.fn(() => ({
    currentThemeName: ref("edu-friendly"),
  })),
}));

vi.mock("@/plugin-system", () => ({
  pluginSystem: {
    broadcastThemeChange: mockBroadcastThemeChange,
    broadcastLangChange: mockBroadcastLangChange,
  },
}));

const cleanups: Array<() => void> = [];

async function mountView() {
  const { default: PluginLayout } = await import(
    "@/plugin-system/views/PluginLayout.vue"
  );

  const el = document.createElement("div");
  document.body.appendChild(el);

  const app = createApp(PluginLayout);
  app.component("el-icon", {
    template: "<div><slot /></div>",
  });
  app.component("el-button", {
    emits: ["click"],
    template: "<button @click=\"$emit('click')\"><slot /></button>",
  });
  app.component("el-result", {
    props: ["title", "subTitle"],
    template: "<div>{{ title }}{{ subTitle }}<slot name='extra' /></div>",
  });
  app.component("el-empty", {
    template: "<div></div>",
  });
  app.mount(el);

  cleanups.push(() => {
    app.unmount();
    el.remove();
  });

  await nextTick();
  await Promise.resolve();

  return { app, el };
}

describe("plugin-system/views/PluginLayout.vue", () => {
  beforeEach(() => {
    mockRoute.params.pluginId = "ai-3d-generator-v3";
    mockInit.mockResolvedValue(undefined);
    mockEnsurePluginAccess.mockResolvedValue({
      status: "visible",
      accessScope: "admin-only",
    });
    mockActivatePlugin.mockImplementation(async (pluginId: string) => {
      const info = mockPlugins.get(pluginId);
      if (info) {
        info.state = "active";
        info.lastError = undefined;
      }
    });
    mockDeactivatePlugin.mockResolvedValue(undefined);
    mockBroadcastThemeChange.mockReset();
    mockBroadcastLangChange.mockReset();
    mockRouterPush.mockReset();
  });

  afterEach(() => {
    cleanups
      .splice(0)
      .reverse()
      .forEach((fn) => fn());
    mockInit.mockClear();
    mockEnsurePluginAccess.mockClear();
    mockActivatePlugin.mockClear();
    mockDeactivatePlugin.mockClear();
    mockPlugins.get("ai-3d-generator-v3")!.state = "unloaded";
    mockPlugins.get("ai-3d-generator-v3")!.lastError = undefined;
    mockPlugins.get("plugin-b")!.state = "unloaded";
    mockPlugins.get("plugin-b")!.lastError = undefined;
  });

  it("activates the plugin for the current route", async () => {
    const { el } = await mountView();

    expect(mockInit).toHaveBeenCalledOnce();
    expect(mockEnsurePluginAccess).toHaveBeenCalledWith(
      "ai-3d-generator-v3",
      {}
    );
    expect(mockActivatePlugin).toHaveBeenCalledOnce();
    expect(mockActivatePlugin).toHaveBeenCalledWith(
      "ai-3d-generator-v3",
      expect.any(HTMLDivElement),
      expect.objectContaining({
        lang: "zh-CN",
        theme: "edu-friendly",
      })
    );
    expect(el.querySelector(".plugin-page__iframe")).not.toBeNull();
  });

  it("checks plugin access before activation", async () => {
    mockEnsurePluginAccess.mockResolvedValue({
      status: "visible",
      accessScope: "admin-only",
    });

    await mountView();

    expect(mockEnsurePluginAccess).toHaveBeenCalledWith(
      "ai-3d-generator-v3",
      {}
    );
    expect(mockActivatePlugin).toHaveBeenCalledOnce();
  });

  it("does not activate forbidden plugins", async () => {
    mockEnsurePluginAccess.mockResolvedValue({
      status: "forbidden",
      accessScope: "root-only",
    });

    const { el } = await mountView();

    expect(mockActivatePlugin).not.toHaveBeenCalled();
    expect(el.textContent).toContain("无权限访问插件");
  });

  it("does not replace host-expiry handling with local plugin error text on 401", async () => {
    mockEnsurePluginAccess.mockRejectedValueOnce({
      response: { status: 401 },
      message: "host expired",
    });

    const { el } = await mountView();

    expect(mockActivatePlugin).not.toHaveBeenCalled();
    expect(el.textContent).not.toContain("加载插件失败");
    expect(el.textContent).not.toContain("host expired");
  });

  it("retries degraded access by checking access again before activation", async () => {
    mockEnsurePluginAccess
      .mockResolvedValueOnce({
        status: "degraded",
        accessScope: "admin-only",
      })
      .mockResolvedValueOnce({
        status: "visible",
        accessScope: "admin-only",
      });

    const { el } = await mountView();

    expect(mockActivatePlugin).not.toHaveBeenCalled();
    expect(el.textContent).toContain("插件暂时不可用，请稍后重试");

    const retryButton = el.querySelector("button") as HTMLButtonElement;
    retryButton.click();
    await nextTick();
    await Promise.resolve();
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    await Promise.resolve();

    expect(mockEnsurePluginAccess).toHaveBeenCalledTimes(2);
    expect(mockActivatePlugin).toHaveBeenCalledOnce();
  });

  it("does not activate a stale plugin after switching routes", async () => {
    const staleAccess = createDeferred<{
      status: "visible";
      accessScope: "admin-only";
    }>();
    mockEnsurePluginAccess.mockImplementation((id: string) => {
      if (id === "ai-3d-generator-v3") {
        return staleAccess.promise;
      }
      return Promise.resolve({
        status: "visible" as const,
        accessScope: "admin-only" as const,
      });
    });

    await mountView();

    mockRoute.params.pluginId = "plugin-b";
    await nextTick();
    await Promise.resolve();
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    await Promise.resolve();

    staleAccess.resolve({
      status: "visible",
      accessScope: "admin-only",
    });
    await Promise.resolve();
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    await Promise.resolve();

    expect(mockActivatePlugin).toHaveBeenCalledTimes(1);
    expect(mockActivatePlugin).toHaveBeenCalledWith(
      "plugin-b",
      expect.any(HTMLDivElement),
      expect.objectContaining({
        lang: "zh-CN",
        theme: "edu-friendly",
      })
    );
  });

  it("does not activate the plugin when retry access becomes forbidden", async () => {
    mockEnsurePluginAccess
      .mockResolvedValueOnce({
        status: "degraded",
        accessScope: "admin-only",
      })
      .mockResolvedValueOnce({
        status: "forbidden",
        accessScope: "root-only",
      });

    const { el } = await mountView();

    const retryButton = el.querySelector("button") as HTMLButtonElement;
    retryButton.click();
    await nextTick();
    await Promise.resolve();
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    await Promise.resolve();

    expect(mockActivatePlugin).not.toHaveBeenCalled();
    expect(el.textContent).toContain("无权限访问插件");
  });

  it("deactivates the last mounted plugin even if the route param is already cleared", async () => {
    const { app } = await mountView();

    mockDeactivatePlugin.mockClear();

    mockRoute.params.pluginId = undefined;
    app.unmount();

    expect(mockDeactivatePlugin).toHaveBeenCalledWith("ai-3d-generator-v3");
  });

  it("routes host navigation events from the active plugin iframe", async () => {
    const { el } = await mountView();

    const container = el.querySelector(
      ".plugin-page__iframe"
    ) as HTMLDivElement;
    const iframe = document.createElement("iframe");
    const iframeWindow = { postMessage: vi.fn() };
    Object.defineProperty(iframe, "contentWindow", {
      value: iframeWindow,
      configurable: true,
    });
    iframe.src = "http://localhost:3101/?lang=zh-CN&theme=edu-friendly";
    container.appendChild(iframe);

    window.dispatchEvent(
      new MessageEvent("message", {
        source: iframeWindow as unknown as MessageEventSource,
        origin: "http://localhost:3101",
        data: {
          type: "EVENT",
          id: "event-1",
          payload: {
            event: "navigate-host",
            path: "/resource/polygen/index",
            query: {
              lang: "zh-CN",
              theme: "edu-friendly",
              resourceId: "5391",
              open: "1",
            },
          },
        },
      })
    );

    await nextTick();

    expect(mockRouterPush).toHaveBeenCalledWith({
      path: "/resource/polygen/index",
      query: {
        lang: "zh-CN",
        theme: "edu-friendly",
        resourceId: "5391",
        open: "1",
      },
    });
  });
});
