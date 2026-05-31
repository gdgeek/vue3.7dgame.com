/**
 * Tests for src/views/sso/index.vue
 * SSO callback handler: reads query params, refreshes token, redirects.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, nextTick } from "vue";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRouteQuery: Record<string, string> = {};
const mockLoadLanguageAsync = vi.fn().mockResolvedValue(undefined);
const mockGetUserInfo = vi.fn().mockResolvedValue(undefined);
const mockSetToken = vi.fn();
const mockRefresh = vi.fn().mockResolvedValue({ data: { token: "new-token" } });

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => ({ query: mockRouteQuery })),
  useRouter: vi.fn(() => ({ push: mockPush, replace: mockReplace })),
}));

vi.mock("@/store/modules/user", () => ({
  useUserStore: vi.fn(() => ({ getUserInfo: mockGetUserInfo })),
}));

vi.mock("@/api/v1/auth", () => ({
  refresh: mockRefresh,
}));

vi.mock("@/lang", () => ({
  default: {},
  loadLanguageAsync: mockLoadLanguageAsync,
}));

vi.mock("@/store/modules/token", () => ({
  default: { setToken: mockSetToken },
}));

vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn(), log: vi.fn() },
}));

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
  window.history.replaceState(null, "", "/sso");
  mockPush.mockClear();
  mockReplace.mockClear();
  mockLoadLanguageAsync.mockClear();
  mockGetUserInfo.mockClear();
  mockSetToken.mockClear();
  mockRefresh.mockReset();
  mockRefresh.mockResolvedValue({ data: { token: "new-token" } });
  // Reset query
  for (const k of Object.keys(mockRouteQuery)) delete mockRouteQuery[k];
});

async function mount() {
  const { default: SsoView } = await import("@/views/sso/index.vue");
  const el = document.createElement("div");
  const app = createApp(SsoView as Parameters<typeof createApp>[0]);
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el };
}

describe("views/sso/index.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders .sso-container element", async () => {
    const { el } = await mount();
    expect(el.querySelector(".sso-container")).not.toBeNull();
  });

  it("shows processing text", async () => {
    const { el } = await mount();
    expect(el.textContent).toContain("Processing login");
  });

  it("calls router.replace with /home/index when no redirect param", async () => {
    await mount();
    // Wait for onMounted to complete
    await nextTick();
    expect(mockReplace).toHaveBeenCalledWith("/home/index");
  });

  it("calls router.replace with custom redirect path when provided", async () => {
    mockRouteQuery.redirect = "/verse/index";
    await mount();
    await nextTick();
    expect(mockReplace).toHaveBeenCalledWith("/verse/index");
  });

  it("loads language when a supported lang param is provided", async () => {
    mockRouteQuery.lang = "en";
    await mount();
    await nextTick();
    expect(mockLoadLanguageAsync).toHaveBeenCalledWith("en-US");
  });

  it("ignores unsupported lang params", async () => {
    mockRouteQuery.lang = "javascript:alert(1)";
    await mount();
    await nextTick();
    expect(mockLoadLanguageAsync).not.toHaveBeenCalled();
  });

  it("reads refresh token from URL fragment and clears it from the address bar", async () => {
    window.history.replaceState(
      null,
      "",
      "/sso#refreshToken=fragment-token&lang=zh-TW"
    );

    await mount();
    await nextTick();

    const { refresh } = await import("@/api/v1/auth");
    expect(refresh).toHaveBeenCalledWith("fragment-token");
    expect(mockSetToken).toHaveBeenCalledWith("new-token");
    expect(window.location.hash).toBe("");
  });

  it("falls back to default redirect for external redirect params", async () => {
    mockRouteQuery.redirect = "https://evil.example";
    await mount();
    await nextTick();
    expect(mockReplace).toHaveBeenCalledWith("/home/index");
  });

  it("stops redirect flow when refresh fails", async () => {
    mockRouteQuery.refreshToken = "bad-token";
    mockRouteQuery.redirect = "/verse/index";
    mockRefresh.mockRejectedValueOnce(new Error("invalid refresh token"));

    await mount();
    await nextTick();

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/login");
    expect(mockReplace).not.toHaveBeenCalledWith("/verse/index");
    expect(mockLoadLanguageAsync).not.toHaveBeenCalled();
  });
});
