/**
 * Tests for src/views/sso/index.vue
 * SSO callback handler: reads query params, refreshes token, redirects.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, nextTick } from "vue";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRouteQuery: Record<string, string> = {};
const mockChangeLanguage = vi.fn();
const mockGetUserInfo = vi.fn().mockResolvedValue(undefined);
const mockSetToken = vi.fn();

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => ({ query: mockRouteQuery })),
  useRouter: vi.fn(() => ({ push: mockPush, replace: mockReplace })),
}));

vi.mock("@/store/modules/app", () => ({
  useAppStore: vi.fn(() => ({ changeLanguage: mockChangeLanguage })),
}));

vi.mock("@/store/modules/user", () => ({
  useUserStore: vi.fn(() => ({ getUserInfo: mockGetUserInfo })),
}));

vi.mock("@/api/v1/auth", () => ({
  refresh: vi.fn().mockResolvedValue({ data: { token: "new-token" } }),
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
  mockReplace.mockClear();
  mockChangeLanguage.mockClear();
  mockSetToken.mockClear();
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

  it("calls changeLanguage when lang param is provided", async () => {
    mockRouteQuery.lang = "en";
    await mount();
    await nextTick();
    expect(mockChangeLanguage).toHaveBeenCalledWith("en");
  });
});
