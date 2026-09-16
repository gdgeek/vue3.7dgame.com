import type { WebMcpTool } from "./model-context";
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
};
export type AuthoringTaskDependencies = {
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
  const state = (task: Task) =>
    structuredClone({
      taskId: task.taskId,
      name: task.name,
      status: task.status,
      index: task.index,
      steps: task.states,
      persistence: "memory_only",
      automaticRetry: false,
      reloadSupported: false,
      nextStep:
        task.status === "unknown"
          ? "查询原操作回执；不要重跑写入步骤。"
          : "核对当前结果后调用 advance 执行下一步或查询待完成操作。",
    });
  const owned = (raw: unknown) => {
    const input = record(raw);
    const task = tasks.get(String(input.taskId));
    if (!d.actor() || !task || task.actor !== d.actor())
      throw new Error("任务不存在或账号已改变");
    return task;
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
      current.status = task.status = "waiting_editor";
      return;
    }
    // A busy response identifies another operation; it must never become this step's receipt.
    if (data.status === "busy") {
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
      const result = await d.invokeTool(name, input);
      assertActor(task);
      classify(task, result);
    } catch {
      const current = task.states[task.index];
      if (current?.status === "executing")
        current.status = task.status = "unknown";
      else task.status = "failed";
    } finally {
      task.busy = false;
    }
  };
  const schema = {
    type: "object",
    properties: { taskId: { type: "string" } },
    required: ["taskId"],
    additionalProperties: false,
  };
  return [
    {
      name: "xrugc_preview_authoring_task",
      description:
        "预览最多 30 步跨对象创作任务。输入可用 {$ref:'已完成步骤.返回字段路径'} 引用前面步骤；编辑器步骤必须指定 target。只规划，不执行。",
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
      annotations: { readOnlyHint: true, untrustedContentHint: true },
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
        if (tasks.size >= 20) throw new Error("任务过多，请先核对当前任务");
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
        tasks.set(taskId, task);
        return { ...state(task), preview: structuredClone(steps) };
      },
    },
    {
      name: "xrugc_advance_authoring_task",
      description:
        "推进任务一步或查询原操作。缺少页面工具/目标不符时等待；unknown 不重发。完成仅指保存和回执，不代表发布或运行通过。",
      inputSchema: schema,
      annotations: { readOnlyHint: false },
      execute(raw) {
        const task = owned(raw);
        if (
          !task.busy &&
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
        "查询任务各步骤结果、对象 ID 和保存回执；内存任务跨页面保留，刷新后不保留，不能据此重建已创建对象。",
      inputSchema: schema,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (raw) => state(owned(raw)),
    },
  ];
}
