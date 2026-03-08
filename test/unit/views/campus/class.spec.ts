import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp, defineComponent, h } from "vue";

const mockRouteQuery: Record<string, string> = {};
const mockDomainStore = { title: "TestPlatform" };
let emitClassLoaded: ((payload: { name?: string }) => void) | null = null;

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => ({ query: mockRouteQuery })),
}));

vi.mock("@/store/modules/domain", () => ({
  useDomainStore: vi.fn(() => mockDomainStore),
}));

vi.mock("@/views/campus/components/ClassDetail.vue", async () => {
  const { defineComponent: dc, h: vh } = await import("vue");
  return {
    default: dc({
      name: "ClassDetail",
      props: {
        classId: {
          type: Number,
          required: true,
        },
      },
      emits: ["class-loaded"],
      setup(props, { emit }) {
        emitClassLoaded = (payload: { name?: string }) => {
          emit("class-loaded", payload);
        };
        return () =>
          vh("div", {
            class: "class-detail-stub",
            "data-class-id": String(props.classId),
          });
      },
    }),
  };
});

const ElEmptyStub = defineComponent({
  name: "ElEmpty",
  props: ["description"],
  setup(props) {
    return () => h("div", { class: "el-empty-stub", "data-desc": String(props.description) });
  },
});

const cleanups: (() => void)[] = [];
const originalTitle = document.title;

beforeEach(() => {
  delete mockRouteQuery.class_id;
  mockDomainStore.title = "TestPlatform";
  emitClassLoaded = null;
  document.title = originalTitle;
});

afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
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
  it("shows empty state when class_id is missing", async () => {
    const { el } = await mount();
    expect(el.querySelector(".el-empty-stub")).not.toBeNull();
    expect(el.querySelector(".class-detail-stub")).toBeNull();
  });

  it("renders ClassDetail when class_id is provided", async () => {
    mockRouteQuery.class_id = "7";
    const { el } = await mount();
    expect(el.querySelector(".class-detail-stub")).not.toBeNull();
    expect(el.querySelector(".class-detail-stub")?.getAttribute("data-class-id")).toBe("7");
  });

  it("falls back to empty state for invalid class_id", async () => {
    mockRouteQuery.class_id = "abc";
    const { el } = await mount();
    expect(el.querySelector(".class-detail-stub")).toBeNull();
    expect(el.querySelector(".el-empty-stub")).not.toBeNull();
  });

  it("updates document title with class name and store title", async () => {
    mockRouteQuery.class_id = "10";
    await mount();
    emitClassLoaded?.({ name: "Class A" });
    expect(document.title).toBe("Class A - TestPlatform");
  });

  it("uses store title when class name is empty", async () => {
    mockRouteQuery.class_id = "10";
    await mount();
    emitClassLoaded?.({});
    expect(document.title).toBe("TestPlatform");
  });

  it("uses default site title when store title is empty", async () => {
    mockRouteQuery.class_id = "10";
    mockDomainStore.title = "";
    await mount();
    emitClassLoaded?.({});
    expect(document.title).toBe("XR UGC平台（XRUGC.com）");
  });
});
