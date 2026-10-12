import { completionFailure } from "./completion-result";
import { createDraftStore, confirmDraft } from "./draft-lifecycle";
import type { MetaInfo } from "@/api/v1/types/meta";
import type { ResourceInfo } from "@/api/v1/resources/model";
import type { WebMcpTool } from "./model-context";

type JsonRecord = Record<string, unknown>;

export const ENTITY_ASSET_TYPES = [
  "polygen",
  "picture",
  "video",
  "voxel",
  "audio",
  "particle",
] as const;

export type EntityAssetType = (typeof ENTITY_ASSET_TYPES)[number];

export type AssetUsageReference = {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  path: string;
};

export type EntityAssetUsage = {
  entityId: number | null;
  entityTitle: string | null;
  resourceCount: number;
  usedResourceCount: number;
  unusedResourceCount: number;
  missingResourceCount: number;
  truncated: boolean;
  assets: Array<{
    resourceId: number | string;
    resourceType: string;
    resourceName: string;
    referenceCount: number;
    references: AssetUsageReference[];
    status: "used" | "unused";
  }>;
  missingResources: Array<{
    resourceId: number | string;
    referenceCount: number;
    references: AssetUsageReference[];
  }>;
};

export type AssetUploadStartResult = {
  opened: boolean;
  resourceType: EntityAssetType;
  url?: string;
  message?: string;
};

export type AssetRenamePreview = {
  entityId: number;
  resourceId: number;
  resourceType: EntityAssetType;
  currentName: string;
  proposedName: string;
  resourceUpdatedAt?: string;
};

export type AssetRenameCompletion = {
  resourceId: number;
  resourceType: EntityAssetType;
  resourceName: string;
  noChange?: boolean;
};

export type EntityAssetLifecycleToolOptions = {
  getEntity: () => MetaInfo | null;
  getLiveContext?: () => Promise<{
    entity: MetaInfo | null;
    source?: "live-editor" | "saved";
    dirty: boolean;
    entityVersion?: string;
    contextGeneration?: number;
  }>;
  startAssetUpload: (
    resourceType: EntityAssetType
  ) => Promise<AssetUploadStartResult>;
  stageAssetRename: (
    resourceType: EntityAssetType,
    resourceId: number,
    proposedName: string
  ) => Promise<AssetRenamePreview>;
  confirmAssetRename: (preview: AssetRenamePreview) => Promise<boolean>;
  completeAssetRename: (
    preview: AssetRenamePreview
  ) => Promise<AssetRenameCompletion>;
};

type AssetRenameDraft = {
  preview: AssetRenamePreview;
  expiresAt: number;
};

const DRAFT_TTL_MS = 5 * 60 * 1000;
const MAX_DRAFTS = 20;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asRecord = (value: unknown): JsonRecord | null =>
  isRecord(value) ? value : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const parseData = (value: unknown): JsonRecord | null => {
  if (isRecord(value)) return value;
  if (typeof value !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return asRecord(parsed);
  } catch {
    return null;
  }
};

const parseResourceType = (value: unknown): EntityAssetType => {
  if (
    typeof value !== "string" ||
    !ENTITY_ASSET_TYPES.includes(value as EntityAssetType)
  ) {
    throw new TypeError(`不支持的素材类型：${String(value ?? "空")}`);
  }
  return value as EntityAssetType;
};

const parseResourceId = (value: unknown) => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError("resourceId 必须是正整数");
  }
  return value;
};

const parseName = (value: unknown) => {
  if (typeof value !== "string") throw new TypeError("name 必须是字符串");
  const name = value.trim();
  if (!name) throw new TypeError("name 不能为空");
  if (name.length > 100) throw new RangeError("name 不能超过 100 个字符");
  if (/[\u0000-\u001f\u007f]/.test(name)) {
    throw new TypeError("name 不能包含控制字符");
  }
  return name;
};

const getRootEntities = (entity: MetaInfo | null): JsonRecord[] => {
  const data = parseData(entity?.data);
  const children = asRecord(data?.children);
  return Array.isArray(children?.entities)
    ? children.entities.filter(isRecord)
    : [];
};

const getChildren = (node: JsonRecord): JsonRecord[] => {
  const children = asRecord(node.children);
  return Array.isArray(children?.entities)
    ? children.entities.filter(isRecord)
    : [];
};

const getParameters = (node: JsonRecord) => asRecord(node.parameters) ?? {};

const getNodeName = (node: JsonRecord) =>
  asString(getParameters(node).name) ?? asString(node.name) ?? "未命名节点";

const getNodeType = (node: JsonRecord) =>
  asString(node.type) ?? asString(getParameters(node).type) ?? "unknown";

const getNodeId = (node: JsonRecord, path: string) =>
  asString(node.uuid) ??
  asString(getParameters(node).uuid) ??
  asString(node.id) ??
  (typeof node.id === "number" ? String(node.id) : path);

const getResourceId = (node: JsonRecord): number | string | null => {
  const value = getParameters(node).resource;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
};

const getResourceName = (resource: ResourceInfo) =>
  resource.name ??
  (resource as ResourceInfo & { title?: string }).title ??
  "未命名素材";

export const buildEntityAssetUsage = (
  entity: MetaInfo | null,
  options: { resourceId?: number; maxReferences?: number } = {}
): EntityAssetUsage => {
  const maxReferences = Math.min(
    500,
    Math.max(1, Math.trunc(options.maxReferences ?? 200))
  );
  const knownResources = new Map<string, ResourceInfo>();
  for (const resource of entity?.resources ?? []) {
    if (resource?.id === undefined || resource?.id === null) continue;
    knownResources.set(String(resource.id), resource);
  }

  const references = new Map<string, AssetUsageReference[]>();
  let visitedReferences = 0;
  let truncated = false;

  const visit = (node: JsonRecord, path: string) => {
    const resourceId = getResourceId(node);
    if (resourceId !== null) {
      if (visitedReferences >= maxReferences) {
        truncated = true;
      } else {
        const key = String(resourceId);
        const list = references.get(key) ?? [];
        list.push({
          nodeId: getNodeId(node, path),
          nodeName: getNodeName(node),
          nodeType: getNodeType(node),
          path,
        });
        references.set(key, list);
        visitedReferences += 1;
      }
    }
    getChildren(node).forEach((child, index) =>
      visit(child, `${path}/${index}`)
    );
  };

  getRootEntities(entity).forEach((node, index) => visit(node, String(index)));

  const filterKey = options.resourceId ? String(options.resourceId) : null;
  const assets = Array.from(knownResources.entries())
    .filter(([key]) => !filterKey || key === filterKey)
    .map(([key, resource]) => {
      const nodeReferences = references.get(key) ?? [];
      return {
        resourceId: resource.id,
        resourceType: resource.type,
        resourceName: getResourceName(resource),
        referenceCount: nodeReferences.length,
        references: nodeReferences,
        status: nodeReferences.length > 0 ? "used" : "unused",
      } as EntityAssetUsage["assets"][number];
    });

  const missingResources = Array.from(references.entries())
    .filter(
      ([key]) => !knownResources.has(key) && (!filterKey || key === filterKey)
    )
    .map(([resourceId, nodeReferences]) => ({
      resourceId,
      referenceCount: nodeReferences.length,
      references: nodeReferences,
    }));

  return {
    entityId: entity?.id ?? null,
    entityTitle: entity?.title ?? null,
    resourceCount: assets.length,
    usedResourceCount: assets.filter((asset) => asset.status === "used").length,
    unusedResourceCount: assets.filter((asset) => asset.status === "unused")
      .length,
    missingResourceCount: missingResources.length,
    truncated,
    assets,
    missingResources,
  };
};

const generateDraftId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `asset-rename-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createEntityAssetLifecycleTools = (
  options: EntityAssetLifecycleToolOptions
): WebMcpTool[] => {
  const drafts = createDraftStore<AssetRenameDraft>(MAX_DRAFTS);

  const removeExpiredDrafts = drafts.prune;

  return [
    {
      name: "xrugc_get_entity_asset_usage",
      title: "读取 XRUGC 实体素材引用",
      description:
        "清点当前实体已关联素材、节点引用位置、未使用关联和缺失素材引用。可按 resourceId 过滤；只读取当前实体，不代表素材在账号其他实体或场景中的使用情况。",
      inputSchema: {
        type: "object",
        properties: {
          resourceId: { type: "integer", minimum: 1 },
          maxReferences: {
            type: "integer",
            minimum: 1,
            maximum: 500,
            default: 200,
          },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        const resourceId =
          input.resourceId === undefined
            ? undefined
            : parseResourceId(input.resourceId);
        const maxReferences =
          input.maxReferences === undefined
            ? 200
            : parseResourceId(input.maxReferences);
        if (maxReferences > 500) {
          throw new RangeError("maxReferences 不能超过 500");
        }
        const context = await options.getLiveContext?.();
        return {
          ...buildEntityAssetUsage(
            context ? context.entity : options.getEntity(),
            { resourceId, maxReferences }
          ),
          source: context?.source ?? "saved",
          dirty: context?.dirty,
          entityVersion: context?.entityVersion,
          contextGeneration: context?.contextGeneration,
        };
      },
    },
    {
      name: "xrugc_start_asset_upload",
      title: "开始上传 XRUGC 素材",
      description:
        "打开指定素材类型的真实上传页面和上传对话框。WebMCP 不读取本地文件路径，也不会伪造上传；打开后必须由用户在系统文件选择器中选择文件并确认上传。",
      inputSchema: {
        type: "object",
        properties: {
          resourceType: { type: "string", enum: ENTITY_ASSET_TYPES },
        },
        required: ["resourceType"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input, _execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        const resourceType = parseResourceType(input.resourceType);
        const result = await options.startAssetUpload(resourceType);
        return {
          status: result.opened ? "opened" : "not_opened",
          requiresUserFileSelection: true,
          ...result,
        };
      },
    },
    {
      name: "xrugc_stage_asset_rename",
      title: "预览重命名 XRUGC 素材",
      description:
        "读取并核对一个现有素材，准备修改素材库中的全局名称。只生成五分钟有效草稿，不修改素材，也不会修改实体节点名。",
      inputSchema: {
        type: "object",
        properties: {
          resourceType: { type: "string", enum: ENTITY_ASSET_TYPES },
          resourceId: { type: "integer", minimum: 1 },
          name: { type: "string", minLength: 1, maxLength: 100 },
        },
        required: ["resourceType", "resourceId", "name"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        const preview = await options.stageAssetRename(
          parseResourceType(input.resourceType),
          parseResourceId(input.resourceId),
          parseName(input.name)
        );
        if (preview.currentName === preview.proposedName) {
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
      name: "xrugc_complete_asset_rename",
      title: "确认并重命名 XRUGC 素材",
      description:
        "提交 xrugc_stage_asset_rename 创建的草稿。用户明确确认且素材名称、类型和版本未变化后，调用平台真实素材接口修改全局名称；实体节点名称保持不变。",
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
        const draftId = asString(input.draftId);
        if (!draftId) throw new TypeError("draftId 不能为空");

        const approval = await confirmDraft(drafts, draftId, {
          confirm: options.confirmAssetRename,
          isCurrent: (preview) => options.getEntity()?.id === preview.entityId,
          changedStatus: "entity_changed",
          signal: execution?.signal,
        });
        if (!approval.ok) return approval.result;
        const { draft } = approval;

        try {
          const completion = await options.completeAssetRename(draft.preview);
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
