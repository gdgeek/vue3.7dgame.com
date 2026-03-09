/**
 * Tests for src/views/verse/view.vue
 * Reads route.query.id and renders VerseDetail when id is present.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent } from "vue";

const mockPush = vi.fn();
const mockRouteQuery: Record<string, string> = {};

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => ({ query: mockRouteQuery })),
  useRouter: vi.fn(() => ({ push: mockPush })),
}));

vi.mock("@/components/TransitionWrapper.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "TransitionWrapper",
      template: "<div class='tw-stub'><slot /></div>",
    }),
  };
});

vi.mock("@/components/MrPP/MrPPVerse/VerseDetail.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "VerseDetail",
      props: ["verseId"],
      emits: ["deleted", "changed"],
      template: "<div class='verse-detail-stub' :data-id='verseId'></div>",
    }),
  };
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
  mockPush.mockClear();
  delete mockRouteQuery.id;
});

async function mount() {
  const { default: View } = await import("@/views/verse/view.vue");
  const el = document.createElement("div");
  const app = createApp(View as Parameters<typeof createApp>[0]);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("views/verse/view.vue", () => {
  it("mounts without throwing when no id", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders TransitionWrapper stub", async () => {
    const { el } = await mount();
    expect(el.querySelector(".tw-stub")).not.toBeNull();
  });

  it("does not render VerseDetail when id is missing", async () => {
    const { el } = await mount();
    expect(el.querySelector(".verse-detail-stub")).toBeNull();
  });

  it("renders VerseDetail when id query param is set", async () => {
    mockRouteQuery.id = "42";
    const { el } = await mount();
    expect(el.querySelector(".verse-detail-stub")).not.toBeNull();
  });

  it("passes verseId prop to VerseDetail", async () => {
    mockRouteQuery.id = "99";
    const { el } = await mount();
    const stub = el.querySelector(".verse-detail-stub");
    expect(stub?.getAttribute("data-id")).toBe("99");
  });

  it("renders .verse-view container", async () => {
    const { el } = await mount();
    expect(el.querySelector(".verse-view")).not.toBeNull();
  });
});
