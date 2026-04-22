import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, nextTick, reactive } from "vue";

const mockEnsureAllEnabledPluginAccess = vi.fn();
const mockMenuGroups = reactive<Array<Record<string, unknown>>>([]);
const mockPluginsByGroup = reactive(
  new Map<string, Array<Record<string, unknown>>>()
);
const mockCurrentRoute = reactive({
  path: "/home",
});
const mockPluginStore = reactive({
  init: vi.fn(),
  enabledPlugins: [] as Array<Record<string, unknown>>,
  configuredEnabledPlugins: [] as Array<Record<string, unknown>>,
  get hasConfiguredEnabledPlugins() {
    return this.configuredEnabledPlugins.length > 0;
  },
  initialized: false,
  menuGroups: mockMenuGroups,
  pluginsByGroup: mockPluginsByGroup,
  currentTokenPluginAccessStates: {} as Record<string, string>,
  ensureAllEnabledPluginAccess: mockEnsureAllEnabledPluginAccess,
});

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
    currentRoute: { value: mockCurrentRoute },
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
  props: ["width"],
  emits: ["show"],
  template:
    "<div class='popover-stub' :data-width='width'><button class='popover-show' @click=\"$emit('show')\"></button><slot name='reference' /><slot /></div>",
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

async function mount(collapsed = false) {
  const { default: SidebarLeft } = await import(
    "@/layout/components/Sidebar/SidebarLeft.vue"
  );

  const el = document.createElement("div");
  document.body.appendChild(el);

  const app = createApp(SidebarLeft as Parameters<typeof createApp>[0], {
    collapsed,
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

function showVisiblePluginMenu() {
  mockPluginStore.configuredEnabledPlugins = [
    {
      pluginId: "ai-3d-generator-v3",
    },
  ];
  mockPluginStore.currentTokenPluginAccessStates = {
    "ai-3d-generator-v3": "visible",
  };
  mockMenuGroups.push({
    id: "ai-tools",
    name: "AI Tools",
    nameI18n: null,
    order: 1,
    icon: "toolbox",
  });
  mockPluginsByGroup.set("ai-tools", [
    {
      pluginId: "ai-3d-generator-v3",
      name: "AI 3D Generator",
      nameI18n: null,
      group: "ai-tools",
      order: 1,
    },
  ]);
}

describe("SidebarLeft plugin auth", () => {
  beforeEach(() => {
    mockCurrentRoute.path = "/home";
    mockPluginStore.initialized = false;
    mockPluginStore.init.mockResolvedValue(undefined);
    mockPluginStore.configuredEnabledPlugins = [
      {
        pluginId: "ai-3d-generator-v3",
      },
    ];
    mockPluginStore.currentTokenPluginAccessStates = {};
    mockMenuGroups.splice(0, mockMenuGroups.length);
    mockPluginsByGroup.clear();
    mockEnsureAllEnabledPluginAccess.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanups
      .splice(0)
      .reverse()
      .forEach((fn) => fn());
    vi.clearAllMocks();
  });

  it("hides the tools root until at least one plugin is visible", async () => {
    mockPluginStore.configuredEnabledPlugins = [
      {
        pluginId: "ai-3d-generator-v3",
      },
    ];

    const { el } = await mount();
    expect(el.textContent).not.toContain("sidebar.tools");
  });

  it("renders the tools root when a visible plugin group exists", async () => {
    showVisiblePluginMenu();

    const { el } = await mount();
    expect(el.textContent).toContain("sidebar.tools");
  });

  it("hides the tools root when every configured plugin is confirmed forbidden", async () => {
    mockPluginStore.initialized = true;
    mockPluginStore.configuredEnabledPlugins = [
      {
        pluginId: "ai-3d-generator-v3",
      },
    ];
    mockPluginStore.currentTokenPluginAccessStates = {
      "ai-3d-generator-v3": "forbidden",
    };
    mockMenuGroups.push({
      id: "ai-tools",
      name: "AI Tools",
      nameI18n: null,
      order: 1,
      icon: "toolbox",
    });

    const { el } = await mount();

    expect(el.textContent).not.toContain("sidebar.tools");
  });

  it("preloads plugin visibility on mount so the tools root only appears for openable plugins", async () => {
    await mount();

    expect(mockEnsureAllEnabledPluginAccess).toHaveBeenCalledOnce();
  });

  it("preloads plugin visibility when entering a plugin route directly", async () => {
    mockCurrentRoute.path = "/plugins/user-management";
    mockPluginStore.configuredEnabledPlugins = [
      {
        pluginId: "user-management",
      },
      {
        pluginId: "ai-3d-generator-v3",
      },
    ];
    mockPluginStore.init.mockResolvedValue(undefined);

    await mount();
    await Promise.resolve();
    await nextTick();

    expect(mockEnsureAllEnabledPluginAccess).toHaveBeenCalledOnce();
  });

  it("preloads plugin visibility after plugin init finishes on direct entry", async () => {
    mockCurrentRoute.path = "/plugins/user-management";
    let resolveInit: (() => void) | null = null;
    mockPluginStore.initialized = false;
    mockPluginStore.configuredEnabledPlugins = [];
    mockPluginStore.init.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveInit = resolve;
        })
    );

    await mount();
    await nextTick();

    expect(mockEnsureAllEnabledPluginAccess).not.toHaveBeenCalled();

    mockPluginStore.initialized = true;
    mockPluginStore.configuredEnabledPlugins = [
      {
        pluginId: "user-management",
      },
      {
        pluginId: "system-admin",
      },
    ];
    resolveInit?.();

    await Promise.resolve();
    await nextTick();
    await nextTick();

    expect(mockEnsureAllEnabledPluginAccess).toHaveBeenCalledOnce();
  });

  it("does not reload plugin visibility when a resolved tools root is opened", async () => {
    showVisiblePluginMenu();

    const { el } = await mount();
    const toolsTrigger = Array.from(el.querySelectorAll(".sidebar-item")).find(
      (node) => node.textContent?.includes("sidebar.tools")
    ) as HTMLElement;

    toolsTrigger.click();
    await nextTick();

    expect(mockEnsureAllEnabledPluginAccess).not.toHaveBeenCalled();
  });

  it("does not reload plugin visibility again when the tools root is closed", async () => {
    showVisiblePluginMenu();

    const { el } = await mount();
    const toolsTrigger = Array.from(el.querySelectorAll(".sidebar-item")).find(
      (node) => node.textContent?.includes("sidebar.tools")
    ) as HTMLElement;

    toolsTrigger.click();
    await nextTick();
    toolsTrigger.click();
    await nextTick();

    expect(mockEnsureAllEnabledPluginAccess).not.toHaveBeenCalled();
  });

  it("does not reload plugin visibility when the resolved collapsed popover is shown", async () => {
    showVisiblePluginMenu();

    const { el } = await mount(true);
    const pluginPopoverShow = el.querySelector(
      ".popover-stub[data-width='220'] .popover-show"
    ) as HTMLButtonElement;

    pluginPopoverShow.click();
    await nextTick();

    expect(mockEnsureAllEnabledPluginAccess).not.toHaveBeenCalled();
  });

  it("expands the active plugin group after plugin visibility becomes available", async () => {
    mockCurrentRoute.path = "/plugins/ai-3d-generator-v3";
    mockPluginStore.initialized = true;
    mockMenuGroups.push({
      id: "ai-tools",
      name: "AI Tools",
      nameI18n: null,
      order: 1,
      icon: "toolbox",
    });

    const { el } = await mount();

    expect(el.querySelector(".submenu-level3")).toBeNull();

    mockPluginsByGroup.set("ai-tools", [
      {
        pluginId: "ai-3d-generator-v3",
        name: "AI 3D Generator",
        nameI18n: null,
        group: "ai-tools",
        order: 1,
      },
    ]);
    await nextTick();
    await nextTick();

    const level3Menu = el.querySelector(".submenu-level3") as HTMLDivElement;
    expect(level3Menu).not.toBeNull();
    expect(level3Menu.style.display).not.toBe("none");
  });
});
