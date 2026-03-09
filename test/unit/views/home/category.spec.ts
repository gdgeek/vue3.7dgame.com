import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent, nextTick, type App } from "vue";

// ─── Mock vue-router ──────────────────────────────────────────────────────────
const mockRoute = { query: { id: "7" } };

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => mockRoute),
  useRouter: vi.fn(() => ({ replace: vi.fn() })),
}));

// ─── Mock DocumentList child component ────────────────────────────────────────
vi.mock("@/components/Home/DocumentList.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    __esModule: true,
    default: dc({
      name: "DocumentList",
      props: ["categoryId"],
      template:
        '<div data-testid="document-list-stub" :data-category-id="categoryId"></div>',
    }),
  };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

async function mountCategoryPage(): Promise<{ el: HTMLElement; app: App }> {
  const { default: CategoryPage } = await import("@/views/home/category.vue");
  const el = document.createElement("div");
  const app = createApp(CategoryPage as Parameters<typeof createApp>[0]);
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el, app };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("views/home/category.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mountCategoryPage()).resolves.toBeDefined();
  });

  it("renders .category-page container", async () => {
    const { el } = await mountCategoryPage();
    expect(el.querySelector(".category-page")).not.toBeNull();
  });

  it("renders the DocumentList stub", async () => {
    const { el } = await mountCategoryPage();
    expect(
      el.querySelector('[data-testid="document-list-stub"]')
    ).not.toBeNull();
  });

  it("passes parsed categoryId to DocumentList", async () => {
    mockRoute.query = { id: "7" };
    const { el } = await mountCategoryPage();
    const stub = el.querySelector(
      '[data-testid="document-list-stub"]'
    ) as HTMLElement;
    expect(stub?.dataset.categoryId).toBe("7");
  });

  it("handles numeric id from route query", async () => {
    mockRoute.query = { id: "99" };
    const { el } = await mountCategoryPage();
    const stub = el.querySelector(
      '[data-testid="document-list-stub"]'
    ) as HTMLElement;
    expect(stub?.dataset.categoryId).toBe("99");
  });
});
