import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, nextTick, reactive } from "vue";
import { ElSelect, ElOption } from "element-plus";
import { createI18n } from "vue-i18n";
import en from "@/lang/en-US/verse";

const mocks = vi.hoisted(() => ({
  getVerses: vi.fn(),
  getVerse: vi.fn(),
  getGlobalScenePropertyOptions: vi.fn(),
  getScenesByProperty: vi.fn(),
  getSceneByProperty: vi.fn(),
  putVerse: vi.fn(),
  deleteVerse: vi.fn(),
  routerPush: vi.fn(),
}));
const permission = reactive({ role: "root" });
const property = { id: 31, key: "interactive", info: "Interactive scenes" };
const otherProperty = { id: 32, key: "public", info: null };
const mine = {
  id: 673,
  name: "My scene",
  description: "Mine",
  public: false,
  editable: true,
  tags: [],
  metas: [],
};
const foreign = {
  id: 683,
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
  addTag: vi.fn(),
  removeTag: vi.fn(),
  takePhoto: vi.fn(),
}));
vi.mock("@/api/v1/scene-properties", () => ({
  getGlobalScenePropertyOptions: mocks.getGlobalScenePropertyOptions,
  getScenesByProperty: mocks.getScenesByProperty,
  getSceneByProperty: mocks.getSceneByProperty,
}));
vi.mock("@/api/v1/tags", () => ({
  getTags: vi.fn(async () => ({ data: [] })),
}));
vi.mock("@/components/Dialog", () => ({
  Message: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  MessageBox: { confirm: vi.fn(), prompt: vi.fn() },
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
    emits: ["view"],
    template: `<div class="scene-card" @click="$emit('view')"><slot name="actions"/></div>`,
  }),
  DetailPanel: defineComponent({
    props: {
      modelValue: Boolean,
      editable: Boolean,
      showDelete: Boolean,
      name: String,
    },
    emits: ["close", "update:modelValue"],
    template: `<section v-if="modelValue" class="detail-panel" :data-editable="String(editable)" :data-delete="String(showDelete)"><h2>{{name}}</h2><slot name="actions"><button class="fallback-export">Export scene</button></slot><slot name="info"/><button class="close-detail" @click="$emit('close'); $emit('update:modelValue',false)">Close</button></section>`,
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
  default: defineComponent({ template: "<div/>" }),
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
async function mount() {
  const { default: Index } = await import("@/views/meta-verse/index.vue");
  const el = document.createElement("div");
  document.body.append(el);
  const app = createApp(Index);
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
      template: `<textarea :readonly="readonly">{{modelValue}}</textarea>`,
    })
  );
  for (const name of [
    "ElTag",
    "ElIcon",
    "ElDropdown",
    "ElDropdownMenu",
    "ElDropdownItem",
    "ElDialog",
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
beforeEach(() => {
  permission.role = "root";
  vi.resetAllMocks();
  mocks.getGlobalScenePropertyOptions.mockResolvedValue({
    data: [property, otherProperty],
  });
  mocks.getVerses.mockImplementation(async (params) => ({
    ...response([mine]),
    headers: {
      ...response([mine]).headers,
      "x-pagination-current-page": String(params.page),
    },
  }));
  mocks.getVerse.mockResolvedValue({ data: mine });
  mocks.getScenesByProperty.mockResolvedValue(response([mine, foreign]));
  mocks.getSceneByProperty.mockResolvedValue({ data: foreign });
});
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  vi.useRealTimers();
});

describe("root global scene filtering by property", () => {
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
        expect(mocks.getSceneByProperty).not.toHaveBeenCalled();
      }
    }
    expect(mocks.routerPush).toHaveBeenCalledTimes(1);
    expect(mocks.getSceneByProperty).toHaveBeenCalledWith(
      683,
      31,
      "image,author,tags,metas,public"
    );
  });
  it("starts in my scenes, filters across owners, and clears back to my scenes", async () => {
    const el = await mount();
    expect(mocks.getVerses).toHaveBeenCalledTimes(1);
    expect(mocks.getScenesByProperty).not.toHaveBeenCalled();
    await choose(el, property.key);
    expect(mocks.getScenesByProperty).toHaveBeenCalledWith(
      property.id,
      expect.objectContaining({
        page: 1,
        perPage: 24,
        expand: "image,author,public",
      })
    );
    expect(el.querySelector(".scene-property-scope")).toBeNull();
    expect(el.textContent).toContain(foreign.name);
    await clear(el);
    expect(mocks.getVerses).toHaveBeenCalledTimes(2);
    expect(el.querySelector(".scene-property-scope")).toBeNull();
    expect(el.textContent).not.toContain(foreign.name);
  });
  it.each(["admin", "manager", "user"])(
    "does not show or call global property APIs for %s",
    async (role) => {
      permission.role = role;
      const el = await mount();
      expect(el.querySelector(".scene-property-filter")).toBeNull();
      expect(mocks.getGlobalScenePropertyOptions).not.toHaveBeenCalled();
      expect(mocks.getScenesByProperty).not.toHaveBeenCalled();
      expect(mocks.getSceneByProperty).not.toHaveBeenCalled();
      expect(mocks.getVerses).toHaveBeenCalledTimes(1);
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
    expect(mocks.getScenesByProperty).toHaveBeenLastCalledWith(
      property.id,
      expect.objectContaining({ search: "dragon", tags: [5], page: 1 })
    );
    await click(el, ".sort-scenes");
    expect(mocks.getScenesByProperty).toHaveBeenLastCalledWith(
      property.id,
      expect.objectContaining({ sort: "name" })
    );
  });
  it("loads cross-owner private details through the global endpoint with property management and no write controls", async () => {
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');
    expect(mocks.getSceneByProperty).toHaveBeenCalledWith(
      683,
      31,
      "image,author,tags,metas,public"
    );
    expect(mocks.getVerse).not.toHaveBeenCalled();
    expect(
      el.querySelector(".detail-panel")?.getAttribute("data-editable")
    ).toBe("false");
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
    ).toBe(true);
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
    mocks.getSceneByProperty.mockResolvedValueOnce({ data: mine });
    await click(el, '.open-scene[data-id="673"]');
    expect(el.querySelector(".detail-panel .enter-edit-btn")).not.toBeNull();
  });

  it("clears global data and details immediately on role loss and ignores the old list response", async () => {
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');
    const mineLoad = deferred<ReturnType<typeof response>>();
    mocks.getVerses.mockReturnValueOnce(mineLoad.promise);
    permission.role = "admin";
    await flush();
    expect(el.querySelector(".scene-property-filter")).toBeNull();
    expect(el.querySelector(".detail-panel")).toBeNull();
    expect(el.textContent).not.toContain(foreign.name);
    mineLoad.resolve(response([mine]));
    await flush();
    expect(el.textContent).toContain(mine.name);
  });
  it("closes details and removes the scene immediately when unlinking the selected global property", async () => {
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');
    const matches = deferred<ReturnType<typeof response>>();
    mocks.getScenesByProperty.mockClear();
    mocks.getScenesByProperty.mockReturnValueOnce(matches.promise);
    await click(el, ".unlink-filter-property");
    expect(mocks.getScenesByProperty).toHaveBeenCalledTimes(1);
    expect(el.querySelector(".detail-panel")).toBeNull();
    expect(el.querySelector('.open-scene[data-id="683"]')).toBeNull();
    expect(mocks.getSceneByProperty).toHaveBeenCalledTimes(1);
    expect(mocks.getVerses).toHaveBeenCalledTimes(1);
    expect(el.querySelector(".scene-property-scope")).toBeNull();
    matches.resolve(response([mine]));
    await flush();
    expect(el.textContent).not.toContain(foreign.name);
  });
  it("reloads global scene details through the selected property after unlinking another property", async () => {
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');
    const editor = el.querySelector(".property-management");
    mocks.getSceneByProperty.mockResolvedValueOnce({
      data: { ...foreign, name: "Updated private scene" },
    });
    await click(el, ".unlink-other-property");
    expect(mocks.getSceneByProperty).toHaveBeenLastCalledWith(
      683,
      31,
      "image,author,tags,metas,public"
    );
    expect(mocks.getSceneByProperty).toHaveBeenCalledTimes(2);
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
    mocks.getSceneByProperty.mockReturnValueOnce(previous.promise);
    await click(el, ".unlink-other-property");
    mocks.getScenesByProperty.mockResolvedValueOnce(response([mine]));
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
    mocks.getSceneByProperty.mockReturnValueOnce(previous.promise);
    await click(el, ".unlink-other-property");
    await clear(el);
    previous.resolve({ data: foreign });
    await flush();
    expect(el.querySelector(".detail-panel")).toBeNull();
    expect(el.textContent).toContain(mine.name);
    expect(el.textContent).not.toContain(foreign.name);
  });
  it("clears a deleted selected property, closes its details, and returns to my scenes", async () => {
    const el = await mount();
    await choose(el, property.key);
    await click(el, '.open-scene[data-id="683"]');
    mocks.getGlobalScenePropertyOptions.mockResolvedValueOnce({
      data: [otherProperty],
    });
    await click(el, ".delete-filter-property");
    expect(el.querySelector(".detail-panel")).toBeNull();
    expect(el.querySelector(".scene-property-scope")).toBeNull();
    expect(mocks.getVerses).toHaveBeenCalledTimes(2);
  });
  it("retries a failed global property catalog without issuing a global scene query", async () => {
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
    expect(mocks.getScenesByProperty).not.toHaveBeenCalled();
  });
  it("ignores late global details after clearing the scope", async () => {
    const detail = deferred<unknown>();
    mocks.getSceneByProperty.mockReturnValueOnce(detail.promise);
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
    expect(mocks.getScenesByProperty).not.toHaveBeenCalled();
  });
  it("ignores a global list response after clearing back to my scenes", async () => {
    const globalList = deferred<ReturnType<typeof response>>();
    mocks.getScenesByProperty.mockReturnValueOnce(globalList.promise);
    const el = await mount();
    await choose(el, property.key);
    await clear(el);
    expect(el.textContent).toContain(mine.name);
    globalList.resolve(response([foreign]));
    await flush();
    expect(el.textContent).toContain(mine.name);
    expect(el.textContent).not.toContain(foreign.name);
  });

  it("discards an in-flight global list response after root access is revoked", async () => {
    const globalList = deferred<ReturnType<typeof response>>();
    const mineList = deferred<ReturnType<typeof response>>();
    mocks.getScenesByProperty.mockReturnValueOnce(globalList.promise);
    const el = await mount();
    await choose(el, property.key);
    mocks.getVerses.mockReturnValueOnce(mineList.promise);
    permission.role = "admin";
    await flush();
    globalList.resolve(response([foreign]));
    await flush();
    expect(el.textContent).not.toContain(foreign.name);
    expect(el.querySelectorAll(".scene-result")).toHaveLength(0);
    mineList.resolve(response([mine]));
    await flush();
    expect(el.textContent).toContain(mine.name);
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
