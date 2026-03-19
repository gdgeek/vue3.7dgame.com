import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, nextTick, ref } from "vue";

const mockPush = vi.fn();
const mockHandleSearch = vi.fn();

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
    items: ref([]),
    loading: ref(false),
    pagination: { current: 1, count: 1, size: 24, total: 0 },
    viewMode: ref("grid"),
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

vi.mock("@/components/StandardPage", () => ({
  ViewContainer: defineComponent({
    name: "ViewContainerStub",
    template: "<div class='view-container-stub'><slot /></div>",
  }),
  PagePagination: defineComponent({
    name: "PagePaginationStub",
    template: "<div class='page-pagination-stub'></div>",
  }),
  StandardCard: defineComponent({
    name: "StandardCardStub",
    template: "<div class='standard-card-stub'></div>",
  }),
  DetailPanel: defineComponent({
    name: "DetailPanelStub",
    template:
      "<div class='detail-panel-stub'><slot name='preview' /><slot name='info' /></div>",
  }),
}));

const cleanups: Array<() => void> = [];

beforeEach(() => {
  vi.useFakeTimers();
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
  app.mount(el);
  cleanups.push(() => {
    app.unmount();
    el.remove();
  });
  return { el };
}

describe("views/meta-verse/public.vue", () => {
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
