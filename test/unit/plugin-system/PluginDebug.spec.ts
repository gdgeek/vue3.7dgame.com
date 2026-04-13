import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  inject,
  type PropType,
  ref,
  type Ref,
} from "vue";

const tableDataKey = Symbol("plugin-debug-table-data");

const mockStore = {
  config: { version: "1.0.0", plugins: [] },
  plugins: new Map([
    [
      "unknown-plugin",
      {
        pluginId: "unknown-plugin",
        name: "Unknown Plugin",
        nameI18n: undefined,
        description: "",
        icon: "",
        group: "tools",
        state: "unloaded",
        enabled: true,
        order: 1,
      },
    ],
    [
      "loading-plugin",
      {
        pluginId: "loading-plugin",
        name: "Loading Plugin",
        nameI18n: undefined,
        description: "",
        icon: "",
        group: "tools",
        state: "unloaded",
        enabled: true,
        order: 2,
      },
    ],
    [
      "forbidden-plugin",
      {
        pluginId: "forbidden-plugin",
        name: "Forbidden Plugin",
        nameI18n: undefined,
        description: "",
        icon: "",
        group: "tools",
        state: "unloaded",
        enabled: true,
        order: 3,
      },
    ],
    [
      "degraded-plugin",
      {
        pluginId: "degraded-plugin",
        name: "Degraded Plugin",
        nameI18n: undefined,
        description: "",
        icon: "",
        group: "tools",
        state: "unloaded",
        enabled: true,
        order: 4,
      },
    ],
    [
      "visible-plugin",
      {
        pluginId: "visible-plugin",
        name: "Visible Plugin",
        nameI18n: undefined,
        description: "",
        icon: "",
        group: "tools",
        state: "unloaded",
        enabled: true,
        order: 5,
      },
    ],
  ]),
  menuGroups: [],
  enabledPlugins: [],
  pluginPermissions: {
    "unknown-plugin": [],
    "loading-plugin": [],
    "forbidden-plugin": [],
    "degraded-plugin": [],
    "visible-plugin": ["view"],
  },
  pluginAccessStates: {
    "unknown-plugin": "unknown",
    "loading-plugin": "loading",
    "forbidden-plugin": "forbidden",
    "degraded-plugin": "degraded",
    "visible-plugin": "visible",
  },
  currentTokenPluginPermissions: {
    "unknown-plugin": [],
    "loading-plugin": [],
    "forbidden-plugin": [],
    "degraded-plugin": [],
    "visible-plugin": ["view"],
  },
  currentTokenPluginAccessStates: {
    "unknown-plugin": "unknown",
    "loading-plugin": "loading",
    "forbidden-plugin": "forbidden",
    "degraded-plugin": "degraded",
    "visible-plugin": "visible",
  },
  pluginsByGroup: new Map(),
  initialized: true,
  loading: false,
  error: null,
  activePluginId: null,
  init: vi.fn().mockResolvedValue(undefined),
  refreshConfig: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/store/modules/plugin-system", () => ({
  usePluginSystemStore: vi.fn(() => mockStore),
}));

vi.mock("@/store/modules/app", () => ({
  useAppStoreHook: vi.fn(() => ({
    language: "zh-CN",
  })),
}));

const ElIconStub = defineComponent({
  name: "ElIcon",
  template: "<div class='el-icon-stub'><slot /></div>",
});

const ElButtonStub = defineComponent({
  name: "ElButton",
  template: "<button class='el-button-stub'><slot /></button>",
});

const ElTagStub = defineComponent({
  name: "ElTag",
  props: {
    type: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
  },
  template:
    "<span class='el-tag-stub' :data-type='type || \"default\"'><slot /></span>",
});

const ElTabsStub = defineComponent({
  name: "ElTabs",
  template: "<div class='el-tabs-stub'><slot /></div>",
});

const ElTabPaneStub = defineComponent({
  name: "ElTabPane",
  template: "<section class='el-tab-pane-stub'><slot /></section>",
});

const ElTableStub = defineComponent({
  name: "ElTable",
  props: {
    data: {
      type: Array as PropType<Record<string, unknown>[]>,
      default: () => [],
    },
  },
  setup(props, { slots }) {
    provideTableData(ref(props.data));
    return () => h("div", { class: "el-table-stub" }, slots.default?.());
  },
});

function provideTableData(data: Ref<Record<string, unknown>[]>) {
  const provider = defineComponent({
    setup(_, { slots }) {
      return () => {
        return h("div", [slots.default?.()]);
      };
    },
  });
  void provider;
  (ElTableStub as unknown as { __tableData?: Ref<Record<string, unknown>[]> }).__tableData =
    data;
}

const ElTableColumnStub = defineComponent({
  name: "ElTableColumn",
  props: {
    prop: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    label: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const data =
      (ElTableStub as unknown as {
        __tableData?: Ref<Record<string, unknown>[]>;
      }).__tableData ?? ref<Record<string, unknown>[]>([]);

    return () =>
      h(
        "div",
        {
          class: "el-table-column-stub",
          "data-label": props.label ?? props.prop ?? "",
        },
        data.value.map((row, index) =>
          h(
            "div",
            { class: "el-table-cell-stub", "data-row-index": String(index) },
            slots.default
              ? slots.default({ row, $index: index })
              : String(
                  props.prop ? (row[props.prop] as string | number | undefined) ?? "" : ""
                )
          )
        )
      );
  },
});

const PassthroughStub = defineComponent({
  template: "<div><slot /></div>",
});

const cleanups: Array<() => void> = [];

async function mountView() {
  const { default: PluginDebug } = await import(
    "@/plugin-system/views/PluginDebug.vue"
  );

  const el = document.createElement("div");
  document.body.appendChild(el);

  const app = createApp(PluginDebug);
  app.component("el-icon", ElIconStub);
  app.component("el-button", ElButtonStub);
  app.component("el-tag", ElTagStub);
  app.component("el-alert", PassthroughStub);
  app.component("el-row", PassthroughStub);
  app.component("el-col", PassthroughStub);
  app.component("el-card", PassthroughStub);
  app.component("el-statistic", PassthroughStub);
  app.component("el-tabs", ElTabsStub);
  app.component("el-tab-pane", ElTabPaneStub);
  app.component("el-descriptions", PassthroughStub);
  app.component("el-descriptions-item", PassthroughStub);
  app.component("el-table", ElTableStub);
  app.component("el-table-column", ElTableColumnStub);
  app.component("el-link", PassthroughStub);
  app.component("el-popover", PassthroughStub);
  app.component("el-collapse", PassthroughStub);
  app.component("el-collapse-item", PassthroughStub);
  app.mount(el);

  cleanups.push(() => {
    app.unmount();
    el.remove();
  });

  await Promise.resolve();
  return { el };
}

function findTagsByText(el: HTMLElement, text: string) {
  return Array.from(el.querySelectorAll(".el-tag-stub")).filter((node) =>
    node.textContent?.includes(text)
  );
}

afterEach(() => {
  cleanups.splice(0).reverse().forEach((fn) => fn());
  vi.clearAllMocks();
});

describe("plugin-system/views/PluginDebug.vue", () => {
  it("maps access states to matching permission labels and tag colors", async () => {
    const { el } = await mountView();

    for (const node of findTagsByText(el, "未获取")) {
      expect(node.getAttribute("data-type")).toBe("info");
    }
    for (const node of findTagsByText(el, "加载中")) {
      expect(node.getAttribute("data-type")).toBe("warning");
    }
    for (const node of findTagsByText(el, "无权限")) {
      expect(node.getAttribute("data-type")).toBe("danger");
    }
    for (const node of findTagsByText(el, "服务降级")) {
      expect(node.getAttribute("data-type")).toBe("warning");
    }
    for (const node of findTagsByText(el, "view")) {
      expect(node.getAttribute("data-type")).toBe("success");
    }
  });

  it("renders current-token-aware permission state instead of stale raw cache", async () => {
    mockStore.pluginPermissions["visible-plugin"] = ["view"];
    mockStore.pluginAccessStates["visible-plugin"] = "visible";
    mockStore.currentTokenPluginPermissions["visible-plugin"] = [];
    mockStore.currentTokenPluginAccessStates["visible-plugin"] = "unknown";

    const { el } = await mountView();

    expect(el.textContent).toContain("未获取");
    expect(el.textContent).not.toContain("view");
  });
});
