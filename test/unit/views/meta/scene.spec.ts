import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, nextTick, reactive, ref } from "vue";

const mockRoute = reactive({
  query: {
    id: "1",
    title: "test-scene",
  },
});

const mockPush = vi.fn();
const mockPostStandardMessage = vi.fn();
const mockSendRequest = vi.fn();
let mockHostSession = "test-session";
const mockGetMeta = vi.fn();
const mockGetPolygen = vi.fn();
const mockPutMeta = vi.fn();
const mockGetVerse = vi.fn();
const mockPutVerse = vi.fn();
const mockDirty = ref(false);
const mockUnconfirmedPersistence = ref(false);
let mockUseActualSaveGuard = false;
const mockResolveLeaveSave = vi.fn();
const mockConfirmEditorSave = vi.fn();
vi.mock("@/utils/confirmEditorSave", () => ({
  confirmEditorSave: mockConfirmEditorSave,
}));
const mockAppStore = reactive({ language: "zh-CN" });
const mockGetVerses = vi.fn();
const mockRegisterToolbar = vi.fn();
const mockUpdateToolbarStatus = vi.fn();
const mockUnregisterToolbar = vi.fn();
const mockDrawerOpen = vi.fn();
const mockDrawerAllowClose = ref(true);
const mockDrawerState = reactive({
  open: false,
  ready: false,
  dirty: false,
  saving: false,
  tab: null as "blockly" | "script" | null,
});
let mockReadDrawerData: () => unknown = () => undefined;
let mockEmitDrawerSaved: (result: unknown) => void = () => {};

vi.mock("vue-router", () => ({
  createRouter: vi.fn(() => ({
    push: mockPush,
    replace: vi.fn(),
    beforeEach: vi.fn(),
    afterEach: vi.fn(),
  })),
  createWebHistory: vi.fn(() => ({})),
  useRoute: vi.fn(() => mockRoute),
  useRouter: vi.fn(() => ({ push: mockPush, getRoutes: () => [] })),
  onBeforeRouteLeave: vi.fn(),
  onBeforeRouteUpdate: vi.fn(),
}));

vi.mock("vue-i18n", () => ({
  createI18n: vi.fn(() => ({})),
  useI18n: vi.fn(() => ({
    t: (key: string) => key,
  })),
}));

vi.mock("@/utils/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
  },
}));

vi.mock("@/api/v1/meta", () => ({
  getMeta: mockGetMeta,
  getMetas: vi.fn(),
  putMeta: mockPutMeta,
}));

vi.mock("@/api/v1/write-protocol", () => ({
  getScenePublication: vi.fn(async () => ({ data: { published: false } })),
  getWriteReceipt: vi.fn(),
}));

vi.mock("@/api/v1/prefab", () => ({ getPrefab: vi.fn() }));

vi.mock("@/api/v1/files", () => ({
  postFile: vi.fn(),
}));

vi.mock("@/api/v1/verse", () => ({
  getVerses: mockGetVerses,
  getVerse: mockGetVerse,
  putVerse: mockPutVerse,
  takePhoto: vi.fn(),
}));

vi.mock("@/api/v1/resources", () => ({
  getAudio: vi.fn(),
  getParticle: vi.fn(),
  getPolygen: mockGetPolygen,
  getPicture: vi.fn(),
  getResources: vi.fn(),
  getVideo: vi.fn(),
  getVoxel: vi.fn(),
}));

vi.mock("@/api/v1/phototype", () => ({
  getPhototypes: vi.fn(),
}));

vi.mock("@/components/Dialog", () => ({
  Message: {
    success: vi.fn(),
  },
}));

vi.mock("@/store/modules/app", () => ({
  useAppStore: () => mockAppStore,
}));

vi.mock("@/store/modules/user", () => ({
  useUserStore: () => ({
    userInfo: { id: 7 },
    getRole: () => "editor",
  }),
}));

vi.mock("@/store/modules/settings", () => ({
  useSettingsStore: () => ({
    theme: "light",
  }),
}));

vi.mock("@/store/modules/config", () => ({
  useFileStore: () => ({
    store: {
      fileMD5: vi.fn(),
      publicHandler: vi.fn(),
      fileHas: vi.fn(),
      fileUpload: vi.fn(),
      fileUrl: vi.fn(),
    },
  }),
}));

vi.mock("@casl/vue", () => ({
  useAbility: () => ({
    can: () => true,
  }),
}));

vi.mock("@/utils/ability", () => ({
  AbilityEdit: class AbilityEdit {
    constructor(public type: string) {}
  },
}));

vi.mock("@/utils/i18n", () => ({
  translateRouteTitle: (value: string) => value,
}));

vi.mock("@/environment", () => ({
  default: {
    api: "https://api.example.test",
    buildVersion: "test-build",
    editor: "https://editor.example.test",
  },
}));

vi.mock("@/utils/base64", () => ({
  safeAtob: vi.fn(),
}));

vi.mock("@vueuse/core", () => ({
  until: () => ({
    toBeTruthy: async () => undefined,
  }),
}));

vi.mock("@/composables/useEditorVersionToolbar", () => ({
  useEditorVersionToolbar: () => ({
    registerToolbar: mockRegisterToolbar,
    updateToolbarStatus: mockUpdateToolbarStatus,
    unregisterToolbar: mockUnregisterToolbar,
  }),
}));

vi.mock("@/composables/useIframeMessaging", () => ({
  useIframeMessaging: () => ({
    postStandardMessage: mockPostStandardMessage,
    sendRequest: mockSendRequest,
    pendingRequests: new Map(),
    getHostSessionId: () => mockHostSession,
  }),
}));

vi.mock("@/composables/useSceneSaveGuard", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/composables/useSceneSaveGuard")>();
  return {
    useSceneSaveGuard: (
      options: Parameters<typeof actual.useSceneSaveGuard>[0]
    ) =>
      mockUseActualSaveGuard
        ? actual.useSceneSaveGuard(options)
        : {
            hasUnsavedChangesBeforeUnload: mockDirty,
            hasUnconfirmedPersistence: mockUnconfirmedPersistence,
            markPersistenceUnverified: () => {
              mockUnconfirmedPersistence.value = true;
              mockDirty.value = true;
            },
            markPersistenceAcknowledged: () => {
              mockUnconfirmedPersistence.value = false;
              mockDirty.value = false;
            },
            resetUnsavedState: () => {
              mockUnconfirmedPersistence.value = false;
              mockDirty.value = false;
            },
            syncUnsavedChangesForBeforeUnload: vi.fn(),
            resolveLeaveSave: mockResolveLeaveSave,
            requestSceneSave: vi.fn(),
            requestManualSceneSave: vi.fn(),
            isManualSavePending: () => false,
            resolveUnsavedBeforeLeave: vi.fn(async () => true),
            handleBeforeUnload: vi.fn(),
            cleanupPendingResolver: vi.fn(),
          },
  };
});

vi.mock("@/components/MrPP/ResourceDialog.vue", () => ({
  default: defineComponent({
    name: "ResourceDialogStub",
    template: "<div class='resource-dialog-stub'></div>",
  }),
}));

vi.mock("@/components/MrPP/PhototypeDialog.vue", () => ({
  default: defineComponent({
    name: "PhototypeDialogStub",
    template: "<div class='phototype-dialog-stub'></div>",
  }),
}));

vi.mock("@/components/ScriptDraftDialog.vue", () => ({
  default: defineComponent({
    name: "ScriptDraftDialogStub",
    template: "<div class='script-draft-dialog-stub'></div>",
  }),
}));

vi.mock("@/components/VerseScriptDrawer.vue", () => ({
  default: defineComponent({
    name: "VerseScriptDrawerStub",
    setup(_props, { expose }) {
      expose({ getState: () => ({ ...mockDrawerState }) });
      return {};
    },
    template: "<div class='verse-script-drawer-stub'></div>",
  }),
}));

vi.mock("@/components/MetaScriptDrawer.vue", () => ({
  default: defineComponent({
    name: "MetaScriptDrawerStub",
    props: {
      metaId: Number,
      title: String,
      metaData: Object,
    },
    emits: ["closed", "saved"],
    setup(props, { expose, emit }) {
      mockReadDrawerData = () => props.metaData;
      mockEmitDrawerSaved = (result) => emit("saved", result);
      expose({
        open: () => {
          mockDrawerOpen();
          mockDrawerState.open = true;
          mockDrawerState.tab = "blockly";
        },
        close: async (assertActive: () => void = () => {}) => {
          assertActive();
          if (!mockDrawerAllowClose.value) return false;
          mockDrawerState.open = false;
          mockDrawerState.ready = false;
          mockDrawerState.tab = null;
          emit("closed");
          return true;
        },
        getState: () => ({ ...mockDrawerState }),
        resolveBeforeLeave: async () => mockDrawerAllowClose.value,
        closeAfterNavigation: async () => {
          mockDrawerState.open = false;
          emit("closed");
          return true;
        },
      });
      return {};
    },
    template: "<div class='meta-script-drawer-stub'></div>",
  }),
}));

vi.mock("@/components/MrPP/MetaDialog.vue", () => ({
  default: defineComponent({ template: "<div />" }),
}));
vi.mock("@/components/MrPP/KnightDataDialog.vue", () => ({
  default: defineComponent({ template: "<div />" }),
}));
vi.mock("@/components/UnityPreviewDialog.vue", () => ({
  default: defineComponent({ template: "<div />" }),
}));
vi.mock("@/composables/useUnityPreviewBridge", () => ({
  useUnityPreviewBridge: () => ({
    dialogRef: ref(null),
    visible: ref(false),
    frameVisible: ref(false),
    frameKey: ref(0),
    src: ref(""),
    ready: ref(false),
    status: ref("closed"),
    failure: ref(null),
    close: vi.fn(),
    open: vi.fn(),
    handleLoad: vi.fn(),
    handleClosed: vi.fn(),
  }),
}));

const flushAsync = async () => {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
  await nextTick();
};
const sendReady = (
  documentId: string,
  origin = "https://editor.example.test",
  source = document.querySelector("iframe")?.contentWindow
) => {
  window.dispatchEvent(
    new MessageEvent("message", {
      source,
      origin,
      data: { type: "PLUGIN_READY", payload: { documentId } },
    })
  );
};
// Confirm the content probe separately from the PLUGIN_READY / INIT handshake.
const finishEditorLoading = async () => {
  await vi.advanceTimersByTimeAsync(0);
  window.dispatchEvent(
    new MessageEvent("message", {
      source: document.querySelector("iframe")?.contentWindow,
      origin: "https://editor.example.test",
      data: {
        type: "RESPONSE",
        requestId: "webmcp-request",
        payload: {
          hostSessionId: mockHostSession,
          ok: true,
          loading: false,
        },
      },
    })
  );
  await flushAsync();
};
const initCalls = () =>
  mockPostStandardMessage.mock.calls.filter(([type]) => type === "INIT");
const registerTools = () => {
  const registry = new Map<
    string,
    { execute: (input: unknown) => Promise<unknown> }
  >();
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: {
      registerTool(
        tool: { name: string; execute: (input: unknown) => Promise<unknown> },
        options: { signal: AbortSignal }
      ) {
        registry.set(tool.name, tool);
        options.signal.addEventListener("abort", () => {
          if (registry.get(tool.name) === tool) registry.delete(tool.name);
        });
      },
    },
  });
  return registry;
};

const cleanups: Array<() => void> = [];

const makeMetaResponse = (id: number) => ({
  data: {
    id,
    serverRevision: `sha256:${"a".repeat(64)}`,
    editable: true,
    verseMetas: [],
    resources: [],
    data: {
      parameters: {
        uuid: `meta-${id}`,
      },
      children: {
        entities: [],
      },
    },
    events: null,
  },
});

async function mountSceneView(kind: "meta" | "verse" = "meta") {
  const { default: SceneView } =
    kind === "meta"
      ? await import("@/views/meta/scene.vue")
      : await import("@/views/verse/scene.vue");
  const el = document.createElement("div");
  document.body.appendChild(el);
  const app = createApp(SceneView);
  app.mount(el);

  cleanups.push(() => {
    app.unmount();
    el.remove();
  });

  return {
    el,
    get metaDetail() {
      return (
        app._instance!.setupState as {
          metaDetail: ReturnType<typeof makeMetaResponse>["data"] & {
            metaCode?: { blockly: string; lua?: string; js?: string };
          };
        }
      ).metaDetail;
    },
    get saving() {
      return (app._instance!.setupState as { isSavingVersion: boolean })
        .isSavingVersion;
    },
    setSaving(value: boolean) {
      (
        app._instance!.setupState as { isSavingVersion: boolean }
      ).isSavingVersion = value;
    },
    persistSceneMutation: (response: Record<string, unknown>) =>
      (
        app._instance!.setupState as {
          persistWebMcpSceneMutation: (
            response: Record<string, unknown>,
            messages: { success: string; failure: string },
            preview: object
          ) => Promise<unknown>;
        }
      ).persistWebMcpSceneMutation(
        response,
        { success: "saved", failure: "not saved" },
        {}
      ),
    persistMetaMutation: (response: Record<string, unknown>) =>
      (
        app._instance!.setupState as {
          persistWebMcpMutation: (
            response: Record<string, unknown>,
            message: string,
            preview: object
          ) => Promise<unknown>;
        }
      ).persistWebMcpMutation(response, "entity save failed", {}),
    saveMeta: (...args: unknown[]) =>
      (
        app._instance!.setupState as {
          saveMeta: (...args: unknown[]) => Promise<boolean>;
        }
      ).saveMeta(...args),
    refresh: () =>
      (app._instance!.setupState as { refresh: () => Promise<void> }).refresh(),
  };
}

describe("views/meta/scene.vue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockRoute.query.id = "1";
    mockRoute.query.title = "test-scene";
    mockPush.mockReset();
    mockPostStandardMessage.mockReset();
    mockPostStandardMessage.mockReturnValue("init-request");
    mockHostSession = "test-session";
    mockGetVerse.mockReset();
    mockPutVerse.mockReset();
    mockResolveLeaveSave.mockReset();
    mockConfirmEditorSave.mockReset();
    mockConfirmEditorSave.mockResolvedValue("confirm");
    mockUnconfirmedPersistence.value = false;
    mockUseActualSaveGuard = false;
    mockAppStore.language = "zh-CN";
    mockDirty.value = false;
    mockGetVerse.mockImplementation(async (id: number) => makeMetaResponse(id));
    mockSendRequest.mockReset();
    mockSendRequest.mockReturnValue("webmcp-request");
    mockGetMeta.mockReset();
    mockGetPolygen.mockReset();
    mockPutMeta.mockReset();
    mockPutMeta.mockResolvedValue({
      data: { serverRevision: `sha256:${"b".repeat(64)}` },
    });
    mockGetVerses.mockReset();
    mockRegisterToolbar.mockReset();
    mockUpdateToolbarStatus.mockReset();
    mockUnregisterToolbar.mockReset();
    mockDrawerOpen.mockReset();
    mockDrawerAllowClose.value = true;
    Object.assign(mockDrawerState, {
      open: false,
      ready: false,
      dirty: false,
      saving: false,
      tab: null,
    });
    mockReadDrawerData = () => undefined;
    mockEmitDrawerSaved = () => {};

    mockGetMeta.mockImplementation(async (id: number) => makeMetaResponse(id));
    mockGetVerses.mockResolvedValue({
      data: [],
      headers: {
        "x-pagination-page-count": "1",
      },
    });
  });

  afterEach(() => {
    cleanups.forEach((cleanup) => cleanup());
    cleanups.length = 0;
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    delete (document as Document & { modelContext?: unknown }).modelContext;
    vi.resetModules();
  });

  describe("entity script drawer host", () => {
    const workspaceTool = "xrugc_get_entity_workspace_context";
    const openTool = "xrugc_open_entity_script_editor";
    const closeTool = "xrugc_close_entity_script_editor";
    const contextTool = "xrugc_get_editor_context";
    const previousRevision = `sha256:${"a".repeat(64)}`;
    const nextRevision = `sha256:${"c".repeat(64)}`;
    const scriptCode = {
      blockly: "<xml><block type='entity_action'/></xml>",
      lua: "print('entity')",
      js: "console.log('entity')",
    };
    const liveData = {
      parameters: { uuid: "meta-1", name: "Unsaved 3D edits" },
      children: { entities: [{ parameters: { uuid: "live-node" } }] },
    };
    const liveEvents = [{ id: "unsaved-event", action: "show" }];
    const respondToSnapshot = (
      overrides: Record<string, unknown> = {},
      source = document.querySelector("iframe")?.contentWindow
    ) => {
      window.dispatchEvent(
        new MessageEvent("message", {
          source,
          origin: "https://editor.example.test",
          data: {
            type: "RESPONSE",
            requestId: "webmcp-request",
            payload: {
              action: "webmcp-get-entity-state",
              hostSessionId: "test-session",
              ok: true,
              entityId: 1,
              meta: liveData,
              events: liveEvents,
              changed: true,
              loading: false,
              entityVersion: "entity-live",
              contextGeneration: 1,
              ...overrides,
            },
          },
        })
      );
    };
    const openReadyDrawer = async () => {
      const registry = registerTools();
      const page = await mountSceneView();
      sendReady("entity-drawer-document");
      await flushAsync();
      await finishEditorLoading();
      const opening = registry.get(openTool)!.execute({});
      respondToSnapshot();
      await opening;
      await nextTick();
      return { registry, page };
    };

    it("reports loading without opening until the entity editor has initialized", async () => {
      const registry = registerTools();
      await mountSceneView();
      await expect(
        registry.get(workspaceTool)!.execute({})
      ).resolves.toMatchObject({
        entityId: 1,
        entity: { ready: false },
        script: { open: false },
      });
      await expect(registry.get(openTool)!.execute({})).resolves.toMatchObject({
        status: "loading",
        applied: false,
        retryAfterMs: 500,
      });
      expect(mockDrawerOpen).not.toHaveBeenCalled();
      expect(mockSendRequest).not.toHaveBeenCalled();
      expect(mockPutMeta).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("passes a live unsaved snapshot to the drawer without navigation, saving or reinitialization", async () => {
      const { registry } = await openReadyDrawer();
      expect(mockSendRequest).toHaveBeenCalledWith(
        "webmcp-get-entity-state",
        {}
      );
      expect(mockReadDrawerData()).toMatchObject({
        id: 1,
        serverRevision: previousRevision,
        data: liveData,
        events: liveEvents,
      });
      expect((mockReadDrawerData() as { data: unknown }).data).not.toBe(
        liveData
      );
      expect(mockDrawerOpen).toHaveBeenCalledOnce();
      expect(mockDirty.value).toBe(true);
      expect(mockPutMeta).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockGetMeta).toHaveBeenCalledOnce();
      expect(initCalls()).toHaveLength(1);
      await expect(
        registry.get(workspaceTool)!.execute({})
      ).resolves.toMatchObject({
        activeEditor: "entity-script",
        entity: { ready: true, dirty: true },
        script: { open: true, ready: false, tab: "blockly" },
      });
    });

    it("hydrates newly added unsaved resources and excludes deleted references without changing the host snapshot", async () => {
      const keptResource = { id: 101, type: "polygen", name: "Kept model" };
      const addedResource = { id: 202, type: "polygen", name: "New model" };
      const deletedResource = {
        id: 303,
        type: "polygen",
        name: "Deleted model",
      };
      mockGetMeta.mockResolvedValueOnce({
        data: {
          ...makeMetaResponse(1).data,
          resources: [keptResource, deletedResource],
        },
      });
      mockGetPolygen.mockResolvedValueOnce({ data: addedResource });
      const registry = registerTools();
      const page = await mountSceneView();
      sendReady("entity-drawer-document");
      await flushAsync();
      await finishEditorLoading();
      const opening = registry.get(openTool)!.execute({});
      respondToSnapshot({
        meta: {
          ...liveData,
          children: {
            entities: [
              { type: "Polygen", parameters: { resource: 101 } },
              { type: "Polygen", parameters: { resource: 202 } },
              { type: "Polygen", parameters: { resource: 202 } },
            ],
          },
        },
      });
      await opening;
      await nextTick();
      expect(mockGetPolygen).toHaveBeenCalledOnce();
      expect(mockGetPolygen).toHaveBeenCalledWith(202);
      expect(mockReadDrawerData()).toMatchObject({
        resources: [keptResource, addedResource],
      });
      expect(page.metaDetail.resources).toEqual([
        keptResource,
        deletedResource,
      ]);
      expect(mockDirty.value).toBe(true);
      expect(mockPutMeta).not.toHaveBeenCalled();
      expect(initCalls()).toHaveLength(1);
    });

    it("does not open a stale drawer when the owner changes while resource hydration is pending", async () => {
      const addedResource = { id: 202, type: "polygen", name: "New model" };
      let resolveResource!: (value: { data: typeof addedResource }) => void;
      mockGetPolygen.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveResource = resolve;
        })
      );
      const registry = registerTools();
      await mountSceneView();
      sendReady("entity-drawer-document");
      await flushAsync();
      await finishEditorLoading();
      const opening = registry.get(openTool)!.execute({});
      const rejected = expect(opening).resolves.toMatchObject({
        isError: true,
        errorCode: "session_closed",
      });
      respondToSnapshot({
        meta: {
          ...liveData,
          children: {
            entities: [{ type: "Polygen", parameters: { resource: 202 } }],
          },
        },
      });
      await flushAsync();
      expect(mockGetPolygen).toHaveBeenCalledOnce();
      expect(mockGetPolygen).toHaveBeenCalledWith(202);
      expect(mockDrawerOpen).not.toHaveBeenCalled();
      mockRoute.query.id = "2";
      await nextTick();
      resolveResource({ data: addedResource });
      await rejected;
      expect(mockDrawerOpen).not.toHaveBeenCalled();
      expect(mockReadDrawerData()).toBeUndefined();
      expect(mockPutMeta).not.toHaveBeenCalled();
      await expect(
        registry.get(workspaceTool)!.execute({})
      ).resolves.toMatchObject({
        entityId: 2,
        activeEditor: "entity",
        script: { open: false },
      });
    });

    it("pauses entity tools while keeping workspace helpers and restores them on close", async () => {
      const registry = registerTools();
      await mountSceneView();
      sendReady("entity-drawer-document");
      await flushAsync();
      const staleContext = registry.get(contextTool)!;
      const helpers = [workspaceTool, openTool, closeTool].map((name) =>
        registry.get(name)
      );
      await finishEditorLoading();
      const opening = registry.get(openTool)!.execute({});
      respondToSnapshot();
      await opening;
      expect(registry.has(contextTool)).toBe(false);
      await expect(staleContext.execute({})).resolves.toMatchObject({
        isError: true,
        errorCode: "session_closed",
      });
      expect(
        [workspaceTool, openTool, closeTool].map((name) => registry.get(name))
      ).toEqual(helpers);
      await expect(registry.get(closeTool)!.execute({})).resolves.toMatchObject(
        {
          status: "closed",
          context: { activeEditor: "entity", script: { open: false } },
        }
      );
      expect(registry.has(contextTool)).toBe(true);
      expect(registry.get(contextTool)).not.toBe(staleContext);
      expect(
        [workspaceTool, openTool, closeTool].map((name) => registry.get(name))
      ).toEqual(helpers);
      expect(mockPutMeta).not.toHaveBeenCalled();
      expect(initCalls()).toHaveLength(1);
    });

    it("keeps the drawer active and entity tools paused when closing is cancelled", async () => {
      const { registry } = await openReadyDrawer();
      mockDrawerAllowClose.value = false;
      mockDrawerState.dirty = true;
      await expect(registry.get(closeTool)!.execute({})).resolves.toMatchObject(
        {
          status: "cancelled",
          rediscoverTools: false,
          context: {
            activeEditor: "entity-script",
            script: { open: true, dirty: true },
          },
        }
      );
      expect(registry.has(contextTool)).toBe(false);
      expect(mockPutMeta).not.toHaveBeenCalled();
    });

    it("adopts a matching script revision and code without clearing unsaved entity edits", async () => {
      const { page } = await openReadyDrawer();
      const before = JSON.parse(JSON.stringify(page.metaDetail));
      mockUnconfirmedPersistence.value = true;
      mockEmitDrawerSaved({
        entityId: 1,
        previousRevision,
        serverRevision: nextRevision,
        metaCode: scriptCode,
      });
      await nextTick();
      expect(page.metaDetail).toEqual({
        ...before,
        serverRevision: nextRevision,
        metaCode: scriptCode,
      });
      expect(mockDirty.value).toBe(true);
      expect(mockUnconfirmedPersistence.value).toBe(true);
      expect(mockPutMeta).not.toHaveBeenCalled();
      expect(initCalls()).toHaveLength(1);
    });

    it.each([
      { entityId: 2, previousRevision },
      { entityId: 1, previousRevision: `sha256:${"b".repeat(64)}` },
    ])(
      "ignores a script save from a different owner or revision: %j",
      async (saved) => {
        const { page } = await openReadyDrawer();
        const before = JSON.parse(JSON.stringify(page.metaDetail));
        mockEmitDrawerSaved({
          ...saved,
          serverRevision: nextRevision,
          metaCode: scriptCode,
        });
        await nextTick();
        expect(page.metaDetail).toEqual(before);
        expect(mockDirty.value).toBe(true);
        expect(mockPutMeta).not.toHaveBeenCalled();
        expect(initCalls()).toHaveLength(1);
      }
    );

    it("invalidates a pending snapshot when the owner changes before its response", async () => {
      const registry = registerTools();
      await mountSceneView();
      sendReady("entity-drawer-document");
      await flushAsync();
      const oldFrame = document.querySelector("iframe")?.contentWindow;
      await finishEditorLoading();
      const opening = registry.get(openTool)!.execute({});
      const rejected = expect(opening).resolves.toMatchObject({
        isError: true,
        errorCode: "session_closed",
      });
      mockRoute.query.id = "2";
      await nextTick();
      respondToSnapshot({}, oldFrame);
      await rejected;
      expect(mockDrawerOpen).not.toHaveBeenCalled();
      expect(mockReadDrawerData()).toBeUndefined();
      expect(mockPutMeta).not.toHaveBeenCalled();
      sendReady("next-entity-document");
      await flushAsync();
      await finishEditorLoading();
      await expect(
        registry.get(workspaceTool)!.execute({})
      ).resolves.toMatchObject({
        entityId: 2,
        activeEditor: "entity",
        entity: { ready: true, dirty: false },
        script: { open: false },
      });
    });
  });

  it("reloads meta data when the route id changes and the iframe becomes ready again", async () => {
    await mountSceneView();

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "PLUGIN_READY" },
        source: document.querySelector("iframe")?.contentWindow,
        origin: "https://editor.example.test",
      })
    );
    await nextTick();
    await Promise.resolve();

    expect(mockGetMeta).toHaveBeenNthCalledWith(1, 1, { expand: "verseMetas" });
    expect(mockPostStandardMessage).toHaveBeenLastCalledWith(
      "INIT",
      expect.objectContaining({
        config: expect.objectContaining({
          data: expect.objectContaining({ id: 1 }),
        }),
      })
    );

    mockRoute.query.id = "2";
    await nextTick();

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "PLUGIN_READY" },
        source: document.querySelector("iframe")?.contentWindow,
        origin: "https://editor.example.test",
      })
    );
    await nextTick();
    await Promise.resolve();

    expect(mockGetMeta).toHaveBeenNthCalledWith(2, 2, { expand: "verseMetas" });
    expect(mockPostStandardMessage).toHaveBeenLastCalledWith(
      "INIT",
      expect.objectContaining({
        config: expect.objectContaining({
          data: expect.objectContaining({ id: 2 }),
        }),
      })
    );
  });
  it("guards an editor save with its loaded revision and adopts only the acknowledged revision", async () => {
    vi.stubGlobal("ElMessage", { error: vi.fn(), info: vi.fn() });
    const view = await mountSceneView();
    window.dispatchEvent(
      new MessageEvent("message", {
        source: document.querySelector("iframe")?.contentWindow,
        origin: "https://editor.example.test",
        data: { type: "PLUGIN_READY" },
      })
    );
    await flushAsync();
    const payload = { meta: makeMetaResponse(1).data.data, events: null };
    expect(await view.saveMeta(payload)).toBe(true);
    expect(mockPutMeta).toHaveBeenLastCalledWith(
      1,
      expect.any(Object),
      expect.objectContaining({
        expectedRevision: `sha256:${"a".repeat(64)}`,
        operationId: expect.any(String),
      })
    );
    expect(await view.saveMeta(payload)).toBe(true);
    expect(mockPutMeta).toHaveBeenLastCalledWith(
      1,
      expect.any(Object),
      expect.objectContaining({ expectedRevision: `sha256:${"b".repeat(64)}` })
    );
    mockPutMeta.mockRejectedValueOnce({ response: { status: 409 } });
    expect(await view.saveMeta(payload)).toBe(false);
    expect(mockPutMeta).toHaveBeenCalledTimes(3);
  });

  it.each(["meta", "verse"] as const)(
    "keeps rejected %s edits unsaved and refuses a later no-change save acknowledgment",
    async (kind) => {
      vi.stubGlobal("ElMessage", { error: vi.fn(), info: vi.fn() });
      const view = await mountSceneView(kind);
      sendReady("conflict-document");
      await flushAsync();
      const put = kind === "meta" ? mockPutMeta : mockPutVerse;
      put.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 409 },
      });
      await expect(
        (kind === "meta"
          ? view.persistMetaMutation
          : view.persistSceneMutation)({
          meta: makeMetaResponse(1).data.data,
          events: null,
          entityVersion: "local-b",
          verse: makeMetaResponse(1).data.data,
          moduleId: "test-module",
          sceneVersion: "local-b",
        })
      ).rejects.toMatchObject({
        result: {
          status: "partial",
          persistence: "server_rejected",
          errorCode: "write_conflict",
          httpStatus: 409,
          retry: "review_server_state_before_retry",
        },
      });
      expect(mockDirty.value).toBe(true);
      expect(mockUnconfirmedPersistence.value).toBe(true);
      window.dispatchEvent(
        new MessageEvent("message", {
          source: document.querySelector("iframe")?.contentWindow,
          origin: "https://editor.example.test",
          data: {
            type: "RESPONSE",
            payload: { action: "save-before-leave", noChange: true },
          },
        })
      );
      await flushAsync();
      expect(mockResolveLeaveSave).toHaveBeenLastCalledWith(false);
      expect(mockUnconfirmedPersistence.value).toBe(true);
      expect(put).toHaveBeenCalledTimes(1);
    }
  );

  describe.each(["meta", "verse"] as const)(
    "%s read tools with the real persistence guard",
    (kind) => {
      it.each([409, "lost response"] as const)(
        "keeps all dirty reports consistent after %s until acknowledgment or owner change",
        async (failure) => {
          mockUseActualSaveGuard = true;
          vi.stubGlobal("ElMessage", { error: vi.fn(), info: vi.fn() });
          const registry = registerTools();
          const view = await mountSceneView(kind);
          sendReady("read-dirty-document");
          await flushAsync();
          const put = kind === "meta" ? mockPutMeta : mockPutVerse;
          put.mockResolvedValue({
            data: { serverRevision: `sha256:${"b".repeat(64)}` },
          });
          const failSave = async () => {
            put.mockRejectedValueOnce(
              failure === 409
                ? { isAxiosError: true, response: { status: 409 } }
                : new Error("connection lost")
            );
            await expect(persist()).rejects.toMatchObject({
              result: {
                status: "partial",
                persistence: failure === 409 ? "server_rejected" : "unverified",
              },
            });
          };
          const persist = () =>
            (kind === "meta"
              ? view.persistMetaMutation
              : view.persistSceneMutation)({
              meta: makeMetaResponse(1).data.data,
              verse: makeMetaResponse(1).data.data,
              events: null,
              entityVersion: "local-entity",
              sceneVersion: "local-scene",
            });
          const sendResponse = (payload: Record<string, unknown>) =>
            window.dispatchEvent(
              new MessageEvent("message", {
                source: document.querySelector("iframe")?.contentWindow,
                origin: "https://editor.example.test",
                data: {
                  type: "RESPONSE",
                  requestId: "webmcp-request",
                  payload: { hostSessionId: "test-session", ...payload },
                },
              })
            );
          const readTools: Array<[string, Record<string, unknown>]> =
            kind === "meta"
              ? [
                  ["xrugc_get_editor_context", {}],
                  ["xrugc_get_entity_tree", {}],
                  ["xrugc_inspect_entity_node", { nodeId: "local-node" }],
                  ["xrugc_validate_entity", {}],
                  ["xrugc_get_entity_asset_usage", {}],
                ]
              : [
                  ["xrugc_get_scene_editor_context", {}],
                  ["xrugc_validate_scene", {}],
                ];
          const expectDirtyReports = async (dirty: boolean) => {
            await finishEditorLoading();
            for (const [name, input] of readTools) {
              const reading = registry.get(name)!.execute(input);
              await flushAsync();
              sendResponse({
                action:
                  kind === "meta"
                    ? "webmcp-get-entity-state"
                    : "webmcp-get-scene-state",
                ok: true,
                entityId: Number(mockRoute.query.id),
                meta: {
                  children: {
                    entities: [
                      {
                        parameters: { uuid: "local-node", name: "Local edits" },
                      },
                    ],
                  },
                },
                verse: makeMetaResponse(Number(mockRoute.query.id)).data.data,
                events: null,
                changed: false,
                loading: false,
                entityVersion: "local-entity",
                sceneVersion: "local-scene",
                contextGeneration: 1,
              });
              await expect(reading, name).resolves.toMatchObject({ dirty });
            }
            const owner = kind === "meta" ? "entity" : "scene";
            await expect(
              registry.get(`xrugc_get_${owner}_workspace_context`)!.execute({})
            ).resolves.toMatchObject({ [owner]: { dirty } });
          };

          await failSave();
          // The legacy iframe may reset its own baseline before the failed HTTP save returns.
          sendResponse({ action: "check-unsaved-changes", changed: false });
          sendResponse({ action: "save-before-leave", noChange: true });
          await flushAsync();
          await expectDirtyReports(true);
          expect(put).toHaveBeenCalledTimes(1);

          const saving = persist();
          await flushAsync();
          acknowledgeSceneSave(kind);
          await expect(saving).resolves.toMatchObject({
            persistence: "server_acknowledged",
            editorAcknowledged: true,
          });
          await expectDirtyReports(false);

          await failSave();
          await expectDirtyReports(true);
          mockRoute.query.id = "2";
          await nextTick();
          sendReady("replacement-read-document");
          await flushAsync();
          await expectDirtyReports(false);
        }
      );
    }
  );

  describe.each(["meta", "verse"] as const)(
    "%s unified manual save entry points",
    (kind) => {
      it.each(["toolbar", "editor"])(
        "confirms %s saves and preserves edits on cancellation",
        async (entry) => {
          mockUseActualSaveGuard = true;
          vi.stubGlobal("ElMessage", {
            error: vi.fn(),
            info: vi.fn(),
            success: vi.fn(),
          });
          await mountSceneView(kind);
          sendReady("manual-confirmation");
          await flushAsync();
          await finishEditorLoading();
          const put = kind === "meta" ? mockPutMeta : mockPutVerse;
          const respond = (payload: object) =>
            window.dispatchEvent(
              new MessageEvent("message", {
                source: document.querySelector("iframe")?.contentWindow,
                origin: "https://editor.example.test",
                data: { type: "RESPONSE", payload },
              })
            );
          const data = {
            meta: makeMetaResponse(1).data.data,
            events: null,
            verse: makeMetaResponse(1).data.data,
          };
          const save = () =>
            entry === "toolbar"
              ? mockRegisterToolbar.mock.calls.at(-1)![1].onSave()
              : respond({ action: "save", ...data });
          mockSendRequest.mockClear();
          mockConfirmEditorSave.mockRejectedValueOnce("cancel");
          save();
          await flushAsync();
          expect(mockConfirmEditorSave).toHaveBeenCalledOnce();
          expect(mockConfirmEditorSave.mock.calls[0][1]).toMatchObject({
            cancelButtonText: "common.cancel",
            confirmButtonText: "common.button.save",
          });
          expect(mockSendRequest).not.toHaveBeenCalledWith("save-before-leave");
          expect(put).not.toHaveBeenCalled();
          if (entry === "editor")
            expect(mockUpdateToolbarStatus).toHaveBeenLastCalledWith(
              expect.anything(),
              "dirty"
            );
          // After cancelling, either entry can confirm and request the same snapshot path.
          save();
          await flushAsync();
          expect(mockSendRequest).toHaveBeenCalledWith("save-before-leave");
          expect(put).not.toHaveBeenCalled();
          put.mockRejectedValueOnce({
            isAxiosError: true,
            response: { status: 409 },
          });
          respond(
            entry === "editor"
              ? { action: "save-before-leave", noChange: true }
              : { action: "save-before-leave", ...data }
          );
          await flushAsync();
          expect(put).toHaveBeenCalledOnce();
          expect(mockUpdateToolbarStatus).toHaveBeenLastCalledWith(
            expect.anything(),
            "dirty"
          );
        }
      );
    }
  );

  describe.each(["meta", "verse"] as const)(
    "%s manual save failures",
    (kind) => {
      it.each(["save-before-leave"])(
        "reports a rejected %s and never acknowledges a noChange retry",
        async (action) => {
          const errorMessage = vi.fn();
          vi.stubGlobal("ElMessage", { error: errorMessage, info: vi.fn() });
          await mountSceneView(kind);
          sendReady("manual-conflict");
          await flushAsync();
          const put = kind === "meta" ? mockPutMeta : mockPutVerse;
          put.mockRejectedValueOnce({
            isAxiosError: true,
            response: { status: 409 },
          });
          const send = (payload: object) =>
            window.dispatchEvent(
              new MessageEvent("message", {
                source: document.querySelector("iframe")?.contentWindow,
                origin: "https://editor.example.test",
                data: { type: "RESPONSE", payload: { action, ...payload } },
              })
            );
          send({
            meta: makeMetaResponse(1).data.data,
            events: null,
            verse: makeMetaResponse(1).data.data,
          });
          await flushAsync();
          expect(errorMessage).toHaveBeenCalledWith(
            "common.editorSave.conflict"
          );
          expect(mockUnconfirmedPersistence.value).toBe(true);
          expect(mockResolveLeaveSave).toHaveBeenLastCalledWith(false);
          send({ noChange: true });
          await flushAsync();
          expect(errorMessage).toHaveBeenLastCalledWith(
            "common.editorSave.pending"
          );
          expect(mockResolveLeaveSave).toHaveBeenLastCalledWith(false);
          expect(put).toHaveBeenCalledTimes(1);
          expect(mockDirty.value).toBe(true);
        }
      );

      it("reports a lost response as unverified, retaining its local edits", async () => {
        vi.stubGlobal("ElMessage", { error: vi.fn(), info: vi.fn() });
        const view = await mountSceneView(kind);
        sendReady("lost-response");
        await flushAsync();
        (kind === "meta" ? mockPutMeta : mockPutVerse).mockRejectedValueOnce(
          new Error("connection lost")
        );
        await expect(
          (kind === "meta"
            ? view.persistMetaMutation
            : view.persistSceneMutation)({
            meta: makeMetaResponse(1).data.data,
            events: null,
            verse: makeMetaResponse(1).data.data,
          })
        ).rejects.toMatchObject({
          result: {
            status: "partial",
            persistence: "unverified",
            retry: "read_state_before_retry",
          },
        });
        expect(mockDirty.value).toBe(true);
        expect(mockUnconfirmedPersistence.value).toBe(true);
      });
    }
  );

  const acknowledgeSceneSave = (kind: "meta" | "verse" = "verse") => {
    window.dispatchEvent(
      new MessageEvent("message", {
        source: document.querySelector("iframe")?.contentWindow,
        origin: "https://editor.example.test",
        data: {
          type: "RESPONSE",
          requestId: "webmcp-request",
          payload: {
            action:
              kind === "meta"
                ? "webmcp-mark-entity-saved"
                : "webmcp-mark-scene-saved",
            hostSessionId: "test-session",
            ok: true,
          },
        },
      })
    );
  };

  it.each(["meta", "verse"] as const)(
    "clears an unconfirmed %s save only after server and editor acknowledge it",
    async (kind) => {
      const view = await mountSceneView(kind);
      sendReady("save-document");
      await flushAsync();
      mockPutVerse.mockResolvedValueOnce({
        data: { serverRevision: `sha256:${"b".repeat(64)}` },
      });
      const pending = (
        kind === "meta" ? view.persistMetaMutation : view.persistSceneMutation
      )({
        meta: makeMetaResponse(1).data.data,
        events: null,
        entityVersion: "saved-entity",
        verse: makeMetaResponse(1).data.data,
        moduleId: "test-module",
        sceneVersion: "saved-scene",
      });
      await flushAsync();
      expect(mockSendRequest).toHaveBeenLastCalledWith(
        kind === "meta"
          ? "webmcp-mark-entity-saved"
          : "webmcp-mark-scene-saved",
        kind === "meta"
          ? { expectedEntityVersion: "saved-entity" }
          : { expectedSceneVersion: "saved-scene" }
      );
      expect(mockDirty.value).toBe(true);
      expect(mockUnconfirmedPersistence.value).toBe(true);

      acknowledgeSceneSave(kind);
      await expect(pending).resolves.toMatchObject({
        persistence: "server_acknowledged",
        editorAcknowledged: true,
      });
      expect(mockDirty.value).toBe(false);
      expect(mockUnconfirmedPersistence.value).toBe(false);
    }
  );

  it.each(["meta", "verse"] as const)(
    "does not clear replacement %s dirty state when the old server save returns",
    async (kind) => {
      const view = await mountSceneView(kind);
      sendReady("old-save-document");
      await flushAsync();
      let finishSave!: (response: { data: { serverRevision: string } }) => void;
      (kind === "meta" ? mockPutMeta : mockPutVerse).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishSave = resolve;
          })
      );
      const pending = (
        kind === "meta" ? view.persistMetaMutation : view.persistSceneMutation
      )({
        meta: makeMetaResponse(1).data.data,
        events: null,
        entityVersion: "old-entity",
        verse: makeMetaResponse(1).data.data,
        moduleId: "old-module",
        sceneVersion: "old-scene",
      });
      expect(mockUnconfirmedPersistence.value).toBe(true);
      expect(view.saving).toBe(true);

      mockRoute.query.id = "2";
      await nextTick();
      expect(mockUnconfirmedPersistence.value).toBe(false);
      expect(view.saving).toBe(false);
      sendReady("replacement-document");
      await flushAsync();
      view.setSaving(true);
      mockDirty.value = true;
      mockUnconfirmedPersistence.value = true;
      finishSave({ data: { serverRevision: `sha256:${"b".repeat(64)}` } });

      await expect(pending).resolves.toMatchObject({
        persistence: "server_acknowledged",
        editorAcknowledged: false,
        ownerId: 1,
      });
      expect(mockSendRequest).not.toHaveBeenCalledWith(
        "webmcp-mark-scene-saved",
        expect.anything()
      );
      expect(mockDirty.value).toBe(true);
      expect(view.saving).toBe(true);
      expect(mockUnconfirmedPersistence.value).toBe(true);
    }
  );

  it.each(["meta", "verse"] as const)(
    "does not clear new %s session edits after an old editor acknowledgment",
    async (kind) => {
      const view = await mountSceneView(kind);
      sendReady("ack-document");
      await flushAsync();
      mockPutVerse.mockResolvedValueOnce({
        data: { serverRevision: `sha256:${"b".repeat(64)}` },
      });
      const pending = (
        kind === "meta" ? view.persistMetaMutation : view.persistSceneMutation
      )({
        meta: makeMetaResponse(1).data.data,
        events: null,
        entityVersion: "saved-entity",
        verse: makeMetaResponse(1).data.data,
        moduleId: "test-module",
        sceneVersion: "saved-scene",
      });
      await flushAsync();
      expect(mockSendRequest).toHaveBeenLastCalledWith(
        kind === "meta"
          ? "webmcp-mark-entity-saved"
          : "webmcp-mark-scene-saved",
        kind === "meta"
          ? { expectedEntityVersion: "saved-entity" }
          : { expectedSceneVersion: "saved-scene" }
      );

      acknowledgeSceneSave(kind);
      // The RPC has resolved, but its awaiting save continuation has not resumed.
      mockHostSession = "replacement-session";
      mockDirty.value = true;
      mockUnconfirmedPersistence.value = true;
      await expect(pending).resolves.toMatchObject({
        persistence: "server_acknowledged",
        editorAcknowledged: true,
      });
      expect(mockDirty.value).toBe(true);
      expect(mockUnconfirmedPersistence.value).toBe(true);
    }
  );

  it("reads unsaved entity content from the current iframe and aborts the old tools on route changes", async () => {
    const registry = new Map<
      string,
      { execute: (input: unknown) => Promise<unknown> }
    >();
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool(
          tool: { name: string; execute: (input: unknown) => Promise<unknown> },
          options: { signal: AbortSignal }
        ) {
          registry.set(tool.name, tool);
          options.signal.addEventListener("abort", () => {
            if (registry.get(tool.name) === tool) registry.delete(tool.name);
          });
        },
      },
    });
    await mountSceneView();
    window.dispatchEvent(
      new MessageEvent("message", {
        source: document.querySelector("iframe")?.contentWindow,
        origin: "https://editor.example.test",
        data: { type: "PLUGIN_READY" },
      })
    );
    await nextTick();
    await Promise.resolve();
    const tool = registry.get("xrugc_get_entity_tree")!;
    expect(tool).toBeDefined();
    await finishEditorLoading();
    const result = tool.execute({});
    expect(mockSendRequest).toHaveBeenCalledWith("webmcp-get-entity-state", {});
    window.dispatchEvent(
      new MessageEvent("message", {
        source: document.querySelector("iframe")?.contentWindow,
        origin: "https://editor.example.test",
        data: {
          type: "RESPONSE",
          requestId: "webmcp-request",
          payload: {
            action: "webmcp-get-entity-state",
            hostSessionId: "test-session",
            ok: true,
            entityId: 1,
            meta: {
              children: {
                entities: [
                  {
                    type: "Group",
                    parameters: { uuid: "new-node", name: "Unsaved live node" },
                    children: { entities: [] },
                  },
                ],
              },
            },
            events: null,
            entityVersion: "live-version",
            changed: true,
            loading: false,
            contextGeneration: 1,
          },
        },
      })
    );
    const snapshot = await result;
    expect(JSON.stringify(snapshot)).toContain("Unsaved live node");
    expect(snapshot).toMatchObject({
      source: "live-editor",
      dirty: true,
      entityVersion: "live-version",
    });
    mockRoute.query.id = "2";
    await nextTick();
    mockRoute.query.id = "1";
    await nextTick();
    await expect(tool.execute({})).resolves.toMatchObject({
      isError: true,
      errorCode: "session_closed",
    });
  });
  it("keeps entity live reads blocked while referenced scene names are loading", async () => {
    const registry = registerTools();
    const result = makeMetaResponse(1);
    mockGetMeta.mockResolvedValueOnce({
      data: { ...result.data, verseMetas: [{ verse_id: 10 }] },
    });
    let release!: (value: unknown) => void;
    mockGetVerses.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    await mountSceneView();
    sendReady("document-one");
    await flushAsync();
    expect(mockGetVerses).toHaveBeenCalledOnce();
    await expect(
      registry.get("xrugc_get_editor_context")!.execute({})
    ).resolves.toMatchObject({ ready: false });
    expect(mockSendRequest).not.toHaveBeenCalled();
    expect(initCalls()).toHaveLength(0);
    release({
      data: [{ id: 10, name: "Referenced scene" }],
      headers: { "x-pagination-page-count": "1" },
    });
    await flushAsync();
    expect(initCalls()[0][1].config.entitySceneNames).toEqual([
      "Referenced scene",
    ]);
  });

  describe.each(["meta", "verse"] as const)(
    "%s initialization lifecycle",
    (kind) => {
      const contextTool =
        kind === "meta"
          ? "xrugc_get_editor_context"
          : "xrugc_get_scene_editor_context";
      const fetchData = () => (kind === "meta" ? mockGetMeta : mockGetVerse);

      it("does not issue live RPC while scene data is waiting for INIT", async () => {
        const registry = registerTools();
        let release!: (value: ReturnType<typeof makeMetaResponse>) => void;
        fetchData().mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              release = resolve;
            })
        );
        await mountSceneView(kind);
        await expect(
          registry.get(contextTool)!.execute({})
        ).resolves.toMatchObject({ ready: false });
        sendReady("document-one");
        await flushAsync();
        expect(initCalls()).toHaveLength(0);
        await expect(
          registry.get(contextTool)!.execute({})
        ).resolves.toMatchObject({ ready: false });
        expect(registry.has("xrugc_get_workflow_guide")).toBe(true);
        await expect(
          registry.get("xrugc_get_workflow_guide")!.execute({})
        ).resolves.toMatchObject({ topic: "overview" });
        expect(mockSendRequest).not.toHaveBeenCalled();
        release(makeMetaResponse(1));
        await flushAsync();
        expect(initCalls()).toHaveLength(1);
        expect(registry.has(contextTool)).toBe(true);
        const action =
          kind === "meta"
            ? "webmcp-get-entity-state"
            : "webmcp-get-scene-state";
        await finishEditorLoading();
        const context = registry.get(contextTool)!.execute({});
        expect(mockSendRequest).toHaveBeenCalledWith(action, {});
        window.dispatchEvent(
          new MessageEvent("message", {
            source: document.querySelector("iframe")?.contentWindow,
            origin: "https://editor.example.test",
            data: {
              type: "RESPONSE",
              requestId: "webmcp-request",
              payload: {
                action,
                hostSessionId: "test-session",
                ok: true,
                entityId: 1,
                meta: makeMetaResponse(1).data.data,
                verse: makeMetaResponse(1).data.data,
                entityVersion: "entity-live",
                sceneVersion: "scene-live",
                changed: false,
                loading: false,
                selectedModuleIds: [],
              },
            },
          })
        );
        await expect(context).resolves.toMatchObject(
          kind === "meta"
            ? { editor: "entity", entity: { id: 1 } }
            : { editor: "scene", ready: true, scene: { id: 1 } }
        );
      });

      it("ignores duplicate READY and initializes a new document in the same frame", async () => {
        await mountSceneView(kind);
        sendReady("document-one");
        await flushAsync();
        expect(initCalls()).toHaveLength(1);
        mockDirty.value = true;
        sendReady("document-one");
        await flushAsync();
        expect(initCalls()).toHaveLength(1);
        expect(mockDirty.value).toBe(true);
        expect(fetchData()).toHaveBeenCalledTimes(1);
        sendReady("document-two");
        await flushAsync();
        expect(initCalls()).toHaveLength(2);
        expect(fetchData()).toHaveBeenCalledTimes(2);
      });

      it("ignores a prior document fetch after an iframe reload", async () => {
        let release!: (value: ReturnType<typeof makeMetaResponse>) => void;
        fetchData().mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              release = resolve;
            })
        );
        await mountSceneView(kind);
        sendReady("document-one");
        await flushAsync();
        sendReady("document-two");
        await flushAsync();
        release(makeMetaResponse(99));
        await flushAsync();
        expect(initCalls()).toHaveLength(1);
        expect(initCalls()[0][1].config.data.id).toBe(1);
      });

      it("does not apply an older route response to the replacement frame", async () => {
        let release!: (value: ReturnType<typeof makeMetaResponse>) => void;
        fetchData().mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              release = resolve;
            })
        );
        await mountSceneView(kind);
        sendReady("document-one");
        await flushAsync();
        mockRoute.query.id = "2";
        await nextTick();
        sendReady("document-two");
        await flushAsync();
        release(makeMetaResponse(1));
        await flushAsync();
        expect(initCalls()).toHaveLength(1);
        expect(initCalls()[0][1].config.data.id).toBe(2);
      });

      it("waits for the new src document and discards the previous src fetch", async () => {
        let release!: (value: ReturnType<typeof makeMetaResponse>) => void;
        fetchData().mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              release = resolve;
            })
        );
        await mountSceneView(kind);
        sendReady("document-one");
        await flushAsync();
        mockAppStore.language = "en-US";
        await nextTick();
        release(makeMetaResponse(1));
        await flushAsync();
        expect(initCalls()).toHaveLength(0);
        sendReady("document-two");
        await flushAsync();
        expect(initCalls()).toHaveLength(1);
      });

      it("does not initialize from another origin or window", async () => {
        await mountSceneView(kind);
        sendReady("foreign", "https://wrong.example");
        sendReady("foreign", "https://editor.example.test", window);
        await flushAsync();
        expect(fetchData()).not.toHaveBeenCalled();
        expect(initCalls()).toHaveLength(0);
        sendReady("document-one");
        await flushAsync();
        expect(initCalls()).toHaveLength(1);
      });

      const resolveContext = async (
        registry: ReturnType<typeof registerTools>
      ) => {
        const action =
          kind === "meta"
            ? "webmcp-get-entity-state"
            : "webmcp-get-scene-state";
        await finishEditorLoading();
        const context = registry.get(contextTool)!.execute({});
        expect(mockSendRequest).toHaveBeenCalledWith(action, {});
        window.dispatchEvent(
          new MessageEvent("message", {
            source: document.querySelector("iframe")?.contentWindow,
            origin: "https://editor.example.test",
            data: {
              type: "RESPONSE",
              requestId: "webmcp-request",
              payload: {
                action,
                hostSessionId: "test-session",
                ok: true,
                entityId: 1,
                meta: makeMetaResponse(1).data.data,
                verse: makeMetaResponse(1).data.data,
                sceneVersion: "scene-live",
                entityVersion: "entity-live",
                changed: false,
                loading: false,
                selectedModuleIds: [],
              },
            },
          })
        );
        await expect(context).resolves.toMatchObject(
          kind === "meta"
            ? { editor: "entity", entity: { id: 1 } }
            : { editor: "scene", ready: true, scene: { id: 1 } }
        );
      };

      it("restores live RPC after an API refresh fails without sending a new INIT", async () => {
        const registry = registerTools();
        const page = await mountSceneView(kind);
        sendReady("document-one");
        await flushAsync();
        await resolveContext(registry);
        mockSendRequest.mockClear();
        fetchData().mockRejectedValueOnce(new Error("Temporary API failure"));
        await page.refresh();
        expect(initCalls()).toHaveLength(1);
        await resolveContext(registry);
      });

      it("keeps a document blocked when its first API initialization fails", async () => {
        const registry = registerTools();
        fetchData().mockRejectedValueOnce(new Error("Initial API failure"));
        await mountSceneView(kind);
        sendReady("document-one");
        await flushAsync();
        await expect(
          registry.get(contextTool)!.execute({})
        ).resolves.toMatchObject({ ready: false });
        expect(initCalls()).toHaveLength(0);
        expect(mockSendRequest).not.toHaveBeenCalled();
      });

      it.each(["returns no id", "throws"])(
        "keeps RPC blocked when re-INIT %s",
        async (failure) => {
          const registry = registerTools();
          const page = await mountSceneView(kind);
          sendReady("document-one");
          await flushAsync();
          mockSendRequest.mockClear();
          if (failure === "throws")
            mockPostStandardMessage.mockImplementationOnce(() => {
              throw new Error("Post failed after session rotation");
            });
          else mockPostStandardMessage.mockReturnValueOnce(undefined);
          await page.refresh();
          await expect(
            registry.get(contextTool)!.execute({})
          ).resolves.toMatchObject({ ready: false });
          expect(mockSendRequest).not.toHaveBeenCalled();
        }
      );

      it("does not restore old readiness when a stale refresh fails after reload", async () => {
        const registry = registerTools();
        const page = await mountSceneView(kind);
        sendReady("document-one");
        await flushAsync();
        mockSendRequest.mockClear();
        let rejectOld!: (error: Error) => void;
        fetchData().mockImplementationOnce(
          () =>
            new Promise((_resolve, reject) => {
              rejectOld = reject;
            })
        );
        const oldRefresh = page.refresh();
        let resolveNew!: (value: ReturnType<typeof makeMetaResponse>) => void;
        fetchData().mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveNew = resolve;
            })
        );
        sendReady("document-two");
        await flushAsync();
        rejectOld(new Error("Old API failure"));
        await oldRefresh;
        await expect(
          registry.get(contextTool)!.execute({})
        ).resolves.toMatchObject({ ready: false });
        expect(mockSendRequest).not.toHaveBeenCalled();
        resolveNew(makeMetaResponse(1));
        await flushAsync();
        await resolveContext(registry);
      });

      it("keeps live RPC blocked when posting INIT fails", async () => {
        const registry = registerTools();
        mockPostStandardMessage.mockReturnValue(undefined);
        await mountSceneView(kind);
        sendReady("document-one");
        await flushAsync();
        await expect(
          registry.get(contextTool)!.execute({})
        ).resolves.toMatchObject({ ready: false });
        expect(mockSendRequest).not.toHaveBeenCalled();
      });
    }
  );
});
