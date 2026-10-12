import { completionFailure } from "./completion-result";
import { createDraftStore, confirmDraft } from "./draft-lifecycle";
import type { WebMcpTool } from "./model-context";

type JsonRecord = Record<string, unknown>;

export type NodeOrderSnapshot = {
  parentNodeId: string | null;
  parentName: string;
  currentIndex: number;
  siblingCount: number;
  siblingOrderVersion: string;
};

export type NodeOrderTarget = {
  beforeNodeId: string | null;
  beforeNodeName: string | null;
  targetIndex: number;
};

export type NodeOrderPreview = {
  entityId: number;
  nodeId: string;
  nodeName: string;
  current: NodeOrderSnapshot;
  proposed: NodeOrderTarget;
  changed: boolean;
};

export type NodeOrderCompletion = {
  nodeId: string;
  nodeName: string;
  order: NodeOrderSnapshot;
  noChange: boolean;
};

export type EntityNodeOrderToolOptions = {
  getEntityId: () => number | null;
  stageNodeReorder: (
    nodeId: string,
    beforeNodeId: string | null
  ) => Promise<NodeOrderPreview>;
  confirmNodeReorder: (preview: NodeOrderPreview) => Promise<boolean>;
  completeNodeReorder: (
    preview: NodeOrderPreview
  ) => Promise<NodeOrderCompletion>;
};

type NodeOrderDraft = {
  preview: NodeOrderPreview;
  expiresAt: number;
};

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

const parseBeforeNodeId = (value: unknown) => {
  if (value === null) return null;
  return parseId(value, "beforeNodeId");
};

const generateDraftId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `node-order-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createEntityNodeOrderTools = (
  options: EntityNodeOrderToolOptions
): WebMcpTool[] => {
  const drafts = createDraftStore<NodeOrderDraft>(MAX_DRAFTS);

  const removeExpiredDrafts = drafts.prune;

  return [
    {
      name: "xrugc_stage_node_reorder",
      title: "预览 XRUGC 同级节点排序",
      description:
        "准备把一个节点移动到同一父级的 beforeNodeId 节点之前；beforeNodeId 传 null 表示移到同级末尾。只选中节点并生成五分钟有效的顺序预览，不修改或保存实体。不会改变父级。",
      inputSchema: {
        type: "object",
        properties: {
          nodeId: { type: "string", minLength: 1 },
          beforeNodeId: {
            anyOf: [{ type: "string", minLength: 1 }, { type: "null" }],
          },
        },
        required: ["nodeId", "beforeNodeId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        const nodeId = parseId(input.nodeId, "nodeId");
        const beforeNodeId = parseBeforeNodeId(input.beforeNodeId);
        const preview = await options.stageNodeReorder(nodeId, beforeNodeId);
        if (!preview.changed) {
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
      name: "xrugc_complete_node_reorder",
      title: "确认并保存 XRUGC 同级顺序",
      description:
        "提交 xrugc_stage_node_reorder 创建的草稿。只有用户明确确认、实体未切换且同级节点列表未发生并发变化时，才使用编辑器真实移动命令调整顺序并保存。",
      inputSchema: {
        type: "object",
        properties: {
          draftId: { type: "string", minLength: 1 },
        },
        required: ["draftId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        const draftId = parseId(input.draftId, "draftId");

        const approval = await confirmDraft(drafts, draftId, {
          confirm: options.confirmNodeReorder,
          isCurrent: (preview) => options.getEntityId() === preview.entityId,
          changedStatus: "entity_changed",
          signal: execution?.signal,
        });
        if (!approval.ok) return approval.result;
        const { draft } = approval;

        try {
          const completion = await options.completeNodeReorder(draft.preview);
          drafts.delete(draftId);
          return {
            status: "completed",
            draftId,
            entityId: draft.preview.entityId,
            ...completion,
          };
        } catch (error) {
          drafts.delete(draftId);
          return completionFailure(error, draftId);
        }
      },
    },
  ];
};
