import { completionFailure } from "./completion-result";
import { createDraftStore, confirmDraft } from "./draft-lifecycle";
import type { WebMcpTool } from "./model-context";
import type { NodeParentSnapshot } from "./entity-hierarchy-tools";

type JsonRecord = Record<string, unknown>;

export type NodeClonePreview = {
  entityId: number;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  parent: NodeParentSnapshot;
  sourceVersion: string;
  siblingOrderVersion: string;
  directChildCount: number;
  descendantCount: number;
  proposedName: string;
};

export type NodeCloneCompletion = {
  sourceNodeId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  clonedNodeCount: number;
  parent: NodeParentSnapshot;
};

export type EntityNodeCloneToolOptions = {
  getEntityId: () => number | null;
  stageNodeClone: (nodeId: string, name?: string) => Promise<NodeClonePreview>;
  confirmNodeClone: (preview: NodeClonePreview) => Promise<boolean>;
  completeNodeClone: (
    preview: NodeClonePreview
  ) => Promise<NodeCloneCompletion>;
};

type NodeCloneDraft = {
  preview: NodeClonePreview;
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

const parseOptionalName = (value: unknown) => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new TypeError("name 必须是字符串");
  const name = value.trim();
  if (!name) throw new TypeError("name 不能为空");
  if (name.length > 100) throw new RangeError("name 不能超过 100 个字符");
  if (/[\u0000-\u001f\u007f]/.test(name)) {
    throw new TypeError("name 不能包含控制字符");
  }
  return name;
};

const generateDraftId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `node-clone-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createEntityNodeCloneTools = (
  options: EntityNodeCloneToolOptions
): WebMcpTool[] => {
  const drafts = createDraftStore<NodeCloneDraft>(MAX_DRAFTS);

  const removeExpiredDrafts = drafts.prune;

  return [
    {
      name: "xrugc_stage_node_clone",
      title: "预览复制 XRUGC 节点",
      description:
        "准备复制一个节点及其全部子节点，并把复制件插入原节点之后。可提供不超过 100 字的同级唯一名称；省略时自动生成副本名称。只选中源节点并生成五分钟有效的预览，不创建或保存复制件。",
      inputSchema: {
        type: "object",
        properties: {
          nodeId: { type: "string", minLength: 1 },
          name: { type: "string", minLength: 1, maxLength: 100 },
        },
        required: ["nodeId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        const nodeId = parseId(input.nodeId, "nodeId");
        const name = parseOptionalName(input.name);
        const preview = await options.stageNodeClone(nodeId, name);

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
      name: "xrugc_complete_node_clone",
      title: "确认并复制 XRUGC 节点",
      description:
        "提交 xrugc_stage_node_clone 创建的草稿。只有用户明确确认、实体未切换且源子树与同级顺序未发生变化时，才使用平台原生克隆流程创建全新节点 UUID，并保存实体。",
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
          confirm: options.confirmNodeClone,
          isCurrent: (preview) => options.getEntityId() === preview.entityId,
          changedStatus: "entity_changed",
          signal: execution?.signal,
        });
        if (!approval.ok) return approval.result;
        const { draft } = approval;

        try {
          const completion = await options.completeNodeClone(draft.preview);
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
