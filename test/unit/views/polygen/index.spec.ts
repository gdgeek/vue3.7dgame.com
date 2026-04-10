import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, reactive, ref } from "vue";

const mockRoute = reactive({
  path: "/resource/polygen/index",
  query: {
    lang: "zh-CN",
    theme: "edu-friendly",
    resourceId: "5391",
    open: "1",
  } as Record<string, string>,
});

const mockRouterReplace = vi.fn();
const mockRouterPush = vi.fn();

const mocks = vi.hoisted(() => ({
  getPolygen: vi.fn(),
  getPolygens: vi.fn(),
  putPolygen: vi.fn(),
  deletePolygen: vi.fn(),
  postPolygen: vi.fn(),
  refresh: vi.fn(),
  handleSearch: vi.fn(),
  handleSortChange: vi.fn(),
  handlePageChange: vi.fn(),
  handleViewChange: vi.fn(),
}));

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => mockRoute),
  useRouter: vi.fn(() => ({
    replace: mockRouterReplace,
    push: mockRouterPush,
  })),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/components/Dialog", () => ({
  Message: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  MessageBox: {
    confirm: vi.fn(),
    prompt: vi.fn(),
  },
}));

vi.mock("@/components/StandardPage", () => {
  const stub = (name: string, template: string) =>
    defineComponent({ name, props: ["items", "modelValue"], emits: ["close"], template });

  return {
    PageActionBar: stub(
      "PageActionBar",
      "<div class='page-action-bar-stub'><slot name='filters' /><slot name='actions' /></div>"
    ),
    ViewContainer: stub(
      "ViewContainer",
      "<div class='view-container-stub'><slot name='empty' /></div>"
    ),
    PagePagination: stub("PagePagination", "<div class='page-pagination-stub'></div>"),
    EmptyState: stub("EmptyState", "<div class='empty-state-stub'></div>"),
    StandardCard: stub("StandardCard", "<div class='standard-card-stub'></div>"),
    DetailPanel: defineComponent({
      name: "DetailPanel",
      props: ["modelValue"],
      emits: ["close"],
      template:
        "<div class='detail-panel-stub'><button data-test='detail-close' @click=\"$emit('close')\">close</button><slot name='preview' /></div>",
    }),
    ResourceScopeFilter: stub(
      "ResourceScopeFilter",
      "<div class='resource-scope-filter-stub'></div>"
    ),
  };
});

vi.mock("@/components/StandardPage/StandardUploadDialog.vue", () => ({
  default: defineComponent({
    name: "StandardUploadDialog",
    template: "<div class='standard-upload-dialog-stub'></div>",
  }),
}));

vi.mock("@/components/PolygenView.vue", () => ({
  default: defineComponent({
    name: "PolygenView",
    template: "<div class='polygen-view-stub'></div>",
  }),
}));

vi.mock("@/components/TransitionWrapper.vue", () => ({
  default: defineComponent({
    name: "TransitionWrapper",
    template: "<div class='transition-wrapper-stub'><slot /></div>",
  }),
}));

vi.mock("@/api/v1/files", () => ({
  postFile: vi.fn(),
}));

vi.mock("@/api/v1/resources/index", () => ({
  getPolygens: mocks.getPolygens,
  getPolygen: mocks.getPolygen,
  putPolygen: mocks.putPolygen,
  deletePolygen: mocks.deletePolygen,
  postPolygen: mocks.postPolygen,
}));

vi.mock("@/composables/usePageData", () => ({
  usePageData: () => ({
    items: ref([]),
    loading: ref(false),
    pagination: reactive({ current: 1 }),
    viewMode: ref("grid"),
    totalPages: ref(1),
    refresh: mocks.refresh,
    handleSearch: mocks.handleSearch,
    handleSortChange: mocks.handleSortChange,
    handlePageChange: mocks.handlePageChange,
    handleViewChange: mocks.handleViewChange,
  }),
}));

vi.mock("@/composables/useSelection", () => ({
  useSelection: () => ({
    selectedCount: ref(0),
    hasSelection: ref(false),
    isSelected: () => false,
    toggleSelection: vi.fn(),
    clearSelection: vi.fn(),
    getSelectedItems: () => [],
    selectItems: vi.fn(),
    deselectItems: vi.fn(),
  }),
}));

vi.mock("@/composables/useResourceScopeFilter", () => ({
  useResourceScopeFilter: () => ({
    isFilterActive: ref(false),
    pagedResources: ref([]),
    localPage: ref(1),
    totalPages: ref(1),
    scopeMode: ref("all"),
    selectedSceneId: ref(null),
    selectedEntityId: ref(null),
    showSceneSelect: ref(false),
    showEntitySelect: ref(false),
    loadingScenes: ref(false),
    loadingSceneDetail: ref(false),
    loadingEntityDetail: ref(false),
    scenes: ref([]),
    entities: ref([]),
    handleScopedSearch: () => false,
    handleScopedSort: () => false,
    handleScopedPageChange: () => false,
    handleSceneChange: vi.fn(async () => {}),
    handleEntityChange: vi.fn(),
  }),
}));

vi.mock("@/store/modules/config", () => ({
  useFileStore: () => ({
    store: {
      fileMD5: vi.fn(),
      publicHandler: vi.fn(),
      fileHas: vi.fn(),
      fileUpload: vi.fn(),
      fileUrl: vi.fn(),
    },
  }),
}));

vi.mock("@/utils/modelProcessor", () => ({
  generateModelThumbnailFromUrl: vi.fn(),
}));

vi.mock("@/utils/utilityFunctions", () => ({
  convertToLocalTime: (value: string) => value,
  formatFileSize: (value: number) => `${value}`,
  getResourceFormat: () => "glb",
}));

vi.mock("@/utils/helper", () => ({
  toHttps: (value: string) => value,
}));

vi.mock("@/utils/resourceGrid", () => ({
  denseResourceBreakpoints: {},
  denseResourceCardGutter: 0,
}));

vi.mock("@/utils/downloadHelper", () => ({
  downloadResource: vi.fn(),
}));

vi.mock("@/utils/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("views/polygen/index.vue", () => {
  const cleanups: Array<() => void> = [];

  beforeEach(() => {
    mockRoute.query = {
      lang: "zh-CN",
      theme: "edu-friendly",
      resourceId: "5391",
      open: "1",
    };
    mockRouterReplace.mockReset();
    mockRouterPush.mockReset();
    mocks.getPolygen.mockReset();
    mocks.getPolygen.mockResolvedValue({
      data: {
        id: 5391,
        name: "小狗",
        file: {
          size: 613910,
          url: "https://cdn.example.com/models/dog.glb",
        },
        image: {
          url: "https://cdn.example.com/thumbs/dog.webp",
        },
        created_at: "2026-04-10T04:11:00.000Z",
        info: null,
      },
    });
  });

  afterEach(() => {
    cleanups.splice(0).reverse().forEach((fn) => fn());
    vi.resetModules();
  });

  async function mountView() {
    const { default: PolygenIndex } = await import("@/views/polygen/index.vue");
    const el = document.createElement("div");
    document.body.appendChild(el);

    const app = createApp(PolygenIndex);
    app.config.globalProperties.$t = (key: string) => key;
    app.component(
      "font-awesome-icon",
      defineComponent({
        name: "FontAwesomeIcon",
        template: "<span class='fa-stub'></span>",
      })
    );
    app.component(
      "el-button",
      defineComponent({
        name: "ElButton",
        template: "<button><slot /></button>",
      })
    );
    app.component(
      "el-checkbox",
      defineComponent({
        name: "ElCheckbox",
        template: "<label><slot /></label>",
      })
    );
    app.component(
      "el-dropdown",
      defineComponent({
        name: "ElDropdown",
        template: "<div><slot /><slot name='dropdown' /></div>",
      })
    );
    app.component(
      "el-dropdown-menu",
      defineComponent({
        name: "ElDropdownMenu",
        template: "<div><slot /></div>",
      })
    );
    app.component(
      "el-dropdown-item",
      defineComponent({
        name: "ElDropdownItem",
        template: "<button><slot /></button>",
      })
    );
    app.mount(el);

    cleanups.push(() => {
      app.unmount();
      el.remove();
    });

    await Promise.resolve();
    await Promise.resolve();

    return { el };
  }

  it("auto-opens the requested resource detail from the route query", async () => {
    await mountView();

    expect(mocks.getPolygen).toHaveBeenCalledWith(5391);
  });

  it("clears resourceId and open from the URL when the detail panel closes", async () => {
    const { el } = await mountView();

    const closeButton = el.querySelector(
      "[data-test='detail-close']"
    ) as HTMLButtonElement;
    closeButton.click();

    expect(mockRouterReplace).toHaveBeenCalledWith({
      path: "/resource/polygen/index",
      query: {
        lang: "zh-CN",
        theme: "edu-friendly",
      },
    });
  });
});
