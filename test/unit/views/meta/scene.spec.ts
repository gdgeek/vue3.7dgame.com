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
const mockGetMeta = vi.fn();
const mockGetVerse = vi.fn();
const mockDirty = ref(false);
const mockAppStore = reactive({ language: "zh-CN" });
const mockGetVerses = vi.fn();
const mockRegisterToolbar = vi.fn();
const mockUpdateToolbarStatus = vi.fn();
const mockUnregisterToolbar = vi.fn();

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
  putMeta: vi.fn(),
}));

vi.mock("@/api/v1/prefab", () => ({ getPrefab: vi.fn() }));

vi.mock("@/api/v1/files", () => ({
  postFile: vi.fn(),
}));

vi.mock("@/api/v1/verse", () => ({
  getVerses: mockGetVerses,
  getVerse: mockGetVerse,
  putVerse: vi.fn(),
  takePhoto: vi.fn(),
}));

vi.mock("@/api/v1/resources", () => ({
  getAudio: vi.fn(),
  getParticle: vi.fn(),
  getPolygen: vi.fn(),
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
    getHostSessionId: () => "test-session",
  }),
}));

vi.mock("@/composables/useSceneSaveGuard", () => ({
  useSceneSaveGuard: () => ({
    hasUnsavedChangesBeforeUnload: mockDirty,
    syncUnsavedChangesForBeforeUnload: vi.fn(),
    resolveLeaveSave: vi.fn(),
    requestSceneSave: vi.fn(),
    resolveUnsavedBeforeLeave: vi.fn(async () => true),
    handleBeforeUnload: vi.fn(),
    cleanupPendingResolver: vi.fn(),
  }),
}));

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
    mockGetVerse.mockReset();
    mockAppStore.language = "zh-CN";
    mockDirty.value = false;
    mockGetVerse.mockImplementation(async (id: number) => makeMetaResponse(id));
    mockSendRequest.mockReset();
    mockSendRequest.mockReturnValue("webmcp-request");
    mockGetMeta.mockReset();
    mockGetVerses.mockReset();
    mockRegisterToolbar.mockReset();
    mockUpdateToolbarStatus.mockReset();
    mockUnregisterToolbar.mockReset();

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
    await expect(tool.execute({})).rejects.toThrow();
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
    ).rejects.toThrow();
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
        await expect(registry.get(contextTool)!.execute({})).rejects.toThrow();
        sendReady("document-one");
        await flushAsync();
        expect(initCalls()).toHaveLength(0);
        await expect(registry.get(contextTool)!.execute({})).rejects.toThrow();
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
        await expect(registry.get(contextTool)!.execute({})).rejects.toThrow();
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
          if (failure === "throws")
            mockPostStandardMessage.mockImplementationOnce(() => {
              throw new Error("Post failed after session rotation");
            });
          else mockPostStandardMessage.mockReturnValueOnce(undefined);
          await page.refresh();
          await expect(registry.get(contextTool)!.execute({})).rejects.toThrow(
            /准备|加载/
          );
          expect(mockSendRequest).not.toHaveBeenCalled();
        }
      );

      it("does not restore old readiness when a stale refresh fails after reload", async () => {
        const registry = registerTools();
        const page = await mountSceneView(kind);
        sendReady("document-one");
        await flushAsync();
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
        await expect(registry.get(contextTool)!.execute({})).rejects.toThrow(
          /准备|加载/
        );
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
        await expect(registry.get(contextTool)!.execute({})).rejects.toThrow(
          /准备|加载/
        );
        expect(mockSendRequest).not.toHaveBeenCalled();
      });
    }
  );
});
