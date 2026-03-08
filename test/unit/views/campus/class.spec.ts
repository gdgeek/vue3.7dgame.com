/**
 * Tests for src/views/campus/class.vue
 * Shows ClassDetail when classId query param is present, otherwise el-empty.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent } from "vue";

const mockRouteQuery: Record<string, string> = {};
const mockDomainStore = { title: "TestPlatform" };

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => ({ query: mockRouteQuery })),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  createRouter: vi.fn(() => ({})),
  createWebHistory: vi.fn(() => ({})),
}));

vi.mock("@/store/modules/domain", () => ({
  useDomainStore: vi.fn(() => mockDomainStore),
}));

vi.mock("@/views/campus/components/ClassDetail.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "ClassDetail",
      props: ["classId"],
      emits: ["class-loaded"],
      template: "<div class='class-detail-stub' :data-id='classId'></div>",
    }),
  };
});

const ElEmptyStub = defineComponent({
  name: "ElEmpty",
  props: ["description"],
  template: "<div class='el-empty-stub' :data-desc='description'></div>",
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
  delete mockRouteQuery.class_id;
  mockDomainStore.title = "TestPlatform";
});

async function mount() {
  const { default: ClassView } = await import("@/views/campus/class.vue");
  const el = document.createElement("div");
  const app = createApp(ClassView as Parameters<typeof createApp>[0]);
  app.component("ElEmpty", ElEmptyStub);
  app.config.globalProperties.$t = (k: string) => k;
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("views/campus/class.vue", () => {
  it("mounts without throwing (no classId)", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders .class-page-container", async () => {
    const { el } = await mount();
    expect(el.querySelector(".class-page-container")).not.toBeNull();
  });

  it("shows el-empty when no class_id query param", async () => {
    const { el } = await mount();
    expect(el.querySelector(".el-empty-stub")).not.toBeNull();
  });

  it("does not show ClassDetail when no class_id", async () => {
    const { el } = await mount();
    expect(el.querySelector(".class-detail-stub")).toBeNull();
  });

  it("shows ClassDetail when class_id query param is provided", async () => {
    mockRouteQuery.class_id = "7";
    const { el } = await mount();
    expect(el.querySelector(".class-detail-stub")).not.toBeNull();
  });

  it("passes classId prop to ClassDetail", async () => {
    mockRouteQuery.class_id = "15";
    const { el } = await mount();
    const stub = el.querySelector(".class-detail-stub");
    expect(stub?.getAttribute("data-id")).toBe("15");
  });
});
