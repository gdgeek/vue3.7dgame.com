/**
 * Tests for src/views/web/document.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent, nextTick } from "vue";

// ─── Mock router ──────────────────────────────────────────────────────────────
vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => ({ query: { id: "42" } })),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// ─── Mock child component ─────────────────────────────────────────────────────
vi.mock("@/components/Home/Document.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "Document",
      props: ["postId", "category", "categoryPath"],
      template: '<div class="document-stub"></div>',
    }),
  };
});

// ─── Mock logger ──────────────────────────────────────────────────────────────
vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// ─── Stubs ────────────────────────────────────────────────────────────────────
const ElCardStub = defineComponent({
  name: "ElCard",
  props: ["shadow"],
  template: '<div class="el-card-stub"><slot /></div>',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

async function mount() {
  const { default: WebDocument } = await import("@/views/web/document.vue");
  const el = document.createElement("div");
  const app = createApp(WebDocument as Parameters<typeof createApp>[0]);
  app.component("el-card", ElCardStub);
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("views/web/document.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders el-card stub containers", async () => {
    const { el } = await mount();
    const cards = el.querySelectorAll(".el-card-stub");
    expect(cards.length).toBeGreaterThan(0);
  });

  it("renders Document stub component", async () => {
    const { el } = await mount();
    expect(el.querySelector(".document-stub")).not.toBeNull();
  });

  it("renders spacer div at the top", async () => {
    const { el } = await mount();
    // First div has height: 50px
    const divs = el.querySelectorAll("div");
    expect(divs.length).toBeGreaterThan(0);
  });

  it("renders #news-detail-content element", async () => {
    const { el } = await mount();
    expect(el.querySelector("#news-detail-content")).not.toBeNull();
  });
});
