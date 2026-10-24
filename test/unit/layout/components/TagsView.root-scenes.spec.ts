import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, nextTick, reactive, ref } from "vue";
import { createPinia, defineStore, setActivePinia } from "pinia";

const mockRoute = reactive({
  path: "/verse/index",
  fullPath: "/verse/index",
  name: "VerseIndex",
  meta: { title: "project.selfGenerated" },
  query: {},
});
const mockUserStore = reactive({ userInfo: { roles: ["user"] } });
const mockPush = vi.fn();
const mockReplace = vi.fn();

const useMockTagsViewStore = defineStore("root-scenes-tags-test", () => {
  const visitedViews = ref<TagView[]>([]);
  const addVisitedView = (view: TagView) => {
    if (!visitedViews.value.some((tag) => tag.path === view.path)) {
      visitedViews.value.push(view);
    }
  };
  return {
    visitedViews,
    addVisitedView,
    addView: addVisitedView,
    updateVisitedView: vi.fn(),
    delCachedView: vi.fn(),
    delView: async (view: TagView) => {
      visitedViews.value = visitedViews.value.filter(
        (tag) => tag.path !== view.path
      );
      return { visitedViews: visitedViews.value, cachedViews: [] };
    },
  };
});

vi.mock("vue-router", () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));
vi.mock("@/store", () => ({
  usePermissionStore: () => ({ routes: [] }),
  useTagsViewStore: () => useMockTagsViewStore(),
  useSettingsStore: () => ({ layout: "left" }),
  useAppStore: () => ({ activeTopMenuPath: "", activeTopMenu: vi.fn() }),
  useUserStore: () => mockUserStore,
}));
vi.mock("@/utils/i18n", () => ({
  translateRouteTitle: (title: string) => title,
}));
vi.mock("@/utils/logger", () => ({ logger: { log: vi.fn() } }));

const RouterLinkStub = defineComponent({
  props: { to: { type: Object, required: true } },
  template: "<a :data-path='to.path'><slot /></a>",
});
const SlotStub = defineComponent({ template: "<div><slot /></div>" });
const IconStub = defineComponent({ template: "<i></i>" });
const cleanups: Array<() => void> = [];

const sceneTag = (path: string, title: string): TagView => ({
  path,
  fullPath: path,
  name: title,
  title,
});

async function mount() {
  const { default: TagsView } = await import(
    "@/layout/components/TagsView/index.vue"
  );
  const el = document.createElement("div");
  document.body.appendChild(el);
  const app = createApp(TagsView);
  app.config.globalProperties.$t = (key: string) => key;
  app.component("RouterLink", RouterLinkStub);
  app.component("ElScrollbar", SlotStub);
  app.component("SvgIcon", IconStub);
  app.component("IEpClose", IconStub);
  app.mount(el);
  cleanups.push(() => {
    app.unmount();
    el.remove();
  });
  await nextTick();
  return el;
}

beforeEach(() => {
  setActivePinia(createPinia());
  mockRoute.path = "/verse/index";
  mockRoute.fullPath = "/verse/index";
  mockRoute.name = "VerseIndex";
  mockRoute.meta = { title: "project.selfGenerated" };
  mockUserStore.userInfo.roles = ["user"];
  useMockTagsViewStore().visitedViews = [
    sceneTag("/home/index", "Home"),
    sceneTag("/verse/index", "Mine"),
    sceneTag("/verse/public", "Public"),
    sceneTag("/verse/all", "All"),
  ];
  vi.clearAllMocks();
});

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
});

describe("TagsView root-only all scenes history", () => {
  it.each(["user", "manager", "admin"])(
    "hides persisted all-scenes tags for %s without hiding ordinary scene history",
    async (role) => {
      mockUserStore.userInfo.roles = [role];
      const el = await mount();

      expect(el.querySelector('[data-path="/verse/all"]')).toBeNull();
      expect(el.querySelector('[data-path="/verse/index"]')).not.toBeNull();
      expect(el.querySelector('[data-path="/verse/public"]')).not.toBeNull();
    }
  );

  it("shows root history and hides it immediately when root is revoked", async () => {
    mockUserStore.userInfo.roles = ["root"];
    const el = await mount();
    const allTag = el.querySelector('[data-path="/verse/all"]')!;
    expect(allTag).not.toBeNull();
    allTag.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
    await nextTick();
    expect(
      (el.querySelector(".contextmenu") as HTMLElement).style.display
    ).not.toBe("none");

    mockUserStore.userInfo.roles = ["admin"];
    await nextTick();

    expect(el.querySelector('[data-path="/verse/all"]')).toBeNull();
    expect(
      (el.querySelector(".contextmenu") as HTMLElement).style.display
    ).toBe("none");
  });

  it("does not create an all-scenes history entry for a non-root route state", async () => {
    useMockTagsViewStore().visitedViews = [];
    mockRoute.path = "/verse/all";
    mockRoute.fullPath = "/verse/all";
    mockRoute.name = "VerseAll";
    mockRoute.meta = { title: "project.allScenes" };

    await mount();

    expect(useMockTagsViewStore().visitedViews).toHaveLength(0);
  });

  it("skips hidden root history when closing the active ordinary scene tag", async () => {
    const el = await mount();
    const close = el.querySelector('[data-path="/verse/index"] .close-icon')!;
    close.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockPush).toHaveBeenCalledWith("/verse/public");
    expect(mockPush).not.toHaveBeenCalledWith("/verse/all");
  });
});
