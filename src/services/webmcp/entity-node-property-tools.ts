import { completionFailure } from "./completion-result";
import { createDraftStore, confirmDraft } from "./draft-lifecycle";
import type { WebMcpTool } from "./model-context";

type JsonRecord = Record<string, unknown>;

export type NodePropertySnapshot = {
  name: string;
  visible: boolean;
};

export type NodePropertyPatch = {
  name?: string;
  visible?: boolean;
};

export type NodePropertyPreview = {
  entityId: number;
  nodeId: string;
  nodeName: string;
  current: NodePropertySnapshot;
  proposed: NodePropertySnapshot;
  changed: boolean;
};

export type NodePropertyCompletion = {
  nodeId: string;
  nodeName: string;
  properties: NodePropertySnapshot;
  noChange: boolean;
};

export type EntityNodePropertyToolOptions = {
  getEntityId: () => number | null;
  stageNodeProperties: (
    nodeId: string,
    properties: NodePropertyPatch
  ) => Promise<NodePropertyPreview>;
  confirmNodeProperties: (preview: NodePropertyPreview) => Promise<boolean>;
  completeNodeProperties: (
    preview: NodePropertyPreview
  ) => Promise<NodePropertyCompletion>;
};

type NodePropertyDraft = {
  preview: NodePropertyPreview;
  expiresAt: number;
};

const DRAFT_TTL_MS = 5 * 60 * 1000;
const MAX_DRAFTS = 20;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseName = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new TypeError("properties.name 必须是字符串");
  }
  const name = value.trim();
  if (!name) throw new TypeError("properties.name 不能为空");
  if (name.length > 100) {
    throw new RangeError("properties.name 不能超过 100 个字符");
  }
  if (/[\u0000-\u001f\u007f]/.test(name)) {
    throw new TypeError("properties.name 不能包含控制字符");
  }
  return name;
};

const parseProperties = (value: unknown): NodePropertyPatch => {
  if (!isRecord(value)) throw new TypeError("properties 必须是对象");
  const properties: NodePropertyPatch = {};
  if (value.name !== undefined) properties.name = parseName(value.name);
  if (value.visible !== undefined) {
    if (typeof value.visible !== "boolean") {
      throw new TypeError("properties.visible 必须是布尔值");
    }
    properties.visible = value.visible;
  }
  if (properties.name === undefined && properties.visible === undefined) {
    throw new TypeError("properties 至少需要包含 name 或 visible");
  }
  return properties;
};

const generateDraftId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `node-properties-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

export const createEntityNodePropertyTools = (
  options: EntityNodePropertyToolOptions
): WebMcpTool[] => {
  const drafts = createDraftStore<NodePropertyDraft>(MAX_DRAFTS);

  const removeExpiredDrafts = drafts.prune;

  return [
    {
      name: "xrugc_stage_node_properties",
      title: "预览 XRUGC 节点属性修改",
      description:
        "准备修改节点名称或可见性，并在编辑器中选中目标节点。只生成五分钟有效的预览草稿，不改变或保存实体。",
      inputSchema: {
        type: "object",
        properties: {
          nodeId: { type: "string", minLength: 1 },
          properties: {
            type: "object",
            properties: {
              name: { type: "string", minLength: 1, maxLength: 100 },
              visible: { type: "boolean" },
            },
            minProperties: 1,
            additionalProperties: false,
          },
        },
        required: ["nodeId", "properties"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        const nodeId =
          typeof input.nodeId === "string" ? input.nodeId.trim() : "";
        if (!nodeId) throw new TypeError("nodeId 不能为空");
        const properties = parseProperties(input.properties);
        const preview = await options.stageNodeProperties(nodeId, properties);
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
      name: "xrugc_complete_node_properties",
      title: "确认并保存 XRUGC 节点属性",
      description:
        "提交 xrugc_stage_node_properties 创建的草稿。调用时会显示名称和可见性的修改前后值；只有用户明确确认、节点没有并发变化且后端保存成功后才返回 completed。",
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
        const draftId =
          typeof input.draftId === "string" ? input.draftId.trim() : "";
        if (!draftId) throw new TypeError("draftId 不能为空");

        const approval = await confirmDraft(drafts, draftId, {
          confirm: options.confirmNodeProperties,
          isCurrent: (preview) => options.getEntityId() === preview.entityId,
          changedStatus: "entity_changed",
          signal: execution?.signal,
        });
        if (!approval.ok) return approval.result;
        const { draft } = approval;

        try {
          const completion = await options.completeNodeProperties(
            draft.preview
          );
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
