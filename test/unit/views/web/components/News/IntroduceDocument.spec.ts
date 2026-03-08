/**
 * Tests for src/views/web/components/News/IntroduceDocument.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent, nextTick } from "vue";

const mockBack = vi.fn();
const mockRoute = { query: { id: "15" } };

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => mockRoute),
  useRouter: vi.fn(() => ({ back: mockBack })),
}));

vi.mock("@/utils/logger", () => ({ logger: { error: vi.fn(), log: vi.fn() } }));

vi.mock("@/components/Home/Document.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "Document",
      props: ["postId", "category", "categoryPath"],
      template:
        '<div class="document-stub" :data-post-id="postId" :data-category="String(category)"></div>',
    }),
  };
});

vi.mock("@element-plus/icons-vue", () => ({
  Back: { name: "Back", template: '<span class="back-icon-stub"></span>' },
}));

// stub scrollTo
Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
  mockBack.mockClear();
});

const ElCardStub = defineComponent({
  name: "ElCard",
  template: "<div class='el-card-stub'><slot /></div>",
});
const ElButtonStub = defineComponent({
  name: "ElButton",
<<<<<<< HEAD
  template: "<button class='el-btn-stub' @click=\"$emit('click')\"><slot /></button>",
  emits: ["click"],
=======
  emits: ["click"],
  template:
    "<button class='el-btn-stub' @click=\"$emit('click')\"><slot /></button>",
>>>>>>> openclaw/improvements
});
const ElIconStub = defineComponent({
  name: "ElIcon",
  template: "<i class='el-icon-stub'><slot /></i>",
});

async function mount() {
  const { default: IntroduceDocument } = await import(
    "@/views/web/components/News/IntroduceDocument.vue"
  );
  const el = document.createElement("div");
  const app = createApp(IntroduceDocument as Parameters<typeof createApp>[0]);
<<<<<<< HEAD
  app.component("el-card", ElCardStub);
  app.component("el-button", ElButtonStub);
  app.component("el-icon", ElIconStub);
=======
  app.component("ElCard", ElCardStub);
  app.component("ElButton", ElButtonStub);
  app.component("ElIcon", ElIconStub);
>>>>>>> openclaw/improvements
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el };
}

describe("views/web/components/News/IntroduceDocument.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders el-card wrapper", async () => {
    const { el } = await mount();
    expect(el.querySelector(".el-card-stub")).not.toBeNull();
  });

  it("renders Document stub with postId from route", async () => {
    mockRoute.query = { id: "15" };
    const { el } = await mount();
    const stub = el.querySelector(".document-stub") as HTMLElement;
    expect(stub).not.toBeNull();
    expect(stub.dataset.postId).toBe("15");
  });

  it("renders back button", async () => {
    const { el } = await mount();
    expect(el.querySelector(".el-btn-stub")).not.toBeNull();
  });

  it("clicking back button calls router.back()", async () => {
    const { el } = await mount();
    const btn = el.querySelector<HTMLButtonElement>(".el-btn-stub");
    btn?.click();
    await nextTick();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("passes category=true to Document", async () => {
    const { el } = await mount();
    const stub = el.querySelector(".document-stub") as HTMLElement;
    expect(stub.dataset.category).toBe("true");
  });
});
