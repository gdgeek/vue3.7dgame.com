import type { WebMcpTool } from "./model-context";
import type { TaskStore, TaskSnapshot } from "./authoring-task-store";
import type { ObjectKind } from "./authoring-tools";

type Json = Record<string, unknown>;
type Target = { kind: ObjectKind; id: number };
type Step = {
  key: string;
  tool: string;
  input: Json;
  target?: { kind: ObjectKind; id: unknown };
};
type StepState = {
  key: string;
  status: string;
  result?: unknown;
  operationId?: string;
  target?: Target | null;
};
type Task = {
  taskId: string;
  actor: string;
  context: string;
  name: string;
  expiresAt: number;
  steps: Step[];
  states: StepState[];
  index: number;
  status: string;
  busy: boolean;
  approved: boolean;
  revision?: number;
  claimId?: string;
  leaseUntil?: number;
  restored?: boolean;
};
export type AuthoringTaskDependencies = {
  store?: TaskStore;
  queryAuthoringOperation?: (
    operationId: string,
    preview: Record<string, unknown>
  ) => Promise<unknown>;
  actor: () => string | null;
  context: () => string;
  getTarget: () => Target | null;
  getAvailableTools: () => string[];
  invokeTool: (name: string, input: unknown) => Promise<unknown>;
  confirm: (message: string) => Promise<boolean>;
};
const GLOBAL = [
  "xrugc_stage_authoring_creation",
  "xrugc_complete_authoring_draft",
  "xrugc_open_authoring_object",
  "xrugc_stage_object_cover",
  "xrugc_get_object_cover",
  "xrugc_search_authoring_assets",
  "xrugc_get_asset_metadata",
];
const EDITOR = [
  "xrugc_open_entity_script_editor",
  "xrugc_close_entity_script_editor",
  "xrugc_open_scene_script_editor",
  "xrugc_close_scene_script_editor",
  "xrugc_stage_resource_placement",
  "xrugc_complete_resource_placement",
  "xrugc_stage_scene_entity_placement",
  "xrugc_complete_scene_entity_placement",
  "xrugc_stage_script_block_batch",
  "xrugc_complete_script_block_batch",
  "xrugc_stage_meta_script_replace",
  "xrugc_complete_meta_script_replace",
  "xrugc_stage_scene_script_replace",
  "xrugc_complete_scene_script_replace",
  "xrugc_get_entity_tree",
  "xrugc_get_scene_modules",
  "xrugc_get_script_block_catalog",
  "xrugc_validate_meta_script",
  "xrugc_validate_scene_script",
];
const allowed = new Set([...GLOBAL, ...EDITOR]);
const record = (v: unknown): Json => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new Error("需要对象参数");
  return v as Json;
};
const banned = new Set(["__proto__", "prototype", "constructor"]);
function visit(
  value: unknown,
  lookup: (path: string[]) => unknown,
  depth = 0
): unknown {
  if (depth > 40) throw new Error("参数嵌套过深");
  if (Array.isArray(value))
    return value.map((v) => visit(v, lookup, depth + 1));
  if (!value || typeof value !== "object") return value;
  const data = record(value);
  if (Object.hasOwn(data, "$ref")) {
    if (Object.keys(data).length !== 1 || typeof data.$ref !== "string")
      throw new Error("引用必须只有 $ref 字符串");
    const path = data.$ref.split(".");
    if (
      path.length < 2 ||
      path.some((p) => banned.has(p) || !/^[a-zA-Z0-9_-]+$/.test(p))
    )
      throw new Error("非法引用路径");
    return lookup(path);
  }
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => {
      if (banned.has(k)) throw new Error("非法参数字段");
      return [k, visit(v, lookup, depth + 1)];
    })
  );
}
export function createAuthoringTaskTools(
  d: AuthoringTaskDependencies
): WebMcpTool[] {
  const tasks = new Map<string, Task>();
  const leaseWait = (task: Task) =>
    !task.busy && !task.claimId
      ? Math.max(0, (task.leaseUntil ?? 0) * 1000 - Date.now())
      : 0;
  const state = (task: Task) =>
    structuredClone({
      taskId: task.taskId,
      name: task.name,
      status: leaseWait(task) ? "waiting_lease" : task.status,
      retryAfterMs: leaseWait(task) || null,
      index: task.index,
      steps: task.states,
      plan: task.steps,
      persistence: d.store ? "server" : "memory_only",
      revision: task.revision,
      automaticRetry: false,
      resultEvidence:
        "client_recorded; verify writes with server operation receipts",
      reloadSupported: Boolean(d.store),
      nextStep: leaseWait(task)
        ? "其他会话或刷新前的执行租约尚未释放；等待 retryAfterMs 后查询原任务，不重新创建。"
        : task.status === "unknown"
          ? "查询原操作回执；不要重跑写入步骤。"
          : "核对当前结果后调用 advance 执行下一步或查询待完成操作。",
    });
  const hydrate = (saved: TaskSnapshot): Task => {
    const owner = d.actor();
    if (
      !owner ||
      !saved ||
      !Array.isArray(saved.plan) ||
      saved.plan.length < 1 ||
      saved.plan.length > 30 ||
      !Array.isArray(saved.progress?.states) ||
      saved.progress.states.length !== saved.plan.length ||
      !Number.isSafeInteger(saved.revision) ||
      !Number.isInteger(saved.progress.index) ||
      saved.progress.index < 0 ||
      saved.progress.index > saved.plan.length
    )
      throw new Error("服务端任务格式无效");
    const steps = saved.plan.map((value) => {
      const step = record(value);
      if (
        typeof step.key !== "string" ||
        typeof step.tool !== "string" ||
        !allowed.has(step.tool)
      )
        throw new Error("任务含不支持的工具");
      // PHP JSON decoding represents an empty object as an empty array.
      const input =
        Array.isArray(step.input) && step.input.length === 0
          ? {}
          : record(step.input);
      visit(input, () => null);
      return { ...step, input } as Step;
    });
    const states = saved.progress.states.map((value, i) => {
      const step = record(value);
      if (step.key !== steps[i].key || typeof step.status !== "string")
        throw new Error("任务步骤状态无效");
      return structuredClone(step) as StepState;
    });
    const task: Task = {
      taskId: saved.taskId,
      actor: owner,
      context: d.context(),
      name: saved.name,
      expiresAt: Date.now() + 300000,
      steps,
      states,
      index: saved.progress.index,
      status: saved.progress.status,
      busy: false,
      approved: false,
      revision: saved.revision,
      leaseUntil: saved.leaseUntil,
      restored: true,
    };
    // A lost client can still finish an in-flight write. Never replay it as a new operation.
    if (["executing", "pending"].includes(task.status)) {
      const current = states[task.index];
      const tool = steps[task.index]?.tool ?? "";
      task.status = current?.operationId
        ? "pending"
        : /^(xrugc_stage_|xrugc_get_|xrugc_search_|xrugc_open_|xrugc_close_)/.test(
              tool
            )
          ? "ready"
          : "unknown";
    }
    tasks.set(task.taskId, task);
    return task;
  };
  const owned = async (raw: unknown, fresh = false) => {
    const input = record(raw);
    const id = String(input.taskId);
    const owner = d.actor();
    if (!owner) throw new Error("请先登录");
    let task = tasks.get(id);
    if (d.store && (!task || (fresh && !task.busy))) {
      const saved = await d.store.get(id);
      if (d.actor() !== owner) throw new Error("账号已改变");
      // Retain this client's confirmation only for the exact same progress revision.
      if (
        !task ||
        task.actor !== owner ||
        task.revision !== saved.revision ||
        task.status === "sync_required"
      )
        task = hydrate(saved);
      task.leaseUntil = saved.leaseUntil;
    }
    if (!task || task.actor !== owner)
      throw new Error("任务不存在或账号已改变");
    return task;
  };
  const checkpoint = async (task: Task, release = false) => {
    if (!d.store) return;
    if (!task.claimId || !task.revision) throw new Error("缺少任务执行权");
    assertActor(task);
    const saved = await d.store.checkpoint(
      task.taskId,
      task.revision,
      task.claimId,
      { index: task.index, status: task.status, states: task.states },
      release
    );
    assertActor(task);
    task.revision = saved.revision;
    task.leaseUntil = saved.leaseUntil;
    if (release) task.claimId = undefined;
  };
  const assertActor = (task: Task) => {
    if (d.actor() !== task.actor) throw new Error("账号已改变");
  };
  const resultFor = (task: Task, parts: string[]) => {
    const step = task.states.find((s) => s.key === parts[0]);
    if (step?.status !== "completed") throw new Error("依赖步骤尚未完成");
    let value: unknown = step.result;
    for (const part of parts.slice(1)) {
      if (!value || typeof value !== "object" || !Object.hasOwn(value, part))
        throw new Error("引用结果字段不存在");
      value = (value as Json)[part];
    }
    return structuredClone(value);
  };
  const sameTarget = (target?: Target | null) =>
    !target ||
    (d.getTarget()?.kind === target.kind && d.getTarget()?.id === target.id);
  const classify = (task: Task, result: unknown) => {
    const current = task.states[task.index];
    const data = record(result);
    current.result = structuredClone(result);
    if (data.status === "loading" && data.isError !== true) {
      current.operationId = undefined;
      current.status = task.status = "waiting_editor";
      return;
    }
    // A busy response identifies another operation; it must never become this step's receipt.
    if (data.status === "busy") {
      current.operationId = undefined;
      current.status = task.status = "waiting_busy";
      return;
    }
    const failed =
      data.isError === true ||
      data.success === false ||
      data.ok === false ||
      data.applied === false ||
      data.opened === false ||
      [
        "failed",
        "rejected",
        "cancelled",
        "conflict",
        "partial",
        "error",
        "expired_or_missing",
      ].includes(String(data.status));
    if (
      current.operationId &&
      typeof data.operationId === "string" &&
      data.operationId !== current.operationId
    ) {
      current.status = task.status = "unknown";
      current.result = { status: "unknown", reason: "operation_id_mismatch" };
      return;
    }
    if (typeof data.operationId === "string")
      current.operationId = data.operationId;
    if (
      data.status === "unknown" ||
      data.status === "not_found" ||
      data.status === "not_observed"
    ) {
      current.status = task.status = "unknown";
      return;
    }
    if (failed) {
      current.status = task.status = "failed";
      return;
    }
    if (
      [
        "awaiting_confirmation",
        "submitting",
        "executing",
        "running",
        "pending",
      ].includes(String(data.status))
    ) {
      current.status = task.status = current.operationId
        ? "pending"
        : "unknown";
      return;
    }
    current.status = "completed";
    task.index++;
    task.status = task.index === task.steps.length ? "completed" : "ready";
  };
  const run = async (task: Task) => {
    try {
      if (d.store) {
        const claimId = crypto.randomUUID();
        const saved = await d.store.claim(task.taskId, task.revision!, claimId);
        assertActor(task);
        task.claimId = claimId;
        task.leaseUntil = saved.leaseUntil;
        task.revision = saved.revision;
      }
      if (!task.approved) {
        if (task.expiresAt < Date.now() || task.context !== d.context()) {
          task.status = "expired";
          return;
        }
        const approved = await d.confirm(
          `逐步执行任务「${task.name}」：\n${task.steps.map((s, i) => `${i + 1}. ${s.tool}`).join("\n")}\n每次推进只执行一步。实际写入仍保留原页面确认。`
        );
        assertActor(task);
        if (
          !approved ||
          task.context !== d.context() ||
          task.expiresAt < Date.now()
        ) {
          task.status = "cancelled";
          return;
        }
        task.approved = true;
      }
      assertActor(task);
      const step = task.steps[task.index];
      const current = task.states[task.index];
      const target = step.target
        ? {
            kind: step.target.kind,
            id: visit(step.target.id, (p) => resultFor(task, p)),
          }
        : undefined;
      if (
        target &&
        (typeof target.id !== "number" ||
          !Number.isSafeInteger(target.id) ||
          target.id <= 0)
      )
        throw new Error("任务目标 ID 无效");
      if (
        !sameTarget(target as Target | undefined) ||
        (current.operationId && !sameTarget(current.target))
      ) {
        task.status = "waiting_target";
        return;
      }
      const draftRef = record(step.input).draftId;
      const parentKey =
        draftRef &&
        typeof draftRef === "object" &&
        typeof record(draftRef).$ref === "string"
          ? String(record(draftRef).$ref).split(".")[0]
          : null;
      const parentIndex = parentKey
        ? task.steps.findIndex((s) => s.key === parentKey)
        : -1;
      if (
        task.restored &&
        !current.operationId &&
        step.tool.startsWith("xrugc_complete_")
      ) {
        if (
          parentIndex < 0 ||
          parentIndex >= task.index ||
          !task.steps[parentIndex].tool.startsWith("xrugc_stage_")
        )
          throw new Error("过期草稿无法安全重建，请重新核对计划");
        const parent = task.steps[parentIndex];
        if (!d.getAvailableTools().includes(parent.tool)) {
          task.status = "waiting_tool";
          return;
        }
        const result = await d.invokeTool(
          parent.tool,
          visit(parent.input, (p) => resultFor(task, p))
        );
        assertActor(task);
        if (
          record(result).isError ||
          typeof record(result).draftId !== "string"
        )
          throw new Error("重新预览失败");
        const previewState = task.states[parentIndex];
        previewState.result = structuredClone(result);
        previewState.operationId =
          typeof record(result).operationId === "string"
            ? String(record(result).operationId)
            : undefined;
        await checkpoint(task);
      }
      const isPoll = Boolean(current.operationId);
      const name = isPoll
        ? step.tool === "xrugc_complete_authoring_draft"
          ? "xrugc_get_authoring_operation"
          : "xrugc_get_operation_status"
        : step.tool;
      if (!d.getAvailableTools().includes(name)) {
        task.status = "waiting_tool";
        return;
      }
      const input = isPoll
        ? { operationId: current.operationId }
        : visit(step.input, (p) => resultFor(task, p));
      current.target ??= target as Target | undefined;
      current.status = "executing";
      // Complete tools identify their operation by the staged draft ID. Persist it before dispatch.
      if (
        d.store &&
        !isPoll &&
        name.startsWith("xrugc_complete_") &&
        typeof record(input).draftId === "string"
      )
        current.operationId = String(record(input).draftId);
      await checkpoint(task);
      const parentResult =
        parentIndex >= 0 ? record(task.states[parentIndex].result) : null;
      const result =
        isPoll &&
        step.tool === "xrugc_complete_authoring_draft" &&
        d.queryAuthoringOperation &&
        parentResult?.preview
          ? await d.queryAuthoringOperation(
              current.operationId!,
              record(parentResult.preview)
            )
          : await d.invokeTool(name, input);
      assertActor(task);
      classify(task, result);
    } catch {
      if (d.store && !task.claimId) {
        // A failed claim owns no progress; reload before deciding whether to resume.
        task.status = "sync_required";
        return;
      }
      const current = task.states[task.index];
      if (current?.status === "executing")
        current.status = task.status = "unknown";
      else task.status = "failed";
    } finally {
      try {
        if (task.claimId) await checkpoint(task, true);
      } catch {
        task.status = "sync_required";
      }
      task.busy = false;
    }
  };
  const schema = {
    type: "object",
    properties: { taskId: { type: "string" } },
    required: ["taskId"],
    additionalProperties: false,
  };
  const tools: WebMcpTool[] = [
    {
      name: "xrugc_preview_authoring_task",
      description:
        "预览最多 30 步跨对象创作任务。输入可用 {$ref:'已完成步骤.返回字段路径'} 引用前面步骤；编辑器步骤必须指定 target。计划保存到当前账号的服务端任务记录；不执行对象修改。",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", maxLength: 120 },
          steps: {
            type: "array",
            minItems: 1,
            maxItems: 30,
            items: {
              type: "object",
              properties: {
                key: { type: "string" },
                tool: { type: "string", enum: [...allowed] },
                input: { type: "object" },
                target: {
                  type: "object",
                  properties: { kind: { enum: ["entity", "scene"] }, id: {} },
                  required: ["kind", "id"],
                },
              },
              required: ["key", "tool", "input"],
              additionalProperties: false,
            },
          },
        },
        required: ["name", "steps"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: !d.store, untrustedContentHint: true },
      execute(raw) {
        const actor = d.actor();
        if (!actor) throw new Error("请先登录");
        const input = record(raw);
        const size = JSON.stringify(input).length;
        if (
          size > 256 * 1024 ||
          typeof input.name !== "string" ||
          !input.name.trim() ||
          input.name.length > 120 ||
          !Array.isArray(input.steps) ||
          !input.steps.length ||
          input.steps.length > 30
        )
          throw new Error("任务名称、步骤或大小无效");
        if (!d.store && tasks.size >= 20)
          throw new Error("任务过多，请先核对当前任务");
        const keys = new Set<string>();
        const steps: Step[] = [];
        for (const rawStep of input.steps) {
          const s = record(rawStep);
          const key = String(s.key);
          const tool = String(s.tool);
          if (
            !/^[a-zA-Z][a-zA-Z0-9_-]{0,40}$/.test(key) ||
            keys.has(key) ||
            banned.has(key) ||
            !allowed.has(tool)
          )
            throw new Error("步骤 key 或工具无效");
          const args = record(s.input);
          const validateRef = (path: string[]) => {
            if (!keys.has(path[0])) throw new Error("只能引用前面的步骤");
            return null;
          };
          visit(args, validateRef);
          let target: Step["target"];
          if (s.target !== undefined) {
            const t = record(s.target);
            if (t.kind !== "scene" && t.kind !== "entity")
              throw new Error("target.kind 无效");
            visit(t.id, validateRef);
            target = { kind: t.kind, id: t.id };
          }
          if (EDITOR.includes(tool) && !target)
            throw new Error("编辑器步骤必须绑定目标对象");
          keys.add(key);
          steps.push({ key, tool, input: structuredClone(args), target });
        }
        const taskId = crypto.randomUUID();
        const task: Task = {
          taskId,
          actor,
          context: d.context(),
          name: input.name,
          expiresAt: Date.now() + 300000,
          steps,
          states: steps.map((s) => ({ key: s.key, status: "planned" })),
          index: 0,
          status: "preview",
          busy: false,
          approved: false,
        };
        const ready = () => {
          tasks.set(taskId, task);
          return { ...state(task), preview: structuredClone(steps) };
        };
        if (!d.store) return ready();
        return d.store
          .create({ taskId, name: task.name, steps })
          .then((saved) => {
            assertActor(task);
            task.revision = saved.revision;
            return ready();
          });
      },
    },
    {
      name: "xrugc_advance_authoring_task",
      description:
        "推进任务一步或查询原操作。缺少页面工具/目标不符时等待；unknown 不重发。完成仅指保存和回执，不代表发布或运行通过。",
      inputSchema: schema,
      annotations: { readOnlyHint: false },
      async execute(raw) {
        const task = await owned(raw, true);
        if (
          !task.busy &&
          !leaseWait(task) &&
          !["completed", "cancelled", "expired", "failed"].includes(
            task.status
          ) &&
          (task.status !== "unknown" || task.states[task.index]?.operationId)
        ) {
          task.busy = true;
          task.status = "executing";
          void run(task);
        }
        return state(task);
      },
    },
    {
      name: "xrugc_get_authoring_task",
      description:
        "查询服务端任务步骤、对象 ID 和回执；刷新后按原 taskId 续办。未知写入先核对原回执，不重新创建。",
      inputSchema: schema,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (raw) => state(await owned(raw, true)),
    },
  ];
  if (d.store)
    tools.push({
      name: "xrugc_list_authoring_tasks",
      description:
        "分页查找当前账号已持久保存的创作任务，刷新后可据 taskId 查询和续办。",
      inputSchema: {
        type: "object",
        properties: {
          offset: { type: "integer", minimum: 0, maximum: 100000, default: 0 },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (raw) => {
        const owner = d.actor();
        if (!owner) throw new Error("请先登录");
        const offset = record(raw).offset ?? 0;
        if (
          typeof offset !== "number" ||
          !Number.isInteger(offset) ||
          offset < 0 ||
          offset > 100000
        )
          throw new Error("offset 无效");
        const result = await d.store!.list(offset);
        if (owner !== d.actor()) throw new Error("账号已改变");
        return result;
      },
    });
  return tools;
}
