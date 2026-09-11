import { completionFailure } from "./completion-result";
import { createDraftStore, confirmDraft } from "./draft-lifecycle";
import type { WebMcpTool } from "./model-context";

type JsonRecord = Record<string, unknown>;

export const ENTITY_SIGNAL_DIRECTIONS = ["input", "output"] as const;

export type EntitySignalDirection = (typeof ENTITY_SIGNAL_DIRECTIONS)[number];
export type EntitySignalOperation = "add" | "rename" | "remove";

export type SignalReference = {
  scope: "entity_script" | "scene_script";
  source: "blockly" | "lua" | "js";
  count: number;
  sceneId?: number;
  sceneName?: string;
};

export type EntitySignalSnapshot = {
  signalId: string;
  direction: EntitySignalDirection;
  title: string;
};

export type EntitySignalList = {
  entityId: number;
  inputs: Array<EntitySignalSnapshot & { references: SignalReference[] }>;
  outputs: Array<EntitySignalSnapshot & { references: SignalReference[] }>;
};

export type SignalChangeInput = {
  operation: EntitySignalOperation;
  direction: EntitySignalDirection;
  signalId?: string;
  title?: string;
};

export type SignalBatchPreviewItem = {
  operation: EntitySignalOperation;
  direction: EntitySignalDirection;
  signalId: string;
  current: EntitySignalSnapshot | null;
  proposed: EntitySignalSnapshot | null;
  signalsVersion: string;
  changed: boolean;
  references: SignalReference[];
  blockedReason?: string;
};

export type SignalBatchPreview = {
  entityId: number;
  changes: SignalBatchPreviewItem[];
  changedCount: number;
  blockedCount: number;
};

export type SignalBatchCompletion = {
  noChange: boolean;
  commandCount: number;
  changes: Array<{
    operation: EntitySignalOperation;
    direction: EntitySignalDirection;
    signalId: string;
    title: string;
  }>;
};

export type EntitySignalToolOptions = {
  getEntityId: () => number | null;
  getEntitySignals: () => Promise<EntitySignalList>;
  stageSignalBatch: (
    changes: SignalChangeInput[]
  ) => Promise<SignalBatchPreview>;
  confirmSignalBatch: (preview: SignalBatchPreview) => Promise<boolean>;
  completeSignalBatch: (
    preview: SignalBatchPreview
  ) => Promise<SignalBatchCompletion>;
};

type SignalBatchDraft = {
  preview: SignalBatchPreview;
  expiresAt: number;
};

const MAX_CHANGES = 20;
const DRAFT_TTL_MS = 5 * 60 * 1000;
const MAX_DRAFTS = 20;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseId = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${label} 不能为空`);
  }
  return value.trim();
};

const parseTitle = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${label} 不能为空`);
  }
  const title = value.trim();
  if (title.length > 100) throw new RangeError(`${label} 不能超过 100 个字符`);
  if (/[\u0000-\u001f\u007f]/.test(title)) {
    throw new TypeError(`${label} 不能包含控制字符`);
  }
  return title;
};

const parseDirection = (value: unknown, label: string) => {
  if (
    typeof value !== "string" ||
    !ENTITY_SIGNAL_DIRECTIONS.includes(value as EntitySignalDirection)
  ) {
    throw new TypeError(`${label} 必须是 input 或 output`);
  }
  return value as EntitySignalDirection;
};

const parseChanges = (value: unknown): SignalChangeInput[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("changes 必须是非空数组");
  }
  if (value.length > MAX_CHANGES) {
    throw new RangeError(`changes 不能超过 ${MAX_CHANGES} 项`);
  }

  const targets = new Set<string>();
  return value.map((item, index) => {
    if (!isRecord(item)) throw new TypeError(`changes[${index}] 必须是对象`);
    const operation = item.operation;
    if (
      operation !== "add" &&
      operation !== "rename" &&
      operation !== "remove"
    ) {
      throw new TypeError(`changes[${index}].operation 无效`);
    }
    const direction = parseDirection(
      item.direction,
      `changes[${index}].direction`
    );
    const signalId =
      operation === "add"
        ? undefined
        : parseId(item.signalId, `changes[${index}].signalId`);
    const title =
      operation === "remove"
        ? undefined
        : parseTitle(item.title, `changes[${index}].title`);
    if (signalId) {
      const target = `${direction}:${signalId}`;
      if (targets.has(target)) {
        throw new TypeError(`changes 中的信号目标 ${target} 重复`);
      }
      targets.add(target);
    }
    return { operation, direction, signalId, title };
  });
};

const generateDraftId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `signal-batch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createEntitySignalTools = (
  options: EntitySignalToolOptions
): WebMcpTool[] => {
  const drafts = createDraftStore<SignalBatchDraft>(MAX_DRAFTS);

  const removeExpiredDrafts = drafts.prune;

  return [
    {
      name: "xrugc_get_entity_signals",
      title: "读取 XRUGC 实体信号",
      description:
        "读取当前实体的输入信号、输出信号、UUID，以及实体脚本和引用场景脚本中的实际引用位置。不会修改或保存实体。",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () => options.getEntitySignals(),
    },
    {
      name: "xrugc_stage_signal_batch",
      title: "预览 XRUGC 信号批量修改",
      description:
        "准备一次添加、重命名或移除 1 到 20 个实体输入/输出信号。移除前会检查实体 Blockly/Lua/JavaScript 以及所有引用场景脚本；存在引用时阻止提交。只生成五分钟有效预览。",
      inputSchema: {
        type: "object",
        properties: {
          changes: {
            type: "array",
            minItems: 1,
            maxItems: MAX_CHANGES,
            items: {
              oneOf: [
                {
                  type: "object",
                  properties: {
                    operation: { const: "add" },
                    direction: {
                      type: "string",
                      enum: ENTITY_SIGNAL_DIRECTIONS,
                    },
                    title: { type: "string", minLength: 1, maxLength: 100 },
                  },
                  required: ["operation", "direction", "title"],
                  additionalProperties: false,
                },
                {
                  type: "object",
                  properties: {
                    operation: { const: "rename" },
                    direction: {
                      type: "string",
                      enum: ENTITY_SIGNAL_DIRECTIONS,
                    },
                    signalId: { type: "string", minLength: 1 },
                    title: { type: "string", minLength: 1, maxLength: 100 },
                  },
                  required: ["operation", "direction", "signalId", "title"],
                  additionalProperties: false,
                },
                {
                  type: "object",
                  properties: {
                    operation: { const: "remove" },
                    direction: {
                      type: "string",
                      enum: ENTITY_SIGNAL_DIRECTIONS,
                    },
                    signalId: { type: "string", minLength: 1 },
                  },
                  required: ["operation", "direction", "signalId"],
                  additionalProperties: false,
                },
              ],
            },
          },
        },
        required: ["changes"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        const preview = await options.stageSignalBatch(
          parseChanges(input.changes)
        );
        if (preview.blockedCount > 0) {
          return {
            status: "blocked_by_references",
            draftId: null,
            preview,
            message: "至少一个待移除信号仍被脚本引用，请先修改对应脚本",
          };
        }
        if (preview.changedCount === 0) {
          return { status: "no_change", draftId: null, preview };
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
          preview,
        };
      },
    },
    {
      name: "xrugc_complete_signal_batch",
      title: "确认并保存 XRUGC 信号批量修改",
      description:
        "提交 xrugc_stage_signal_batch 创建的草稿。用户确认、信号版本未变化且删除目标仍无脚本引用后，把全部修改作为一个可撤销历史操作执行，并只保存一次。",
      inputSchema: {
        type: "object",
        properties: { draftId: { type: "string", minLength: 1 } },
        required: ["draftId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        const draftId = parseId(input.draftId, "draftId");
        const approval = await confirmDraft(drafts, draftId, {
          confirm: options.confirmSignalBatch,
          isCurrent: (preview) => options.getEntityId() === preview.entityId,
          changedStatus: "entity_changed",
          signal: execution?.signal,
        });
        if (!approval.ok) return approval.result;
        const { draft } = approval;

        try {
          const completion = await options.completeSignalBatch(draft.preview);
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
