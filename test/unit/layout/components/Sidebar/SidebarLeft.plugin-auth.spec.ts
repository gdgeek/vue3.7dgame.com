import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, nextTick } from "vue";

const mockEnsureAllEnabledPluginAccess = vi.fn();
const mockPluginStore = {
  init: vi.fn(),
  enabledPlugins: [],
  hasConfiguredEnabledPlugins: true,
  initialized: false,
  menuGroups: [],
  pluginsByGroup: new Map(),
  ensureAllEnabledPluginAccess: mockEnsureAllEnabledPluginAccess,
};

vi.mock("@/store/modules/plugin-system", () => ({
  usePluginSystemStore: vi.fn(() => mockPluginStore),
}));

vi.mock("@/components/Dialog/ConfirmDialog.vue", () => ({
  default: defineComponent({
    name: "ConfirmDialog",
    template: "<div class='confirm-dialog-stub'></div>",
  }),
}));

vi.mock("vue-router", () => ({
  useRouter: vi.fn(() => ({
    currentRoute: { value: { path: "/home" } },
    push: vi.fn(),
  })),
}));

vi.mock("@/store", () => ({
  useUserStore: vi.fn(() => ({ logout: vi.fn() })),
}));

vi.mock("@/store/modules/domain", () => ({
  useDomainStore: vi.fn(() => ({ icon: "", title: "XRUGC" })),
}));

vi.mock("@/store/modules/app", () => ({
  useAppStoreHook: vi.fn(() => ({ language: "zh-CN" })),
}));

vi.mock("@casl/vue", () => ({
  useAbility: vi.fn(() => ({ can: vi.fn(() => true) })),
}));

vi.mock("@/utils/ability", () => ({
  AbilityRouter: class AbilityRouter {
    constructor(public path: string) {}
  },
}));

vi.mock("vue-i18n", () => ({
  useI18n: vi.fn(() => ({ t: (key: string) => key })),
}));

const ElScrollbarStub = defineComponent({
  name: "ElScrollbar",
  template: "<div><slot /></div>",
});
const ElPopoverStub = defineComponent({
  name: "ElPopover",
  emits: ["show"],
  template: "<div class='popover-stub'><slot name='reference' /><slot /></div>",
});
const RouterLinkStub = defineComponent({
  name: "RouterLink",
  props: ["to", "custom"],
  methods: {
    navigate() {
      return undefined;
    },
  },
  template:
    "<a class='router-link-stub'><slot :isActive='false' :navigate='navigate' /></a>",
});
const FontAwesomeIconStub = defineComponent({
  name: "FontAwesomeIcon",
  template: "<i class='fa-stub'></i>",
});

const cleanups: Array<() => void> = [];

async function mount() {
  const { default: SidebarLeft } = await import(
    "@/layout/components/Sidebar/SidebarLeft.vue"
  );

  const el = document.createElement("div");
  document.body.appendChild(el);

  const app = createApp(SidebarLeft as Parameters<typeof createApp>[0], {
    collapsed: false,
  });
  app.component("el-scrollbar", ElScrollbarStub);
  app.component("el-popover", ElPopoverStub);
  app.component("RouterLink", RouterLinkStub);
  app.component("font-awesome-icon", FontAwesomeIconStub);
  app.mount(el);

  cleanups.push(() => {
    app.unmount();
    el.remove();
  });

  await nextTick();
  return { el };
}

describe("SidebarLeft plugin auth", () => {
  beforeEach(() => {
    mockEnsureAllEnabledPluginAccess.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanups.splice(0).reverse().forEach((fn) => fn());
    vi.clearAllMocks();
  });

  it("renders the tools root when configured plugins exist but no plugin is visible yet", async () => {
    const { el } = await mount();
    expect(el.textContent).toContain("sidebar.tools");
  });

  it("loads plugin visibility when the tools root is opened", async () => {
    const { el } = await mount();
    const toolsTrigger = Array.from(el.querySelectorAll(".sidebar-item")).find(
      (node) => node.textContent?.includes("sidebar.tools")
    ) as HTMLElement;

    toolsTrigger.click();
    await nextTick();

    expect(mockEnsureAllEnabledPluginAccess).toHaveBeenCalledOnce();
  });
});
