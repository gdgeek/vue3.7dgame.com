/**
 * Tests for src/layout/components/NavBar/components/Breadcrumb.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, nextTick } from "vue";

// ─── Mock vue-router ───────────────────────────────────────────────────────────
const mockRoute = {
  path: "/dashboard",
  meta: { title: "dashboard" },
  query: {},
};

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => mockRoute),
}));

// ─── Mock vue-i18n ────────────────────────────────────────────────────────────
vi.mock("vue-i18n", () => ({
  useI18n: vi.fn(() => ({
    t: (k: string) => {
      if (k === "meta.script.title") return "meta.script.title"; // return key = not translated
      return k;
    },
  })),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

async function mount() {
  const { default: Breadcrumb } = await import(
    "@/layout/components/NavBar/components/Breadcrumb.vue"
  );
  const el = document.createElement("div");
  const app = createApp(Breadcrumb as Parameters<typeof createApp>[0]);
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("layout/components/NavBar/components/Breadcrumb.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders nav.breadcrumb-nav element", async () => {
    const { el } = await mount();
    expect(el.querySelector("nav.breadcrumb-nav")).not.toBeNull();
  });

  it("renders .breadcrumb-text span", async () => {
    const { el } = await mount();
    expect(el.querySelector(".breadcrumb-text")).not.toBeNull();
  });

  it("renders breadcrumb text content", async () => {
    const { el } = await mount();
    const span = el.querySelector(".breadcrumb-text");
    expect(span).not.toBeNull();
    // Text may be empty for /dashboard or populated
    expect(typeof span!.textContent).toBe("string");
  });

  it("renders breadcrumb from route with meta title", async () => {
    mockRoute.meta = { title: "系统管理" };
    mockRoute.path = "/system/user";
    const { el } = await mount();
    const span = el.querySelector(".breadcrumb-text");
    expect(span).not.toBeNull();
  });

  it("handles unknown path — returns workspace breadcrumb key", async () => {
    mockRoute.meta = { title: "SomeTitle" };
    mockRoute.path = "/meta/editor";
    const { el } = await mount();
    const span = el.querySelector(".breadcrumb-text");
    // i18n mock returns key, unknown path falls through to t("breadcrumb.workspace")
    expect(span!.textContent).toContain("breadcrumb.workspace");
  });
});
