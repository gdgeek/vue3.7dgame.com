import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, nextTick, reactive } from "vue";

const mockRoute = reactive({
  query: {
    id: "1",
    title: "test-scene",
  },
});

const mockPush = vi.fn();
const mockPostStandardMessage = vi.fn();
const mockGetMeta = vi.fn();
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
  putMeta: vi.fn(),
}));

vi.mock("@/api/v1/files", () => ({
  postFile: vi.fn(),
}));

vi.mock("@/api/v1/verse", () => ({
  getVerses: mockGetVerses,
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
  useAppStore: () => ({
    language: "zh-CN",
  }),
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
    sendRequest: vi.fn(),
    pendingRequests: new Map(),
  }),
}));

vi.mock("@/composables/useSceneSaveGuard", () => ({
  useSceneSaveGuard: () => ({
    hasUnsavedChangesBeforeUnload: { value: false },
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

async function mountSceneView() {
  const { default: SceneView } = await import("@/views/meta/scene.vue");
  const el = document.createElement("div");
  document.body.appendChild(el);
  const app = createApp(SceneView);
  app.mount(el);

  cleanups.push(() => {
    app.unmount();
    el.remove();
  });

  return { el };
}

describe("views/meta/scene.vue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockRoute.query.id = "1";
    mockRoute.query.title = "test-scene";
    mockPush.mockReset();
    mockPostStandardMessage.mockReset();
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
    vi.resetModules();
  });

  it("reloads meta data when the route id changes and the iframe becomes ready again", async () => {
    await mountSceneView();

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "PLUGIN_READY" },
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
});
