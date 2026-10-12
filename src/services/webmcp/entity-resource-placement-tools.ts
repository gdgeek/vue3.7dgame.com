import { completionFailure } from "./completion-result";
import { createDraftStore, confirmDraft } from "./draft-lifecycle";
import type { WebMcpTool } from "./model-context";

type JsonRecord = Record<string, unknown>;

export type ResourcePlacementPreview = {
  operationId?: string;
  entityVersion?: string;
  entityId: number;
  resourceId: number;
  resourceType: string;
  resourceName: string;
  resourceUpdatedAt?: string;
};

export type ResourcePlacementCompletion = {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  resourceId: number;
};

export type EntityResourcePlacementToolOptions = {
  getEntityId: () => number | null;
  stageResourcePlacement: (
    resourceType: string,
    resourceId: number
  ) => Promise<ResourcePlacementPreview>;
  confirmResourcePlacement: (
    preview: ResourcePlacementPreview
  ) => Promise<boolean>;
  completeResourcePlacement: (
    preview: ResourcePlacementPreview
  ) => Promise<ResourcePlacementCompletion>;
};

type ResourcePlacementDraft = {
  preview: ResourcePlacementPreview;
  expiresAt: number;
};

const RESOURCE_TYPES = [
  "polygen",
  "picture",
  "video",
  "voxel",
  "audio",
  "particle",
] as const;
const DRAFT_TTL_MS = 5 * 60 * 1000;
const MAX_DRAFTS = 20;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseResourceType = (value: unknown) => {
  if (
    typeof value !== "string" ||
    !RESOURCE_TYPES.includes(value as (typeof RESOURCE_TYPES)[number])
  ) {
    throw new TypeError(`不支持的素材类型：${String(value ?? "空")}`);
  }
  return value;
};

const parseResourceId = (value: unknown) => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError("resourceId 必须是正整数");
  }
  return value;
};

const generateDraftId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `resource-placement-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

export const createEntityResourcePlacementTools = (
  options: EntityResourcePlacementToolOptions
): WebMcpTool[] => {
  const drafts = createDraftStore<ResourcePlacementDraft>(MAX_DRAFTS);

  const removeExpiredDrafts = drafts.prune;

  return [
    {
      name: "xrugc_stage_resource_placement",
      title: "预览放入 XRUGC 素材",
      description:
        "按素材类型和素材 ID 准备把一个现有素材放入当前实体根层级。会从 XRUGC 接口核对素材，只生成五分钟有效的草稿，不创建或保存节点。",
      inputSchema: {
        type: "object",
        properties: {
          resourceType: { type: "string", enum: RESOURCE_TYPES },
          resourceId: { type: "integer", minimum: 1 },
        },
        required: ["resourceType", "resourceId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        const resourceType = parseResourceType(input.resourceType);
        const resourceId = parseResourceId(input.resourceId);
        const preview = await options.stageResourcePlacement(
          resourceType,
          resourceId
        );

        removeExpiredDrafts();
        const draftId = generateDraftId();
        const expiresAt = Date.now() + DRAFT_TTL_MS;
        execution?.signal.throwIfAborted();
        preview.operationId = draftId;
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
      name: "xrugc_complete_resource_placement",
      title: "确认并放入 XRUGC 素材",
      description:
        "提交 xrugc_stage_resource_placement 创建的草稿。用户明确确认且素材仍存在、版本未变化后，使用编辑器真实加载流程创建根节点并保存实体。",
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
          confirm: options.confirmResourcePlacement,
          isCurrent: (preview) => options.getEntityId() === preview.entityId,
          changedStatus: "entity_changed",
          signal: execution?.signal,
        });
        if (!approval.ok) return approval.result;
        const { draft } = approval;

        try {
          const completion = await options.completeResourcePlacement(
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
