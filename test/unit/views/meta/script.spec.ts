import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, reactive, ref } from "vue";
import type {
  EditorPostPayload,
  UseScriptEditorBaseOptions,
} from "@/composables/useScriptEditorBase";
import MetaScript from "@/views/meta/script.vue";

const mocks = vi.hoisted(() => ({
  getMeta: vi.fn(),
  putMetaCode: vi.fn(),
  getVerses: vi.fn(),
  loadModel: vi.fn(),
  registerToolbar: vi.fn(),
  updateToolbarStatus: vi.fn(),
  unregisterToolbar: vi.fn(),
  routeUpdate: vi.fn(),
  useBase: vi.fn(),
  createRpc: vi.fn(),
  registerMetaTools: vi.fn(),
  registerBlockTools: vi.fn(),
}));
const route = reactive({ name: "MetaScene", query: { id: "99" } });

vi.mock("vue-router", () => ({
  useRoute: () => route,
  useRouter: () => ({ push: vi.fn() }),
  onBeforeRouteUpdate: mocks.routeUpdate,
}));
vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("@/api/v1/meta", () => ({
  getMeta: mocks.getMeta,
  putMetaCode: mocks.putMetaCode,
}));
vi.mock("@/api/v1/verse", () => ({ getVerses: mocks.getVerses }));
vi.mock("@/lib/three/loaders", () => ({
  getConfiguredGLTFLoader: () => ({ load: mocks.loadModel }),
}));
vi.mock("@/store/modules/user", () => ({
  useUserStore: () => ({ userInfo: { id: 7 }, getRole: () => "editor" }),
}));
vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/components/Dialog", () => ({ Message: { success: vi.fn() } }));
vi.mock("@/components/ScriptDraftDialog.vue", () => ({
  default: defineComponent({ render: () => h("div") }),
}));
vi.mock("@/composables/useEditorVersionToolbar", () => ({
  useEditorVersionToolbar: () => ({
    registerToolbar: mocks.registerToolbar,
    updateToolbarStatus: mocks.updateToolbarStatus,
    unregisterToolbar: mocks.unregisterToolbar,
  }),
}));
vi.mock("@/composables/useScriptEditorBase", () => ({
  useScriptEditorBase: mocks.useBase,
}));
vi.mock("@/utils/iframeRpc", () => ({ createIframeRpc: mocks.createRpc }));
vi.mock("@/services/webmcp/meta-script-tools", () => ({
  registerMetaScriptWebMcpTools: mocks.registerMetaTools,
}));
vi.mock("@/services/webmcp/script-block-tools", () => ({
  registerScriptBlockWebMcpTools: mocks.registerBlockTools,
}));

const revision = `sha256:${"a".repeat(64)}`;
const nextRevision = `sha256:${"b".repeat(64)}`;
const scriptPayload: EditorPostPayload = {
  data: { blocks: { blocks: [{ type: "text_print" }] } },
  js: "updated();",
  lua: "updated()",
};
const savedMeta = (id = 7) => ({
  id,
  title: "saved entity",
  editable: true,
  serverRevision: revision,
  metaCode: { blockly: '{"saved":true}', js: "saved();", lua: "saved()" },
  data: { type: "Root", parameters: {}, children: { entities: [] } },
  resources: [],
  events: { inputs: [], outputs: [] },
  verseMetas: [],
});
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
};
const flushAsync = async () => {
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
  await nextTick();
};

function createBase(options: UseScriptEditorBaseOptions) {
  let snapshot = { blocklyData: {}, js: "", lua: "" };
  return {
    activeName: ref("blockly"),
    languageName: ref("lua"),
    LuaCode: ref(""),
    JavaScriptCode: ref(""),
    resolveUnsavedChangesBeforeLeave: vi.fn(async () => true),
    hasUnsavedChanges: ref(false),
    draftVersions: ref([]),
    versionDialogVisible: ref(false),
    autoSaveEnabled: ref(false),
    autoSaveIntervalSeconds: ref(300),
    isSaving: ref(false),
    lastSaveTrigger: ref(null),
    lastSavedAt: ref(null),
    editorFrameKey: ref(0),
    editor: ref<HTMLIFrameElement>(),
    src: ref("https://blockly.example.test"),
    editorContentReady: ref(false),
    isDark: ref(false),
    postMessage: vi.fn(),
    beginEditorSession: vi.fn((value) => (snapshot = value)),
    initializeSavedSnapshot: vi.fn(),
    getEditorInitState: () => ({
      data: snapshot.blocklyData,
      code: { js: snapshot.js, lua: snapshot.lua },
      persisted: { data: snapshot.blocklyData },
      hostSessionId: "test-script-session",
    }),
    save: vi.fn(() => options.onPost(scriptPayload, { trigger: "manual" })),
    openVersionDialog: vi.fn(),
    clearDraftHistory: vi.fn(),
    restoreDraftVersion: vi.fn(),
    reloadEditorFrame: vi.fn(),
    handleEditorFrameLoad: vi.fn(),
    decompressBlockly: (value: string) => value,
    isReady: () => true,
    copyCode: vi.fn(),
  };
}
const bases: Array<ReturnType<typeof createBase>> = [];
const registrations: AbortController[] = [];
const cleanups: Array<() => void> = [];

function mountScript(
  props: { embedded?: boolean; metaId?: number; metaData?: unknown } = {}
) {
  const saved = vi.fn();
  const root = document.createElement("div");
  document.body.appendChild(root);
  const app = createApp(MetaScript, { ...props, onSaved: saved });
  app.config.globalProperties.$t = (key: string) => key;
  app.config.warnHandler = () => {};
  app.directive("highlight", {});
  const passthrough = defineComponent({
    setup(_, { slots }) {
      return () => h("div", slots.default?.());
    },
  });
  for (const name of [
    "ElContainer",
    "ElMain",
    "ElCard",
    "ElTabs",
    "ElTabPane",
    "ElIcon",
    "ElSelect",
    "ElOption",
    "ElButton",
    "FontAwesomeIcon",
  ]) {
    app.component(name, passthrough);
  }
  const vm = app.mount(root) as unknown as {
    save: () => Promise<void>;
    resolveBeforeClose: () => Promise<boolean>;
    saveable: boolean;
    editorContentLoading: boolean;
    openVersionDialog: () => void;
  };
  let mounted = true;
  const unmount = () => {
    if (!mounted) return;
    mounted = false;
    app.unmount();
    root.remove();
  };
  cleanups.push(unmount);
  return { root, vm, saved, unmount, base: bases.at(-1)! };
}

beforeEach(() => {
  vi.clearAllMocks();
  route.name = "MetaScene";
  route.query.id = "99";
  bases.length = 0;
  registrations.length = 0;
  mocks.getMeta.mockResolvedValue({ data: savedMeta() });
  mocks.getVerses.mockResolvedValue({ data: [], headers: {} });
  mocks.putMetaCode.mockResolvedValue({
    data: { serverRevision: nextRevision },
  });
  mocks.useBase.mockImplementation((options: UseScriptEditorBaseOptions) => {
    const base = createBase(options);
    bases.push(base);
    return base;
  });
  mocks.createRpc.mockImplementation(() => ({
    request: vi.fn(),
    handleMessage: vi.fn(),
    cancel: vi.fn(),
  }));
  const register = () => {
    const controller = new AbortController();
    registrations.push(controller);
    return controller;
  };
  mocks.registerMetaTools.mockImplementation(register);
  mocks.registerBlockTools.mockImplementation(register);
});
afterEach(() => {
  cleanups
    .splice(0)
    .reverse()
    .forEach((cleanup) => cleanup());
});

describe("embedded meta script editor", () => {
  it("loads the explicit entity within the scene route without replacing the host toolbar or frame", async () => {
    const hostFrame = document.createElement("iframe");
    hostFrame.id = "editor";
    document.body.appendChild(hostFrame);
    cleanups.push(() => hostFrame.remove());
    const { root, vm, base, unmount } = mountScript({
      embedded: true,
      metaId: 7,
    });
    await flushAsync();

    expect(mocks.getMeta).toHaveBeenCalledWith(7, expect.any(Object));
    expect(mocks.getVerses).not.toHaveBeenCalled();
    expect(mocks.useBase.mock.calls[0][0].registerRouteGuard).toBe(false);
    expect(mocks.routeUpdate).not.toHaveBeenCalled();
    expect(mocks.registerToolbar).not.toHaveBeenCalled();
    expect(root.querySelector(".script-editor-toolbar")).toBeNull();
    expect(root.querySelector(".script-main-tabs")?.getAttribute("type")).toBe(
      ""
    );
    expect(mocks.createRpc.mock.calls[0][0].frame()).toBe(
      root.querySelector("#meta-script-editor")
    );
    expect(mocks.createRpc.mock.calls[0][0].frame()).not.toBe(hostFrame);
    await expect(vm.resolveBeforeClose()).resolves.toBe(true);
    expect(base.resolveUnsavedChangesBeforeLeave).toHaveBeenCalledWith({
      showDiscardInfo: true,
    });
    vm.openVersionDialog();
    expect(base.openVersionDialog).toHaveBeenCalledOnce();
    unmount();
    expect(mocks.unregisterToolbar).not.toHaveBeenCalled();
  });

  it("combines live resources and events with fresh scripts, permissions and revision without mutating host data", async () => {
    const live = {
      ...savedMeta(),
      editable: false,
      serverRevision: "outdated",
      metaCode: { blockly: '{"stale":true}' },
      resources: [
        {
          id: 51,
          type: "polygen",
          file: { url: "https://models.test/live.glb" },
        },
      ],
      data: {
        type: "Root",
        parameters: {},
        children: {
          entities: [
            {
              type: "Polygen",
              parameters: {
                uuid: "live-node",
                name: "Live model",
                resource: 51,
              },
            },
          ],
        },
      },
      events: {
        inputs: [{ title: "Live event", uuid: "live-event" }],
        outputs: [],
      },
    };
    const original = JSON.parse(JSON.stringify(live));
    mocks.loadModel.mockImplementation((_url, loaded) => {
      loaded({ animations: [{ name: "Walk" }] });
    });
    const { base, vm, saved } = mountScript({
      embedded: true,
      metaId: 7,
      metaData: live,
    });
    await flushAsync();

    expect(mocks.loadModel).toHaveBeenCalledWith(
      expect.stringMatching(/models\.test\/live\.glb$/),
      expect.any(Function),
      undefined,
      expect.any(Function)
    );
    expect(base.beginEditorSession).toHaveBeenCalledWith(
      { blocklyData: { saved: true }, js: "saved();", lua: "saved()" },
      "meta:7"
    );
    const init = base.postMessage.mock.calls.find(
      ([type]) => type === "INIT"
    )?.[1];
    expect(init.config.parameters.resource.polygen).toEqual([
      expect.objectContaining({ uuid: "live-node", animations: ["Walk"] }),
    ]);
    expect(init.config.parameters.resource.events.inputs).toEqual([
      expect.objectContaining({ uuid: "live-event", title: "Live event" }),
    ]);
    expect(live).toEqual(original);
    expect(vm.saveable).toBe(true);
    await vm.save();
    expect(mocks.putMetaCode).toHaveBeenCalledWith(
      7,
      {
        blockly: JSON.stringify(scriptPayload.data),
        js: scriptPayload.js,
        lua: scriptPayload.lua,
      },
      expect.objectContaining({ expectedRevision: revision })
    );
    expect(saved).toHaveBeenCalledWith({
      entityId: 7,
      previousRevision: revision,
      serverRevision: nextRevision,
      metaCode: {
        blockly: JSON.stringify(scriptPayload.data),
        js: scriptPayload.js,
        lua: scriptPayload.lua,
      },
    });
  });

  it("does not borrow editable permission from a stale live snapshot", async () => {
    mocks.getMeta.mockResolvedValue({
      data: { ...savedMeta(), editable: false },
    });
    const { vm, saved } = mountScript({
      embedded: true,
      metaId: 7,
      metaData: savedMeta(),
    });
    await flushAsync();
    expect(vm.saveable).toBe(false);
    await expect(vm.save()).rejects.toThrow("meta.script.error2");
    expect(mocks.putMetaCode).not.toHaveBeenCalled();
    expect(saved).not.toHaveBeenCalled();
  });

  it("keeps the standalone route, navigation guard and global history toolbar", async () => {
    route.name = "MetaScript";
    route.query.id = "7";
    const { root, unmount } = mountScript();
    await flushAsync();
    expect(mocks.getMeta).toHaveBeenCalledWith(7, expect.any(Object));
    expect(mocks.getVerses).toHaveBeenCalledOnce();
    expect(mocks.useBase.mock.calls[0][0].registerRouteGuard).toBe(true);
    expect(mocks.routeUpdate).toHaveBeenCalledOnce();
    expect(mocks.registerToolbar).toHaveBeenCalledWith(
      "meta-script-editor",
      expect.any(Object)
    );
    expect(root.querySelector(".script-editor-toolbar")).not.toBeNull();
    expect(root.querySelector("#editor")).not.toBeNull();
    unmount();
    expect(mocks.unregisterToolbar).toHaveBeenCalledWith("meta-script-editor");
  });

  it("ignores a load that finishes after close and fetches a fresh session on reopen", async () => {
    const pending = deferred<{ data: ReturnType<typeof savedMeta> }>();
    mocks.getMeta.mockReturnValueOnce(pending.promise);
    const first = mountScript({ embedded: true, metaId: 7 });
    first.unmount();
    pending.resolve({ data: savedMeta() });
    await flushAsync();
    expect(first.base.beginEditorSession).not.toHaveBeenCalled();
    expect(first.base.postMessage).not.toHaveBeenCalled();

    const second = mountScript({ embedded: true, metaId: 7 });
    await flushAsync();
    expect(mocks.getMeta).toHaveBeenCalledTimes(2);
    expect(second.base.beginEditorSession).toHaveBeenCalledOnce();
    second.base.editorContentReady.value = true;
    await nextTick();
    expect(registrations).toHaveLength(2);
    second.unmount();
    expect(registrations.every((controller) => controller.signal.aborted)).toBe(
      true
    );
    expect(mocks.createRpc.mock.results[1].value.cancel).toHaveBeenCalled();
  });

  it("does not emit saved after its editor session has unmounted", async () => {
    const pending = deferred<{ data: { serverRevision: string } }>();
    mocks.putMetaCode.mockReturnValueOnce(pending.promise);
    const { vm, saved, unmount } = mountScript({ embedded: true, metaId: 7 });
    await flushAsync();
    const saving = vm.save();
    unmount();
    pending.resolve({ data: { serverRevision: nextRevision } });
    await saving;
    expect(saved).not.toHaveBeenCalled();
  });
});
