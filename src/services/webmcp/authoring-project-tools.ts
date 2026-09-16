import type { WebMcpTool } from "./model-context";
import { collectAuthoringReferences } from "./authoring-dependencies";
import type { ObjectKind } from "./authoring-tools";
import { validRevision, type WriteReceipt } from "@/api/v1/write-contract";

type Json = Record<string, unknown>;
export type EditableSource = {
  kind: ObjectKind;
  id: number;
  uuid: string;
  name: string;
  serverRevision: string;
  data: unknown;
  info: unknown;
  events: unknown;
  description: string | null;
  imageId: number | null;
  code: { blockly: string; lua?: string; js?: string } | null;
  resources: Array<{ id: number; type: string }>;
  entityIds?: number[];
};
export type ResourcePin = {
  id: number;
  type: string;
  fileId: number;
  md5: string;
};
type BackupBody = {
  format: "xrugc-editable-project";
  version: 1;
  root: { kind: ObjectKind; id: number };
  objects: EditableSource[];
  resources: ResourcePin[];
  createdAt: string;
  resourceBytesArchived: false;
};
export type EditableBackup = { body: BackupBody; hash: string };
export type ProjectDependencies = {
  actor: () => string | null;
  context: () => string;
  canCreate: (kind: ObjectKind) => boolean;
  read: (kind: ObjectKind, id: number) => Promise<EditableSource>;
  resource: (type: string, id: number) => Promise<ResourcePin>;
  create: (
    source: EditableSource,
    uuid: string,
    name: string
  ) => Promise<{ id: number; uuid: string; serverRevision: string }>;
  write: (
    target: {
      kind: ObjectKind;
      id: number;
      revision: string;
      operationId: string;
    },
    part: "data" | "code",
    payload: unknown
  ) => Promise<WriteReceipt>;
  receipt: (
    kind: ObjectKind,
    id: number,
    operationId: string
  ) => Promise<WriteReceipt>;
  confirm: (message: string) => Promise<boolean>;
  download?: (backup: EditableBackup) => void;
};
const rec = (v: unknown): Json => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new Error("预期工程对象");
  return v as Json;
};
const positive = (v: unknown): number => {
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v <= 0)
    throw new Error("对象 ID 无效");
  return v;
};
const jsonSize = (v: unknown) => {
  const json = JSON.stringify(v);
  if (json.length > 2 * 1024 * 1024)
    throw new Error("工程超过 2 MB JSON 限制，请分实体备份");
  return json;
};
function canonical(v: unknown, depth = 0): unknown {
  if (depth > 60) throw new Error("工程嵌套过深");
  if (Array.isArray(v)) return v.map((x) => canonical(x, depth + 1));
  if (!v || typeof v !== "object") return v;
  return Object.fromEntries(
    Object.keys(v)
      .sort()
      .map((key) => {
        if (["__proto__", "constructor", "prototype"].includes(key))
          throw new Error("工程包含非法字段");
        return [key, canonical((v as Json)[key], depth + 1)];
      })
  );
}
export async function hashEditableProject(body: unknown) {
  const bytes = new TextEncoder().encode(jsonSize(canonical(body)));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("")}`;
}
export function remapRestoredScene(
  data: unknown,
  mapping: Map<number, number>
): unknown {
  const value =
    typeof data === "string" ? JSON.parse(data) : structuredClone(data);
  const scan = collectAuthoringReferences(value, "scene");
  if (scan.invalid || scan.truncated)
    throw new Error("场景引用不完整，拒绝自动恢复");
  const stack = [value];
  let count = 0;
  while (stack.length) {
    if (++count > 10000) throw new Error("场景结构过大");
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (!Array.isArray(node)) {
      const params = (node as Json).parameters;
      if (
        params &&
        typeof params === "object" &&
        !Array.isArray(params) &&
        Object.hasOwn(params, "meta_id")
      ) {
        const old = (params as Json).meta_id;
        const next = mapping.get(Number(old));
        if (!next) throw new Error("缺少已恢复实体的映射");
        (params as Json).meta_id =
          typeof old === "string" ? String(next) : next;
      }
    }
    stack.push(...Object.values(node));
  }
  return typeof data === "string" ? JSON.stringify(value) : value;
}
type RestoreStep = {
  source: number;
  part: "create" | "data" | "code";
  operationId: string;
  uuid?: string;
  status: string;
  receipt?: WriteReceipt;
};
type Restore = {
  restoreId: string;
  actor: string;
  context: string;
  expires: number;
  backup: EditableBackup;
  prefix: string;
  steps: RestoreStep[];
  index: number;
  state: string;
  busy: boolean;
  approved: boolean;
  created: Map<number, { id: number; uuid: string; serverRevision: string }>;
};
export function createAuthoringProjectTools(
  d: ProjectDependencies
): WebMcpTool[] {
  const restores = new Map<string, Restore>();
  const backups = new Map<string, { actor: string; backup: EditableBackup }>();
  const guard = () => {
    const actor = d.actor();
    const context = d.context();
    if (!actor) throw new Error("请先登录");
    return () => {
      if (actor !== d.actor() || context !== d.context())
        throw new Error("账号或页面改变，请重新预览");
    };
  };
  const validate = async (raw: unknown): Promise<EditableBackup> => {
    jsonSize(raw);
    const envelope = rec(raw);
    const body = rec(envelope.body);
    if (
      body.format !== "xrugc-editable-project" ||
      body.version !== 1 ||
      !Array.isArray(body.objects) ||
      body.objects.length < 1 ||
      body.objects.length > 21 ||
      !Array.isArray(body.resources) ||
      body.resources.length > 200 ||
      body.resourceBytesArchived !== false
    )
      throw new Error("备份格式或数量不支持");
    if (envelope.hash !== (await hashEditableProject(body)))
      throw new Error("备份哈希不匹配");
    const root = rec(body.root);
    positive(root.id);
    if (
      !body.objects.some((raw) => {
        const o = rec(raw);
        return o.id === root.id && o.kind === root.kind;
      })
    )
      throw new Error("备份根对象不存在");
    const keys = new Set<string>();
    for (const raw of body.objects) {
      const o = rec(raw);
      positive(o.id);
      if (
        !["entity", "scene"].includes(String(o.kind)) ||
        !validRevision(o.serverRevision) ||
        typeof o.uuid !== "string" ||
        typeof o.name !== "string" ||
        !Array.isArray(o.resources)
      )
        throw new Error("对象字段或版本无效");
      const key = `${o.kind}:${o.id}`;
      if (keys.has(key)) throw new Error("备份对象重复");
      keys.add(key);
      if (o.kind === "scene" && (root.kind !== "scene" || o.id !== root.id))
        throw new Error("备份只能有一个根场景");
      if (o.code !== null) {
        const code = rec(o.code);
        if (typeof code.blockly !== "string")
          throw new Error("缺少可编辑 Blockly 源");
      }
    }
    return structuredClone(raw) as EditableBackup;
  };
  const preflight = async (backup: EditableBackup, check: () => void) => {
    for (const source of backup.body.objects)
      if (!d.canCreate(source.kind))
        throw new Error("当前账号不能创建恢复对象");
    const pins = new Map<string, ResourcePin>();
    for (const pin of backup.body.resources) {
      positive(pin.id);
      positive(pin.fileId);
      if (
        typeof pin.type !== "string" ||
        typeof pin.md5 !== "string" ||
        !pin.md5
      )
        throw new Error("素材版本信息无效");
      const current = await d.resource(pin.type, pin.id);
      check();
      if (
        current.fileId !== pin.fileId ||
        current.md5 !== pin.md5 ||
        current.id !== pin.id ||
        current.type !== pin.type
      )
        throw new Error("素材已改变或无法读取，不能按原依赖恢复");
      pins.set(`${pin.type}:${pin.id}`, pin);
    }
    for (const source of backup.body.objects) {
      for (const resource of source.resources)
        if (!pins.has(`${resource.type}:${resource.id}`))
          throw new Error("备份缺少素材版本");
      if (source.kind === "scene") {
        const refs = collectAuthoringReferences(source.data, "scene");
        if (
          refs.invalid ||
          refs.truncated ||
          refs.references.some(
            (ref) =>
              !backup.body.objects.some(
                (o) => o.kind === "entity" && o.id === ref.id
              )
          )
        )
          throw new Error("场景依赖不完整");
      } else {
        const refs = collectAuthoringReferences(source.data, "entity");
        if (
          refs.invalid ||
          refs.truncated ||
          refs.references.some(
            (ref) => !source.resources.some((r) => r.id === ref.id)
          )
        )
          throw new Error("实体素材引用不完整");
      }
    }
  };
  const state = (r: Restore) => ({
    restoreId: r.restoreId,
    status: r.state,
    index: r.index,
    steps: structuredClone(r.steps),
    objects: [...r.created].map(([source, o]) => ({
      sourceId: r.backup.body.objects[source].id,
      kind: r.backup.body.objects[source].kind,
      ...o,
    })),
    persistence: "memory_only",
    reloadSupported: false,
    originalObjectsModified: false,
    publicationCreated: false,
    generatedCodeNeedsRegeneration: true,
    coverImagesRequireRebinding: true,
    nextStep:
      "逐步推进；unknown 只查原回执或用创建 UUID 核对新对象，不重放。恢复后打开脚本抽屉校验并生成代码。",
  });
  const owned = (raw: unknown) => {
    const r = restores.get(String(rec(raw).restoreId));
    if (!r || !d.actor() || r.actor !== d.actor())
      throw new Error("恢复任务不存在或账号改变");
    return r;
  };
  const run = async (r: Restore) => {
    const checkActor = () => {
      if (d.actor() !== r.actor) throw new Error("账号改变");
    };
    try {
      if (!r.approved) {
        if (r.context !== d.context() || r.expires < Date.now()) {
          r.state = "expired";
          return;
        }
        const approved = await d.confirm(
          `恢复备份为 ${r.backup.body.objects.length} 个全新草稿，名称前缀「${r.prefix}」。\n保留 Blockly 源，生成代码清空后需重新生成；不覆盖原对象、不发布。`
        );
        checkActor();
        if (!approved || r.context !== d.context() || r.expires < Date.now()) {
          r.state = "cancelled";
          return;
        }
        await preflight(r.backup, () => {
          checkActor();
          if (r.context !== d.context() || r.expires < Date.now())
            throw new Error("预览上下文已过期");
        });
        r.approved = true;
      }
      checkActor();
      const step = r.steps[r.index];
      const source = r.backup.body.objects[step.source];
      const target = r.created.get(step.source);
      if (!d.canCreate(source.kind)) throw new Error("创建权限已撤回");
      if (step.status === "unknown") {
        if (step.part === "create" || !target) {
          r.state = "unknown";
          return;
        }
        const receipt = await d.receipt(
          source.kind,
          target.id,
          step.operationId
        );
        checkActor();
        if (
          receipt.operationId !== step.operationId ||
          receipt.targetId !== target.id ||
          receipt.targetType !==
            (source.kind === "entity" ? "meta" : "verse") ||
          receipt.action !== (step.part === "code" ? "save_code" : "save") ||
          receipt.status !== "completed" ||
          !validRevision(receipt.serverRevision)
        )
          throw new Error("回执不匹配");
        step.receipt = receipt;
        target.serverRevision = receipt.serverRevision;
      } else {
        step.status = "submitting";
        if (step.part === "create") {
          const result = await d.create(
            source,
            step.uuid!,
            `${r.prefix}${source.name}`.slice(0, 200)
          );
          positive(result.id);
          if (
            result.uuid !== step.uuid ||
            !validRevision(result.serverRevision)
          )
            throw new Error("新建回执不匹配");
          r.created.set(step.source, result);
        } else {
          if (!target) throw new Error("未取得新建对象 ID");
          const mapping = new Map(
            [...r.created]
              .filter(
                ([index]) => r.backup.body.objects[index].kind === "entity"
              )
              .map(([index, object]) => [
                r.backup.body.objects[index].id,
                object.id,
              ])
          );
          const payload =
            step.part === "code"
              ? { blockly: source.code!.blockly, lua: "", js: "" }
              : {
                  data: remapRestoredScene(source.data, mapping),
                  info: source.info,
                };
          const receipt = await d.write(
            {
              kind: source.kind,
              id: target.id,
              revision: target.serverRevision,
              operationId: step.operationId,
            },
            step.part,
            payload
          );
          step.receipt = receipt;
          target.serverRevision = receipt.serverRevision;
        }
      }
      step.status = "completed";
      r.index++;
      r.state = r.index === r.steps.length ? "completed" : "ready";
    } catch {
      const step = r.steps[r.index];
      if (step?.status === "submitting" || step?.status === "unknown") {
        step.status = "unknown";
        r.state = "unknown";
      } else r.state = "blocked";
    } finally {
      r.busy = false;
    }
  };
  const restoreSchema = {
    type: "object",
    properties: { restoreId: { type: "string" } },
    required: ["restoreId"],
    additionalProperties: false,
  };
  return [
    {
      name: "xrugc_export_editable_project",
      description:
        "备份已保存实体/场景的可编辑数据、Blockly 源、代码和素材版本。返回有哈希的 JSON 工程；不归档资源二进制，不包含未保存编辑内容。",
      inputSchema: {
        type: "object",
        properties: {
          kind: { enum: ["entity", "scene"] },
          includeBackup: { type: "boolean", default: false },
          download: { type: "boolean", default: false },
          id: { type: "integer", minimum: 1 },
        },
        required: ["kind", "id"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(raw) {
        const check = guard();
        const input = rec(raw);
        if (input.kind !== "entity" && input.kind !== "scene")
          throw new Error("kind 无效");
        const root = await d.read(input.kind, positive(input.id));
        check();
        const objects = [root];
        if (root.kind === "scene") {
          const scan = collectAuthoringReferences(root.data, "scene");
          if (scan.invalid || scan.truncated) throw new Error("场景结构不完整");
          const ids = [
            ...new Set([
              ...scan.references.map((r) => r.id),
              ...(root.entityIds ?? []),
            ]),
          ];
          if (ids.length > 20) throw new Error("一次最多备份 20 个实体");
          for (const id of ids) {
            const entity = await d.read("entity", id);
            check();
            objects.push(entity);
            jsonSize(objects);
          }
        }
        const resources: ResourcePin[] = [];
        const seen = new Set<string>();
        for (const object of objects)
          for (const resource of object.resources) {
            const key = `${resource.type}:${resource.id}`;
            if (seen.has(key)) continue;
            if (seen.size >= 200) throw new Error("素材数量超过 200");
            seen.add(key);
            const pin = await d.resource(resource.type, resource.id);
            check();
            resources.push(pin);
          }
        // A revision recheck prevents mixing changes observed during the read sequence.
        for (const object of objects) {
          const current = await d.read(object.kind, object.id);
          check();
          if (
            !validRevision(object.serverRevision) ||
            current.serverRevision !== object.serverRevision
          )
            throw new Error("备份期间对象改变，请重试读取");
        }
        const body: BackupBody = {
          format: "xrugc-editable-project",
          version: 1,
          root: { kind: root.kind, id: root.id },
          objects,
          resources,
          createdAt: new Date().toISOString(),
          resourceBytesArchived: false,
        };
        const hash = await hashEditableProject(body);
        check();
        if (backups.size >= 10)
          throw new Error("内存备份已满，请下载现有备份后使用新标签页");
        const backup = { body, hash };
        const backupId = crypto.randomUUID();
        backups.set(backupId, { actor: d.actor()!, backup });
        if (input.download === true) {
          if (!d.download) throw new Error("下载不可用");
          d.download(backup);
        }
        return {
          backupId,
          hash,
          objectCount: objects.length,
          resourceCount: resources.length,
          ...(input.includeBackup === true ? { backup } : {}),
          downloaded: input.download === true,
          source: "saved_api_data",
          editableSourceIncluded: true,
          dependencyVersionsIncluded: true,
          readConsistency: "object_revisions_rechecked",
          atomicSnapshot: false,
          nextStep:
            "同一标签页可用 backupId 恢复；持久保存需 download=true 或 includeBackup=true 导出 JSON。素材文件需仍然可访问且版本一致。",
        };
      },
    },
    {
      name: "xrugc_stage_project_restore",
      description:
        "验证工程哈希、源码和当前素材版本，预览恢复为全新对象。不会覆盖旧对象；生成代码不直接运行，恢复后从 Blockly 源重新生成。",
      inputSchema: {
        type: "object",
        properties: {
          backup: { type: "object" },
          backupId: { type: "string" },
          namePrefix: { type: "string", minLength: 1, maxLength: 40 },
        },
        required: ["namePrefix"],
        oneOf: [{ required: ["backup"] }, { required: ["backupId"] }],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(raw) {
        const check = guard();
        const input = rec(raw);
        if (
          typeof input.namePrefix !== "string" ||
          !input.namePrefix.trim() ||
          input.namePrefix.length > 40
        )
          throw new Error("名称前缀无效");
        if ((input.backup === undefined) === (input.backupId === undefined))
          throw new Error("必须指定 backup 或 backupId 其中之一");
        const stored =
          input.backupId === undefined
            ? undefined
            : backups.get(String(input.backupId));
        if (
          input.backupId !== undefined &&
          (!stored || stored.actor !== d.actor())
        )
          throw new Error("备份不存在或账号已改变");
        const backup = await validate(stored ? stored.backup : input.backup);
        check();
        await preflight(backup, check);
        check();
        if (restores.size >= 10) throw new Error("恢复任务过多");
        const steps: RestoreStep[] = [];
        const indices = backup.body.objects
          .map((_, i) => i)
          .sort(
            (a, b) =>
              Number(backup.body.objects[a].kind === "scene") -
              Number(backup.body.objects[b].kind === "scene")
          );
        for (const source of indices) {
          const object = backup.body.objects[source];
          steps.push({
            source,
            part: "create",
            operationId: crypto.randomUUID(),
            uuid: crypto.randomUUID(),
            status: "planned",
          });
          if (object.kind === "scene")
            steps.push({
              source,
              part: "data",
              operationId: crypto.randomUUID(),
              status: "planned",
            });
          if (object.code)
            steps.push({
              source,
              part: "code",
              operationId: crypto.randomUUID(),
              status: "planned",
            });
        }
        const restore: Restore = {
          restoreId: crypto.randomUUID(),
          actor: d.actor()!,
          context: d.context(),
          expires: Date.now() + 300000,
          backup,
          prefix: input.namePrefix,
          steps,
          index: 0,
          state: "preview",
          busy: false,
          approved: false,
          created: new Map(),
        };
        restores.set(restore.restoreId, restore);
        return state(restore);
      },
    },
    {
      name: "xrugc_advance_project_restore",
      description:
        "逐步恢复一个新对象或其数据/脚本，或查询原保存回执。unknown 新建不重发，使用 UUID 核对。",
      inputSchema: restoreSchema,
      annotations: { readOnlyHint: false },
      execute(raw) {
        const r = owned(raw);
        if (
          !r.busy &&
          !["completed", "cancelled", "expired", "blocked"].includes(r.state)
        ) {
          r.busy = true;
          r.state = "executing";
          void run(r);
        }
        return state(r);
      },
    },
    {
      name: "xrugc_get_project_restore",
      description: "读取本标签页恢复进度、新对象映射和保存回执。",
      inputSchema: restoreSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (raw) => state(owned(raw)),
    },
    {
      name: "xrugc_reconcile_project_restore",
      description:
        "新建响应丢失时，使用搜索找到的对象 ID 对照本步骤生成的 UUID；匹配才继续，不创建或覆盖对象。",
      inputSchema: {
        type: "object",
        properties: {
          restoreId: { type: "string" },
          createdId: { type: "integer", minimum: 1 },
        },
        required: ["restoreId", "createdId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(raw) {
        const r = owned(raw);
        const step = r.steps[r.index];
        if (r.busy || r.state !== "unknown" || step?.part !== "create")
          throw new Error("当前步骤不需要新建核对");
        r.busy = true;
        try {
          const source = r.backup.body.objects[step.source];
          const current = await d.read(
            source.kind,
            positive(rec(raw).createdId)
          );
          owned(raw);
          if (
            current.uuid !== step.uuid ||
            !validRevision(current.serverRevision)
          )
            throw new Error("对象 UUID 不匹配");
          r.created.set(step.source, {
            id: current.id,
            uuid: current.uuid,
            serverRevision: current.serverRevision,
          });
          step.status = "completed";
          r.index++;
          r.state = r.index === r.steps.length ? "completed" : "ready";
          return state(r);
        } finally {
          r.busy = false;
        }
      },
    },
  ];
}
