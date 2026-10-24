import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, nextTick, ref } from "vue";
import { getVerse } from "@/api/v1/verse";

const mockPush = vi.fn();
const mockHandleSearch = vi.fn();
const mockWaterfallRenderer = vi.fn();
const mockViewMode = ref<"grid" | "list">("grid");
const example = {
  id: 313,
  name: "Public example",
  image: { url: "/example.png" },
  author: { nickname: "Author" },
};

vi.mock("vue-router", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
}));

vi.mock("vue-i18n", () => ({
  useI18n: vi.fn(() => ({
    t: (key: string) => key,
  })),
}));

vi.mock("@/api/v1/tags", () => ({
  getTags: vi.fn(async () => ({
    data: [],
  })),
}));

vi.mock("@/api/v1/verse", () => ({
  getPublic: vi.fn(),
  getVerse: vi.fn(),
}));

vi.mock("@/composables/usePageData", () => ({
  usePageData: vi.fn(() => ({
    items: ref([example]),
    loading: ref(false),
    pagination: { current: 1, count: 1, size: 24, total: 0 },
    viewMode: mockViewMode,
    totalPages: ref(1),
    refresh: vi.fn(),
    handleSearch: mockHandleSearch,
    handleSortChange: vi.fn(),
    handlePageChange: vi.fn(),
    handleViewChange: vi.fn(),
    handleTagsChange: vi.fn(),
  })),
}));

vi.mock("@/components/TransitionWrapper.vue", () => ({
  default: defineComponent({
    name: "TransitionWrapperStub",
    template: "<div><slot /></div>",
  }),
}));

vi.mock("vue-waterfall-plugin-next", () => ({
  Waterfall: defineComponent({
    props: { list: Array },
    setup(_, { expose }) {
      expose({ renderer: mockWaterfallRenderer });
    },
    template: '<div><slot v-for="item in list" :item="item" /></div>',
  }),
}));

vi.mock("@/components/StandardPage", async () => ({
  ViewContainer: (await import("@/components/StandardPage/ViewContainer.vue"))
    .default,
  PagePagination: defineComponent({
    name: "PagePaginationStub",
    template: "<div class='page-pagination-stub'></div>",
  }),
  StandardCard: (await import("@/components/StandardPage/StandardCard.vue"))
    .default,
  DetailPanel: defineComponent({
    name: "DetailPanelStub",
    props: {
      modelValue: Boolean,
      editable: { type: Boolean, default: true },
    },
    template:
      "<div v-if='modelValue' class='detail-panel-stub' :data-editable='String(editable)'><button v-if='editable' class='rename-scene'>Rename</button><slot name='preview' /><slot name='info' /></div>",
  }),
}));

const cleanups: Array<() => void> = [];

beforeEach(() => {
  vi.useFakeTimers();
  mockViewMode.value = "grid";
  mockWaterfallRenderer.mockClear();
  vi.mocked(getVerse).mockReset();
  vi.mocked(getVerse).mockResolvedValue({ data: example } as Awaited<
    ReturnType<typeof getVerse>
  >);
});

afterEach(() => {
  cleanups.forEach((cleanup) => cleanup());
  cleanups.length = 0;
  mockPush.mockReset();
  mockHandleSearch.mockReset();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

async function mount() {
  const { default: PublicView } = await import("@/views/meta-verse/public.vue");
  const el = document.createElement("div");
  document.body.appendChild(el);
  const app = createApp(PublicView);
  app.component("FontAwesomeIcon", { template: "<span />" });
  for (const name of [
    "ElDropdown",
    "ElDropdownMenu",
    "ElDropdownItem",
    "ElTag",
    "ElCheckbox",
    "ElEmpty",
    "ElSkeleton",
  ])
    app.component(name, { template: "<div><slot /></div>" });
  app.mount(el);
  cleanups.push(() => {
    app.unmount();
    el.remove();
  });
  return { el };
}

describe("views/meta-verse/public.vue", () => {
  it("uses the loaded image's natural proportions and recalculates the waterfall", async () => {
    const { el } = await mount();
    await nextTick();
    const image = el.querySelector<HTMLImageElement>(".card-thumbnail img")!;
    Object.defineProperties(image, {
      naturalWidth: { configurable: true, value: 320 },
      naturalHeight: { configurable: true, value: 640 },
    });
    vi.advanceTimersByTime(1);
    image.dispatchEvent(new Event("load"));
    await nextTick();
    expect(
      el.querySelector(".card-thumbnail")?.getAttribute("style")
    ).toContain("aspect-ratio: 320 / 640");
    expect(mockWaterfallRenderer).toHaveBeenCalledTimes(1);
  });

  it.each(["grid", "list"] as const)(
    "enters an example after holding for one second in %s view without opening details",
    async (mode) => {
      mockViewMode.value = mode;
      const { el } = await mount();
      const card = el.querySelector<HTMLElement>(
        mode === "grid" ? ".standard-card" : ".list-row"
      )!;
      expect(card).not.toBeNull();
      expect(el.querySelector(".card-action-group")).toBeNull();
      expect(el.querySelector(".btn-hover-action")).toBeNull();
      card.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
      expect(document.querySelector(".long-press-hint")?.textContent).toBe(
        "长按 1 秒直接进入编辑"
      );
      vi.advanceTimersByTime(999);
      expect(mockPush).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith({
        path: "/verse/scene",
        query: { id: example.id, title: expect.any(String) },
      });
      card.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
      card.click();
      expect(getVerse).not.toHaveBeenCalled();
      expect(document.querySelector(".long-press-hint")).toBeNull();
    }
  );

  it.each(["grid", "list"] as const)(
    "opens information on a short click in %s view",
    async (mode) => {
      mockViewMode.value = mode;
      const { el } = await mount();
      const card = el.querySelector<HTMLElement>(
        mode === "grid" ? ".standard-card" : ".list-row"
      )!;
      card.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
      vi.advanceTimersByTime(200);
      card.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
      card.click();
      await nextTick();
      expect(getVerse).toHaveBeenCalledWith(example.id, "image,author,tags");
      expect(el.querySelector(".detail-panel-stub")).not.toBeNull();
      expect(
        el.querySelector(".detail-panel-stub")?.getAttribute("data-editable")
      ).toBe("false");
      expect(el.querySelector(".rename-scene")).toBeNull();
      expect(mockPush).not.toHaveBeenCalled();
    }
  );

  it("auto searches after 300ms when input changes", async () => {
    const { el } = await mount();
    const input = el.querySelector(".hero-search-input") as HTMLInputElement;

    input.value = "dragon";
    input.dispatchEvent(new Event("input"));
    await nextTick();

    expect(mockHandleSearch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(mockHandleSearch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(mockHandleSearch).toHaveBeenCalledWith("dragon");
  });

  it("searches immediately and cancels pending debounce when input is cleared", async () => {
    const { el } = await mount();
    const input = el.querySelector(".hero-search-input") as HTMLInputElement;

    input.value = "dragon";
    input.dispatchEvent(new Event("input"));
    await nextTick();

    input.value = "";
    input.dispatchEvent(new Event("input"));
    await nextTick();

    expect(mockHandleSearch).toHaveBeenCalledTimes(1);
    expect(mockHandleSearch).toHaveBeenCalledWith("");

    vi.advanceTimersByTime(300);
    expect(mockHandleSearch).toHaveBeenCalledTimes(1);
  });
});
