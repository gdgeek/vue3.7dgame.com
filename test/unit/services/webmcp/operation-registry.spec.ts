import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revision = `sha256:${"a".repeat(64)}`;
const nextRevision = `sha256:${"b".repeat(64)}`;
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
const flush = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};

async function setup() {
  const { registerWebMcpTools } = await import(
    "@/services/webmcp/model-context"
  );
  const { createScenePublicationTools } = await import(
    "@/services/webmcp/scene-publication-tools"
  );
  const { writeOptionsForPreview } = await import(
    "@/services/webmcp/operation-context"
  );
  const scope = {
    actorId: "17",
    targetType: "verse" as const,
    targetId: 2329,
    serverRevision: revision,
  };
  const confirmation = deferred<boolean>();
  const confirm = vi.fn(() => confirmation.promise);
  const writes: unknown[] = [];
  const readReceipt = vi.fn().mockRejectedValue({ response: { status: 404 } });
  const complete = vi.fn(async (preview: object) => {
    const write = writeOptionsForPreview(preview, revision);
    writes.push(write);
    write.onSubmitting?.();
    const receipt = {
      operationId: write.operationId,
      targetType: "verse" as const,
      targetId: 2329,
      action: "publish" as const,
      serverRevision: nextRevision,
      status: "completed" as const,
    };
    write.onAcknowledged?.(receipt);
    readReceipt.mockResolvedValue(receipt);
    return {
      sceneId: 2329,
      published: true,
      snapshotId: 1082,
      snapshotUuid: "snapshot",
    };
  });
  const tools = new Map<
    string,
    import("@/services/webmcp/model-context").WebMcpTool
  >();
  const document = {
    modelContext: {
      registerTool: (
        tool: import("@/services/webmcp/model-context").WebMcpTool
      ) => tools.set(tool.name, tool),
    },
  } as unknown as Document;
  const lifecycle = registerWebMcpTools(
    createScenePublicationTools({
      getSceneId: () => scope.targetId,
      stageScenePublication: async () => ({
        sceneId: 2329,
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
    { document, operations: { getScope: () => scope, readReceipt } }
  )!;
  const call = async (name: string, input: unknown = {}) =>
    tools.get(name)!.execute(input) as Promise<Record<string, unknown>>;
  const stage = () => call("xrugc_stage_scene_publication");
  return {
    scope,
    confirmation,
    confirm,
    complete,
    writes,
    readReceipt,
    lifecycle,
    call,
    stage,
  };
}

beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
});
afterEach(() => vi.useRealTimers());

describe("queryable WebMCP completion", () => {
  it("returns before a long human confirmation, then exposes exactly one durable write", async () => {
    vi.useFakeTimers();
    const x = await setup();
    const staged = await x.stage();
    const pending = await x.call("xrugc_complete_scene_publication", {
      draftId: staged.draftId,
    });
    expect(pending).toMatchObject({
      operationId: staged.draftId,
      status: "awaiting_confirmation",
    });
    await vi.advanceTimersByTimeAsync(60000);
    expect(x.complete).not.toHaveBeenCalled();
    expect(
      await x.call("xrugc_get_operation_status", {
        operationId: pending.operationId,
      })
    ).toMatchObject({ status: "awaiting_confirmation" });
    await x.call("xrugc_complete_scene_publication", {
      draftId: staged.draftId,
    });
    expect(x.confirm).toHaveBeenCalledTimes(1);
    x.confirmation.resolve(true);
    await flush();
    expect(x.complete).toHaveBeenCalledTimes(1);
    expect(x.writes[0]).toMatchObject({
      operationId: staged.draftId,
      expectedRevision: revision,
    });
    expect(
      await x.call("xrugc_get_operation_status", {
        operationId: pending.operationId,
      })
    ).toMatchObject({
      status: "completed",
      writeReceipt: { serverRevision: nextRevision },
    });
    expect(sessionStorage.getItem("xrugc-webmcp-operations-v1")).not.toContain(
      '"sceneName"'
    );
  });

  it("cancels while waiting and cannot execute on a late yes", async () => {
    const x = await setup();
    const { draftId } = await x.stage();
    await x.call("xrugc_complete_scene_publication", { draftId });
    expect(
      await x.call("xrugc_cancel_operation", { operationId: draftId })
    ).toMatchObject({ status: "cancelled" });
    x.confirmation.resolve(true);
    await flush();
    expect(x.complete).not.toHaveBeenCalled();
  });

  it.each(["actor", "revision", "route"])(
    "blocks changes to %s during confirmation",
    async (change) => {
      const x = await setup();
      const { draftId } = await x.stage();
      await x.call("xrugc_complete_scene_publication", { draftId });
      if (change === "actor") x.scope.actorId = "18";
      if (change === "revision") x.scope.serverRevision = nextRevision;
      if (change === "route") x.scope.targetId = 2330;
      x.confirmation.resolve(true);
      await flush();
      expect(x.complete).not.toHaveBeenCalled();
    }
  );

  it("expires even when confirmation eventually arrives", async () => {
    vi.useFakeTimers();
    const x = await setup();
    const { draftId } = await x.stage();
    await x.call("xrugc_complete_scene_publication", { draftId });
    await vi.advanceTimersByTimeAsync(301000);
    x.confirmation.resolve(true);
    await flush();
    expect(x.complete).not.toHaveBeenCalled();
  });

  it("recovers a server receipt after page reload without re-executing", async () => {
    const x = await setup();
    const { draftId } = await x.stage();
    await x.call("xrugc_complete_scene_publication", { draftId });
    x.confirmation.resolve(true);
    await flush();
    vi.resetModules();
    const reloaded = await setup();
    reloaded.readReceipt.mockResolvedValue({
      operationId: draftId,
      targetType: "verse",
      targetId: 2329,
      action: "publish",
      serverRevision: nextRevision,
      status: "completed",
    });
    expect(
      await reloaded.call("xrugc_get_operation_status", {
        operationId: draftId,
      })
    ).toMatchObject({
      status: "completed",
      verification: "server_acknowledged",
    });
    expect(reloaded.complete).not.toHaveBeenCalled();
  });

  it("keeps an unobserved server operation unknown", async () => {
    const x = await setup();
    expect(
      await x.call("xrugc_get_operation_status", {
        operationId: crypto.randomUUID(),
      })
    ).toMatchObject({
      status: "unknown",
      serverStatus: "not_observed",
      nextAction: "query_operation_before_retry",
    });
  });

  it("does not leak a local successful result after access is revoked", async () => {
    const x = await setup();
    const { draftId } = await x.stage();
    await x.call("xrugc_complete_scene_publication", { draftId });
    x.confirmation.resolve(true);
    await flush();
    x.readReceipt.mockRejectedValue({ response: { status: 403 } });
    await expect(
      x.call("xrugc_get_operation_status", { operationId: draftId })
    ).rejects.toMatchObject({ response: { status: 403 } });
  });

  it("aborts an outstanding confirmation when the page is disposed", async () => {
    const x = await setup();
    const { draftId } = await x.stage();
    await x.call("xrugc_complete_scene_publication", { draftId });
    x.lifecycle.abort();
    x.confirmation.resolve(true);
    await flush();
    expect(x.complete).not.toHaveBeenCalled();
  });
});
