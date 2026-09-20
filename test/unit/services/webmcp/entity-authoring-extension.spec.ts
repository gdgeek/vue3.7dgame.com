import { describe, expect, it, vi } from "vitest";
import { createEntityAuthoringAdapter } from "@/services/webmcp/entity-authoring-adapter";
import { createEntityAuthoringExtensionTools } from "@/services/webmcp/entity-authoring-extension-tools";
import { WebMcpCompletionError } from "@/services/webmcp/completion-result";

const actions = [
  "webmcp-preview-node-creation-batch",
  "webmcp-complete-node-creation-batch",
  "webmcp-stage-node-authoring-properties",
  "webmcp-complete-node-authoring-properties",
  "webmcp-get-model-animation-metadata",
  "webmcp-get-editor-animation-preview",
  "webmcp-control-editor-animation-preview",
];
function fixture() {
  let entityId = 7;
  const resource = {
    id: 12,
    type: "picture",
    name: "Picture",
    updated_at: "r1",
    file: { id: 14, md5: "v1", url: "https://private.example/signed" },
  };
  const save = vi.fn(async () => ({ persistence: "server_acknowledged" }));
  const request = vi.fn(
    async (action: string, input: Record<string, unknown> = {}) => {
      if (action === "webmcp-get-capabilities")
        return { ok: true, capabilities: actions };
      if (action.includes("preview-node-creation"))
        return {
          ok: true,
          items: input.items,
          expectedEntityVersion: "v1",
          summary: { count: 1 },
        };
      if (action.includes("stage-node-authoring"))
        return {
          ok: true,
          nodeId: input.nodeId,
          current: { loop: false },
          proposed: input.properties,
          entityVersion: "v1",
        };
      if (action.includes("complete-"))
        return {
          ok: true,
          items: [{ clientKey: "a", nodeId: "saved-node" }],
          meta: { secret: "body" },
          events: [],
          readBackVerified: true,
        };
      return {
        ok: true,
        scope: "editor-preview",
        persisted: false,
        parseStatus: "unknown",
        clips: [],
      };
    }
  );
  const confirm = vi.fn(async () => true);
  const fetchResource = vi.fn(async () => structuredClone(resource));
  const adapter = createEntityAuthoringAdapter({
    getEntityId: () => entityId,
    assertWritable: vi.fn(async () => {}),
    request,
    fetchResource,
    confirm,
    save,
  });
  const tools = createEntityAuthoringExtensionTools(adapter);
  const call = async (name: string, input: unknown = {}) =>
    (await tools.find((t) => t.name === name)!.execute(input)) as Record<
      string,
      unknown
    >;
  const stage = () =>
    call("xrugc_stage_node_creation_batch", {
      items: [
        {
          clientKey: "a",
          kind: "resource",
          resourceType: "picture",
          resourceId: 12,
        },
      ],
    });
  return {
    resource,
    fetchResource,
    request,
    save,
    confirm,
    call,
    stage,
    tools,
    setEntity: (id: number) => {
      entityId = id;
    },
  };
}
describe("entity authoring extension contracts", () => {
  it("queries a repeated resource once per batch to keep signed references consistent", async () => {
    const f = fixture();
    await f.call("xrugc_stage_node_creation_batch", {
      items: ["a", "b"].map((clientKey) => ({
        clientKey,
        kind: "resource",
        resourceType: "picture",
        resourceId: 12,
      })),
    });
    expect(f.fetchResource).toHaveBeenCalledTimes(1);
  });
  it("rejects attempts to replace the bridge action with extra tool input", async () => {
    const f = fixture();
    await expect(
      f.call("xrugc_stage_node_authoring_properties", {
        nodeId: "x",
        properties: { loop: false },
        action: "save-before-leave",
      })
    ).rejects.toThrow("不支持");
    expect(f.request).not.toHaveBeenCalled();
  });
  it("reports active-preview rejection as not submitted rather than an unknown write", async () => {
    const f = fixture(),
      draft = await f.stage(),
      original = f.request.getMockImplementation()!;
    f.request.mockImplementation(async (action, input) =>
      action === "webmcp-complete-node-creation-batch"
        ? ({ ok: false, code: "ANIMATION_PREVIEW_ACTIVE" } as any)
        : original(action, input)
    );
    expect(
      await f.call("xrugc_complete_node_creation_batch", {
        draftId: draft.draftId,
      })
    ).toMatchObject({
      status: "failed",
      editorApplied: false,
      persistence: "not_submitted",
      errorCode: "ANIMATION_PREVIEW_ACTIVE",
    });
    expect(f.save).not.toHaveBeenCalled();
  });

  it("creates a bounded proposal without writes or leaking signed resource URLs", async () => {
    const f = fixture(),
      result = await f.stage();
    expect(result.status).toBe("staged");
    expect(f.save).not.toHaveBeenCalled();
    expect(f.confirm).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("private.example");
    expect((result.preview as any).items[0].resourceId).toBe(12);
  });
  it("confirms once, saves one batch, exposes stable node IDs without a full scene body", async () => {
    const f = fixture(),
      draft = await f.stage();
    const result = await f.call("xrugc_complete_node_creation_batch", {
      draftId: draft.draftId,
    });
    expect(result).toMatchObject({
      status: "completed",
      persistence: "server_acknowledged",
      items: [{ clientKey: "a", nodeId: "saved-node" }],
    });
    expect(result).not.toHaveProperty("meta");
    expect(f.save).toHaveBeenCalledTimes(1);
    expect(f.confirm).toHaveBeenCalledTimes(1);
    expect(
      await f.call("xrugc_complete_node_creation_batch", {
        draftId: draft.draftId,
      })
    ).toMatchObject({ status: "expired_or_missing" });
  });
  it("rejects cross-tool completion and a changed target", async () => {
    const f = fixture(),
      draft = await f.stage();
    expect(
      await f.call("xrugc_complete_node_authoring_properties", {
        draftId: draft.draftId,
      })
    ).toMatchObject({ status: "entity_or_proposal_changed" });
    const second = await f.stage();
    f.setEntity(8);
    expect(
      await f.call("xrugc_complete_node_creation_batch", {
        draftId: second.draftId,
      })
    ).toMatchObject({ status: "entity_or_proposal_changed" });
    expect(f.save).not.toHaveBeenCalled();
    expect(f.confirm).not.toHaveBeenCalled();
  });
  it("rejects duplicate keys, oversized batches and caller-supplied resource payloads", async () => {
    const f = fixture();
    const item = { clientKey: "a", kind: "empty" };
    for (const items of [
      [item, item],
      Array(21).fill(item),
      [{ ...item, resource: { file: { url: "https://evil" } } }],
    ])
      await expect(
        f.call("xrugc_stage_node_creation_batch", { items })
      ).rejects.toThrow();
    expect(f.request).not.toHaveBeenCalled();
  });
  it("does not commit after cancellation or stale resource metadata", async () => {
    const f = fixture(),
      draft = await f.stage();
    f.confirm.mockResolvedValueOnce(false);
    expect(
      await f.call("xrugc_complete_node_creation_batch", {
        draftId: draft.draftId,
      })
    ).toMatchObject({ status: "cancelled" });
    const second = await f.stage();
    f.resource.file.md5 = "v2";
    await expect(
      f.call("xrugc_complete_node_creation_batch", { draftId: second.draftId })
    ).rejects.toThrow("素材在预览后变化");
    expect(f.save).not.toHaveBeenCalled();
  });
  it("does not let a returned preview mutate the internally approved proposal", async () => {
    const f = fixture(),
      draft = await f.stage();
    (draft.preview as any).items[0].resourceId = 999;
    await f.call("xrugc_complete_node_creation_batch", {
      draftId: draft.draftId,
    });
    const input = f.request.mock.calls.find(
      ([name]) => name === "webmcp-complete-node-creation-batch"
    )![1];
    expect((input.items as any[])[0].resourceId).toBe(12);
  });
  it("marks lost editor response unverified and prevents blind repeat", async () => {
    const f = fixture(),
      draft = await f.stage();
    const original = f.request.getMockImplementation()!;
    f.request.mockImplementation(async (action, input) => {
      if (action === "webmcp-complete-node-creation-batch")
        throw new Error("timeout");
      return original(action, input);
    });
    expect(
      await f.call("xrugc_complete_node_creation_batch", {
        draftId: draft.draftId,
      })
    ).toMatchObject({
      status: "partial",
      editorApplied: "unknown",
      persistence: "unverified",
      retry: "read_state_before_retry",
    });
    expect(f.save).not.toHaveBeenCalled();
  });
  it("refuses missing editor protocol before dispatching an unsupported command", async () => {
    const f = fixture();
    f.request.mockResolvedValue({ ok: true, capabilities: [] } as any);
    await expect(
      f.call("xrugc_get_model_animation_metadata", { nodeId: "x" })
    ).rejects.toMatchObject({ code: "CAPABILITY_UNAVAILABLE" });
    expect(f.request).toHaveBeenCalledTimes(1);
  });
  it("keeps every created UUID when server persistence loses its response", async () => {
    const f = fixture(),
      draft = await f.stage();
    f.save.mockRejectedValueOnce(
      new WebMcpCompletionError({
        status: "partial",
        editorApplied: true,
        persistence: "unverified",
      })
    );
    expect(
      await f.call("xrugc_complete_node_creation_batch", {
        draftId: draft.draftId,
      })
    ).toMatchObject({
      status: "partial",
      operationId: draft.draftId,
      items: [{ clientKey: "a", nodeId: "saved-node" }],
      persistence: "unverified",
    });
  });
  it("keeps confirmed no-mutation failures distinct from lost responses", async () => {
    const f = fixture(),
      draft = await f.stage(),
      original = f.request.getMockImplementation()!;
    f.request.mockImplementation(async (action, input) =>
      action === "webmcp-complete-node-creation-batch"
        ? ({
            ok: false,
            status: "not_applied",
            code: "VERSION_CONFLICT",
          } as any)
        : original(action, input)
    );
    expect(
      await f.call("xrugc_complete_node_creation_batch", {
        draftId: draft.draftId,
      })
    ).toMatchObject({
      status: "failed",
      editorApplied: false,
      persistence: "not_submitted",
      errorCode: "VERSION_CONFLICT",
    });
    expect(f.save).not.toHaveBeenCalled();
  });
  it("preview controls never save or claim runtime success", async () => {
    const f = fixture();
    expect(
      await f.call("xrugc_control_editor_animation_preview", {
        nodeId: "x",
        command: "stop",
        expectedAnimationVersion: "v1",
      })
    ).toMatchObject({ scope: "editor-preview", persisted: false });
    expect(f.save).not.toHaveBeenCalled();
    expect(
      await f.call("xrugc_get_entity_authoring_capabilities")
    ).toMatchObject({
      runtimeAnimationControl: false,
      unityRuntimeControl: false,
    });
  });
});
