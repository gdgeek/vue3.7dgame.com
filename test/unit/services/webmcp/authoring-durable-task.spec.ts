/* eslint-disable @typescript-eslint/no-explicit-any -- Simulated process restart and malformed transport results. */
import { describe, it, expect, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { createAuthoringTaskTools } from "@/services/webmcp/authoring-task-tools";
import type {
  TaskStore,
  TaskSnapshot,
} from "@/services/webmcp/authoring-task-store";
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
const flush = () => new Promise((r) => setTimeout(r, 0));
function setup() {
  const rows = new Map<string, TaskSnapshot>();
  const leases = new Map<string, string>();
  const copy = <T>(v: T): T => structuredClone(v);
  const store: TaskStore = {
    create: vi.fn(async (p) => {
      const s = {
        taskId: p.taskId,
        name: p.name,
        revision: 1,
        plan: p.steps,
        progress: {
          index: 0,
          status: "preview",
          states: p.steps.map((x: any) => ({ key: x.key, status: "planned" })),
        },
        leaseUntil: 0,
      };
      rows.set(p.taskId, copy(s));
      return copy(s);
    }),
    get: vi.fn(async (id) => copy(rows.get(id)!)),
    list: vi.fn(async () =>
      [...rows.values()].map((r) => ({ taskId: r.taskId }))
    ),
    claim: vi.fn(async (id, revision, claim) => {
      const s = rows.get(id)!;
      if (s.revision !== revision || leases.has(id))
        throw new Error("conflict");
      leases.set(id, claim);
      s.revision++;
      return copy(s);
    }),
    checkpoint: vi.fn(async (id, revision, claim, progress, release) => {
      const s = rows.get(id)!;
      if (s.revision !== revision || leases.get(id) !== claim)
        throw new Error("stale");
      s.progress = copy(progress);
      s.revision++;
      if (release) leases.delete(id);
      return copy(s);
    }),
  };
  const receipts = new Map<string, unknown>();
  let drafts = 0;
  let creations = 0;
  let drop = false;
  const tools = [
    "xrugc_stage_authoring_creation",
    "xrugc_complete_authoring_draft",
    "xrugc_get_authoring_operation",
  ];
  const invoke = vi.fn(async (name: string, input: any) => {
    if (name === "xrugc_stage_authoring_creation")
      return {
        draftId: `draft-${++drafts}`,
        operationId: `draft-${drafts}`,
        preview: { kind: "entity", action: "create", name: input.name },
      };
    if (name === "xrugc_complete_authoring_draft") {
      const result = {
        operationId: input.draftId,
        status: "completed",
        result: {
          id: ++creations,
          uuid: "created",
          receipt: { status: "completed" },
        },
      };
      receipts.set(input.draftId, result);
      if (drop) throw new Error("response lost");
      return { operationId: input.draftId, status: "awaiting_confirmation" };
    }
    throw new Error("unexpected tool");
  });
  const query = vi.fn(async (id: string) => {
    if (!receipts.has(id)) throw new Error("not observed");
    return copy(receipts.get(id));
  });
  const client = (confirm = vi.fn(async () => true)) => {
    const registered = createAuthoringTaskTools({
      store,
      actor: () => "7",
      context: () => "page",
      getTarget: () => null,
      getAvailableTools: () => tools,
      invokeTool: invoke,
      queryAuthoringOperation: query,
      confirm,
    });
    return async (name: string, args: unknown) =>
      (await registered
        .find((t) => t.name === `xrugc_${name}`)!
        .execute(args)) as any;
  };
  const plan = {
    name: "fixed create task",
    steps: [
      {
        key: "draft",
        tool: tools[0],
        input: { kind: "entity", name: "独立测试" },
      },
      {
        key: "create",
        tool: tools[1],
        input: { draftId: { $ref: "draft.draftId" } },
      },
    ],
  };
  const advance = async (c: ReturnType<typeof client>, id: string) => {
    await c("advance_authoring_task", { taskId: id });
    await flush();
  };
  return {
    store,
    rows,
    leases,
    invoke,
    query,
    client,
    plan,
    advance,
    setDrop: () => {
      drop = true;
    },
    count: () => creations,
  };
}
describe("durable authoring regression", () => {
  it("lists the same task after restart and restages an unsubmitted expired preview", async () => {
    const s = setup();
    let c = s.client();
    const t = await c("preview_authoring_task", s.plan);
    await s.advance(c, t.taskId);
    c = s.client();
    expect(await c("list_authoring_tasks", {})).toEqual([{ taskId: t.taskId }]);
    expect((await c("get_authoring_task", { taskId: t.taskId })).index).toBe(1);
    await s.advance(c, t.taskId);
    await s.advance(c, t.taskId);
    const done = await c("get_authoring_task", { taskId: t.taskId });
    expect(done.status).toBe("completed");
    expect(done.steps[1].result.result.id).toBe(1);
    expect(done.steps[0].operationId).toBe("draft-2");
    expect(done.steps[0].result.operationId).toBe("draft-2");
    expect(done.steps[1].operationId).toBe("draft-2");
    const loaded = await s.client()("get_authoring_task", { taskId: t.taskId });
    expect(loaded.steps[0].operationId).toBe("draft-2");
    expect(s.invoke.mock.calls.map((x) => x[0])).toEqual([
      "xrugc_stage_authoring_creation",
      "xrugc_stage_authoring_creation",
      "xrugc_complete_authoring_draft",
    ]);
    expect(s.count()).toBe(1);
    expect(done.persistence).toBe("server");
  });
  it("clears a previous preview operation ID when the restaged tool omits it", async () => {
    const s = setup();
    const first = s.client();
    const task = await first("preview_authoring_task", s.plan);
    await s.advance(first, task.taskId);
    s.invoke.mockImplementationOnce(async () => ({
      draftId: "replacement",
      preview: { kind: "entity", action: "create" },
    }));
    const restored = s.client();
    await s.advance(restored, task.taskId);
    const saved = await restored("get_authoring_task", { taskId: task.taskId });
    expect(saved.steps[0].operationId).toBeUndefined();
    expect(saved.steps[0].result.draftId).toBe("replacement");
    expect(saved.steps[1].operationId).toBe("replacement");
  });
  it("recovers a committed creation after response loss without issuing a second create", async () => {
    const s = setup();
    const first = s.client();
    const t = await first("preview_authoring_task", s.plan);
    await s.advance(first, t.taskId);
    s.setDrop();
    await s.advance(first, t.taskId);
    expect(
      (await first("get_authoring_task", { taskId: t.taskId })).status
    ).toBe("unknown");
    const restarted = s.client();
    await s.advance(restarted, t.taskId);
    expect(
      (await restarted("get_authoring_task", { taskId: t.taskId })).status
    ).toBe("completed");
    expect(s.count()).toBe(1);
    expect(s.query).toHaveBeenCalledWith(
      "draft-1",
      expect.objectContaining({ kind: "entity" })
    );
  });
  it("does not replay a write when the old server receipt is not observed", async () => {
    const s = setup();
    const c = s.client();
    const t = await c("preview_authoring_task", s.plan);
    await s.advance(c, t.taskId);
    s.invoke.mockImplementationOnce(async () => {
      throw new Error("connection lost before result");
    });
    await s.advance(c, t.taskId);
    const restarted = s.client();
    await s.advance(restarted, t.taskId);
    await s.advance(restarted, t.taskId);
    expect(
      (await restarted("get_authoring_task", { taskId: t.taskId })).status
    ).toBe("unknown");
    expect(s.invoke).toHaveBeenCalledTimes(2);
    expect(s.count()).toBe(0);
  });
  it("only one client advances while the first confirmation is pending", async () => {
    const s = setup();
    let accept: (v: boolean) => void = () => {};
    const first = s.client(
      vi.fn(
        () =>
          new Promise<boolean>((r) => {
            accept = r;
          })
      )
    );
    const second = s.client();
    const t = await first("preview_authoring_task", s.plan);
    await s.advance(first, t.taskId);
    await s.advance(second, t.taskId);
    expect(s.invoke).not.toHaveBeenCalled();
    accept(true);
    await flush();
    expect(s.invoke).toHaveBeenCalledTimes(1);
    expect(s.rows.get(t.taskId)?.progress.index).toBe(1);
  });
  it("uses the saved checkpoint after its response is lost instead of repeating a step", async () => {
    const s = setup();
    const c = s.client();
    const t = await c("preview_authoring_task", s.plan);
    const original = vi.mocked(s.store.checkpoint).getMockImplementation()!;
    vi.mocked(s.store.checkpoint).mockImplementation(async (...args) => {
      const saved = await original(...args);
      if (args[4]) throw new Error("checkpoint response lost after commit");
      return saved;
    });
    await s.advance(c, t.taskId);
    const fresh = s.client();
    const recovered = await fresh("get_authoring_task", { taskId: t.taskId });
    expect(recovered.index).toBe(1);
    expect(recovered.steps[0].status).toBe("completed");
    expect(recovered.plan).toEqual(s.plan.steps);
    expect(s.invoke).toHaveBeenCalledTimes(1);
  });

  it("does not accept a different operation's result as this task's completion", async () => {
    const s = setup();
    const c = s.client();
    const t = await c("preview_authoring_task", s.plan);
    await s.advance(c, t.taskId);
    s.invoke.mockImplementationOnce(async () => ({
      status: "completed",
      operationId: "foreign-operation",
      result: { id: 900 },
    }));
    await s.advance(c, t.taskId);
    const saved = await c("get_authoring_task", { taskId: t.taskId });
    expect(saved.status).toBe("unknown");
    expect(saved.steps[1].operationId).toBe("draft-1");
    expect(saved.steps[1].result.reason).toBe("operation_id_mismatch");
  });

  it("fails closed when server storage cannot be written or read", async () => {
    const s = setup();
    const c = s.client();
    vi.mocked(s.store.create).mockRejectedValueOnce(new Error("offline"));
    await expect(c("preview_authoring_task", s.plan)).rejects.toThrow(
      "offline"
    );
    expect(s.invoke).not.toHaveBeenCalled();
    const t = await c("preview_authoring_task", s.plan);
    vi.mocked(s.store.get).mockRejectedValueOnce(new Error("forbidden"));
    await expect(c("get_authoring_task", { taskId: t.taskId })).rejects.toThrow(
      "forbidden"
    );
  });
});
