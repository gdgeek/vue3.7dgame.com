import { describe, expect, it, vi } from "vitest";
import {
  registerWebMcpTools,
  type WebMcpTool,
} from "@/services/webmcp/model-context";
import { getWebMcpToolRegistry } from "@/services/webmcp/tool-registry";
import { createScenePublicationTools } from "@/services/webmcp/scene-publication-tools";
import { writeOptionsForPreview } from "@/services/webmcp/operation-context";
import type { WriteReceipt } from "@/api/v1/write-contract";

const flush = async () => {
  for (let i = 0; i < 16; i++) await Promise.resolve();
};

function setup() {
  const nativeSignals = new Map<string, AbortSignal>();
  const page = {
    modelContext: {
      registerTool: (tool: WebMcpTool, { signal }: { signal: AbortSignal }) =>
        nativeSignals.set(tool.name, signal),
    },
  } as unknown as Document;
  let decide!: (value: boolean) => void;
  const revision = `sha256:${"a".repeat(64)}`;
  const complete = vi.fn(async (_preview: object) => ({
    sceneId: 42,
    snapshotId: 1,
    snapshotUuid: "snapshot",
    published: true,
  }));
  const confirm = vi.fn(
    () => new Promise<boolean>((resolve) => (decide = resolve))
  );
  const readReceipt = vi
    .fn<() => Promise<WriteReceipt>>()
    .mockRejectedValue(new Error("not observed"));
  const register = () =>
    registerWebMcpTools(
      createScenePublicationTools({
        getSceneId: () => 42,
        stageScenePublication: async () => ({
          sceneId: 42,
          sceneVersion: "local-1",
          sceneName: "Test",
          moduleCount: 1,
          warningCount: 0,
          warnings: [],
          alreadyPublished: false,
        }),
        confirmScenePublication: confirm,
        completeScenePublication: complete,
      }),
      {
        document: page,
        operations: {
          getScope: () => ({
            actorId: "same-name-replacement-test",
            targetType: "verse",
            targetId: 42,
            serverRevision: revision,
          }),
          readReceipt,
        },
      }
    )!;
  const owner = register();
  const registry = getWebMcpToolRegistry(page)!;
  const call = (name: string, input: unknown = {}) =>
    registry.lookup(name)!.execute(input) as Promise<Record<string, unknown>>;
  return {
    owner,
    register,
    nativeSignals,
    complete,
    confirm,
    readReceipt,
    revision,
    decide: () => decide(true),
    call,
  };
}

describe("tool replacement and operation confirmation", () => {
  it("revokes a replaced tool's pending confirmation before its owner is disposed", async () => {
    const x = setup();
    const signal = x.nativeSignals.get("xrugc_complete_scene_publication")!;
    const removeChildListener = vi.spyOn(signal, "removeEventListener");
    const removeOwnerListener = vi.spyOn(x.owner.signal, "removeEventListener");
    const { draftId } = await x.call("xrugc_stage_scene_publication");
    expect(
      await x.call("xrugc_complete_scene_publication", { draftId })
    ).toMatchObject({
      status: "awaiting_confirmation",
    });
    const replacement = x.register();
    expect(x.owner.signal.aborted).toBe(false);
    expect(signal.aborted).toBe(true);
    x.decide();
    await flush();
    expect(x.complete).not.toHaveBeenCalled();
    expect(
      await x.call("xrugc_get_operation_status", { operationId: draftId })
    ).toMatchObject({
      status: "cancelled",
    });
    expect(removeChildListener).toHaveBeenCalledWith(
      "abort",
      expect.any(Function)
    );
    expect(removeOwnerListener).toHaveBeenCalledWith(
      "abort",
      expect.any(Function)
    );
    x.owner.abort();
    replacement.abort();
  });

  it("keeps a submitted write receipt when its tool is replaced before delivery", async () => {
    const x = setup();
    let deliver!: () => void;
    x.complete.mockImplementationOnce(async (preview) => {
      const write = writeOptionsForPreview(preview, x.revision);
      write.onSubmitting?.();
      const receipt: WriteReceipt = {
        operationId: write.operationId,
        targetType: "verse",
        targetId: 42,
        serverRevision: `sha256:${"b".repeat(64)}`,
        action: "publish",
        status: "completed",
        snapshotId: 1,
      };
      write.onAcknowledged?.(receipt);
      x.readReceipt.mockResolvedValue(receipt);
      await new Promise<void>((resolve) => (deliver = resolve));
      return {
        sceneId: 42,
        snapshotId: 1,
        snapshotUuid: "snapshot",
        published: true,
      };
    });
    const { draftId } = await x.call("xrugc_stage_scene_publication");
    await x.call("xrugc_complete_scene_publication", { draftId });
    x.decide();
    await flush();
    expect(x.complete).toHaveBeenCalledOnce();
    const replacement = x.register();
    deliver();
    await flush();
    expect(
      await x.call("xrugc_get_operation_status", { operationId: draftId })
    ).toMatchObject({
      status: "completed",
      writeReceipt: { operationId: draftId, status: "completed" },
      verification: "server_acknowledged",
    });
    await x.call("xrugc_complete_scene_publication", { draftId });
    expect(x.complete).toHaveBeenCalledOnce();
    x.owner.abort();
    replacement.abort();
  });
});
