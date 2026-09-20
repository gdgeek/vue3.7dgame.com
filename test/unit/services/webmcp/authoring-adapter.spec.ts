import { webMcpToolError } from "@/services/webmcp/tool-error";
/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic tool payloads and deliberately malformed mock inputs. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { webcrypto } from "node:crypto";
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
  putMetaCode: vi.fn(),
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
vi.mock("@/services/webmcp/authoring-task-store", () => ({
  serverTaskStore: {},
}));
vi.mock("@/utils/request", () => ({ default: vi.fn() }));
vi.mock("@/api/v1/authoring-create", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/v1/authoring-create")>()),
  createAuthoringObject: async (
    kind: string,
    _operation: string,
    body: unknown
  ) =>
    (await (kind === "entity" ? state.postMeta(body) : state.postVerse(body)))
      .data,
  getAuthoringCreation: vi.fn(),
  lookupAuthoringCreation: vi.fn(),
}));
vi.mock("@/api/v1/meta", () => ({
  getMeta: state.getMeta,
  getMetas: state.getMetas,
  postMeta: state.postMeta,
  putMeta: state.putMeta,
  putMetaCode: state.putMetaCode,
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
  getRegisteredWebMcpSchema: vi.fn(),
  invokeRegisteredWebMcpTool: vi.fn(),
  getRegisteredWebMcpTools: () => [{ name: "actual_registered_tool" }],
}));
import {
  useAuthoringWebMcp,
  authoringAsset,
  authoringObject,
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
  it("returns a pollable upload ID before confirmation and guards delayed navigation", async () => {
    let confirm!: () => void;
    state.confirm.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          confirm = resolve;
        })
    );
    const result = await call("start_authoring_upload", {
      resourceType: "picture",
    });
    expect(result).toMatchObject({
      status: "awaiting_confirmation",
      opened: false,
      uploadId: expect.any(String),
    });
    expect(
      await call("get_authoring_upload", { uploadId: result.uploadId })
    ).toMatchObject({
      status: "awaiting_confirmation",
      completedResourceIds: [],
    });
    expect(state.push).not.toHaveBeenCalled();
    state.route.fullPath = "/another-page";
    confirm();
    await flushPromises();
    expect(state.push).not.toHaveBeenCalled();
    expect(
      await call("get_authoring_upload", { uploadId: result.uploadId })
    ).toMatchObject({ status: "not_opened" });
  });
  it("provides actual registered tools and actor permissions", async () => {
    expect(await call("get_authoring_capabilities")).toMatchObject({
      contractVersion: "1.3.0",
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
  it("keeps empty stored animation metadata unknown and identifies legacy anim hints", () => {
    expect(
      authoringAsset({ type: "polygen", info: '{"animations":[]}' } as any)
    ).toMatchObject({
      animationParseStatus: "metadata_only",
      hasAnimations: null,
      animationNames: [],
    });
    expect(
      authoringAsset({ type: "polygen", info: '{"anim":["Eye_full"]}' } as any)
    ).toMatchObject({
      animationParseStatus: "metadata_only",
      hasAnimations: true,
      animationNames: ["Eye_full"],
      animationSource: "stored_metadata",
    });
  });
});

it("uses the normalized readback revision after creating a restored object", async () => {
  vi.stubGlobal("crypto", webcrypto);
  const source = {
    id: 1,
    uuid: "original",
    title: "Source",
    serverRevision: revision,
    data: null,
    info: null,
    events: null,
    image_id: null,
    resources: [],
    metaCode: { blockly: "{}", lua: "old", js: "old" },
  };
  state.getMeta.mockResolvedValue({ data: source });
  const backup = await call("export_editable_project", {
    kind: "entity",
    id: 1,
  });
  const restore = await call("stage_project_restore", {
    backupId: backup.backupId,
    namePrefix: "Copy ",
  });
  const normalizedRevision = `sha256:${"c".repeat(64)}`;
  state.postMeta.mockImplementation(async (input) => ({
    data: { ...source, id: 100, title: input.title, uuid: input.uuid },
  }));
  state.getMeta.mockImplementation(async (id) => ({
    data: {
      ...source,
      id,
      title: "Copy Source",
      uuid: restore.steps[0].uuid,
      serverRevision: normalizedRevision,
    },
  }));
  state.putMetaCode.mockImplementation(async (id, payload, options) => {
    options.onAcknowledged({
      targetId: id,
      targetType: "meta",
      action: "save_code",
      status: "completed",
      operationId: options.operationId,
      serverRevision: normalizedRevision,
    });
    return { data: payload };
  });
  await call("advance_project_restore", { restoreId: restore.restoreId });
  await flushPromises();
  const created = await call("get_project_restore", {
    restoreId: restore.restoreId,
  });
  expect(created.index).toBe(1);
  expect(created.objects[0].serverRevision).toBe(normalizedRevision);
  await call("advance_project_restore", { restoreId: restore.restoreId });
  await flushPromises();
  expect(state.putMetaCode).toHaveBeenCalledWith(
    100,
    { blockly: "{}", lua: "", js: "" },
    expect.objectContaining({ expectedRevision: normalizedRevision })
  );
  expect(
    (await call("get_project_restore", { restoreId: restore.restoreId })).status
  ).toBe("completed");
  vi.unstubAllGlobals();
});

it("reads scene covers from the expanded image when image_id is omitted", async () => {
  state.getVerse.mockResolvedValue({
    data: {
      id: 5,
      uuid: "scene",
      name: "scene",
      image: { id: 80 },
      editable: true,
      serverRevision: revision,
    },
  });
  expect(
    await call("get_object_cover", { kind: "scene", id: 5 })
  ).toMatchObject({ hasCover: true, object: { imageId: 80 } });
  expect(
    authoringObject("scene", { id: 5, image_id: null, image: { id: 80 } })
      .imageId
  ).toBeNull();
});

// Exercise the real adapter that previously reduced missing MD5 to tool_failed.
it.each([
  { file: { id: 77 }, fields: ["md5"], fileId: 77 },
  { file: null, fields: ["fileId", "md5"], fileId: undefined },
])(
  "reports the exact incomplete resource and repair guidance: $fields",
  async ({ file, fields, fileId }) => {
    state.getMeta.mockResolvedValue({
      data: {
        id: 1,
        uuid: "entity",
        title: "source",
        serverRevision: revision,
        data: null,
        resources: [{ id: 7, type: "picture" }],
      },
    });
    state.getResource.mockResolvedValue({
      data: { id: 7, type: "picture", file, privateField: "secret" },
    });
    const result = await call("export_editable_project", {
      kind: "entity",
      id: 1,
    }).catch((error) => webMcpToolError(error, true));
    expect(result).toMatchObject({
      isError: true,
      errorCode: "resource_version_incomplete",
      details: {
        resource: { id: 7, type: "picture" },
        fields,
        referencedBy: { kind: "entity", id: 1 },
      },
    });
    expect(result.details.resource.fileId).toBe(fileId);
    expect(result.nextStep).toContain("不要编造 MD5");
    expect(result.backupId).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("secret");
  }
);
it("keeps inaccessible resources distinct from missing version metadata", async () => {
  state.getMeta.mockResolvedValue({
    data: {
      id: 1,
      uuid: "entity",
      title: "source",
      serverRevision: revision,
      data: null,
      resources: [{ id: 7, type: "picture" }],
    },
  });
  state.getResource.mockRejectedValue({
    response: { status: 403, data: "private" },
    config: { headers: { Authorization: "secret" } },
  });
  const result = await call("export_editable_project", {
    kind: "entity",
    id: 1,
  }).catch((error) => webMcpToolError(error, true));
  expect(result).toMatchObject({
    errorCode: "resource_unavailable",
    httpStatus: 403,
    details: { fields: [], resource: { id: 7, type: "picture" } },
  });
  expect(JSON.stringify(result)).not.toMatch(/secret|private|Authorization/);
});
it("includes the same diagnostic in dependency analysis", async () => {
  state.getMeta.mockResolvedValue({
    data: {
      id: 1,
      uuid: "entity",
      title: "source",
      serverRevision: revision,
      data: { children: { entities: [{ parameters: { resource: 7 } }] } },
      resources: [{ id: 7, type: "picture" }],
    },
  });
  state.getResource.mockResolvedValue({
    data: { id: 7, type: "picture", file: { id: 77 } },
  });
  const result = await call("inspect_authoring_dependencies", {
    kind: "entity",
    id: 1,
  });
  expect(result.issues).toContainEqual(
    expect.objectContaining({
      code: "RESOURCE_UNAVAILABLE",
      diagnostic: expect.objectContaining({
        errorCode: "resource_version_incomplete",
        details: {
          resource: { id: 7, type: "picture", fileId: 77 },
          fields: ["md5"],
        },
      }),
    })
  );
});
