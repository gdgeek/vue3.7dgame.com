/**
 * Tests for src/components/TagsSelect.vue
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createApp, defineComponent } from "vue";

const mockGetTags = vi.fn();
vi.mock("@/api/v1/tags", () => ({
  getTags: mockGetTags,
}));

vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/StandardPage", () => ({
  PageFilter: defineComponent({
    name: "PageFilter",
    props: ["modelValue", "label", "options", "placeholder"],
    emits: ["update:modelValue", "change"],
    template: "<div class='page-filter-stub'></div>",
  }),
}));

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

beforeEach(() => {
  mockGetTags.mockResolvedValue({
    data: [
      { id: 1, name: "Tag A" },
      { id: 2, name: "Tag B" },
    ],
  });
});

async function mount() {
  const { default: TagsSelect } = await import("@/components/TagsSelect.vue");
  const el = document.createElement("div");
  const app = createApp(TagsSelect as Parameters<typeof createApp>[0]);
  app.config.globalProperties.$t = (k: string) => k;
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("TagsSelect.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders page-filter-stub", async () => {
    const { el } = await mount();
    expect(el.querySelector(".page-filter-stub")).not.toBeNull();
  });

  it("calls getTags on mount", async () => {
    await mount();
    // Allow microtasks to flush
    await new Promise((r) => setTimeout(r, 0));
    expect(mockGetTags).toHaveBeenCalled();
  });

  it("mounts a second time without throwing (fresh state)", async () => {
    mockGetTags.mockResolvedValue({ data: [] });
    await expect(mount()).resolves.toBeDefined();
  });

  it("handles getTags returning empty array", async () => {
    mockGetTags.mockResolvedValue({ data: [] });
    const { el } = await mount();
    expect(el.querySelector(".page-filter-stub")).not.toBeNull();
  });
});
