import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, reactive, ref } from "vue";
import type {
  EditorPostPayload,
  UseScriptEditorBaseOptions,
} from "@/composables/useScriptEditorBase";
import VerseScript from "@/views/verse/script.vue";

const mocks = vi.hoisted(() => ({
  getVerse: vi.fn(),
  putVerseCode: vi.fn(),
  takePhoto: vi.fn(),
  useBase: vi.fn(),
  confirm: vi.fn(),
  success: vi.fn(),
  notice: vi.fn(),
}));
const route = reactive({ name: "Script", query: { id: "7" } });
vi.mock("vue-router", () => ({
  useRoute: () => route,
  useRouter: () => ({ push: vi.fn() }),
  onBeforeRouteUpdate: vi.fn(),
  onBeforeRouteLeave: vi.fn(),
}));
vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("@/api/v1/verse", () => ({
  getVerse: mocks.getVerse,
  putVerseCode: mocks.putVerseCode,
  takePhoto: mocks.takePhoto,
}));
vi.mock("@/api/v1/meta", () => ({ getMeta: vi.fn() }));
vi.mock("@/store/modules/user", () => ({
  useUserStore: () => ({ userInfo: { id: 7 }, getRole: () => "editor" }),
}));
vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/utils/i18n", () => ({ translateRouteTitle: (s: string) => s }));
vi.mock("@/components/Dialog", () => ({
  Message: { success: mocks.success },
}));
vi.mock("element-plus", () => ({
  ElMessage: {
    success: mocks.success,
    info: mocks.notice,
    error: vi.fn(),
    warning: vi.fn(),
  },
  ElMessageBox: { confirm: mocks.confirm },
}));
vi.mock("@/components/ScriptDraftDialog.vue", () => ({
  default: defineComponent({ render: () => h("div") }),
}));
vi.mock("@/components/UnityPreviewDialog.vue", () => ({
  default: defineComponent({ render: () => h("div") }),
}));
vi.mock("@/composables/useEditorVersionToolbar", () => ({
  useEditorVersionToolbar: () => ({
    registerToolbar: vi.fn(),
    updateToolbarStatus: vi.fn(),
    unregisterToolbar: vi.fn(),
  }),
}));
vi.mock("@/composables/useScriptEditorBase", () => ({
  useScriptEditorBase: mocks.useBase,
}));
vi.mock("@/composables/useUnityPreviewBridge", () => ({
  useUnityPreviewBridge: () => ({
    dialogRef: ref(null),
    visible: ref(false),
    frameVisible: ref(false),
    frameKey: ref(0),
    src: ref(""),
    runtimeState: ref({}),
    close: vi.fn(async () => {}),
  }),
}));
vi.mock("@/utils/iframeRpc", () => ({
  createIframeRpc: () => ({
    request: vi.fn(),
    handleMessage: vi.fn(),
    cancel: vi.fn(),
  }),
}));
vi.mock("@/services/webmcp/verse-script-tools", () => ({
  registerVerseScriptWebMcpTools: vi.fn(),
}));
vi.mock("@/services/webmcp/script-block-tools", () => ({
  registerScriptBlockWebMcpTools: vi.fn(),
}));
vi.mock("@/services/webmcp/model-context", () => ({
  registerWebMcpTools: vi.fn(),
}));

const revision = `sha256:${"a".repeat(64)}`;
const nextRevision = `sha256:${"b".repeat(64)}`;
const payload: EditorPostPayload = {
  data: {},
  js: "updated();",
  lua: "updated()",
};
const savedVerse = (id = 7) => ({
  id,
  name: `scene ${id}`,
  editable: true,
  serverRevision: revision,
  verseCode: { blockly: "{}", js: "", lua: "" },
  data: { children: { modules: [{ parameters: {} }] } },
  metas: [],
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
  const session = ref(0);
  return {
    session,
    activeName: ref("blockly"),
    languageName: ref("lua"),
    LuaCode: ref(""),
    JavaScriptCode: ref(""),
    unsavedBlocklyData: ref(null),
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
    postMessage: vi.fn(),
    beginEditorSession: vi.fn(() => {
      session.value += 1;
    }),
    initializeSavedSnapshot: vi.fn(),
    getEditorInitState: () => ({
      data: {},
      code: { js: "", lua: "" },
      persisted: { data: {} },
      hostSessionId: `script-session-${session.value}`,
    }),
    save: vi.fn(() => options.onPost(payload, { trigger: "manual" })),
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
const cleanups: Array<() => void> = [];
function mountScript(beforePublish?: () => Promise<void>) {
  const saved = vi.fn();
  const root = document.createElement("div");
  document.body.appendChild(root);
  const app = createApp(VerseScript, { beforePublish, onSaved: saved });
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
  ])
    app.component(name, passthrough);
  const vm = app.mount(root) as unknown as { save: () => Promise<void> };
  let mounted = true;
  const unmount = () => {
    if (!mounted) return;
    mounted = false;
    app.unmount();
    root.remove();
  };
  cleanups.push(unmount);
  return { vm, saved, unmount, base: bases.at(-1)! };
}
beforeEach(() => {
  vi.clearAllMocks();
  route.query.id = "7";
  bases.length = 0;
  mocks.getVerse.mockImplementation(async (id: number) => ({
    data: savedVerse(id),
  }));
  mocks.putVerseCode.mockResolvedValue({
    data: { serverRevision: nextRevision },
  });
  mocks.takePhoto.mockResolvedValue({ data: {} });
  mocks.confirm.mockReturnValue(new Promise(() => {}));
  mocks.useBase.mockImplementation((options: UseScriptEditorBaseOptions) => {
    const base = createBase(options);
    bases.push(base);
    return base;
  });
});
afterEach(() => {
  cleanups
    .splice(0)
    .reverse()
    .forEach((cleanup) => cleanup());
});

describe("scene script save and publication ownership", () => {
  it("saves and publishes the confirmed current scene with the new revision", async () => {
    const confirmation = deferred<boolean>();
    const beforePublish = vi.fn(async () => {});
    mocks.confirm.mockReturnValue(confirmation.promise);
    const view = mountScript(beforePublish);
    await flushAsync();
    await view.vm.save();
    expect(view.saved).toHaveBeenCalledOnce();
    expect(mocks.confirm).toHaveBeenCalledOnce();
    expect(mocks.takePhoto).not.toHaveBeenCalled();
    confirmation.resolve(true);
    await flushAsync();
    expect(beforePublish).toHaveBeenCalledOnce();
    expect(mocks.takePhoto).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ expectedRevision: nextRevision })
    );
    expect(mocks.success).toHaveBeenCalledWith(
      "verse.view.sceneEditor.publishSuccess"
    );
  });

  it.each(["target", "session", "unmount"])(
    "does not emit or open publication after a late save in a replaced %s",
    async (change) => {
      const pending = deferred<{ data: { serverRevision: string } }>();
      mocks.putVerseCode.mockReturnValue(pending.promise);
      const view = mountScript();
      await flushAsync();
      const saving = view.vm.save();
      if (change === "target") route.query.id = "8";
      else if (change === "session") view.base.session.value += 1;
      else view.unmount();
      await flushAsync();
      pending.resolve({ data: { serverRevision: nextRevision } });
      await saving;
      expect(view.saved).not.toHaveBeenCalled();
      expect(mocks.confirm).not.toHaveBeenCalled();
      expect(mocks.success).not.toHaveBeenCalled();
    }
  );

  it.each(["target", "session", "unmount"])(
    "ignores old publication confirmation after replacing the %s",
    async (change) => {
      const confirmation = deferred<boolean>();
      const beforePublish = vi.fn(async () => {});
      mocks.confirm.mockReturnValue(confirmation.promise);
      const view = mountScript(beforePublish);
      await flushAsync();
      await view.vm.save();
      if (change === "target") route.query.id = "8";
      else if (change === "session") view.base.session.value += 1;
      else view.unmount();
      await flushAsync();
      confirmation.resolve(true);
      await flushAsync();
      expect(beforePublish).not.toHaveBeenCalled();
      expect(mocks.takePhoto).not.toHaveBeenCalled();
    }
  );

  it.each(["target", "session", "unmount"])(
    "rechecks the %s after asynchronous preparation before publishing",
    async (change) => {
      const preparation = deferred<void>();
      const beforePublish = vi.fn(() => preparation.promise);
      mocks.confirm.mockResolvedValue(true);
      const view = mountScript(beforePublish);
      await flushAsync();
      await view.vm.save();
      expect(beforePublish).toHaveBeenCalledOnce();
      if (change === "target") route.query.id = "8";
      else if (change === "session") view.base.session.value += 1;
      else view.unmount();
      await flushAsync();
      preparation.resolve();
      await flushAsync();
      expect(mocks.takePhoto).not.toHaveBeenCalled();
    }
  );

  it("does not show a late publish result in another scene", async () => {
    const publication = deferred<{ data: object }>();
    mocks.confirm.mockResolvedValue(true);
    mocks.takePhoto.mockReturnValue(publication.promise);
    const view = mountScript();
    await flushAsync();
    await view.vm.save();
    await flushAsync();
    expect(mocks.takePhoto).toHaveBeenCalledOnce();
    route.query.id = "8";
    await flushAsync();
    publication.resolve({ data: {} });
    await flushAsync();
    expect(mocks.success).not.toHaveBeenCalledWith(
      "verse.view.sceneEditor.publishSuccess"
    );
  });
});
