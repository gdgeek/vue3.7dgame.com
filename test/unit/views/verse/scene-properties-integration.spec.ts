import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, nextTick, ref } from "vue";

const mocks = vi.hoisted(() => ({
  role: "root",
  getVerse: vi.fn(),
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
  useAbility: () => ({
    can: (role: string, subject: string) =>
      subject === "all" &&
      ((role === "root" && mocks.role === "root") ||
        (role === "admin" && ["root", "admin"].includes(mocks.role)) ||
        (role === "manager" &&
          ["root", "admin", "manager"].includes(mocks.role))),
  }),
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
  getVerses: vi.fn(),
  postVerse: vi.fn(),
  putVerse: vi.fn(),
  deleteVerse: vi.fn(),
  addTag: vi.fn(),
  removeTag: vi.fn(),
  takePhoto: vi.fn(),
}));
vi.mock("@/api/v1/scene-properties", () => ({
  getGlobalScenePropertyOptions: vi.fn(async () => ({ data: [] })),
  getScenesByProperty: vi.fn(async () => ({ data: [] })),
  getSceneByProperty: vi.fn(async () => ({ data: scene() })),
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
// exercises the real pages' authorization and scene-list synchronization.
vi.mock("@/components/MrPP/MrPPVerse/SceneProperties.vue", () => ({
  default: defineComponent({
    props: { sceneId: Number },
    emits: ["added", "removed", "globally-deleted"],
    template: `<section class="scene-properties" :data-scene-id="sceneId">
      <button class="add-public" @click="$emit('added', { id: 7, key: 'public', info: null })">Add public</button>
      <button class="add-custom" @click="$emit('added', { id: 8, key: 'custom', info: null })">Add custom</button>
      <button class="remove-public" @click="$emit('removed', { id: 7, key: 'public', info: null })">Remove public</button>
      <button class="remove-custom" @click="$emit('removed', { id: 8, key: 'custom', info: null })">Remove custom</button>
      <button class="delete-public-globally" @click="$emit('globally-deleted', { id: 7, key: 'public', info: null })">Delete public globally</button>
      <button class="delete-custom-globally" @click="$emit('globally-deleted', { id: 8, key: 'custom', info: null })">Delete custom globally</button>
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
const changedListeners = new WeakMap<HTMLElement, ReturnType<typeof vi.fn>>();

beforeEach(() => {
  mocks.role = "root";
  vi.clearAllMocks();
  mocks.getVerse.mockImplementation(async () => ({ data: scene() }));
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
  const changed = vi.fn();
  const app = createApp(
    component,
    legacy ? { verseId: 42, onChanged: changed } : {}
  );
  changedListeners.set(el, changed);
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
      emits: ["update:modelValue"],
      template: `<div v-if="modelValue" class="property-dialog" role="dialog">
        <slot name="header" /><slot /><slot name="footer" />
        <button class="close-property-dialog" @click="$emit('update:modelValue', false)">Close modal</button>
      </div>`,
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

async function openProperties(el: HTMLElement) {
  const trigger = Array.from(el.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("verse.properties.manage")
  );
  expect(trigger).toBeDefined();
  trigger!.click();
  await settle();
}

async function click(el: HTMLElement, selector: string) {
  const button = el.querySelector<HTMLElement>(selector);
  expect(button).not.toBeNull();
  button!.click();
  await settle();
}

describe("scene property management in scene details", () => {
  it("opens unified property management for root and clears it independently from scene details", async () => {
    const el = await mountView();
    expect(el.querySelector(".scene-properties")).toBeNull();
    await click(el, ".open-scene");
    expect(el.querySelectorAll(".vis-btn")).toHaveLength(0);
    expect(el.querySelector(".scene-properties")).toBeNull();
    await openProperties(el);
    expect(
      el.querySelector(".scene-properties")?.getAttribute("data-scene-id")
    ).toBe("42");
    await click(el, ".close-property-dialog");
    expect(el.querySelector(".scene-properties")).toBeNull();
    expect(el.querySelector(".detail-panel")).not.toBeNull();
    await openProperties(el);
    expect(el.querySelector(".scene-properties")).not.toBeNull();
    await click(el, ".close-detail");
    expect(el.querySelector(".scene-properties")).toBeNull();
  });

  it("allows admin to open unified property management with no dedicated visibility controls", async () => {
    mocks.role = "admin";
    const el = await mountView();
    await click(el, ".open-scene");
    expect(el.textContent).toContain("verse.properties.manage");
    expect(el.querySelectorAll(".vis-btn")).toHaveLength(0);
    expect(el.querySelector(".visibility-switch")).toBeNull();
    await openProperties(el);
    expect(el.querySelector(".scene-properties")).not.toBeNull();
  });

  it("syncs public property association to the scene list while preserving the modal", async () => {
    const el = await mountView();
    await click(el, ".open-scene");
    expect(el.querySelector(".open-scene")?.getAttribute("data-public")).toBe(
      "false"
    );
    await openProperties(el);
    const editor = el.querySelector(".scene-properties");
    await click(el, ".add-public");
    expect(el.querySelector(".scene-properties")).toBe(editor);
    expect(el.querySelector(".property-dialog")).not.toBeNull();
    expect(el.querySelector(".open-scene")?.getAttribute("data-public")).toBe(
      "true"
    );
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(el.querySelectorAll(".vis-btn")).toHaveLength(0);
  });

  it("keeps custom property association independent from public scene state", async () => {
    const el = await mountView();
    await click(el, ".open-scene");
    await openProperties(el);
    await click(el, ".add-custom");
    expect(el.querySelector(".open-scene")?.getAttribute("data-public")).toBe(
      "false"
    );
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("notifies the legacy detail parent after property association without rendering a public switch", async () => {
    const el = await mountView(true);
    expect(el.querySelector(".visibility-switch")).toBeNull();
    await openProperties(el);
    expect(
      el.querySelector(".scene-properties")?.getAttribute("data-scene-id")
    ).toBe("42");
    const editor = el.querySelector(".scene-properties");
    await click(el, ".add-public");
    expect(el.querySelector(".scene-properties")).toBe(editor);
    expect(el.querySelector(".property-dialog")).not.toBeNull();
    expect(changedListeners.get(el)).toHaveBeenCalledTimes(1);
    expect(el.querySelector(".visibility-switch")).toBeNull();
  });

  it("allows admin to open unified property management in legacy scene details", async () => {
    mocks.role = "admin";
    const el = await mountView(true);
    expect(el.textContent).toContain("verse.properties.manage");
    expect(el.querySelector(".visibility-switch")).toBeNull();
    await openProperties(el);
    expect(el.querySelector(".scene-properties")).not.toBeNull();
  });

  it("syncs public property removal to private scene state without closing the modal", async () => {
    const el = await mountView();
    await click(el, ".open-scene");
    await openProperties(el);
    await click(el, ".add-public");
    mocks.refresh.mockClear();
    const editor = el.querySelector(".scene-properties");
    await click(el, ".remove-public");
    expect(el.querySelector(".scene-properties")).toBe(editor);
    expect(el.querySelector(".property-dialog")).not.toBeNull();
    expect(el.querySelector(".open-scene")?.getAttribute("data-public")).toBe(
      "false"
    );
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    await click(el, ".remove-custom");
    expect(el.querySelector(".open-scene")?.getAttribute("data-public")).toBe(
      "false"
    );
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("notifies the legacy parent after public removal while preserving the property modal", async () => {
    const el = await mountView(true);
    await openProperties(el);
    await click(el, ".add-public");
    changedListeners.get(el)!.mockClear();
    const editor = el.querySelector(".scene-properties");
    await click(el, ".remove-public");
    expect(el.querySelector(".scene-properties")).toBe(editor);
    expect(el.querySelector(".property-dialog")).not.toBeNull();
    expect(changedListeners.get(el)).toHaveBeenCalledTimes(1);
    expect(el.querySelector(".visibility-switch")).toBeNull();
  });

  it("syncs global public deletion to private scene state and refreshes the list without closing the modal", async () => {
    const el = await mountView();
    await click(el, ".open-scene");
    await openProperties(el);
    await click(el, ".add-public");
    mocks.refresh.mockClear();
    const editor = el.querySelector(".scene-properties");
    await click(el, ".delete-public-globally");
    expect(el.querySelector(".scene-properties")).toBe(editor);
    expect(el.querySelector(".property-dialog")).not.toBeNull();
    expect(el.querySelector(".open-scene")?.getAttribute("data-public")).toBe(
      "false"
    );
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    await click(el, ".delete-custom-globally");
    expect(el.querySelector(".open-scene")?.getAttribute("data-public")).toBe(
      "false"
    );
  });

  it("notifies the legacy parent after global public deletion while preserving the property modal", async () => {
    const el = await mountView(true);
    await openProperties(el);
    await click(el, ".add-public");
    changedListeners.get(el)!.mockClear();
    const editor = el.querySelector(".scene-properties");
    await click(el, ".delete-public-globally");
    expect(el.querySelector(".scene-properties")).toBe(editor);
    expect(el.querySelector(".property-dialog")).not.toBeNull();
    expect(changedListeners.get(el)).toHaveBeenCalledTimes(1);
    expect(el.querySelector(".visibility-switch")).toBeNull();
  });

  it.each(["manager", "user"])(
    "hides unified scene property management for %s",
    async (role) => {
      mocks.role = role;
      const el = await mountView();
      await click(el, ".open-scene");
      expect(el.textContent).not.toContain("verse.properties.manage");
      expect(el.querySelector(".scene-properties")).toBeNull();
      expect(el.querySelectorAll(".vis-btn")).toHaveLength(0);
    }
  );

  it.each(["manager", "user"])(
    "hides unified legacy property management for %s",
    async (role) => {
      mocks.role = role;
      const el = await mountView(true);
      expect(el.textContent).not.toContain("verse.properties.manage");
      expect(el.querySelector(".scene-properties")).toBeNull();
      expect(el.querySelector(".visibility-switch")).toBeNull();
    }
  );
});
