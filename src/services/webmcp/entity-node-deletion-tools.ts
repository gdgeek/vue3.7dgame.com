import { completionFailure } from "./completion-result";
import { createDraftStore, confirmDraft } from "./draft-lifecycle";
import type { WebMcpTool } from "./model-context";
import type { NodeParentSnapshot } from "./entity-hierarchy-tools";

type JsonRecord = Record<string, unknown>;

export type NodeDeletionPreview = {
  entityId: number;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  parent: NodeParentSnapshot;
  subtreeVersion: string;
  directChildCount: number;
  descendantCount: number;
  descendantNames: string[];
};

export type NodeDeletionCompletion = {
  nodeId: string;
  nodeName: string;
  removedNodeCount: number;
  parent: NodeParentSnapshot;
};

export type EntityNodeDeletionToolOptions = {
  getEntityId: () => number | null;
  stageNodeDeletion: (nodeId: string) => Promise<NodeDeletionPreview>;
  confirmNodeDeletion: (preview: NodeDeletionPreview) => Promise<boolean>;
  completeNodeDeletion: (
    preview: NodeDeletionPreview
  ) => Promise<NodeDeletionCompletion>;
};

type NodeDeletionDraft = {
  preview: NodeDeletionPreview;
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

const generateDraftId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `node-deletion-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

export const createEntityNodeDeletionTools = (
  options: EntityNodeDeletionToolOptions
): WebMcpTool[] => {
  const drafts = createDraftStore<NodeDeletionDraft>(MAX_DRAFTS);

  const removeExpiredDrafts = drafts.prune;

  return [
    {
      name: "xrugc_stage_node_deletion",
      title: "预览删除 XRUGC 节点",
      description:
        "准备删除当前实体中的一个节点及其全部子节点。只选中目标并生成五分钟有效的影响预览，不删除或保存任何内容。必须先读取实体层级并使用准确 nodeId。",
      inputSchema: {
        type: "object",
        properties: {
          nodeId: { type: "string", minLength: 1 },
        },
        required: ["nodeId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        const nodeId = parseId(input.nodeId, "nodeId");
        const preview = await options.stageNodeDeletion(nodeId);

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
      name: "xrugc_complete_node_deletion",
      title: "确认并删除 XRUGC 节点",
      description:
        "提交 xrugc_stage_node_deletion 创建的草稿。这是破坏性操作；只有用户明确确认、实体未切换且节点父级和整个实体子树均未发生变化时，才使用编辑器真实删除命令移除节点并保存实体。",
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
          confirm: options.confirmNodeDeletion,
          isCurrent: (preview) => options.getEntityId() === preview.entityId,
          changedStatus: "entity_changed",
          signal: execution?.signal,
        });
        if (!approval.ok) return approval.result;
        const { draft } = approval;

        try {
          const completion = await options.completeNodeDeletion(draft.preview);
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
