import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, nextTick, ref } from "vue";

const mocks = vi.hoisted(() => ({
  role: "root",
  getVerse: vi.fn(),
  addPublic: vi.fn(),
  removePublic: vi.fn(),
  refresh: vi.fn(),
}));

const scene = () => ({
  id: 42,
  name: "Private scene",
  description: "A scene with custom properties",
  public: false,
  editable: true,
  tags: [],
  verseTags: [],
  metas: [],
});

vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("@casl/vue", () => ({
  useAbility: () => ({ can: (role: string) => role === mocks.role }),
}));
vi.mock("@/store/modules/user", () => ({
  useUserStore: () => ({
    userInfo: {},
    RoleEnum: { Root: "root", Admin: "admin" },
    getRole: () => mocks.role,
  }),
}));
vi.mock("@/api/v1/verse", () => ({
  getVerse: mocks.getVerse,
  addPublic: mocks.addPublic,
  removePublic: mocks.removePublic,
  getVerses: vi.fn(),
  postVerse: vi.fn(),
  putVerse: vi.fn(),
  deleteVerse: vi.fn(),
  addTag: vi.fn(),
  removeTag: vi.fn(),
  takePhoto: vi.fn(),
}));
vi.mock("@/composables/usePageData", () => ({
  usePageData: () => ({
    items: ref([scene()]),
    loading: ref(false),
    pagination: { current: 1, count: 1, size: 24, total: 1 },
    viewMode: ref("grid"),
    totalPages: ref(1),
    refresh: mocks.refresh,
    handleSearch: vi.fn(),
    handleSortChange: vi.fn(),
    handlePageChange: vi.fn(),
    handleViewChange: vi.fn(),
    handleTagsChange: vi.fn(),
  }),
}));
vi.mock("@/api/v1/tags", () => ({
  getTags: vi.fn(async () => ({ data: [] })),
}));
vi.mock("@/components/Dialog", () => ({
  Message: { success: vi.fn(), error: vi.fn() },
  MessageBox: { confirm: vi.fn(), prompt: vi.fn() },
}));
vi.mock("element-plus", () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn() },
}));
vi.mock("@/services/scene-package/export-service", () => ({
  exportScene: vi.fn(),
}));
vi.mock("@/api/v1/resources/index", () => ({ getPicture: vi.fn() }));
vi.mock("@/store/modules/config", () => ({ useFileStore: () => ({}) }));
vi.mock("@/api/v1/files", () => ({ postFile: vi.fn() }));
vi.mock("@/utils/utilityFunctions", () => ({
  convertToLocalTime: (value: string) => value,
}));

vi.mock("@/components/StandardPage", () => ({
  PageActionBar: defineComponent({ template: "<div />" }),
  ViewContainer: defineComponent({
    props: { items: Array },
    emits: ["row-click"],
    template: `<div>
      <button v-for="item in items" :key="item.id" class="open-scene"
        :data-public="String(item.public)" @click="$emit('row-click', item)">
        {{ item.name }}
      </button>
    </div>`,
  }),
  PagePagination: defineComponent({ template: "<div />" }),
  EmptyState: defineComponent({ template: "<div />" }),
  StandardCard: defineComponent({ template: "<div />" }),
  DetailPanel: defineComponent({
    props: { modelValue: Boolean },
    emits: ["close", "update:modelValue"],
    template: `<section v-if="modelValue" class="detail-panel">
      <slot name="info" />
      <button class="close-detail" @click="$emit('close'); $emit('update:modelValue', false)">Close</button>
    </section>`,
  }),
}));

// The property editor has its own API/form tests. Here its public event contract
// exercises the real pages' authorization and visibility controls.
vi.mock("@/components/MrPP/MrPPVerse/SceneProperties.vue", () => ({
  default: defineComponent({
    props: { sceneId: Number },
    emits: ["added"],
    template: `<section class="scene-properties" :data-scene-id="sceneId">
      <button class="add-public" @click="$emit('added', { id: 7, key: 'public', info: null })">Add public</button>
      <button class="add-custom" @click="$emit('added', { id: 8, key: 'custom', info: null })">Add custom</button>
    </section>`,
  }),
}));
vi.mock("@/components/TransitionWrapper.vue", () => ({
  default: defineComponent({ template: "<div><slot /></div>" }),
}));
vi.mock("@/components/TagsSelect.vue", () => ({
  default: defineComponent({ template: "<div />" }),
}));
vi.mock("@/components/MrPP/MrPPVerse/MrPPVerseWindowCreate.vue", () => ({
  default: defineComponent({ template: "<div />" }),
}));
vi.mock("@/components/ScenePackage/ImportDialog.vue", () => ({
  default: defineComponent({ template: "<div />" }),
}));
vi.mock("@/components/MrPP/ResourceDialog.vue", () => ({
  default: defineComponent({ template: "<div />" }),
}));
vi.mock("@/components/Tags.vue", () => ({
  default: defineComponent({ template: "<div />" }),
}));
vi.mock("@/components/MrPP/MrPPVerse/InfoContent.vue", () => ({
  default: defineComponent({ template: "<div />" }),
}));
vi.mock("@/components/MrPP/MrPPVerse/MrPPVerseToolbar.vue", () => ({
  default: defineComponent({ template: "<div />" }),
}));
vi.mock("@/components/MrPP/ImageSelector.vue", () => ({
  default: defineComponent({ template: "<div />" }),
}));
vi.mock("@/components/ScenePackage/ExportButton.vue", () => ({
  default: defineComponent({ template: "<div />" }),
}));

const cleanups: Array<() => void> = [];

beforeEach(() => {
  mocks.role = "root";
  vi.clearAllMocks();
  mocks.getVerse.mockImplementation(async () => ({ data: scene() }));
  mocks.addPublic.mockResolvedValue({ data: { success: true } });
  mocks.removePublic.mockResolvedValue({ data: { success: true } });
});

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
});

async function settle() {
  for (let i = 0; i < 3; i++) {
    await Promise.resolve();
    await nextTick();
  }
}

async function mountView(legacy = false) {
  const component = legacy
    ? (await import("@/components/MrPP/MrPPVerse/VerseDetail.vue")).default
    : (await import("@/views/meta-verse/index.vue")).default;
  const el = document.createElement("div");
  document.body.appendChild(el);
  const app = createApp(component, legacy ? { verseId: 42 } : {});
  const slotStub = defineComponent({
    template: "<div><slot name='header' /><slot /><slot name='footer' /></div>",
  });
  for (const name of [
    "ElRow",
    "ElCol",
    "ElCard",
    "ElIcon",
    "ElButtonGroup",
    "ElSelect",
    "ElOption",
    "ElTag",
    "ElDropdown",
    "ElDropdownMenu",
    "ElDropdownItem",
  ]) {
    app.component(name, slotStub);
  }
  app.component(
    "ElButton",
    defineComponent({ template: "<button><slot /></button>" })
  );
  app.component("ElInput", defineComponent({ template: "<textarea />" }));
  app.component("FontAwesomeIcon", defineComponent({ template: "<i />" }));
  app.component(
    "ElDialog",
    defineComponent({
      props: { modelValue: Boolean },
      template: "<div v-if='modelValue'><slot /></div>",
    })
  );
  app.component(
    "ElSwitch",
    defineComponent({
      props: { modelValue: Boolean },
      template:
        "<input class='visibility-switch' type='checkbox' :checked='modelValue' />",
    })
  );
  app.config.globalProperties.$t = (key: string) => key;
  app.mount(el);
  cleanups.push(() => {
    app.unmount();
    el.remove();
  });
  await settle();
  return el;
}

async function click(el: HTMLElement, selector: string) {
  const button = el.querySelector<HTMLElement>(selector);
  expect(button).not.toBeNull();
  button!.click();
  await settle();
}

describe("scene property management in scene details", () => {
  it("shows properties for root after a scene is opened and clears them on close", async () => {
    const el = await mountView();
    expect(el.querySelector(".scene-properties")).toBeNull();

    await click(el, ".open-scene");
    expect(
      el.querySelector(".scene-properties")?.getAttribute("data-scene-id")
    ).toBe("42");

    await click(el, ".close-detail");
    expect(el.querySelector(".scene-properties")).toBeNull();
  });

  it("keeps property management hidden for admin while retaining visibility controls", async () => {
    mocks.role = "admin";
    const el = await mountView();
    await click(el, ".open-scene");

    expect(el.querySelector(".scene-properties")).toBeNull();
    expect(el.querySelectorAll(".vis-btn")).toHaveLength(2);
  });

  it("syncs public property additions to detail visibility and the scene list", async () => {
    const el = await mountView();
    await click(el, ".open-scene");
    expect(el.querySelector(".vis-btn.active")?.textContent).toContain(
      "verse.listPage.private"
    );

    await click(el, ".add-public");
    expect(el.querySelector(".vis-btn.active")?.textContent).toContain(
      "verse.listPage.public"
    );
    expect(el.querySelector(".open-scene")?.getAttribute("data-public")).toBe(
      "true"
    );
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.addPublic).not.toHaveBeenCalled();

    await click(el, ".vis-btn");
    expect(mocks.removePublic).toHaveBeenCalledWith(42);
    expect(el.querySelector(".vis-btn.active")?.textContent).toContain(
      "verse.listPage.private"
    );
    expect(el.querySelector(".open-scene")?.getAttribute("data-public")).toBe(
      "false"
    );
  });

  it("keeps custom properties independent from public visibility", async () => {
    const el = await mountView();
    await click(el, ".open-scene");
    await click(el, ".add-custom");

    expect(el.querySelector(".vis-btn.active")?.textContent).toContain(
      "verse.listPage.private"
    );
    expect(mocks.addPublic).not.toHaveBeenCalled();
    expect(mocks.removePublic).not.toHaveBeenCalled();
  });

  it("shows legacy detail properties for root and updates its public switch", async () => {
    const el = await mountView(true);
    expect(
      el.querySelector(".scene-properties")?.getAttribute("data-scene-id")
    ).toBe("42");
    expect(
      el.querySelector<HTMLInputElement>(".visibility-switch")?.checked
    ).toBe(false);

    await click(el, ".add-public");
    expect(
      el.querySelector<HTMLInputElement>(".visibility-switch")?.checked
    ).toBe(true);
    expect(mocks.addPublic).not.toHaveBeenCalled();
  });

  it("keeps legacy detail property management hidden for admin", async () => {
    mocks.role = "admin";
    const el = await mountView(true);

    expect(el.querySelector(".scene-properties")).toBeNull();
    expect(el.querySelector(".visibility-switch")).not.toBeNull();
  });
});
