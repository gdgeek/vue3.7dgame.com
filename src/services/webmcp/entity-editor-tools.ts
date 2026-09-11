import type { MetaInfo } from "@/api/v1/types/meta";
import type { ResourceInfo } from "@/api/v1/resources/model";
import {
  registerWebMcpTools,
  type WebMcpRegistrationOptions,
  type WebMcpTool,
} from "./model-context";
import {
  createEntityTransformTools,
  type NodeTransformCompletion,
  type NodeTransformPatch,
  type NodeTransformPreview,
} from "./entity-transform-tools";
import {
  createEntityNodePropertyTools,
  type NodePropertyCompletion,
  type NodePropertyPatch,
  type NodePropertyPreview,
} from "./entity-node-property-tools";
import {
  createEntityResourcePlacementTools,
  type ResourcePlacementCompletion,
  type ResourcePlacementPreview,
} from "./entity-resource-placement-tools";
import {
  createEntityHierarchyTools,
  type NodeReparentCompletion,
  type NodeReparentPreview,
} from "./entity-hierarchy-tools";
import {
  createEntityNodeDeletionTools,
  type NodeDeletionCompletion,
  type NodeDeletionPreview,
} from "./entity-node-deletion-tools";
import {
  createEntityNodeOrderTools,
  type NodeOrderCompletion,
  type NodeOrderPreview,
} from "./entity-node-order-tools";
import {
  createEntityNodeCloneTools,
  type NodeCloneCompletion,
  type NodeClonePreview,
} from "./entity-node-clone-tools";
import {
  createEntityNodeBatchTools,
  type NodeBatchChangeInput,
  type NodeBatchCompletion,
  type NodeBatchPreview,
} from "./entity-node-batch-tools";
import {
  createEntityAssetLifecycleTools,
  type AssetRenameCompletion,
  type AssetRenamePreview,
  type AssetUploadStartResult,
  type EntityAssetType,
} from "./entity-asset-lifecycle-tools";
import {
  createEntityComponentTools,
  type ComponentBatchCompletion,
  type ComponentBatchPreview,
  type ComponentChangeInput,
  type NodeComponentList,
} from "./entity-component-tools";
import {
  createEntitySignalTools,
  type EntitySignalList,
  type SignalBatchCompletion,
  type SignalBatchPreview,
  type SignalChangeInput,
} from "./entity-signal-tools";

type JsonRecord = Record<string, unknown>;

export type EntityEditorContext = {
  source?: "live-editor" | "saved";
  entityVersion?: string;
  contextGeneration?: number;
  entity: MetaInfo | null;
  dirty: boolean;
  loading: boolean;
  sceneNames: string[];
};

export type AssetSearchInput = {
  type: string;
  query: string;
  page: number;
  pageSize: number;
};

export type AssetSearchResult = {
  items: ResourceInfo[];
  page: number;
  pageSize: number;
  total?: number;
};

export type RegisterEntityEditorWebMcpOptions = WebMcpRegistrationOptions & {
  getContext: () => EntityEditorContext;
  getLiveContext?: () => Promise<EntityEditorContext>;
  searchAssets: (input: AssetSearchInput) => Promise<AssetSearchResult>;
  stageNodeTransform: (
    nodeId: string,
    transform: NodeTransformPatch
  ) => Promise<NodeTransformPreview>;
  confirmNodeTransform: (preview: NodeTransformPreview) => Promise<boolean>;
  completeNodeTransform: (
    preview: NodeTransformPreview
  ) => Promise<NodeTransformCompletion>;
  stageNodeProperties: (
    nodeId: string,
    properties: NodePropertyPatch
  ) => Promise<NodePropertyPreview>;
  confirmNodeProperties: (preview: NodePropertyPreview) => Promise<boolean>;
  completeNodeProperties: (
    preview: NodePropertyPreview
  ) => Promise<NodePropertyCompletion>;
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
  stageNodeReparent: (
    nodeId: string,
    parentNodeId: string | null
  ) => Promise<NodeReparentPreview>;
  confirmNodeReparent: (preview: NodeReparentPreview) => Promise<boolean>;
  completeNodeReparent: (
    preview: NodeReparentPreview
  ) => Promise<NodeReparentCompletion>;
  stageNodeDeletion: (nodeId: string) => Promise<NodeDeletionPreview>;
  confirmNodeDeletion: (preview: NodeDeletionPreview) => Promise<boolean>;
  completeNodeDeletion: (
    preview: NodeDeletionPreview
  ) => Promise<NodeDeletionCompletion>;
  stageNodeReorder: (
    nodeId: string,
    beforeNodeId: string | null
  ) => Promise<NodeOrderPreview>;
  confirmNodeReorder: (preview: NodeOrderPreview) => Promise<boolean>;
  completeNodeReorder: (
    preview: NodeOrderPreview
  ) => Promise<NodeOrderCompletion>;
  stageNodeClone: (nodeId: string, name?: string) => Promise<NodeClonePreview>;
  confirmNodeClone: (preview: NodeClonePreview) => Promise<boolean>;
  completeNodeClone: (
    preview: NodeClonePreview
  ) => Promise<NodeCloneCompletion>;
  stageNodeBatch: (
    changes: NodeBatchChangeInput[]
  ) => Promise<NodeBatchPreview>;
  confirmNodeBatch: (preview: NodeBatchPreview) => Promise<boolean>;
  completeNodeBatch: (
    preview: NodeBatchPreview
  ) => Promise<NodeBatchCompletion>;
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
  getNodeComponents: (nodeId: string) => Promise<NodeComponentList>;
  stageComponentBatch: (
    changes: ComponentChangeInput[]
  ) => Promise<ComponentBatchPreview>;
  confirmComponentBatch: (preview: ComponentBatchPreview) => Promise<boolean>;
  completeComponentBatch: (
    preview: ComponentBatchPreview
  ) => Promise<ComponentBatchCompletion>;
  getEntitySignals: () => Promise<EntitySignalList>;
  stageSignalBatch: (
    changes: SignalChangeInput[]
  ) => Promise<SignalBatchPreview>;
  confirmSignalBatch: (preview: SignalBatchPreview) => Promise<boolean>;
  completeSignalBatch: (
    preview: SignalBatchPreview
  ) => Promise<SignalBatchCompletion>;
};

const RESOURCE_TYPES = [
  "polygen",
  "picture",
  "video",
  "voxel",
  "audio",
  "particle",
] as const;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asRecord = (value: unknown): JsonRecord | null =>
  isRecord(value) ? value : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const asFiniteNumber = (value: unknown): number | null => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

const clampInteger = (
  value: unknown,
  fallback: number,
  min: number,
  max: number
) => {
  const number = asFiniteNumber(value);
  if (number === null) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(number)));
};

const requireRecordInput = (input: unknown): JsonRecord => {
  if (!isRecord(input)) {
    throw new TypeError("工具参数必须是一个对象");
  }
  return input;
};

const getRootEntities = (entity: MetaInfo | null): JsonRecord[] => {
  const data = asRecord(entity?.data);
  const children = asRecord(data?.children);
  const entities = children?.entities;
  return Array.isArray(entities) ? entities.filter(isRecord) : [];
};

const getChildEntities = (node: JsonRecord): JsonRecord[] => {
  const children = asRecord(node.children);
  const entities = children?.entities;
  return Array.isArray(entities) ? entities.filter(isRecord) : [];
};

const getParameters = (node: JsonRecord): JsonRecord =>
  asRecord(node.parameters) ?? {};

const getNodeName = (node: JsonRecord) =>
  asString(getParameters(node).name) ?? asString(node.name) ?? "未命名节点";

const getNodeIdentifier = (node: JsonRecord, path: string) => {
  const parameters = getParameters(node);
  return (
    asString(node.uuid) ??
    asString(parameters.uuid) ??
    asString(node.id) ??
    (asFiniteNumber(node.id) !== null ? String(node.id) : path)
  );
};

const getNodeType = (node: JsonRecord) => {
  const parameters = getParameters(node);
  return (
    asString(node.type) ??
    asString(parameters.type) ??
    asString(parameters.resourceType) ??
    "unknown"
  );
};

const getResourceId = (node: JsonRecord): string | number | null => {
  const value = getParameters(node).resource;
  if (typeof value === "string" || typeof value === "number") return value;
  return null;
};

const isSensitiveOutputKey = (key: string) =>
  /token|authorization|password|secret|cookie|signed.?url|file|url/i.test(key);

const compactValue = (
  value: unknown,
  depth = 0
): string | number | boolean | null | unknown[] | JsonRecord => {
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "string") {
    return value.length > 300 ? `${value.slice(0, 300)}…` : value;
  }
  if (depth >= 3) return "[已省略深层数据]";
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => compactValue(item, depth + 1));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !isSensitiveOutputKey(key))
        .slice(0, 30)
        .map(([key, item]) => [key, compactValue(item, depth + 1)])
    );
  }
  return String(value);
};

export const buildEntityTree = (
  entity: MetaInfo | null,
  options: { maxDepth?: number; maxNodes?: number } = {}
) => {
  const maxDepth = clampInteger(options.maxDepth, 8, 1, 20);
  const maxNodes = clampInteger(options.maxNodes, 200, 1, 500);
  let visited = 0;
  let truncated = false;

  const visit = (node: JsonRecord, path: string, depth: number): JsonRecord => {
    visited += 1;
    const children = getChildEntities(node);
    const summary: JsonRecord = {
      id: getNodeIdentifier(node, path),
      path,
      name: getNodeName(node),
      type: getNodeType(node),
      resourceId: getResourceId(node),
      childCount: children.length,
    };

    if (depth >= maxDepth || visited >= maxNodes) {
      if (children.length > 0) truncated = true;
      return summary;
    }

    const summarizedChildren: JsonRecord[] = [];
    for (let index = 0; index < children.length; index += 1) {
      if (visited >= maxNodes) {
        truncated = true;
        break;
      }
      summarizedChildren.push(
        visit(children[index], `${path}/${index}`, depth + 1)
      );
    }
    summary.children = summarizedChildren;
    return summary;
  };

  const roots = getRootEntities(entity);
  const tree: JsonRecord[] = [];
  for (let index = 0; index < roots.length; index += 1) {
    if (visited >= maxNodes) {
      truncated = true;
      break;
    }
    tree.push(visit(roots[index], String(index), 1));
  }

  return {
    entityId: entity?.id ?? null,
    entityTitle: entity?.title ?? null,
    nodeCount: visited,
    truncated,
    tree,
  };
};

type NodeMatch = { node: JsonRecord; path: string };

const findNode = (
  entity: MetaInfo | null,
  selector: { nodeId?: string; path?: string; name?: string }
): NodeMatch | null => {
  const roots = getRootEntities(entity);
  const targetId = selector.nodeId?.trim();
  const targetPath = selector.path?.trim();
  const targetName = selector.name?.trim();

  const visit = (node: JsonRecord, path: string): NodeMatch | null => {
    if (
      (targetPath && path === targetPath) ||
      (targetId && getNodeIdentifier(node, path) === targetId) ||
      (targetName && getNodeName(node) === targetName)
    ) {
      return { node, path };
    }
    const children = getChildEntities(node);
    for (let index = 0; index < children.length; index += 1) {
      const result = visit(children[index], `${path}/${index}`);
      if (result) return result;
    }
    return null;
  };

  for (let index = 0; index < roots.length; index += 1) {
    const result = visit(roots[index], String(index));
    if (result) return result;
  }
  return null;
};

export const inspectEntityNode = (
  entity: MetaInfo | null,
  selector: { nodeId?: string; path?: string; name?: string }
) => {
  const match = findNode(entity, selector);
  if (!match) {
    return { found: false, selector };
  }
  const parameters = getParameters(match.node);
  return {
    found: true,
    id: getNodeIdentifier(match.node, match.path),
    path: match.path,
    name: getNodeName(match.node),
    type: getNodeType(match.node),
    resourceId: getResourceId(match.node),
    childCount: getChildEntities(match.node).length,
    parameters: compactValue(parameters),
  };
};

export const validateEntity = (entity: MetaInfo | null) => {
  if (!entity) {
    return {
      valid: false,
      errors: ["实体数据尚未加载"],
      warnings: [],
      nodeCount: 0,
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const namePaths = new Map<string, string[]>();
  const knownResources = new Set(
    (entity.resources ?? []).map((resource) => String(resource.id))
  );
  let nodeCount = 0;

  const visit = (node: JsonRecord, path: string) => {
    nodeCount += 1;
    const name = getNodeName(node);
    if (name === "未命名节点") warnings.push(`节点 ${path} 没有名称`);
    const paths = namePaths.get(name) ?? [];
    paths.push(path);
    namePaths.set(name, paths);

    const resourceId = getResourceId(node);
    if (resourceId !== null && !knownResources.has(String(resourceId))) {
      errors.push(`节点 ${path} 引用了不存在的资源 ${resourceId}`);
    }

    getChildEntities(node).forEach((child, index) =>
      visit(child, `${path}/${index}`)
    );
  };

  getRootEntities(entity).forEach((node, index) => visit(node, String(index)));
  for (const [name, paths] of namePaths) {
    if (paths.length > 1) {
      warnings.push(`名称“${name}”重复，位置：${paths.join("、")}`);
    }
  }

  if (nodeCount === 0) warnings.push("实体中还没有节点");

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    nodeCount,
    resourceCount: knownResources.size,
  };
};

const summarizeAsset = (resource: ResourceInfo) => ({
  id: resource.id,
  type: resource.type,
  name:
    resource.name ??
    (resource as ResourceInfo & { title?: string }).title ??
    "未命名素材",
  createdAt: resource.created_at,
  hasPreview: Boolean(resource.image),
});

const readEntityContext = async <T extends object>(
  options: RegisterEntityEditorWebMcpOptions,
  read: (entity: MetaInfo | null) => T
) => {
  const context = await (options.getLiveContext?.() ?? options.getContext());
  return {
    ...read(context.entity),
    source: context.source ?? "saved",
    dirty: context.dirty,
    entityVersion: context.entityVersion,
    contextGeneration: context.contextGeneration,
  };
};

const createTools = (
  options: RegisterEntityEditorWebMcpOptions
): WebMcpTool[] => [
  {
    name: "xrugc_get_editor_context",
    title: "读取 XRUGC 实体编辑器状态",
    description:
      "读取当前 XRUGC 实体编辑器中的实体标识、名称、权限、加载状态、未保存状态和使用场景。不会修改任何数据。",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async () => {
      const context = await (options.getLiveContext?.() ??
        options.getContext());
      const entity = context.entity;
      return {
        editor: "entity",
        source: context.source ?? "saved",
        entityVersion: context.entityVersion,
        contextGeneration: context.contextGeneration,
        loading: context.loading,
        dirty: context.dirty,
        entity: entity
          ? {
              id: entity.id,
              uuid: entity.uuid,
              title: entity.title,
              editable: entity.editable,
              viewable: entity.viewable,
              resourceCount: entity.resources?.length ?? 0,
            }
          : null,
        usedInScenes: context.sceneNames,
      };
    },
  },
  {
    name: "xrugc_get_entity_tree",
    title: "读取 XRUGC 实体层级",
    description:
      "读取当前实体的节点层级摘要，包括节点路径、名称、类型、资源标识和子节点数量。用 maxDepth 或 maxNodes 限制结果大小。不会修改实体。",
    inputSchema: {
      type: "object",
      properties: {
        maxDepth: { type: "integer", minimum: 1, maximum: 20, default: 8 },
        maxNodes: { type: "integer", minimum: 1, maximum: 500, default: 200 },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async (input) => {
      const params = requireRecordInput(input);
      return readEntityContext(options, (entity) =>
        buildEntityTree(entity, {
          maxDepth: clampInteger(params.maxDepth, 8, 1, 20),
          maxNodes: clampInteger(params.maxNodes, 200, 1, 500),
        })
      );
    },
  },
  {
    name: "xrugc_inspect_entity_node",
    title: "检查 XRUGC 实体节点",
    description:
      "按 nodeId、层级 path（例如 0/2/1）或精确名称读取一个实体节点的参数摘要。至少提供一个选择条件，不会修改节点。",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: { type: "string", minLength: 1 },
        path: { type: "string", pattern: "^\\d+(?:/\\d+)*$" },
        name: { type: "string", minLength: 1 },
      },
      anyOf: [
        { required: ["nodeId"] },
        { required: ["path"] },
        { required: ["name"] },
      ],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async (input) => {
      const params = requireRecordInput(input);
      const selector = {
        nodeId: asString(params.nodeId) ?? undefined,
        path: asString(params.path) ?? undefined,
        name: asString(params.name) ?? undefined,
      };
      if (!selector.nodeId && !selector.path && !selector.name) {
        throw new TypeError("nodeId、path、name 至少需要提供一个");
      }
      return readEntityContext(options, (entity) =>
        inspectEntityNode(entity, selector)
      );
    },
  },
  {
    name: "xrugc_validate_entity",
    title: "检查 XRUGC 实体可用性",
    description:
      "检查当前实体是否存在空层级、重复节点名和失效资源引用，返回错误与警告，不会保存或修改实体。",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async () => readEntityContext(options, validateEntity),
  },
  {
    name: "xrugc_search_assets",
    title: "搜索 XRUGC 素材",
    description:
      "通过 XRUGC 现有素材接口搜索模型、图片、视频、体素、音频或粒子素材，返回简短结果。不会上传、删除或修改素材。",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: RESOURCE_TYPES },
        query: { type: "string", maxLength: 100, default: "" },
        page: { type: "integer", minimum: 1, default: 1 },
        pageSize: { type: "integer", minimum: 1, maximum: 50, default: 20 },
      },
      required: ["type"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    async execute(input) {
      const params = requireRecordInput(input);
      const type = asString(params.type);
      if (
        !type ||
        !RESOURCE_TYPES.includes(type as (typeof RESOURCE_TYPES)[number])
      ) {
        throw new TypeError(`不支持的素材类型：${type ?? "空"}`);
      }
      const page = clampInteger(params.page, 1, 1, 100000);
      const pageSize = clampInteger(params.pageSize, 20, 1, 50);
      const result = await options.searchAssets({
        type,
        query: asString(params.query) ?? "",
        page,
        pageSize,
      });
      return {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        items: result.items.map(summarizeAsset),
      };
    },
  },
];

export const registerEntityEditorWebMcpTools = (
  options: RegisterEntityEditorWebMcpOptions
) =>
  registerWebMcpTools(
    [
      ...createTools(options),
      ...createEntityTransformTools({
        getEntityId: () => options.getContext().entity?.id ?? null,
        stageNodeTransform: options.stageNodeTransform,
        confirmNodeTransform: options.confirmNodeTransform,
        completeNodeTransform: options.completeNodeTransform,
      }),
      ...createEntityNodePropertyTools({
        getEntityId: () => options.getContext().entity?.id ?? null,
        stageNodeProperties: options.stageNodeProperties,
        confirmNodeProperties: options.confirmNodeProperties,
        completeNodeProperties: options.completeNodeProperties,
      }),
      ...createEntityResourcePlacementTools({
        getEntityId: () => options.getContext().entity?.id ?? null,
        stageResourcePlacement: options.stageResourcePlacement,
        confirmResourcePlacement: options.confirmResourcePlacement,
        completeResourcePlacement: options.completeResourcePlacement,
      }),
      ...createEntityHierarchyTools({
        getEntityId: () => options.getContext().entity?.id ?? null,
        stageNodeReparent: options.stageNodeReparent,
        confirmNodeReparent: options.confirmNodeReparent,
        completeNodeReparent: options.completeNodeReparent,
      }),
      ...createEntityNodeDeletionTools({
        getEntityId: () => options.getContext().entity?.id ?? null,
        stageNodeDeletion: options.stageNodeDeletion,
        confirmNodeDeletion: options.confirmNodeDeletion,
        completeNodeDeletion: options.completeNodeDeletion,
      }),
      ...createEntityNodeOrderTools({
        getEntityId: () => options.getContext().entity?.id ?? null,
        stageNodeReorder: options.stageNodeReorder,
        confirmNodeReorder: options.confirmNodeReorder,
        completeNodeReorder: options.completeNodeReorder,
      }),
      ...createEntityNodeCloneTools({
        getEntityId: () => options.getContext().entity?.id ?? null,
        stageNodeClone: options.stageNodeClone,
        confirmNodeClone: options.confirmNodeClone,
        completeNodeClone: options.completeNodeClone,
      }),
      ...createEntityNodeBatchTools({
        getEntityId: () => options.getContext().entity?.id ?? null,
        stageNodeBatch: options.stageNodeBatch,
        confirmNodeBatch: options.confirmNodeBatch,
        completeNodeBatch: options.completeNodeBatch,
      }),
      ...createEntityAssetLifecycleTools({
        getEntity: () => options.getContext().entity,
        getLiveContext: options.getLiveContext,
        startAssetUpload: options.startAssetUpload,
        stageAssetRename: options.stageAssetRename,
        confirmAssetRename: options.confirmAssetRename,
        completeAssetRename: options.completeAssetRename,
      }),
      ...createEntityComponentTools({
        getEntityId: () => options.getContext().entity?.id ?? null,
        getNodeComponents: options.getNodeComponents,
        stageComponentBatch: options.stageComponentBatch,
        confirmComponentBatch: options.confirmComponentBatch,
        completeComponentBatch: options.completeComponentBatch,
      }),
      ...createEntitySignalTools({
        getEntityId: () => options.getContext().entity?.id ?? null,
        getEntitySignals: options.getEntitySignals,
        stageSignalBatch: options.stageSignalBatch,
        confirmSignalBatch: options.confirmSignalBatch,
        completeSignalBatch: options.completeSignalBatch,
      }),
    ],
    {
      document: options.document,
      onRegistrationError: options.onRegistrationError,
    }
  );
