import { completionFailure } from "./completion-result";
import { createDraftStore, confirmDraft } from "./draft-lifecycle";
import {
  registerWebMcpTools,
  type WebMcpRegistrationOptions,
  type WebMcpTool,
} from "./model-context";
import type {
  ScriptWorkspaceSummary,
  ScriptValidationMetadata,
} from "./meta-script-tools";

type JsonRecord = Record<string, unknown>;

export type ScriptOwnerKind = "entity" | "scene";

export type ScriptBlockBatchPreview = ScriptValidationMetadata & {
  ownerKind: ScriptOwnerKind;
  ownerId: number;
  ownerTitle: string;
  workspaceVersion: string;
  current: ScriptWorkspaceSummary;
  proposed: ScriptWorkspaceSummary;
  proposedWorkspace: JsonRecord;
  changed: boolean;
  operationCount: number;
  results: JsonRecord[];
};

export type ScriptBlockBatchCompletion = {
  noChange: boolean;
  ownerKind: ScriptOwnerKind;
  ownerId: number;
  workspaceVersion: string;
  summary: ScriptWorkspaceSummary;
};

export type RegisterScriptBlockWebMcpOptions = WebMcpRegistrationOptions & {
  getContext: () => {
    ownerKind: ScriptOwnerKind;
    ownerId: number | null;
    ownerTitle: string;
    editable: boolean;
    ready: boolean;
    dirty: boolean;
    saving: boolean;
  };
  getBlockCatalog: (filters: {
    query?: string;
    category?: string;
    limit: number;
  }) => Promise<JsonRecord>;
  getBlockStructure: (filters: {
    blockId?: string;
    includeSerializedState: boolean;
    limit: number;
  }) => Promise<JsonRecord>;
  stageBlockBatch: (
    operations: JsonRecord[]
  ) => Promise<ScriptBlockBatchPreview>;
  confirmBlockBatch: (preview: ScriptBlockBatchPreview) => Promise<boolean>;
  completeBlockBatch: (
    preview: ScriptBlockBatchPreview
  ) => Promise<ScriptBlockBatchCompletion>;
};

type BlockDraft = {
  preview: ScriptBlockBatchPreview;
  expiresAt: number;
};

const MAX_OPERATIONS = 100;
const MAX_OPERATIONS_BYTES = 256 * 1024;
const DRAFT_TTL_MS = 5 * 60 * 1000;
const MAX_DRAFTS = 10;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const optionalString = (value: unknown, name: string) => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new TypeError(`${name} 必须是字符串`);
  const normalized = value.trim();
  return normalized || undefined;
};

const parseLimit = (value: unknown, fallback: number, maximum: number) => {
  if (value === undefined) return fallback;
  if (
    !Number.isInteger(value) ||
    Number(value) < 1 ||
    Number(value) > maximum
  ) {
    throw new RangeError(`limit 必须是 1 到 ${maximum} 的整数`);
  }
  return Number(value);
};

const cloneOperations = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("operations 必须是非空数组");
  }
  if (value.length > MAX_OPERATIONS) {
    throw new RangeError(`一次最多执行 ${MAX_OPERATIONS} 个积木操作`);
  }
  if (!value.every(isRecord)) {
    throw new TypeError("operations 中的每一项都必须是对象");
  }
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new TypeError("operations 必须可以序列化为 JSON");
  }
  if (new TextEncoder().encode(serialized).byteLength > MAX_OPERATIONS_BYTES) {
    throw new RangeError("operations 不能超过 256 KB");
  }
  return JSON.parse(serialized) as JsonRecord[];
};

const generateDraftId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `script-blocks-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const publicPreview = (preview: ScriptBlockBatchPreview) => ({
  ownerKind: preview.ownerKind,
  ownerId: preview.ownerId,
  ownerTitle: preview.ownerTitle,
  workspaceVersion: preview.workspaceVersion,
  current: preview.current,
  proposed: preview.proposed,
  changed: preview.changed,
  warnings: preview.warnings ?? [],
  canSave: preview.canSave,
  validationScope: preview.validationScope,
  operationCount: preview.operationCount,
  results: preview.results,
});

const operationSchema = {
  type: "object",
  properties: {
    op: {
      type: "string",
      enum: [
        "create",
        "set_fields",
        "set_state",
        "move",
        "connect",
        "disconnect",
        "delete",
      ],
    },
    blockId: { type: "string" },
    parentBlockId: { type: "string" },
    clientId: { type: "string" },
    block: { type: "object" },
    fields: { type: "object" },
    enabled: { type: "boolean" },
    collapsed: { type: "boolean" },
    data: { type: ["string", "null"] },
    x: { type: "number" },
    y: { type: "number" },
    connection: { type: "string", enum: ["next", "input"] },
    inputName: { type: "string" },
    replace: { type: "boolean" },
    healStack: { type: "boolean" },
  },
  required: ["op"],
  oneOf: [
    { properties: { op: { const: "create" } }, required: ["block"] },
    {
      properties: { op: { const: "set_fields" } },
      required: ["blockId", "fields"],
    },
    {
      properties: { op: { const: "set_state" } },
      required: ["blockId"],
      anyOf: [
        { required: ["enabled"] },
        { required: ["collapsed"] },
        { required: ["data"] },
      ],
    },
    { properties: { op: { const: "move" } }, required: ["blockId", "x", "y"] },
    {
      properties: { op: { const: "connect" } },
      required: ["blockId", "parentBlockId", "connection"],
      if: { properties: { connection: { const: "input" } } },
      then: { required: ["inputName"] },
    },
    { properties: { op: { const: "disconnect" } }, required: ["blockId"] },
    { properties: { op: { const: "delete" } }, required: ["blockId"] },
  ],
  additionalProperties: false,
};

const createTools = (
  options: RegisterScriptBlockWebMcpOptions
): WebMcpTool[] => {
  const drafts = createDraftStore<BlockDraft>(MAX_DRAFTS);

  const removeExpiredDrafts = drafts.prune;

  return [
    {
      name: "xrugc_get_script_block_catalog",
      title: "读取 XRUGC 脚本积木目录",
      description:
        "读取当前实体或场景脚本页真实可用的 Blockly 工具箱。返回分类、积木类型、字段、输入、连接类型和可用于 create 操作的序列化样例；不会修改工作区。",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          category: { type: "string" },
          limit: { type: "integer", minimum: 1, maximum: 250, default: 100 },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input, _execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        return options.getBlockCatalog({
          query: optionalString(input.query, "query"),
          category: optionalString(input.category, "category"),
          limit: parseLimit(input.limit, 100, 250),
        });
      },
    },
    {
      name: "xrugc_get_script_block_structure",
      title: "读取 XRUGC 脚本积木结构",
      description:
        "读取当前可见 Blockly 工作区中的积木 ID、字段、父子关系、输入连接、下一积木和顶层坐标。指定 blockId 时返回该积木及其后代；不会修改工作区。",
      inputSchema: {
        type: "object",
        properties: {
          blockId: { type: "string" },
          includeSerializedState: { type: "boolean", default: false },
          limit: { type: "integer", minimum: 1, maximum: 500, default: 200 },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input, _execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        return options.getBlockStructure({
          blockId: optionalString(input.blockId, "blockId"),
          includeSerializedState: input.includeSerializedState === true,
          limit: parseLimit(input.limit, 200, 500),
        });
      },
    },
    {
      name: "xrugc_stage_script_block_batch",
      title: "预览 XRUGC 脚本积木批量修改",
      description:
        "在当前工作区的临时副本中顺序执行最多 100 个 create、set_fields、set_state、move、connect、disconnect 或 delete 操作，再运行真实 Blockly 校验和 Lua/JavaScript 生成。仅创建五分钟有效预览。create 的 clientId 可供后续操作作为 blockId 引用。",
      inputSchema: {
        type: "object",
        properties: {
          operations: {
            type: "array",
            minItems: 1,
            maxItems: MAX_OPERATIONS,
            items: operationSchema,
          },
        },
        required: ["operations"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        const preview = await options.stageBlockBatch(
          cloneOperations(input.operations)
        );
        if (!preview.changed) {
          return {
            status: "no_change",
            draftId: null,
            preview: publicPreview(preview),
          };
        }

        removeExpiredDrafts();
        const draftId = generateDraftId();
        const expiresAt = Date.now() + DRAFT_TTL_MS;
        execution?.signal.throwIfAborted();
        drafts.set(draftId, { preview, expiresAt });
        return {
          status: "staged",
          draftId,
          expiresAt: new Date(expiresAt).toISOString(),
          preview: publicPreview(preview),
        };
      },
    },
    {
      name: "xrugc_complete_script_block_batch",
      title: "确认并保存 XRUGC 脚本积木批量修改",
      description:
        "提交 xrugc_stage_script_block_batch 草稿。用户确认且脚本所有者与工作区版本未变化后，以一个 Blockly 撤销组更新可见工作区，并调用所在页面原有保存链路。",
      inputSchema: {
        type: "object",
        properties: { draftId: { type: "string", minLength: 1 } },
        required: ["draftId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        if (typeof input.draftId !== "string" || !input.draftId.trim()) {
          throw new TypeError("draftId 不能为空");
        }
        const draftId = input.draftId.trim();
        const approval = await confirmDraft(drafts, draftId, {
          confirm: options.confirmBlockBatch,
          isCurrent: (preview) =>
            options.getContext().ownerKind === preview.ownerKind &&
            options.getContext().ownerId === preview.ownerId,
          changedStatus: "owner_changed",
          signal: execution?.signal,
        });
        if (!approval.ok) return approval.result;
        const { draft } = approval;

        try {
          const completion = await options.completeBlockBatch(draft.preview);
          drafts.delete(draftId);
          return { status: "completed", draftId, ...completion };
        } catch (error) {
          drafts.delete(draftId);
          return completionFailure(error, draftId);
        }
      },
    },
  ];
};

export const registerScriptBlockWebMcpTools = (
  options: RegisterScriptBlockWebMcpOptions
) =>
  registerWebMcpTools(createTools(options), {
    document: options.document,
    onRegistrationError: options.onRegistrationError,
  });
