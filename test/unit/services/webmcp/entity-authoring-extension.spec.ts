import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useIframeMessaging } from "@/composables/useIframeMessaging";
import { createIframeRpc } from "@/utils/iframeRpc";
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
type Json = Record<string, unknown>;
const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()));

function fixture(throughIframe = false) {
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
    async (action: string, input: Json = {}): Promise<Json> => {
      if (action === "webmcp-get-capabilities")
        return { action, ok: true, capabilities: actions };
      if (action.includes("preview-node-creation"))
        return {
          action,
          ok: true,
          items: input.items,
          expectedEntityVersion: "v1",
          summary: { count: 1 },
        };
      if (action.includes("stage-node-authoring"))
        return {
          action,
          ok: true,
          nodeId: input.nodeId,
          current: { loop: false },
          proposed: input.properties,
          entityVersion: "v1",
          propertiesVersion: "p1",
          contextGeneration: 1,
        };
      if (action.includes("complete-"))
        return {
          action,
          ok: true,
          status: "applied",
          operationId: input.operationId,
          nodeId: input.nodeId,
          noChange: false,
          saved: false,
          items: [{ clientKey: "a", nodeId: "saved-node", status: "applied" }],
          meta: { secret: "body" },
          events: [],
          readBackVerified: true,
        };
      return {
        action,
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
  const messages: { id: string; type: string; payload: Json }[] = [];
  let sendRequest: ReturnType<typeof useIframeMessaging>["sendRequest"];
  let transport: (
    action: string,
    input?: Json,
    timeout?: number
  ) => Promise<Json> = request;
  if (throughIframe) {
    const frame = document.createElement("iframe");
    frame.src = "https://editor.example.test/three.js/editor/meta-editor.html";
    document.body.append(frame);
    const messaging = useIframeMessaging(ref(frame));
    sendRequest = messaging.sendRequest;
    const rpc = createIframeRpc({
      frame: () => frame,
      session: messaging.getHostSessionId,
      send: messaging.sendRequest,
    });
    const post = vi
      .spyOn(frame.contentWindow!, "postMessage")
      .mockImplementation((message) => {
        messages.push(message);
        // Dispatch by the actual serialized iframe action, not the adapter argument.
        queueMicrotask(async () => {
          const payload = message.payload;
          const result = await request(payload.action, payload);
          const event = new MessageEvent("message", {
            origin: "https://editor.example.test",
            data: {
              type: "RESPONSE",
              requestId: message.id,
              payload: { ...result, hostSessionId: payload.hostSessionId },
            },
          });
          Object.defineProperty(event, "source", {
            value: frame.contentWindow,
          });
          rpc.handleMessage(event);
        });
      });
    transport = rpc.request;
    cleanups.push(() => {
      rpc.cancel();
      post.mockRestore();
      frame.remove();
    });
  }
  const adapter = createEntityAuthoringAdapter({
    getEntityId: () => entityId,
    assertWritable: vi.fn(async () => {}),
    request: transport,
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
    messages,
    sendRequest: (...args: Parameters<messagingSend>) => sendRequest(...args),
    setEntity: (id: number) => {
      entityId = id;
    },
  };
}
type messagingSend = ReturnType<typeof useIframeMessaging>["sendRequest"];
describe("entity authoring extension contracts", () => {
  it("completes batch and property drafts through the real serialized iframe request envelope", async () => {
    const f = fixture(true),
      draft = await f.stage();
    expect((draft.preview as Json).action).toBe(
      "webmcp-preview-node-creation-batch"
    );
    expect(
      await f.call("xrugc_complete_node_creation_batch", {
        draftId: draft.draftId,
      })
    ).toMatchObject({ status: "completed", editorStatus: "applied" });
    const batch = f.messages.find(
      (m) => m.payload.action === "webmcp-complete-node-creation-batch"
    )!.payload;
    expect(batch).toMatchObject({
      operationId: draft.draftId,
      expectedEntityVersion: "v1",
    });
    for (const key of [
      "ok",
      "summary",
      "proposalType",
      "entityId",
      "resourceVersions",
    ])
      expect(batch).not.toHaveProperty(key);
    const properties = await f.call("xrugc_stage_node_authoring_properties", {
      nodeId: "sound",
      properties: { loop: false },
    });
    expect(
      await f.call("xrugc_complete_node_authoring_properties", {
        draftId: properties.draftId,
      })
    ).toMatchObject({ status: "completed" });
    const update = f.messages.find(
      (m) => m.payload.action === "webmcp-complete-node-authoring-properties"
    )!.payload;
    expect(update).toMatchObject({
      nodeId: "sound",
      proposed: { loop: false },
      propertiesVersion: "p1",
      entityVersion: "v1",
      contextGeneration: 1,
    });
    expect(update).not.toHaveProperty("current");
    expect(f.save).toHaveBeenCalledTimes(2);
  });

  it("keeps the host-selected action and session authoritative in serialized requests", () => {
    const f = fixture(true);
    f.sendRequest("webmcp-get-capabilities", {
      action: "save-before-leave",
      hostSessionId: "old-session",
    });
    expect(f.messages[0].payload.action).toBe("webmcp-get-capabilities");
    expect(f.messages[0].payload.hostSessionId).not.toBe("old-session");
  });

  it.each([
    { action: "webmcp-preview-node-creation-batch" },
    { status: "preview" },
    { operationId: "another-operation" },
    { items: [{ clientKey: "a", status: "applied" }] },
    {
      items: [
        { clientKey: "another-item", nodeId: "wrong-node", status: "applied" },
      ],
    },
  ])(
    "does not save or claim application for a mismatched mutation receipt: %j",
    async (invalid) => {
      const f = fixture(),
        draft = await f.stage(),
        original = f.request.getMockImplementation()!;
      f.request.mockImplementation(async (action, input) => {
        const result = await original(action, input);
        return action === "webmcp-complete-node-creation-batch"
          ? ({ ...result, ...invalid } as Json)
          : result;
      });
      expect(
        await f.call("xrugc_complete_node_creation_batch", {
          draftId: draft.draftId,
        })
      ).toMatchObject({
        status: "partial",
        editorApplied: "unknown",
        persistence: "unverified",
      });
      expect(f.save).not.toHaveBeenCalled();
    }
  );

  it.each([false, true])(
    "removes resource URLs and scene bodies from nested receipts, including save failure=%s",
    async (failedSave) => {
      const f = fixture(),
        draft = await f.stage(),
        original = f.request.getMockImplementation()!;
      f.request.mockImplementation(async (action, input) => {
        const result = await original(action, input);
        return action === "webmcp-complete-node-creation-batch"
          ? ({
              ...result,
              items: [
                {
                  clientKey: "a",
                  nodeId: "saved-node",
                  status: "applied",
                  diagnostics: {
                    resource: f.resource,
                    nested: [
                      { resources: [f.resource], meta: { secret: "hidden" } },
                    ],
                  },
                },
              ],
            } as Json)
          : result;
      });
      if (failedSave)
        f.save.mockRejectedValueOnce(
          new WebMcpCompletionError({
            status: "partial",
            persistence: "unverified",
            details: { resource: f.resource },
          })
        );
      const result = await f.call("xrugc_complete_node_creation_batch", {
        draftId: draft.draftId,
      });
      expect(result).toMatchObject({
        items: [{ clientKey: "a", nodeId: "saved-node" }],
      });
      expect(JSON.stringify(result)).not.toContain("private.example");
      expect(JSON.stringify(result)).not.toContain("hidden");
    }
  );

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
        ? ({ action, ok: false, code: "ANIMATION_PREVIEW_ACTIVE" } as Json)
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
    expect(((result.preview as Json).items as Json[])[0].resourceId).toBe(12);
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
    ((draft.preview as Json).items as Json[])[0].resourceId = 999;
    await f.call("xrugc_complete_node_creation_batch", {
      draftId: draft.draftId,
    });
    const input = f.request.mock.calls.find(
      ([name]) => name === "webmcp-complete-node-creation-batch"
    )![1];
    expect((input.items as Json[])[0].resourceId).toBe(12);
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
    f.request.mockResolvedValue({
      action: "webmcp-get-capabilities",
      ok: true,
      capabilities: [],
    } as Json);
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
            action,
            ok: false,
            status: "not_applied",
            code: "VERSION_CONFLICT",
          } as Json)
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
