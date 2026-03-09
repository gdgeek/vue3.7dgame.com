/**
 * Tests for src/layout/components/AppMain/index.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent } from "vue";

vi.mock("@/styles/variables.module.scss", () => ({
  default: {
    "navbar-height": "50px",
    "tags-view-height": "34px",
  },
}));

const mockTagsViewStore = { cachedViews: [] as string[] };
const mockSettingsStore = { tagsView: false };

vi.mock("@/store", () => ({
  useTagsViewStore: vi.fn(() => mockTagsViewStore),
  useSettingsStore: vi.fn(() => mockSettingsStore),
  useAppStore: vi.fn(() => ({
    sidebar: { opened: true },
    toggleSidebar: vi.fn(),
  })),
}));

const RouterViewStub = defineComponent({
  name: "RouterView",
  template: "<div class='router-view-stub'></div>",
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

async function mount() {
  const { default: AppMain } = await import(
    "@/layout/components/AppMain/index.vue"
  );
  const el = document.createElement("div");
  const app = createApp(AppMain as Parameters<typeof createApp>[0]);
  app.component("RouterView", RouterViewStub);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("layout/components/AppMain/index.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders section.app-main element", async () => {
    const { el } = await mount();
    expect(el.querySelector("section.app-main")).not.toBeNull();
  });

  it("minHeight includes only navbar-height when tagsView is false", async () => {
    mockSettingsStore.tagsView = false;
    const { el } = await mount();
    const section = el.querySelector("section.app-main") as HTMLElement;
    expect(section.style.minHeight).toContain("50px");
    expect(section.style.minHeight).not.toContain("34px");
  });

  it("minHeight includes tags-view-height when tagsView is true", async () => {
    mockSettingsStore.tagsView = true;
    const { el } = await mount();
    const section = el.querySelector("section.app-main") as HTMLElement;
    expect(section.style.minHeight).toContain("34px");
    // reset
    mockSettingsStore.tagsView = false;
  });

  it("renders router-view stub inside", async () => {
    const { el } = await mount();
    expect(el.querySelector(".router-view-stub")).not.toBeNull();
  });
});
