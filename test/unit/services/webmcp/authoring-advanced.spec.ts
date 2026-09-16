/* eslint-disable @typescript-eslint/no-explicit-any -- Tool contracts are exercised with malformed dynamic inputs. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { webcrypto } from "node:crypto";
import {
  createAuthoringDependencyTools,
  collectAuthoringReferences,
} from "@/services/webmcp/authoring-dependencies";
import { createAuthoringTaskTools } from "@/services/webmcp/authoring-task-tools";
import { createAuthoringScriptAssistanceTools } from "@/services/webmcp/authoring-script-assistance";
import {
  createAuthoringProjectTools,
  hashEditableProject,
  remapRestoredScene,
  type EditableSource,
} from "@/services/webmcp/authoring-project-tools";
import type { WebMcpTool } from "@/services/webmcp/model-context";
const invoke =
  (tools: WebMcpTool[]) =>
  async (name: string, input: unknown = {}) =>
    tools.find((t) => t.name === `xrugc_${name}`)!.execute(input) as any;
const flush = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
};
const revision = `sha256:${"c".repeat(64)}`;
const sceneData = {
  children: { modules: [{ parameters: { meta_id: 1, uuid: "instance" } }] },
};
const entityData = {
  children: { entities: [{ uuid: "node", parameters: { resource: 7 } }] },
};
beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
});
describe("dependency and impact analysis", () => {
  const setup = () => {
    let actor = "3";
    let context = "one";
    const read = vi.fn(async (kind: "scene" | "entity", id: number) => ({
      kind,
      id,
      uuid: `uuid-${id}`,
      name: `${kind}-${id}`,
      serverRevision: revision,
      data: kind === "scene" ? sceneData : entityData,
      resources: [{ id: 7, type: "picture" }],
      relatedSceneIds: [2, 3],
    }));
    const asset = vi.fn(async () => ({
      id: 7,
      type: "picture",
      name: "cover",
      fileId: 77,
    }));
    return {
      read,
      asset,
      changeActor: () => {
        actor = "4";
      },
      changeContext: () => {
        context = "two";
      },
      call: invoke(
        createAuthoringDependencyTools({
          actor: () => actor,
          context: () => context,
          read,
          asset,
        })
      ),
    };
  };
  it("builds scene to entity to resource graph with reference positions", async () => {
    const s = setup();
    const r = await s.call("inspect_authoring_dependencies", {
      kind: "scene",
      id: 2,
    });
    expect(r.graph.map((e: any) => e.to)).toEqual(["entity:1", "resource:7"]);
    expect(r.coverage).toMatchObject({
      fullSite: false,
      atomicSnapshot: false,
      runtimeVerified: false,
    });
  });
  it("distinguishes missing association from missing file", async () => {
    const s = setup();
    s.read.mockResolvedValueOnce({
      kind: "entity",
      id: 1,
      uuid: "1",
      name: "test",
      serverRevision: revision,
      data: entityData,
      resources: [],
      relatedSceneIds: [],
    });
    const r = await s.call("inspect_authoring_dependencies", {
      kind: "entity",
      id: 1,
    });
    expect(r.issues[0].code).toBe("RESOURCE_NOT_ASSOCIATED");
    expect(s.asset).not.toHaveBeenCalled();
  });
  it("does not leak denied usage candidates", async () => {
    const s = setup();
    s.read.mockImplementation(async (kind, id) => {
      if (kind === "scene") throw new Error(`private scene ${id}`);
      return {
        kind,
        id,
        name: "entity",
        uuid: "entity",
        serverRevision: revision,
        data: entityData,
        resources: [],
        relatedSceneIds: [999999],
      };
    });
    const r = await s.call("find_entity_usage", { id: 1 });
    expect(JSON.stringify(r)).not.toContain("999999");
    expect(r.coverage.unresolved).toBe(true);
  });
  it("detects account switches during a read", async () => {
    const s = setup();
    s.asset.mockImplementation(async () => {
      s.changeActor();
      return { id: 7, type: "picture", name: "test", fileId: 77 };
    });
    await expect(
      s.call("inspect_authoring_dependencies", { kind: "entity", id: 1 })
    ).rejects.toThrow("改变");
  });
  it("caps nested traversal and rejects invalid references", () => {
    const root: any = {
      parameters: { resource: -1 },
      children: { entities: [] },
    };
    root.children.entities.push(root);
    const scan = collectAuthoringReferences(
      { children: { entities: [root] } },
      "entity",
      10
    );
    expect(scan.invalid).toBeGreaterThan(0);
    expect(
      collectAuthoringReferences(
        {
          children: {
            modules: Array.from({ length: 100 }, () => ({
              parameters: { meta_id: 1 },
            })),
          },
        },
        "scene",
        10
      ).truncated
    ).toBe(true);
  });
  it("marks relation-only scenes separately and paginates", async () => {
    const s = setup();
    s.read.mockImplementation(async (kind, id) => ({
      kind,
      id,
      name: "x",
      uuid: "x",
      serverRevision: revision,
      data: kind === "scene" ? { children: { modules: [] } } : entityData,
      resources: [],
      relatedSceneIds: [2, 3],
    }));
    const r = await s.call("find_entity_usage", { id: 1, limit: 1 });
    expect(r.usages[0].relation).toBe("associated_only");
    expect(r.nextOffset).toBe(1);
  });
});
describe("stepwise authoring tasks", () => {
  const setup = () => {
    let actor = "3";
    let target = { kind: "entity" as const, id: 1 };
    const available = [
      "xrugc_stage_authoring_creation",
      "xrugc_complete_authoring_draft",
      "xrugc_get_authoring_operation",
      "xrugc_open_authoring_object",
      "xrugc_stage_resource_placement",
    ];
    const run = vi.fn(
      async (_name: string, _input: unknown): Promise<unknown> => ({
        draftId: "draft",
      })
    );
    const confirm = vi.fn(async () => true);
    const call = invoke(
      createAuthoringTaskTools({
        actor: () => actor,
        context: () => "context",
        getTarget: () => target,
        getAvailableTools: () => available,
        invokeTool: run,
        confirm,
      })
    );
    const preview = (steps: unknown[]) =>
      call("preview_authoring_task", { name: "test", steps });
    const advance = async (task: any) => {
      const result = await call("advance_authoring_task", {
        taskId: task.taskId,
      });
      await flush();
      return result;
    };
    const status = (task: any) =>
      call("get_authoring_task", { taskId: task.taskId });
    return {
      call,
      preview,
      advance,
      status,
      run,
      confirm,
      available,
      changeActor: () => {
        actor = "4";
      },
      changeTarget: () => {
        target = { kind: "entity", id: 2 };
      },
    };
  };
  const stage = {
    key: "stage",
    tool: "xrugc_stage_authoring_creation",
    input: { kind: "entity", name: "test" },
  };
  it("resolves earlier outputs and polls completion without replay", async () => {
    const s = setup();
    const task = await s.preview([
      stage,
      {
        key: "save",
        tool: "xrugc_complete_authoring_draft",
        input: { draftId: { $ref: "stage.draftId" } },
      },
    ]);
    await s.advance(task);
    s.run.mockResolvedValueOnce({
      operationId: "op",
      status: "awaiting_confirmation",
    });
    await s.advance(task);
    expect(s.run).toHaveBeenLastCalledWith("xrugc_complete_authoring_draft", {
      draftId: "draft",
    });
    s.run.mockResolvedValueOnce({
      operationId: "op",
      status: "completed",
      targetId: 9,
    });
    await s.advance(task);
    expect(s.run).toHaveBeenLastCalledWith("xrugc_get_authoring_operation", {
      operationId: "op",
    });
    expect((await s.status(task)).status).toBe("completed");
  });
  it("singleflights simultaneous advances", async () => {
    const s = setup();
    const task = await s.preview([stage]);
    let done!: (v: unknown) => void;
    s.run.mockReturnValue(
      new Promise((r) => {
        done = r;
      })
    );
    await Promise.all([s.advance(task), s.advance(task)]);
    expect(s.run).toHaveBeenCalledTimes(1);
    done({ draftId: "ok" });
    await flush();
  });
  it.each([
    "xrugc_start_scene_runtime_preview",
    "xrugc_complete_scene_publication",
    "xrugc_stage_node_deletion",
  ])("does not orchestrate %s", async (name) => {
    const s = setup();
    await expect(s.preview([{ ...stage, tool: name }])).rejects.toThrow();
  });
  it("rejects forward and prototype references", async () => {
    const s = setup();
    for (const ref of ["later.id", "stage.__proto__.foo"])
      await expect(
        s.preview([{ ...stage, input: { id: { $ref: ref } } }])
      ).rejects.toThrow();
  });
  it("waits on missing tools and target mismatch without submitting", async () => {
    const s = setup();
    const task = await s.preview([
      {
        key: "place",
        tool: "xrugc_stage_resource_placement",
        input: {},
        target: { kind: "entity", id: 2 },
      },
    ]);
    await s.advance(task);
    expect((await s.status(task)).status).toBe("waiting_target");
    expect(s.run).not.toHaveBeenCalled();
    s.changeTarget();
    s.available.splice(
      s.available.indexOf("xrugc_stage_resource_placement"),
      1
    );
    await s.advance(task);
    expect((await s.status(task)).status).toBe("waiting_tool");
  });
  it("does not retry unknown invocations without operation ID", async () => {
    const s = setup();
    const task = await s.preview([stage]);
    s.run.mockRejectedValue(new Error("timeout"));
    await s.advance(task);
    await s.advance(task);
    expect(s.run).toHaveBeenCalledTimes(1);
    expect((await s.status(task)).status).toBe("unknown");
  });
  it("waits on the registered loading guard without treating applied=false as a write failure", async () => {
    const s = setup();
    const task = await s.preview([stage]);
    s.run.mockResolvedValueOnce({
      status: "loading",
      ready: false,
      applied: false,
    });
    await s.advance(task);
    expect((await s.status(task)).status).toBe("waiting_editor");
    expect((await s.status(task)).index).toBe(0);
    await s.advance(task);
    expect((await s.status(task)).status).toBe("completed");
  });
  it("waits on an executing save receipt and never adopts a different busy operation", async () => {
    const s = setup();
    const task = await s.preview([
      stage,
      {
        key: "save",
        tool: "xrugc_complete_authoring_draft",
        input: { draftId: { $ref: "stage.draftId" } },
      },
    ]);
    await s.advance(task);
    s.run.mockResolvedValueOnce({ status: "busy", operationId: "unrelated" });
    await s.advance(task);
    expect((await s.status(task)).steps[1].operationId).toBeUndefined();
    expect((await s.status(task)).status).toBe("waiting_busy");
    s.run.mockResolvedValueOnce({
      status: "awaiting_confirmation",
      operationId: "owned",
    });
    await s.advance(task);
    s.run.mockResolvedValueOnce({ status: "executing", operationId: "owned" });
    await s.advance(task);
    expect((await s.status(task)).index).toBe(1);
    expect((await s.status(task)).status).toBe("pending");
  });
  it.each([{ status: "expired_or_missing" }, { ok: false }])(
    "does not complete unavailable drafts or negative native results: %j",
    async (result) => {
      const s = setup();
      const task = await s.preview([stage]);
      s.run.mockResolvedValueOnce(result);
      await s.advance(task);
      expect((await s.status(task)).status).toBe("failed");
    }
  );
  it("preserves failures instead of advancing", async () => {
    const s = setup();
    const task = await s.preview([stage]);
    s.run.mockResolvedValue({ isError: true });
    await s.advance(task);
    expect((await s.status(task)).index).toBe(0);
    expect((await s.status(task)).status).toBe("failed");
  });
  it("hides tasks from another actor", async () => {
    const s = setup();
    const task = await s.preview([stage]);
    s.changeActor();
    await expect(s.status(task)).rejects.toThrow();
  });
});
describe("catalog based script assistance", () => {
  const descriptor = (type: string, inputs: unknown[] = []) => ({
    type,
    fields: { VALUE: 1 },
    connections: { previous: true, next: true },
    sampleState: { type, fields: { VALUE: 1 } },
    inputs,
  });
  const setup = () => {
    const run = vi.fn(
      async (name: string, _input: unknown): Promise<unknown> =>
        name === "xrugc_get_script_block_catalog"
          ? {
              blocks: [
                descriptor("action"),
                descriptor("event", [{ name: "DO", kind: "statement" }]),
              ],
              truncated: false,
            }
          : name === "xrugc_get_script_block_structure"
            ? {
                workspaceVersion: "v",
                blocks: [
                  {
                    id: "1",
                    inputs: [],
                    relation: { kind: "top" },
                    nextBlockId: "missing",
                  },
                ],
                truncated: false,
              }
            : name === "xrugc_validate_meta_script"
              ? { valid: true, workspaceVersion: "v" }
              : { draftId: "preview", canSave: true }
    );
    const call = invoke(
      createAuthoringScriptAssistanceTools({
        actor: () => "3",
        context: () => "entity:1",
        availableTools: () => [
          "xrugc_get_script_block_catalog",
          "xrugc_get_script_block_structure",
          "xrugc_stage_script_block_batch",
          "xrugc_validate_meta_script",
        ],
        invokeTool: run,
      })
    );
    return { run, call };
  };
  it("compiles an event plus action chain into stage only", async () => {
    const s = setup();
    const r = await s.call("preview_script_template", {
      template: "event_actions",
      event: { type: "event" },
      inputName: "DO",
      actions: [{ type: "action", fields: { VALUE: 2 } }, { type: "action" }],
    });
    expect(r.draftId).toBe("preview");
    expect(r.operations).toContainEqual(
      expect.objectContaining({
        op: "connect",
        connection: "input",
        inputName: "DO",
      })
    );
    expect(s.run.mock.calls.every(([name]) => !name.includes("complete"))).toBe(
      true
    );
  });
  it("rejects nonexistent types and fields before staging", async () => {
    const s = setup();
    for (const block of [
      { type: "invented" },
      { type: "action", fields: { FAKE: 1 } },
    ])
      await expect(
        s.call("preview_script_template", {
          template: "statement_chain",
          actions: [block],
        })
      ).rejects.toThrow();
    expect(s.run.mock.calls.every(([name]) => !name.includes("stage"))).toBe(
      true
    );
  });
  it("combines structural diagnostics with the live validator", async () => {
    const s = setup();
    const r = await s.call("diagnose_authoring_script");
    expect(r.structuralIssues[0].code).toBe("DANGLING_BLOCK_LINK");
    expect(r.validation.valid).toBe(true);
    expect(r.coverage.runtimeVerified).toBe(false);
  });
  it("fails closed when editor versions differ", async () => {
    const s = setup();
    s.run.mockImplementation(async (name) =>
      name.includes("structure")
        ? { blocks: [], workspaceVersion: "v1" }
        : { valid: true, workspaceVersion: "v2" }
    );
    await expect(s.call("diagnose_authoring_script")).rejects.toThrow("改变");
  });
});
describe("editable project backup and new-draft restore", () => {
  const source = (kind: "entity" | "scene", id: number): EditableSource => ({
    kind,
    id,
    uuid: `old-${id}`,
    name: `source-${id}`,
    serverRevision: revision,
    data: kind === "entity" ? entityData : sceneData,
    info: "information",
    events: null,
    description: "description",
    imageId: null,
    code: { blockly: '{"blocks":{}}', lua: "original Lua", js: "original JS" },
    resources: kind === "entity" ? [{ id: 7, type: "picture" }] : [],
    entityIds: kind === "scene" ? [1] : undefined,
  });
  const setup = () => {
    let actor = "3";
    let nextId = 100;
    const read = vi.fn(async (kind: "entity" | "scene", id: number) =>
      source(kind, id)
    );
    const resource = vi.fn(async (type: string, id: number) => ({
      id,
      type,
      fileId: 77,
      md5: "hash",
    }));
    const create = vi.fn(
      async (_source: EditableSource, uuid: string, _name: string) => ({
        id: nextId++,
        uuid,
        serverRevision: revision,
      })
    );
    const write = vi.fn(
      async (target: any, part: string, _payload: unknown) => ({
        operationId: target.operationId,
        targetId: target.id,
        targetType:
          target.kind === "entity" ? ("meta" as const) : ("verse" as const),
        serverRevision: revision,
        status: "completed" as const,
        action: part === "code" ? ("save_code" as const) : ("save" as const),
      })
    );
    const receipt = vi.fn();
    const call = invoke(
      createAuthoringProjectTools({
        actor: () => actor,
        context: () => "page",
        canCreate: () => true,
        confirm: async () => true,
        read,
        resource,
        create,
        write,
        receipt,
      })
    );
    const backup = async () =>
      (
        await call("export_editable_project", {
          kind: "scene",
          id: 2,
          includeBackup: true,
        })
      ).backup;
    const stage = async (b?: unknown) =>
      call("stage_project_restore", {
        backup: b ?? (await backup()),
        namePrefix: "Restored ",
      });
    const advance = async (r: any) => {
      await call("advance_project_restore", { restoreId: r.restoreId });
      await flush();
      return call("get_project_restore", { restoreId: r.restoreId });
    };
    return {
      call,
      read,
      resource,
      create,
      write,
      receipt,
      backup,
      stage,
      advance,
      changeActor: () => {
        actor = "4";
      },
    };
  };
  it("restores by an owned backup ID without returning the full package by default", async () => {
    const s = setup();
    const b = await s.call("export_editable_project", { kind: "scene", id: 2 });
    expect(b.backup).toBeUndefined();
    const r = await s.call("stage_project_restore", {
      backupId: b.backupId,
      namePrefix: "copy ",
    });
    expect(r.status).toBe("preview");
    s.changeActor();
    await expect(
      s.call("stage_project_restore", {
        backupId: b.backupId,
        namePrefix: "copy ",
      })
    ).rejects.toThrow("账号");
  });
  it("exports source, versions and stable canonical hash", async () => {
    const s = setup();
    const b = await s.backup();
    expect(b.body.objects).toHaveLength(2);
    expect(b.body.objects[0].code.lua).toBe("original Lua");
    expect(b.hash).toBe(await hashEditableProject(b.body));
    expect(b.body.resourceBytesArchived).toBe(false);
  });
  it("rejects a changed package or changed dependency", async () => {
    const s = setup();
    const b = await s.backup();
    b.body.objects[0].name = "tampered";
    await expect(s.stage(b)).rejects.toThrow("哈希");
    const good = await s.backup();
    s.resource.mockResolvedValue({
      id: 7,
      type: "picture",
      fileId: 88,
      md5: "new",
    });
    await expect(s.stage(good)).rejects.toThrow("改变");
    expect(s.create).not.toHaveBeenCalled();
  });
  it("restores entities first, rewrites only scene references and returns receipts", async () => {
    const s = setup();
    const r = await s.stage();
    let state = r;
    for (let i = 0; i < 6 && state.status !== "completed"; i++)
      state = await s.advance(r);
    expect(state.status).toBe("completed");
    expect(s.create).toHaveBeenCalledTimes(2);
    expect(s.create.mock.calls[0][0].kind).toBe("entity");
    const dataCall = s.write.mock.calls.find(([, part]) => part === "data")!;
    expect(
      (dataCall[2] as any).data.children.modules[0].parameters.meta_id
    ).toBe(100);
    expect(
      s.write.mock.calls
        .filter(([, part]) => part === "code")
        .every(
          ([, , payload]) =>
            (payload as any).lua === "" && (payload as any).blockly
        )
    ).toBe(true);
    expect(state.steps.filter((step: any) => step.receipt)).toHaveLength(3);
    expect(state.originalObjectsModified).toBe(false);
    expect((dataCall[2] as any).info).toBe("information");
  });
  it("does not replay unknown creates and requires UUID reconciliation", async () => {
    const s = setup();
    const r = await s.stage();
    s.create.mockRejectedValueOnce(new Error("lost"));
    let state = await s.advance(r);
    expect(state.status).toBe("unknown");
    await s.advance(r);
    expect(s.create).toHaveBeenCalledTimes(1);
    const uuid = state.steps[0].uuid;
    s.read.mockImplementation(async (kind, id) => ({
      ...source(kind, id),
      uuid,
    }));
    state = await s.call("reconcile_project_restore", {
      restoreId: r.restoreId,
      createdId: 100,
    });
    expect(state.index).toBe(1);
    expect(state.objects[0].id).toBe(100);
  });
  it("hides restore tasks from other accounts", async () => {
    const s = setup();
    const r = await s.stage();
    s.changeActor();
    await expect(
      s.call("get_project_restore", { restoreId: r.restoreId })
    ).rejects.toThrow();
  });
  it("rejects unmapped scene instances instead of preserving original entity IDs", () => {
    expect(() => remapRestoredScene(sceneData, new Map())).toThrow("映射");
    expect(
      (remapRestoredScene(sceneData, new Map([[1, 100]])) as any).children
        .modules[0].parameters.uuid
    ).toBe("instance");
  });
});
