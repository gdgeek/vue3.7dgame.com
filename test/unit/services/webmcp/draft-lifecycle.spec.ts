import { WebMcpCompletionError } from "@/services/webmcp/completion-result";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createEntityResourcePlacementTools } from "@/services/webmcp/entity-resource-placement-tools";
import {
  registerWebMcpTools,
  type WebMcpTool,
} from "@/services/webmcp/model-context";
import {
  confirmDraft,
  createDraftStore,
} from "@/services/webmcp/draft-lifecycle";

afterEach(() => vi.useRealTimers());
const setup = async () => {
  let entityId = 1;
  let decide!: (accepted: boolean) => void;
  const complete = vi.fn().mockResolvedValue({ nodeId: "new-node" });
  const confirm = vi.fn(
    () =>
      new Promise<boolean>((resolve) => {
        decide = resolve;
      })
  );
  const tools = createEntityResourcePlacementTools({
    getEntityId: () => entityId,
    stageResourcePlacement: async () => ({
      entityId: 1,
      resourceId: 2,
      resourceType: "polygen",
      resourceName: "original",
    }),
    confirmResourcePlacement: confirm,
    completeResourcePlacement: complete,
  });
  const registered: WebMcpTool[] = [];
  const lifecycle = registerWebMcpTools(tools, {
    document: {
      modelContext: {
        registerTool: (tool: WebMcpTool) => {
          registered.push(tool);
        },
      },
    } as unknown as Document,
  })!;
  const stage = () =>
    registered[0].execute({
      resourceType: "polygen",
      resourceId: 2,
    }) as Promise<{ draftId: string; preview: { resourceName: string } }>;
  const staged = await stage();
  return {
    staged,
    stage,
    run: () => registered[1].execute(staged),
    confirm,
    complete,
    decide: (value = true) => decide(value),
    lifecycle,
    switchEntity: () => {
      entityId = 2;
    },
  };
};

describe("entity drafts through registered page tools", () => {
  it("consumes once before confirmation, retaining the operation id for transport replay guards", async () => {
    const s = await setup();
    const first = s.run();
    await expect(s.run()).resolves.toMatchObject({
      status: "expired_or_missing",
    });
    expect(s.confirm).toHaveBeenCalledTimes(1);
    s.decide();
    await expect(first).resolves.toMatchObject({ status: "completed" });
    expect(s.complete).toHaveBeenCalledTimes(1);
    expect(s.complete.mock.calls[0][0]).toMatchObject({
      operationId: s.staged.draftId,
    });
  });
  it("does not evict the oldest valid draft merely to complete it at capacity", async () => {
    const s = await setup();
    for (let i = 1; i < 20; i++) await s.stage();
    const first = s.run();
    expect(s.confirm).toHaveBeenCalledTimes(1);
    s.decide();
    await expect(first).resolves.toMatchObject({ status: "completed" });
  });
  it.each(["expired", "switched", "cancelled"])(
    "does not write after confirmation is %s",
    async (reason) => {
      vi.useFakeTimers();
      const s = await setup();
      const first = s.run();
      if (reason === "expired") vi.advanceTimersByTime(300000);
      if (reason === "switched") s.switchEntity();
      s.decide(reason !== "cancelled");
      await expect(first).resolves.toMatchObject({
        status: {
          expired: "expired_or_missing",
          switched: "entity_changed",
          cancelled: "cancelled",
        }[reason],
      });
      expect(s.complete).not.toHaveBeenCalled();
    }
  );
  it("aborts pending confirmation immediately on route disposal and never writes later", async () => {
    const s = await setup();
    const first = s.run();
    s.lifecycle.abort();
    await expect(first).resolves.toMatchObject({
      isError: true,
      errorCode: "session_closed",
    });
    s.decide();
    await Promise.resolve();
    expect(s.complete).not.toHaveBeenCalled();
    await expect(s.run()).resolves.toMatchObject({
      isError: true,
      errorCode: "session_closed",
    });
  });
  it("protects the approved data from mutations of the public stage result", async () => {
    const s = await setup();
    s.staged.preview.resourceName = "unapproved";
    const first = s.run();
    s.decide();
    await first;
    expect(s.complete.mock.calls[0][0].resourceName).toBe("original");
  });
});

describe("draft failure lifecycle", () => {
  it("returns a partial receipt without making the applied draft replayable", async () => {
    const s = await setup();
    s.complete.mockRejectedValue(
      new WebMcpCompletionError({
        status: "partial",
        editorApplied: true,
        nodeId: "new-node",
        persistence: "unverified",
        retry: "read_state_before_retry",
      })
    );
    const first = s.run();
    s.decide();
    await expect(first).resolves.toMatchObject({
      status: "partial",
      draftId: s.staged.draftId,
      nodeId: "new-node",
      editorApplied: true,
    });
    await expect(s.run()).resolves.toMatchObject({
      status: "expired_or_missing",
    });
    expect(s.complete).toHaveBeenCalledOnce();
  });

  it("consumes a draft even if the confirmation provider throws", async () => {
    const store = createDraftStore<{
      expiresAt: number;
      preview: { id: number };
    }>(2);
    store.set("draft", { expiresAt: Date.now() + 1000, preview: { id: 1 } });
    const options = {
      confirm: vi.fn().mockRejectedValue(new Error("dialog failed")),
      isCurrent: () => true,
      changedStatus: "changed",
    };
    await expect(confirmDraft(store, "draft", options)).rejects.toThrow(
      "dialog failed"
    );
    await expect(confirmDraft(store, "draft", options)).resolves.toMatchObject({
      ok: false,
      result: { status: "expired_or_missing" },
    });
    expect(options.confirm).toHaveBeenCalledOnce();
  });
  it("keeps a confirmed write acknowledgment when lifecycle disposal races the reply", async () => {
    const registered: WebMcpTool[] = [];
    const lifecycle = registerWebMcpTools(
      [
        {
          name: "complete",
          description: "test",
          inputSchema: {},
          execute: async () => {
            lifecycle!.abort();
            return { snapshotId: 123, verification: "server_acknowledged" };
          },
        },
      ],
      {
        document: {
          modelContext: {
            registerTool: (tool: WebMcpTool) => {
              registered.push(tool);
            },
          },
        } as unknown as Document,
      }
    );
    await expect(registered[0].execute({})).resolves.toMatchObject({
      snapshotId: 123,
    });
  });
  it("does not require a polyfill on unsupported browsers", () => {
    expect(registerWebMcpTools([], { document: {} as Document })).toBeNull();
  });
});
