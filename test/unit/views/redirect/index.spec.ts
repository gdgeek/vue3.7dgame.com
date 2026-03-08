import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp, defineComponent, type App } from "vue";

// ─── Mock vue-router ──────────────────────────────────────────────────────────
const mockReplace = vi.fn();
const mockRoute = {
  params: { path: "dashboard" },
  query: { from: "login" },
};

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => mockRoute),
  useRouter: vi.fn(() => ({ replace: mockReplace })),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.clearAllMocks();
});

async function mountRedirect(): Promise<{ el: HTMLElement; app: App }> {
  const { default: RedirectView } = await import(
    "@/views/redirect/index.vue"
  );
  const el = document.createElement("div");
  const app = createApp(RedirectView as Parameters<typeof createApp>[0]);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el, app };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("views/redirect/index.vue", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockRoute.params = { path: "dashboard" };
    mockRoute.query = { from: "login" };
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("mounts without throwing", async () => {
    await expect(mountRedirect()).resolves.toBeDefined();
  });

  it("calls router.replace on mount", async () => {
    await mountRedirect();
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it("calls router.replace with path prefixed by /", async () => {
    await mountRedirect();
    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/dashboard" })
    );
  });

  it("passes the original query to router.replace", async () => {
    await mountRedirect();
    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({ query: { from: "login" } })
    );
  });

  it("renders an empty div", async () => {
    const { el } = await mountRedirect();
    // The template is just <div></div>
    expect(el.querySelector("div")).not.toBeNull();
  });

  it("handles nested path segment correctly", async () => {
    mockRoute.params = { path: "settings/user" };
    mockRoute.query = {};
    await mountRedirect();
    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/settings/user" })
    );
  });
});
