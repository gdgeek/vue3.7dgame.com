import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent, nextTick, type App } from "vue";

// ─── Mock vue-router ──────────────────────────────────────────────────────────
const mockRoute = { query: { id: "42" } };

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => mockRoute),
  useRouter: vi.fn(() => ({ replace: vi.fn() })),
}));

// ─── Mock Document child component ────────────────────────────────────────────
vi.mock("@/components/Home/Document.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    __esModule: true,
    default: dc({
      name: "Document",
      props: ["postId", "category"],
      template:
        '<div data-testid="document-stub" :data-post-id="postId" :data-category="String(category)"></div>',
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

async function mountDocumentPage(): Promise<{ el: HTMLElement; app: App }> {
  const { default: DocumentPage } = await import("@/views/home/document.vue");
  const el = document.createElement("div");
  const app = createApp(DocumentPage as Parameters<typeof createApp>[0]);
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el, app };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("views/home/document.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mountDocumentPage()).resolves.toBeDefined();
  });

  it("renders .document-page container", async () => {
    const { el } = await mountDocumentPage();
    expect(el.querySelector(".document-page")).not.toBeNull();
  });

  it("renders the Document stub", async () => {
    const { el } = await mountDocumentPage();
    expect(el.querySelector('[data-testid="document-stub"]')).not.toBeNull();
  });

  it("passes parsed postId to Document component", async () => {
    mockRoute.query = { id: "42" };
    const { el } = await mountDocumentPage();
    const stub = el.querySelector(
      '[data-testid="document-stub"]'
    ) as HTMLElement;
    expect(stub?.dataset.postId).toBe("42");
  });

  it("passes category=true to Document component", async () => {
    const { el } = await mountDocumentPage();
    const stub = el.querySelector(
      '[data-testid="document-stub"]'
    ) as HTMLElement;
    expect(stub?.dataset.category).toBe("true");
  });
});
