/**
 * Tests for src/views/web/category.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, nextTick } from "vue";

// ─── CSS mock ─────────────────────────────────────────────────────────────────
vi.mock("@/assets/font/font.css", () => ({}));

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockRoute = { query: {} };
const mockRouter = { beforeEach: vi.fn() };

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => mockRoute),
  useRouter: vi.fn(() => mockRouter),
}));

vi.mock("@/composables/useAOS", () => ({
  useAOS: vi.fn(),
}));

vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/utils/utilityFunctions", () => ({
  debounce: vi.fn((fn: unknown) => fn),
}));

vi.mock("@/views/web/components/News/index.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "News",
      props: ["activeTabName"],
      template: '<div class="news-stub" :data-tab="activeTabName"></div>',
    }),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
  mockRouter.beforeEach.mockClear();
});

async function mount() {
  const { default: CategoryView } = await import("@/views/web/category.vue");
  const el = document.createElement("div");
  const app = createApp(CategoryView as Parameters<typeof createApp>[0]);
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("views/web/category.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders a section with id=news", async () => {
    const { el } = await mount();
    expect(el.querySelector("section#news")).not.toBeNull();
  });

  it("renders News stub", async () => {
    const { el } = await mount();
    expect(el.querySelector(".news-stub")).not.toBeNull();
  });

  it("passes default section 'news' to News stub when no query", async () => {
    mockRoute.query = {};
    const { el } = await mount();
    const news = el.querySelector(".news-stub") as HTMLElement;
    expect(news?.dataset.tab).toBe("news");
  });

  it("passes section from route.query to News stub", async () => {
    mockRoute.query = { section: "document" };
    const { el } = await mount();
    const news = el.querySelector(".news-stub") as HTMLElement;
    expect(news?.dataset.tab).toBe("document");
  });

  it("adds scroll and resize listeners on mount", async () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    await mount();
    const calls = addSpy.mock.calls.map((c) => c[0]);
    expect(calls).toContain("resize");
    expect(calls).toContain("scroll");
    addSpy.mockRestore();
  });
});
