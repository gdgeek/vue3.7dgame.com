import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, nextTick, reactive, ref } from "vue";
import { ElSelect, ElOption } from "element-plus";
import { createI18n } from "vue-i18n";
import en from "@/lang/en-US/verse";

const mocks = vi.hoisted(() => ({
  getVerses: vi.fn(),
  getVerse: vi.fn(),
  getAllVerses: vi.fn(),
  getAllVerse: vi.fn(),
  getGlobalScenePropertyOptions: vi.fn(),
  putVerse: vi.fn(),
  deleteVerse: vi.fn(),
  addTag: vi.fn(),
  removeTag: vi.fn(),
  getTags: vi.fn(),
  getPicture: vi.fn(),
  postFile: vi.fn(),
  fileMD5: vi.fn(),
  publicHandler: vi.fn(),
  fileHas: vi.fn(),
  fileUpload: vi.fn(),
  fileUrl: vi.fn(),
  routerPush: vi.fn(),
}));
const permission = reactive({ role: "root" });
const property = { id: 31, key: "interactive", info: "Interactive scenes" };
const otherProperty = { id: 32, key: "public", info: null };
const mine = {
  id: 673,
  author_id: 1,
  author: { id: 1, username: "root", nickname: "Root author" },
  name: "My scene",
  description: "Mine",
  public: false,
  editable: true,
  tags: [],
  metas: [],
};
const foreign = {
  id: 683,
  author_id: 99,
  author: { id: 99, username: "other", nickname: "Other author" },
  name: "Other private scene",
  description: "Private",
  public: false,
  editable: false,
  tags: [],
  metas: [],
};
const response = (data: unknown[], total = data.length) => ({
  data,
  headers: {
    "x-pagination-current-page": "1",
    "x-pagination-page-count": "2",
    "x-pagination-per-page": "24",
    "x-pagination-total-count": String(total),
  },
});

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}));
vi.mock("@casl/vue", () => ({
  useAbility: () => ({
    can: (role: string) =>
      role === "root"
        ? permission.role === "root"
        : role === "admin"
          ? ["root", "admin"].includes(permission.role)
          : false,
  }),
}));
vi.mock("@/api/v1/verse", () => ({
  ...mocks,
  postVerse: vi.fn(),
  takePhoto: vi.fn(),
}));
vi.mock("@/api/v1/scene-properties", () => ({
  getGlobalScenePropertyOptions: mocks.getGlobalScenePropertyOptions,
}));
vi.mock("@/api/v1/tags", () => ({
  getTags: mocks.getTags,
}));
vi.mock("@/components/Dialog", () => ({
  Message: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  MessageBox: { confirm: vi.fn(), prompt: vi.fn() },
}));
vi.mock("@/services/scene-package/export-service", () => ({
  exportScene: vi.fn(),
}));
vi.mock("@/api/v1/resources/index", () => ({ getPicture: mocks.getPicture }));
vi.mock("@/store/modules/config", () => ({
  useFileStore: () => ({
    store: {
      fileMD5: mocks.fileMD5,
      publicHandler: mocks.publicHandler,
      fileHas: mocks.fileHas,
      fileUpload: mocks.fileUpload,
      fileUrl: mocks.fileUrl,
    },
  }),
}));
vi.mock("@/api/v1/files", () => ({ postFile: mocks.postFile }));
vi.mock("@/utils/utilityFunctions", () => ({
  convertToLocalTime: (value: string) => value,
}));
vi.mock("@/components/StandardPage", () => ({
  PageActionBar: defineComponent({
    emits: ["search", "sort-change"],
    template: `<div><input class="scene-search" @change="$emit('search', $event.target.value)" /><button class="sort-scenes" @click="$emit('sort-change', 'name')">Sort</button><slot name="filters"/><slot name="actions"/></div>`,
  }),
  ViewContainer: defineComponent({
    props: { items: Array },
    emits: ["row-click"],
    template: `<div><div v-for="item in items" :key="item.id" class="scene-result"><button class="open-scene" :data-id="item.id" @click="$emit('row-click', item)">{{item.name}}</button><slot name="grid-card" :item="item"/></div></div>`,
  }),
  PagePagination: defineComponent({
    props: { currentPage: Number, totalPages: Number },
    emits: ["page-change"],
    template: `<div><span class="current-page">{{currentPage}}</span><button class="next-page" @click="$emit('page-change', 2)">Next</button></div>`,
  }),
  EmptyState: defineComponent({ template: "<div/>" }),
  StandardCard: defineComponent({
    props: { meta: Object },
    emits: ["view"],
    template: `<div class="scene-card" @click="$emit('view')"><span class="card-author">{{meta?.author}}</span><slot name="actions"/></div>`,
  }),
  DetailPanel: defineComponent({
    props: {
      modelValue: Boolean,
      editable: Boolean,
      showDelete: Boolean,
      name: String,
    },
    emits: ["close", "update:modelValue", "rename"],
    template: `<section v-if="modelValue" class="detail-panel" :data-editable="String(editable)" :data-delete="String(showDelete)"><h2>{{name}}</h2><input v-if="editable" class="rename-scene-input" :value="name" @change="$emit('rename', $event.target.value)"/><slot name="preview"/><slot name="actions"><button class="fallback-export">Export scene</button></slot><slot name="info"/><button class="close-detail" @click="$emit('close'); $emit('update:modelValue',false)">Close</button></section>`,
  }),
}));
vi.mock("@/components/MrPP/MrPPVerse/ScenePropertiesDialog.vue", () => ({
  default: defineComponent({
    props: { sceneId: Number },
    emits: ["added", "removed", "globally-deleted"],
    template: `<div class="property-management" :data-id="sceneId"><button class="unlink-filter-property" @click="$emit('removed', {id:31,key:'interactive',info:null})">Unlink</button><button class="unlink-other-property" @click="$emit('removed', {id:32,key:'public',info:null})">Unlink another property</button><button class="create-property" @click="$emit('added', {id:33,key:'new-property',info:null})">Create property</button><button class="delete-filter-property" @click="$emit('globally-deleted', {id:31,key:'interactive',info:null})">Delete property</button></div>`,
  }),
}));
vi.mock("@/components/TransitionWrapper.vue", () => ({
  default: defineComponent({ template: "<div><slot/></div>" }),
}));
vi.mock("@/components/TagsSelect.vue", () => ({
  default: defineComponent({
    emits: ["tags-change"],
    template: `<button class="filter-tag" @click="$emit('tags-change',[5])">Tag</button>`,
  }),
}));
vi.mock("@/components/MrPP/MrPPVerse/MrPPVerseWindowCreate.vue", () => ({
  default: defineComponent({ template: "<div/>" }),
}));
vi.mock("@/components/ScenePackage/ImportDialog.vue", () => ({
  default: defineComponent({ template: "<div/>" }),
}));
vi.mock("@/components/MrPP/ResourceDialog.vue", () => ({
  default: defineComponent({
    emits: ["selected"],
    setup(_props, { expose }) {
      const visible = ref(false);
      expose({ openIt: () => (visible.value = true) });
      return {
        visible,
        resource: {
          id: 71,
          type: "picture",
          context: { image_id: 501 },
          image: { id: 501, url: "https://files.test/cover.png" },
        },
      };
    },
    template: `<button v-if="visible" class="choose-cover-resource" @click="$emit('selected', resource); visible = false">Choose cover</button>`,
  }),
}));

const cleanups: Array<() => void> = [];
async function flush() {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
    await nextTick();
  }
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
async function mount(scope: "mine" | "all" | null = "all") {
  const { default: Index } = await import("@/views/meta-verse/index.vue");
  const el = document.createElement("div");
  document.body.append(el);
  const app = createApp(Index, scope ? { scope } : {});
  app.use(
    createI18n({
      legacy: false,
      locale: "en-US",
      messages: { "en-US": en },
      missingWarn: false,
      fallbackWarn: false,
    })
  );
  app.component("ElSelect", ElSelect);
  app.component("ElOption", ElOption);
  app.component(
    "ElButton",
    defineComponent({ template: "<button><slot/></button>" })
  );
  app.component(
    "ElInput",
    defineComponent({
      props: { modelValue: String, readonly: Boolean },
      emits: ["update:modelValue"],
      template: `<textarea :value="modelValue" :readonly="readonly" @input="$emit('update:modelValue', $event.target.value)"/>`,
    })
  );
  app.component(
    "ElTag",
    defineComponent({
      props: { closable: Boolean },
      emits: ["close"],
      template: `<span class="scene-tag"><slot/><button v-if="closable" class="remove-scene-tag" @click="$emit('close')">Remove tag</button></span>`,
    })
  );
  for (const name of [
    "ElIcon",
    "ElDropdown",
    "ElDropdownMenu",
    "ElDropdownItem",
    "ElDialog",
    "ElEmpty",
    "FontAwesomeIcon",
  ])
    app.component(name, defineComponent({ template: "<div><slot/></div>" }));
  app.config.globalProperties.$t = (key: string) => key;
  app.mount(el);
  cleanups.push(() => {
    app.unmount();
    el.remove();
  });
  await flush();
  return el;
}
async function click(el: HTMLElement, selector: string) {
  const button = el.querySelector<HTMLElement>(selector);
  expect(button).not.toBeNull();
  button!.click();
  await flush();
}
async function choose(el: HTMLElement, key: string) {
  const combobox = el.querySelector<HTMLElement>(
    '.scene-property-filter [role="combobox"]'
  )!;
  combobox.click();
  await flush();
  const option = Array.from(
    document.body.querySelectorAll<HTMLElement>('[role="option"]')
  ).find((item) => item.textContent?.includes(key));
  expect(option).toBeDefined();
  option!.click();
  await flush();
}
async function clear(el: HTMLElement) {
  const select = el.querySelector<HTMLElement>(
    ".scene-property-filter__select"
  )!;
  select.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
  await flush();
  await click(el, ".scene-property-filter__select .el-select__clear");
}
async function renameScene(el: HTMLElement, name: string) {
  const input = el.querySelector<HTMLInputElement>(".rename-scene-input")!;
  expect(input).not.toBeNull();
  input.value = name;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await flush();
}
async function searchAuthor(el: HTMLElement, author: string, submit = false) {
  const input = el.querySelector<HTMLTextAreaElement>(".scene-author-filter")!;
  expect(input).not.toBeNull();
  input.value = author;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  if (submit) {
    input.dispatchEvent(
      new KeyboardEvent("keyup", { key: "Enter", bubbles: true })
    );
    await flush();
  }
}
async function editDescription(
  el: HTMLElement,
  description: string,
  blur = true
) {
  const input = el.querySelector<HTMLTextAreaElement>(
    ".detail-panel textarea"
  )!;
  expect(input).not.toBeNull();
  input.value = description;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  if (blur) {
    input.dispatchEvent(new Event("blur", { bubbles: true }));
    await flush();
  }
}
async function addFeaturedTag(el: HTMLElement) {
  await click(el, '.tag-select [role="combobox"]');
  const option = Array.from(
    document.body.querySelectorAll<HTMLElement>('[role="option"]')
  ).find((item) => item.textContent?.includes("Featured"));
  expect(option).toBeDefined();
  option!.click();
  await flush();
}
async function selectCoverResource(el: HTMLElement) {
  await click(el, ".detail-panel .verse-preview");
  await click(el, ".selection-card");
  await click(el, ".choose-cover-resource");
}
async function uploadCover(el: HTMLElement) {
  const input = el.querySelector<HTMLInputElement>(
    '.detail-panel input[type="file"]'
  )!;
  expect(input).not.toBeNull();
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [new File(["cover"], "cover.png", { type: "image/png" })],
  });
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await flush();
}
beforeEach(() => {
  permission.role = "root";
  vi.resetAllMocks();
  mocks.getGlobalScenePropertyOptions.mockResolvedValue({
    data: [property, otherProperty],
  });
  mocks.getVerses.mockImplementation(async (params) => ({
    ...response([structuredClone(mine)]),
    headers: {
      ...response([mine]).headers,
      "x-pagination-current-page": String(params.page),
    },
  }));
  mocks.getVerse.mockImplementation(async () => ({
    data: structuredClone(mine),
  }));
  mocks.getAllVerses.mockImplementation(async (params) => ({
    ...response([structuredClone(mine), structuredClone(foreign)]),
    headers: {
      ...response([mine, foreign]).headers,
      "x-pagination-current-page": String(params.page),
    },
  }));
  mocks.getAllVerse.mockImplementation(async (id) => ({
    data: structuredClone(id === mine.id ? mine : foreign),
  }));
  mocks.putVerse.mockResolvedValue({ data: {} });
  mocks.addTag.mockResolvedValue({ data: {} });
  mocks.removeTag.mockResolvedValue({ data: {} });
  mocks.getTags.mockResolvedValue({ data: [{ id: 5, name: "Featured" }] });
  mocks.getPicture.mockResolvedValue({ data: { file: { id: 502 } } });
  mocks.postFile.mockResolvedValue({ data: { id: 901 } });
  mocks.fileMD5.mockResolvedValue("cover-md5");
  mocks.publicHandler.mockResolvedValue("public");
  mocks.fileHas.mockResolvedValue(false);
  mocks.fileUpload.mockResolvedValue(undefined);
  mocks.fileUrl.mockReturnValue("https://files.test/uploaded-cover.png");
});
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  vi.useRealTimers();
});

describe("root all-scenes view and property filtering", () => {
  it.each(["root", "admin", "user"])(
    "keeps the default personal list isolated from global APIs as %s",
    async (role) => {
      permission.role = role;
      const el = await mount(null);
      expect(mocks.getVerses).toHaveBeenCalledTimes(1);
      expect(mocks.getAllVerses).not.toHaveBeenCalled();
      expect(mocks.getGlobalScenePropertyOptions).not.toHaveBeenCalled();
      expect(el.querySelector(".scene-property-filter")).toBeNull();
      expect(el.querySelector(".scene-author-filter")).toBeNull();
      expect(el.textContent).toContain(mine.name);
      expect(el.textContent).not.toContain(foreign.name);
      await click(el, '.open-scene[data-id="673"]');
      expect(mocks.getVerse).toHaveBeenCalledWith(
        673,
        "image,author,tags,metas"
      );
      expect(mocks.getAllVerse).not.toHaveBeenCalled();
      expect(el.querySelector(".detail-panel .enter-edit-btn")).not.toBeNull();
    }
  );
  it("keeps personal search, tags and pagination on the personal API for root", async () => {
    const el = await mount("mine");
    const input = el.querySelector<HTMLInputElement>(".scene-search")!;
    input.value = "my dragon";
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await flush();
    await click(el, ".filter-tag");
    await click(el, ".next-page");
    expect(mocks.getVerses).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "my dragon", tags: [5], page: 2 })
    );
    expect(mocks.getAllVerses).not.toHaveBeenCalled();
    expect(mocks.getGlobalScenePropertyOptions).not.toHaveBeenCalled();
  });
  it("long-presses an owned scene into its editor without opening information, and respects read-only scenes", async () => {
    const el = await mount();
    await choose(el, property.key);
    vi.useFakeTimers();
    for (const id of [673, 683]) {
      const card = el
        .querySelector(`.open-scene[data-id="${id}"]`)!
        .closest(".scene-result")!
        .querySelector<HTMLElement>(".scene-card")!;
      card.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
      vi.advanceTimersByTime(1100);
      card.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
      card.click();
      if (id === 673) {
        expect(mocks.routerPush).toHaveBeenCalledTimes(1);
        expect(mocks.routerPush).toHaveBeenCalledWith({
          path: "/verse/scene",
          query: { id: 673, title: expect.any(String) },
        });
        expect(mocks.getAllVerse).not.toHaveBeenCalled();
      }
    }
    expect(mocks.routerPush).toHaveBeenCalledTimes(1);
    expect(mocks.getAllVerse).toHaveBeenCalledWith(
      683,
      "image,author,tags,metas,public"
    );
  });
  it("loads scenes from mixed authors and keeps all scenes after clearing a property", async () => {
    const el = await mount();
    expect(mocks.getVerses).not.toHaveBeenCalled();
    expect(mocks.getAllVerses).toHaveBeenCalledTimes(1);
    expect(el.textContent).toContain(mine.name);
    expect(el.textContent).toContain(foreign.name);
    expect(el.querySelectorAll(".card-author")[0]?.textContent).toBe(
      "Root author"
    );
    expect(el.querySelectorAll(".card-author")[1]?.textContent).toBe(
      "Other author"
    );
    await choose(el, property.key);
    expect(mocks.getAllVerses).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: property.id,
        page: 1,
        perPage: 24,
        expand: "image,author,public",
      })
    );
    expect(el.querySelector(".scene-property-scope")).toBeNull();
    expect(el.textContent).toContain(foreign.name);
    await clear(el);
    expect(mocks.getVerses).not.toHaveBeenCalled();
    expect(mocks.getAllVerses).toHaveBeenLastCalledWith(
      expect.objectContaining({ propertyId: undefined, page: 1 })
    );
    expect(el.querySelector(".scene-property-scope")).toBeNull();
    expect(el.textContent).toContain(foreign.name);
  });
  it.each(["admin", "manager", "user"])(
    "does not fetch or expose all-scene metadata when mounted directly as %s",
    async (role) => {
      permission.role = role;
      const el = await mount();
      expect(el.querySelector(".scene-property-filter")).toBeNull();
      expect(mocks.getGlobalScenePropertyOptions).not.toHaveBeenCalled();
      expect(mocks.getAllVerses).not.toHaveBeenCalled();
      expect(mocks.getAllVerse).not.toHaveBeenCalled();
      expect(mocks.getVerses).not.toHaveBeenCalled();
      expect(mocks.getVerse).not.toHaveBeenCalled();
      expect(mocks.getTags).not.toHaveBeenCalled();
      expect(el.querySelector(".scene-author-filter")).toBeNull();
      expect(el.querySelector(".scene-result")).toBeNull();
      expect(el.querySelector(".property-management")).toBeNull();
      expect(el.textContent).not.toContain(foreign.name);
    }
  );
  it("preserves search and tag filters and resets pagination when changing property scope", async () => {
    const el = await mount();
    const input = el.querySelector<HTMLInputElement>(".scene-search")!;
    input.value = "dragon";
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await flush();
    await click(el, ".filter-tag");
    await click(el, ".next-page");
    expect(el.querySelector(".current-page")?.textContent).toBe("2");
    await choose(el, property.key);
    expect(el.querySelector(".current-page")?.textContent).toBe("1");
    expect(mocks.getAllVerses).toHaveBeenLastCalledWith(
      expect.objectContaining({
        propertyId: property.id,
        search: "dragon",
        tags: [5],
        page: 1,
      })
    );
    await click(el, ".sort-scenes");
    expect(mocks.getAllVerses).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: "name" })
    );
  });
  it("debounces author input for 300 ms while preserving independent scene, tag and property searches", async () => {
    const el = await mount();
    const input = el.querySelector<HTMLInputElement>(".scene-search")!;
    input.value = "dragon";
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await flush();
    await click(el, ".filter-tag");
    await choose(el, property.key);
    await click(el, ".next-page");
    expect(el.querySelector(".current-page")?.textContent).toBe("2");
    mocks.getAllVerses.mockClear();
    vi.useFakeTimers();

    await searchAuthor(el, "  张三 author  ");
    vi.advanceTimersByTime(299);
    await flush();
    expect(mocks.getAllVerses).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    await flush();
    expect(mocks.getAllVerses).toHaveBeenCalledTimes(1);
    expect(mocks.getAllVerses).toHaveBeenLastCalledWith(
      expect.objectContaining({
        authorSearch: "张三 author",
        search: "dragon",
        propertyId: 31,
        tags: [5],
        page: 1,
      })
    );
    expect(el.querySelector(".current-page")?.textContent).toBe("1");
    expect(mocks.getVerses).not.toHaveBeenCalled();
  });
  it("submits author search immediately on Enter without a delayed duplicate, and clear resets pagination", async () => {
    const el = await mount();
    await choose(el, property.key);
    vi.useFakeTimers();
    mocks.getAllVerses.mockClear();
    await searchAuthor(el, "nickname", true);
    expect(mocks.getAllVerses).toHaveBeenCalledTimes(1);
    expect(mocks.getAllVerses).toHaveBeenLastCalledWith(
      expect.objectContaining({
        authorSearch: "nickname",
        propertyId: 31,
        page: 1,
      })
    );
    vi.advanceTimersByTime(400);
    await flush();
    expect(mocks.getAllVerses).toHaveBeenCalledTimes(1);
    await click(el, ".next-page");
    expect(el.querySelector(".current-page")?.textContent).toBe("2");
    await searchAuthor(el, "");
    expect(mocks.getAllVerses).toHaveBeenLastCalledWith(
      expect.objectContaining({
        authorSearch: undefined,
        propertyId: 31,
        page: 1,
      })
    );
    expect(el.querySelector(".current-page")?.textContent).toBe("1");
  });
  it("ignores the previous author's delayed list after a new author query is applied", async () => {
    const el = await mount();
    const previous = deferred<ReturnType<typeof response>>();
    mocks.getAllVerses.mockReturnValueOnce(previous.promise);
    await searchAuthor(el, "first author", true);
    await searchAuthor(el, "second author", true);
    expect(mocks.getAllVerses).toHaveBeenLastCalledWith(
      expect.objectContaining({ authorSearch: "second author" })
    );
    previous.resolve(response([{ ...foreign, name: "Outdated author match" }]));
    await flush();
    expect(el.textContent).not.toContain("Outdated author match");
    expect(el.textContent).toContain(mine.name);
    expect(el.textContent).toContain(foreign.name);
  });
  it("lets root edit cross-owner metadata and properties without enabling content editing or deletion", async () => {
    const el = await mount();
    await click(el, '.open-scene[data-id="683"]');
    expect(mocks.getAllVerse).toHaveBeenCalledWith(
      683,
      "image,author,tags,metas,public"
    );
    expect(mocks.getVerse).not.toHaveBeenCalled();
    expect(
      el.querySelector(".detail-panel")?.getAttribute("data-editable")
    ).toBe("true");
    expect(el.querySelector(".detail-panel")?.getAttribute("data-delete")).toBe(
      "false"
    );
    expect(
      el.querySelector(".property-management")?.getAttribute("data-id")
    ).toBe("683");
    expect(el.querySelector(".detail-panel .enter-edit-btn")).toBeNull();
    expect(el.querySelector(".detail-panel .fallback-export")).toBeNull();
    expect(el.querySelector(".detail-panel .btn-pill-secondary")).toBeNull();
    expect(
      el.querySelector<HTMLTextAreaElement>(".detail-panel textarea")?.readOnly
    ).toBe(false);
  });
  it("saves root cross-owner name, description and tag changes against that scene", async () => {
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');

    await renameScene(el, "Renamed foreign scene");
    expect(mocks.putVerse).toHaveBeenLastCalledWith(683, {
      name: "Renamed foreign scene",
    });
    expect(el.querySelector(".detail-panel h2")?.textContent).toBe(
      "Renamed foreign scene"
    );

    await editDescription(el, "Foreign scene metadata updated by root");
    expect(mocks.putVerse).toHaveBeenLastCalledWith(683, {
      description: "Foreign scene metadata updated by root",
    });
    await addFeaturedTag(el);
    expect(mocks.addTag).toHaveBeenCalledWith(683, 5);
    expect(el.querySelector(".detail-panel .scene-tag")?.textContent).toContain(
      "Featured"
    );
    await click(el, ".detail-panel .remove-scene-tag");
    expect(mocks.removeTag).toHaveBeenCalledWith(683, 5);
    expect(el.querySelector(".detail-panel .scene-tag")).toBeNull();
    expect(mocks.deleteVerse).not.toHaveBeenCalled();
    expect(mocks.routerPush).not.toHaveBeenCalled();
  });
  it("saves a root cross-owner cover selected from existing picture resources", async () => {
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');
    await selectCoverResource(el);
    expect(mocks.getPicture).toHaveBeenCalledWith(71);
    expect(mocks.putVerse).toHaveBeenCalledWith(683, { image_id: 502 });
    expect(mocks.putVerse).toHaveBeenCalledTimes(1);
  });
  it("does not apply a selected cover to scene B when its picture read started in scene A", async () => {
    const picture = deferred<{ data: { file: { id: number } } }>();
    mocks.getPicture.mockReturnValueOnce(picture.promise);
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');
    await selectCoverResource(el);
    expect(mocks.getPicture).toHaveBeenCalledWith(71);
    await click(el, '.open-scene[data-id="673"]');
    picture.resolve({ data: { file: { id: 502 } } });
    await flush();
    expect(mocks.putVerse).not.toHaveBeenCalled();
    expect(el.querySelector(".detail-panel h2")?.textContent).toBe(mine.name);
  });
  it("does not write an uploaded cover after the detail target changed to scene B", async () => {
    const upload = deferred<void>();
    mocks.fileUpload.mockReturnValueOnce(upload.promise);
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');
    await uploadCover(el);
    expect(mocks.fileUpload).toHaveBeenCalledTimes(1);
    await click(el, '.open-scene[data-id="673"]');
    upload.resolve();
    await flush();
    expect(mocks.putVerse).not.toHaveBeenCalled();
    expect(el.querySelector(".detail-panel h2")?.textContent).toBe(mine.name);
  });
  it("does not restore scene A or change scene B after a late cover save acknowledgement", async () => {
    const save = deferred<{ data: object }>();
    mocks.putVerse.mockReturnValueOnce(save.promise);
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');
    await selectCoverResource(el);
    expect(mocks.putVerse).toHaveBeenCalledWith(683, { image_id: 502 });
    await click(el, '.open-scene[data-id="673"]');
    save.resolve({ data: {} });
    await flush();
    expect(el.querySelector(".detail-panel h2")?.textContent).toBe(mine.name);
    expect(mocks.getAllVerse).toHaveBeenLastCalledWith(
      673,
      "image,author,tags,metas,public"
    );
  });
  it("does not change scene B after a late rename acknowledgement for scene A", async () => {
    const save = deferred<{ data: object }>();
    mocks.putVerse.mockReturnValueOnce(save.promise);
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');
    await renameScene(el, "Renamed scene A");
    expect(mocks.putVerse).toHaveBeenCalledWith(683, {
      name: "Renamed scene A",
    });
    await click(el, '.open-scene[data-id="673"]');
    save.resolve({ data: {} });
    await flush();
    expect(el.querySelector(".detail-panel h2")?.textContent).toBe(mine.name);
    expect(mocks.putVerse).toHaveBeenCalledTimes(1);
  });
  it("keeps scene B's description draft unsaved after scene A's acknowledgement", async () => {
    const save = deferred<{ data: object }>();
    mocks.putVerse.mockReturnValueOnce(save.promise);
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');
    await editDescription(el, "Scene A description");
    expect(mocks.putVerse).toHaveBeenCalledWith(683, {
      description: "Scene A description",
    });
    await click(el, '.open-scene[data-id="673"]');
    await editDescription(el, "Scene B draft", false);
    save.resolve({ data: {} });
    await flush();
    expect(
      el.querySelector<HTMLTextAreaElement>(".detail-panel textarea")?.value
    ).toBe("Scene B draft");
    el.querySelector(".detail-panel textarea")!.dispatchEvent(
      new Event("blur", { bubbles: true })
    );
    await flush();
    expect(mocks.putVerse).toHaveBeenLastCalledWith(673, {
      description: "Scene B draft",
    });
    expect(mocks.putVerse).toHaveBeenCalledTimes(2);
  });
  it("does not discard scene B's description draft when scene A's save fails", async () => {
    const save = deferred<{ data: object }>();
    mocks.putVerse.mockReturnValueOnce(save.promise);
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');
    await editDescription(el, "Scene A description");
    await click(el, '.open-scene[data-id="673"]');
    await editDescription(el, "Scene B draft", false);
    save.reject(new Error("Scene A unavailable"));
    await flush();
    expect(
      el.querySelector<HTMLTextAreaElement>(".detail-panel textarea")?.value
    ).toBe("Scene B draft");
  });
  it("does not add scene A's pending tag to scene B", async () => {
    const save = deferred<{ data: object }>();
    mocks.addTag.mockReturnValueOnce(save.promise);
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');
    await addFeaturedTag(el);
    expect(mocks.addTag).toHaveBeenCalledWith(683, 5);
    await click(el, '.open-scene[data-id="673"]');
    save.resolve({ data: {} });
    await flush();
    expect(el.querySelector(".detail-panel .scene-tag")).toBeNull();
    expect(el.querySelector(".detail-panel h2")?.textContent).toBe(mine.name);
  });
  it("does not complete a cross-owner cover selection after root access is revoked", async () => {
    const picture = deferred<{ data: { file: { id: number } } }>();
    mocks.getPicture.mockReturnValueOnce(picture.promise);
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');
    await selectCoverResource(el);
    permission.role = "admin";
    await flush();
    picture.resolve({ data: { file: { id: 502 } } });
    await flush();
    expect(mocks.putVerse).not.toHaveBeenCalled();
    expect(el.querySelector(".detail-panel")).toBeNull();
    expect(el.querySelector(".scene-property-filter")).toBeNull();
  });
  it("does not reopen a late all-scene detail after root access is revoked and restored", async () => {
    const detail = deferred<{ data: typeof foreign }>();
    mocks.getAllVerse.mockReturnValueOnce(detail.promise);
    const el = await mount();
    await click(el, '.open-scene[data-id="683"]');
    permission.role = "admin";
    await flush();
    detail.resolve({ data: foreign });
    await flush();
    permission.role = "root";
    await flush();
    expect(el.querySelector(".detail-panel")).toBeNull();
    expect(el.querySelector(".property-management")).toBeNull();
    expect(mocks.getTags).not.toHaveBeenCalled();
  });
  it("keeps editing in owned-scene details and removes card edit actions for all scenes", async () => {
    const el = await mount();
    await choose(el, property.key);
    const foreignCard = el
      .querySelector('.open-scene[data-id="683"]')!
      .closest(".scene-result")!;
    const ownedCard = el
      .querySelector('.open-scene[data-id="673"]')!
      .closest(".scene-result")!;
    expect(foreignCard.querySelector(".single-card-action-btn")).toBeNull();
    expect(ownedCard.querySelector(".single-card-action-btn")).toBeNull();
    mocks.getAllVerse.mockResolvedValueOnce({ data: mine });
    await click(el, '.open-scene[data-id="673"]');
    expect(el.querySelector(".detail-panel .enter-edit-btn")).not.toBeNull();
  });

  it("clears global data and details immediately on role loss without falling back to personal data", async () => {
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');
    const previousAllCalls = mocks.getAllVerses.mock.calls.length;
    permission.role = "admin";
    await flush();
    expect(el.querySelector(".scene-property-filter")).toBeNull();
    expect(el.querySelector(".detail-panel")).toBeNull();
    expect(el.textContent).not.toContain(foreign.name);
    expect(el.querySelector(".scene-author-filter")).toBeNull();
    expect(el.textContent).not.toContain(mine.name);
    expect(mocks.getVerses).not.toHaveBeenCalled();
    expect(mocks.getAllVerses).toHaveBeenCalledTimes(previousAllCalls);
  });
  it("closes details and removes the scene immediately when unlinking the selected global property", async () => {
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');
    const matches = deferred<ReturnType<typeof response>>();
    mocks.getAllVerses.mockClear();
    mocks.getAllVerses.mockReturnValueOnce(matches.promise);
    await click(el, ".unlink-filter-property");
    expect(mocks.getAllVerses).toHaveBeenCalledTimes(1);
    expect(el.querySelector(".detail-panel")).toBeNull();
    expect(el.querySelector('.open-scene[data-id="683"]')).toBeNull();
    expect(mocks.getAllVerse).toHaveBeenCalledTimes(1);
    expect(mocks.getVerses).not.toHaveBeenCalled();
    expect(el.querySelector(".scene-property-scope")).toBeNull();
    matches.resolve(response([mine]));
    await flush();
    expect(el.textContent).not.toContain(foreign.name);
  });
  it("reloads global scene details in the all-scenes scope after unlinking another property", async () => {
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');
    const editor = el.querySelector(".property-management");
    mocks.getAllVerse.mockResolvedValueOnce({
      data: { ...foreign, name: "Updated private scene" },
    });
    await click(el, ".unlink-other-property");
    expect(mocks.getAllVerse).toHaveBeenLastCalledWith(
      683,
      "image,author,tags,metas,public"
    );
    expect(mocks.getAllVerse).toHaveBeenCalledTimes(2);
    expect(mocks.getVerse).not.toHaveBeenCalled();
    expect(el.querySelector(".detail-panel h2")?.textContent).toBe(
      "Updated private scene"
    );
    expect(el.querySelector(".property-management")).toBe(editor);
  });
  it("does not restore an unlinked scene from an earlier in-flight detail refresh", async () => {
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');
    const previous = deferred<{ data: typeof foreign }>();
    mocks.getAllVerse.mockReturnValueOnce(previous.promise);
    await click(el, ".unlink-other-property");
    mocks.getAllVerses.mockResolvedValueOnce(response([mine]));
    await click(el, ".unlink-filter-property");
    previous.resolve({ data: foreign });
    await flush();
    expect(el.querySelector(".detail-panel")).toBeNull();
    expect(el.querySelector(".property-management")).toBeNull();
    expect(el.textContent).not.toContain(foreign.name);
  });
  it("keeps refreshed details closed when the global scope is cleared before the response", async () => {
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');
    const previous = deferred<{ data: typeof foreign }>();
    mocks.getAllVerse.mockReturnValueOnce(previous.promise);
    await click(el, ".unlink-other-property");
    await clear(el);
    previous.resolve({ data: foreign });
    await flush();
    expect(el.querySelector(".detail-panel")).toBeNull();
    expect(el.textContent).toContain(mine.name);
    expect(el.textContent).toContain(foreign.name);
  });
  it("clears a deleted selected property, closes its details, and reloads all scenes", async () => {
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');
    mocks.getGlobalScenePropertyOptions.mockResolvedValueOnce({
      data: [otherProperty],
    });
    await click(el, ".delete-filter-property");
    expect(el.querySelector(".detail-panel")).toBeNull();
    expect(el.querySelector(".scene-property-scope")).toBeNull();
    expect(mocks.getVerses).not.toHaveBeenCalled();
    expect(mocks.getAllVerses).toHaveBeenLastCalledWith(
      expect.objectContaining({ propertyId: undefined, page: 1 })
    );
  });
  it("retries a failed global property catalog without repeating the all-scenes query", async () => {
    mocks.getGlobalScenePropertyOptions.mockRejectedValueOnce(
      new Error("offline")
    );
    const el = await mount();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      "Could not load"
    );
    const retry = Array.from(
      el.querySelectorAll<HTMLButtonElement>("button")
    ).find((button) => button.textContent?.includes("Reload properties"))!;
    retry.click();
    await flush();
    expect(mocks.getGlobalScenePropertyOptions).toHaveBeenCalledTimes(2);
    expect(mocks.getAllVerses).toHaveBeenCalledTimes(1);
  });
  it("ignores late global details after clearing the scope", async () => {
    const detail = deferred<unknown>();
    mocks.getAllVerse.mockReturnValueOnce(detail.promise);
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');
    await clear(el);
    detail.resolve({ data: foreign });
    await flush();
    expect(el.querySelector(".detail-panel")).toBeNull();
    expect(el.querySelector(".property-management")).toBeNull();
  });
  it("ignores a late root catalog response after role loss", async () => {
    const catalog = deferred<unknown>();
    mocks.getGlobalScenePropertyOptions.mockReturnValueOnce(catalog.promise);
    const el = await mount();
    permission.role = "admin";
    await flush();
    catalog.resolve({ data: [property] });
    await flush();
    expect(el.querySelector(".scene-property-filter")).toBeNull();
    expect(mocks.getAllVerses).toHaveBeenCalledTimes(1);
  });
  it("ignores an older property-filtered list response after clearing the property", async () => {
    const globalList = deferred<ReturnType<typeof response>>();
    const el = await mount();
    mocks.getAllVerses.mockReturnValueOnce(globalList.promise);
    await choose(el, property.key);
    await clear(el);
    expect(el.textContent).toContain(mine.name);
    globalList.resolve(response([foreign]));
    await flush();
    expect(el.textContent).toContain(mine.name);
    expect(el.textContent).toContain(foreign.name);
    expect(el.querySelectorAll(".scene-result")).toHaveLength(2);
  });

  it("discards an in-flight global list response after root access is revoked", async () => {
    const globalList = deferred<ReturnType<typeof response>>();
    const el = await mount();
    mocks.getAllVerses.mockReturnValueOnce(globalList.promise);
    await choose(el, property.key);
    permission.role = "admin";
    await flush();
    globalList.resolve(response([foreign]));
    await flush();
    expect(el.textContent).not.toContain(foreign.name);
    expect(el.querySelectorAll(".scene-result")).toHaveLength(0);
    permission.role = "root";
    await flush();
    expect(el.querySelectorAll(".scene-result")).toHaveLength(0);
    expect(mocks.getVerses).not.toHaveBeenCalled();
  });

  it("keeps a globally deleted property out of a late catalog refresh", async () => {
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');
    const oldCatalog = deferred<unknown>();
    mocks.getGlobalScenePropertyOptions
      .mockReturnValueOnce(oldCatalog.promise)
      .mockResolvedValueOnce({ data: [otherProperty] });
    await click(el, ".create-property");
    await click(el, ".delete-filter-property");
    oldCatalog.resolve({ data: [property, otherProperty] });
    await flush();
    el.querySelector<HTMLElement>(
      '.scene-property-filter [role="combobox"]'
    )!.click();
    await flush();
    const optionTexts = Array.from(
      document.body.querySelectorAll('[role="option"]')
    ).map((item) => item.textContent);
    expect(optionTexts.join(" ")).not.toContain(property.key);
    expect(optionTexts.join(" ")).toContain(otherProperty.key);
  });
});
