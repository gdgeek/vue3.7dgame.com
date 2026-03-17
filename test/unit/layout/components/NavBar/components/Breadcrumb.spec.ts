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

const mockPush = vi.fn();

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => mockRoute),
  useRouter: vi.fn(() => ({
    push: mockPush,
  })),
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
  afterEach(() => {
    mockRoute.path = "/dashboard";
    mockRoute.meta = { title: "dashboard" };
    mockRoute.query = {};
    mockPush.mockClear();
  });

  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders nav.breadcrumb-nav element", async () => {
    const { el } = await mount();
    expect(el.querySelector("nav.breadcrumb-nav")).not.toBeNull();
  });

  it("renders at least one .crumb-link item", async () => {
    const { el } = await mount();
    expect(el.querySelector(".crumb-link")).not.toBeNull();
  });

  it("renders breadcrumb text content from i18n key", async () => {
    const { el } = await mount();
    const crumb = el.querySelector(".crumb-link");
    expect(crumb).not.toBeNull();
    expect(crumb!.textContent).toContain("breadcrumb.workspace");
  });

  it("renders editor breadcrumb chain for /meta/script", async () => {
    mockRoute.meta = { title: "系统管理" };
    mockRoute.path = "/meta/script";
    mockRoute.query = { title: "测试实体" };
    const { el } = await mount();
    const crumbs = Array.from(el.querySelectorAll(".crumb-link")).map(
      (node) => node.textContent?.trim() || ""
    );
    expect(crumbs.length).toBeGreaterThanOrEqual(4);
    expect(crumbs).toContain("breadcrumb.workspace");
    expect(crumbs).toContain("sidebar.entity");
    expect(crumbs).toContain("测试实体");
  });

  it("handles unknown path — returns workspace breadcrumb key", async () => {
    mockRoute.meta = { title: "SomeTitle" };
    mockRoute.path = "/meta/editor";
    const { el } = await mount();
    const crumb = el.querySelector(".crumb-link");
    // i18n mock returns key, unknown path falls through to t("breadcrumb.workspace")
    expect(crumb!.textContent).toContain("breadcrumb.workspace");
  });

  it("navigates when clicking clickable breadcrumb item", async () => {
    mockRoute.path = "/meta/script";
    mockRoute.query = { title: "测试实体" };
    const { el } = await mount();
    const clickable = el.querySelector(".crumb-link.is-clickable");
    expect(clickable).not.toBeNull();
    clickable!.dispatchEvent(new MouseEvent("click"));
    expect(mockPush).toHaveBeenCalledTimes(1);
  });
});
