import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp, defineComponent } from "vue";

const mockGetTags = vi.fn();
const mockLoggerLog = vi.fn();

vi.mock("@/api/v1/tags", () => ({
  getTags: (...args: unknown[]) => mockGetTags(...args),
}));

vi.mock("@/utils/logger", () => ({
  logger: { log: (...args: unknown[]) => mockLoggerLog(...args) },
}));

vi.mock("@/components/StandardPage", () => ({
  PageFilter: defineComponent({
    name: "PageFilter",
    props: ["modelValue", "label", "options", "placeholder"],
    emits: ["update:modelValue", "change"],
    template:
      "<div class='page-filter-stub' :data-label='label' :data-placeholder='placeholder' :data-options='JSON.stringify(options)'><button class='trigger-change' @click=\"$emit('change', [1, 2]); $emit('update:modelValue', [1, 2])\">change</button></div>",
  }),
}));

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

describe("components/TagsSelect.vue", () => {
  beforeEach(() => {
    mockGetTags.mockReset();
    mockLoggerLog.mockReset();
    mockGetTags.mockResolvedValue({
      data: [
        { id: 1, name: "tag-1" },
        { id: 2, name: "tag-2" },
      ],
    });
  });

  async function mount(props: Record<string, unknown> = {}) {
    const Comp = (await import("@/components/TagsSelect.vue")).default;
    const el = document.createElement("div");
    const app = createApp(Comp as Parameters<typeof createApp>[0], props);
    app.config.globalProperties.$t = (key: string) => key;
    app.mount(el);
    cleanups.push(() => app.unmount());
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    return { el };
  }

  it("mounts and renders PageFilter stub", async () => {
    const { el } = await mount();
    expect(el.querySelector(".page-filter-stub")).not.toBeNull();
  });

  it("calls getTags on mounted", async () => {
    await mount();
    expect(mockGetTags).toHaveBeenCalledTimes(1);
  });

  it("maps api tags to PageFilter options", async () => {
    const { el } = await mount();
    const options =
      el.querySelector(".page-filter-stub")?.getAttribute("data-options") ?? "";

    expect(options).toContain('"label":"tag-1"');
    expect(options).toContain('"value":1');
    expect(options).toContain('"label":"tag-2"');
    expect(options).toContain('"value":2');
  });

  it("passes translated label and placeholder", async () => {
    const { el } = await mount();
    const pageFilter = el.querySelector(".page-filter-stub");

    expect(pageFilter?.getAttribute("data-label")).toBe("ui.filter");
    expect(pageFilter?.getAttribute("data-placeholder")).toBe("ui.filter");
  });

  it("emits tagsChange when PageFilter change fires", async () => {
    const onTagsChange = vi.fn();
    const { el } = await mount({ onTagsChange });

    (el.querySelector(".trigger-change") as HTMLButtonElement).click();
    await Promise.resolve();

    expect(mockLoggerLog).toHaveBeenCalled();
    expect(onTagsChange).toHaveBeenCalledWith([1, 2]);
  });
});
