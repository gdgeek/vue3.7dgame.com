/**
 * Tests for src/views/web/components/News/IntroduceCategory.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent, nextTick } from "vue";

const mockRoute = { query: { id: "7" } };
vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => mockRoute),
  useRouter: vi.fn(() => ({ back: vi.fn() })),
}));

vi.mock("@/utils/logger", () => ({ logger: { error: vi.fn(), log: vi.fn() } }));

vi.mock("@/components/Home/DocumentList.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "DocumentList",
      props: ["categoryId", "documentPath"],
      template:
        '<div class="doc-list-stub" :data-category-id="categoryId" :data-path="documentPath"></div>',
    }),
  };
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

// el-card stub
const ElCardStub = defineComponent({
  name: "ElCard",
  template: "<div class='el-card-stub'><slot /></div>",
});

async function mount() {
  const { default: IntroduceCategory } = await import(
    "@/views/web/components/News/IntroduceCategory.vue"
  );
  const el = document.createElement("div");
  const app = createApp(IntroduceCategory as Parameters<typeof createApp>[0]);
  app.component("ElCard", ElCardStub);
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el };
}

describe("views/web/components/News/IntroduceCategory.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders el-card wrapper", async () => {
    const { el } = await mount();
    expect(el.querySelector(".el-card-stub")).not.toBeNull();
  });

  it("renders DocumentList stub", async () => {
    const { el } = await mount();
    expect(el.querySelector(".doc-list-stub")).not.toBeNull();
  });

  it("passes parsed category id from route to DocumentList", async () => {
    mockRoute.query = { id: "7" };
    const { el } = await mount();
    const stub = el.querySelector(".doc-list-stub") as HTMLElement;
    expect(stub?.dataset.categoryId).toBe("7");
  });

  it("passes correct document-path to DocumentList", async () => {
    const { el } = await mount();
    const stub = el.querySelector(".doc-list-stub") as HTMLElement;
    expect(stub?.dataset.path).toBe("/web/news/document");
  });
});
