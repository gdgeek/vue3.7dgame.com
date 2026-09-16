/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic tool payloads and deliberately malformed mock inputs. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reactive, defineComponent, createApp, type App } from "vue";
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));
const mount = (component: Parameters<typeof createApp>[0]) => {
  const app = createApp(component);
  app.mount(document.createElement("div"));
  return app;
};
import type { WebMcpTool } from "@/services/webmcp/model-context";
const state = vi.hoisted(() => ({
  route: {} as any,
  user: {} as any,
  tools: [] as WebMcpTool[],
  push: vi.fn(),
  register: vi.fn(),
  ability: vi.fn(() => true),
  token: vi.fn(() => "token"),
  confirm: vi.fn(),
  getMeta: vi.fn(),
  getMetas: vi.fn(),
  postMeta: vi.fn(),
  putMeta: vi.fn(),
  getVerse: vi.fn(),
  getVerses: vi.fn(),
  postVerse: vi.fn(),
  putVerse: vi.fn(),
  getResource: vi.fn(),
  getResources: vi.fn(),
  getWriteReceipt: vi.fn(),
}));
vi.mock("vue-router", () => ({
  useRoute: () => state.route,
  useRouter: () => ({ push: state.push }),
}));
vi.mock("@casl/vue", () => ({ useAbility: () => ({ can: state.ability }) }));
vi.mock("@/store/modules/user", () => ({ useUserStore: () => state.user }));
vi.mock("@/services/auth/authClient", () => ({
  default: { getAccessToken: state.token },
}));
vi.mock("@/components/Dialog", () => ({
  MessageBox: { confirm: state.confirm },
}));
vi.mock("@/api/v1/meta", () => ({
  getMeta: state.getMeta,
  getMetas: state.getMetas,
  postMeta: state.postMeta,
  putMeta: state.putMeta,
}));
vi.mock("@/api/v1/verse", () => ({
  getVerse: state.getVerse,
  getVerses: state.getVerses,
  postVerse: state.postVerse,
  putVerse: state.putVerse,
}));
vi.mock("@/api/v1/resources", () => ({
  getResource: state.getResource,
  getResources: state.getResources,
}));
vi.mock("@/api/v1/write-protocol", async () => ({
  ...(await import("@/api/v1/write-contract")),
  getWriteReceipt: state.getWriteReceipt,
}));
vi.mock("@/services/webmcp/model-context", () => ({
  registerWebMcpTools: (tools: WebMcpTool[]) => {
    state.tools = tools;
    return state.register();
  },
  getRegisteredWebMcpTools: () => [{ name: "actual_registered_tool" }],
}));
import {
  useAuthoringWebMcp,
  authoringAsset,
} from "@/composables/useAuthoringWebMcp";
const revision = `sha256:${"b".repeat(64)}`;
let wrapper: App;
const call = async (name: string, input: unknown = {}) =>
  state.tools.find((t) => t.name === `xrugc_${name}`)!.execute(input) as any;
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  state.route = reactive({
    path: "/meta/list",
    fullPath: "/meta/list",
    query: { lang: "zh-CN" },
  });
  state.user = reactive({ userInfo: { id: 3 } });
  state.ability.mockReturnValue(true);
  state.token.mockReturnValue("token");
  state.confirm.mockResolvedValue(undefined);
  state.register.mockReturnValue(new AbortController());
  state.push.mockResolvedValue(undefined);
  state.getMeta.mockResolvedValue({
    data: {
      id: 1,
      title: "entity",
      editable: true,
      image_id: 80,
      serverRevision: revision,
    },
  });
  state.getResource.mockResolvedValue({
    data: {
      id: 7,
      type: "picture",
      name: "image",
      image_id: 8,
      file: { id: 80, type: "image/png", size: 1234 },
      info: '{"width":1280}',
    },
  });
  wrapper = mount(
    defineComponent({
      setup() {
        useAuthoringWebMcp();
        return () => null;
      },
    })
  );
});
afterEach(() => {
  wrapper.unmount();
});
describe("authoring app adapter", () => {
  it("provides actual registered tools and actor permissions", async () => {
    expect(await call("get_authoring_capabilities")).toMatchObject({
      contractVersion: "1.0.0",
      tools: [{ name: "actual_registered_tool" }],
      createKinds: ["entity", "scene"],
    });
    state.ability.mockReturnValue(false);
    expect(await call("get_authoring_capabilities")).toMatchObject({
      createKinds: [],
      uploadTypes: [],
    });
  });
  it("uses the existing scene POST and verifies its acknowledgment", async () => {
    state.postVerse.mockImplementation(async (data) => ({
      data: { id: 25, uuid: data.uuid },
    }));
    const draft = await call("stage_authoring_creation", {
      kind: "scene",
      name: "Created scene",
      description: "test",
    });
    await call("complete_authoring_draft", { draftId: draft.draftId });
    await flushPromises();
    expect(state.postVerse).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Created scene",
        description: "test",
        uuid: expect.any(String),
      })
    );
    expect(
      await call("get_authoring_operation", { operationId: draft.operationId })
    ).toMatchObject({ status: "completed", targetId: 25 });
  });
  it("uses only image_id and guarded options for entity cover writes", async () => {
    state.putMeta.mockImplementation(async (id, payload, options) => {
      options.onAcknowledged({
        operationId: options.operationId,
        targetType: "meta",
        targetId: id,
        action: "save",
        status: "completed",
        serverRevision: revision,
      });
      return { data: payload };
    });
    const draft = await call("stage_object_cover", {
      kind: "entity",
      id: 1,
      pictureResourceId: 7,
    });
    await call("complete_authoring_draft", { draftId: draft.draftId });
    await flushPromises();
    expect(state.putMeta).toHaveBeenCalledWith(
      1,
      { image_id: 80 },
      expect.objectContaining({
        operationId: draft.operationId,
        expectedRevision: revision,
      })
    );
    expect(
      await call("get_authoring_operation", { operationId: draft.operationId })
    ).toMatchObject({ status: "completed", result: { bindingVerified: true } });
  });
  it("does not claim success from a mismatched write receipt", async () => {
    state.putMeta.mockImplementation(async (_id, _payload, options) => {
      options.onAcknowledged({
        operationId: "another-op",
        targetType: "meta",
        targetId: 999,
        action: "save",
        status: "completed",
        serverRevision: revision,
      });
    });
    const draft = await call("stage_object_cover", {
      kind: "entity",
      id: 1,
      pictureResourceId: 7,
    });
    await call("complete_authoring_draft", { draftId: draft.draftId });
    await flushPromises();
    expect(
      await call("get_authoring_operation", { operationId: draft.operationId })
    ).toMatchObject({ status: "unknown" });
  });
  it("checks actual resulting route when navigation is prevented", async () => {
    expect(
      await call("open_authoring_object", { kind: "entity", id: 1 })
    ).toMatchObject({ opened: false });
    expect(state.push).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/meta/scene",
        query: expect.objectContaining({ id: "1" }),
      })
    );
  });
  it("invalidates staged drafts after routing away and back", async () => {
    const draft = await call("stage_authoring_creation", {
      kind: "entity",
      name: "draft",
    });
    state.route.fullPath = "/verse/index";
    state.route.fullPath = "/meta/list";
    await expect(
      call("complete_authoring_draft", { draftId: draft.draftId })
    ).rejects.toThrow("草稿失效");
  });
  it("rejects resource responses with incorrect type or id", async () => {
    state.getResource.mockResolvedValue({ data: { id: 9, type: "video" } });
    await expect(
      call("get_asset_metadata", { resourceType: "picture", id: 7 })
    ).rejects.toThrow("不匹配");
  });
  it("returns bounded metadata and no file URL or author fields", async () => {
    const metadata = await call("get_asset_metadata", {
      resourceType: "picture",
      id: 7,
    });
    expect(metadata).toMatchObject({
      metadata: { width: 1280 },
      fileId: 80,
      mimeType: "image/png",
    });
    expect(metadata).not.toHaveProperty("file");
    expect(metadata).not.toHaveProperty("author");
    expect(
      authoringAsset({ type: "picture", info: "x".repeat(9000) } as any)
        .metadata
    ).toBeNull();
  });
});
