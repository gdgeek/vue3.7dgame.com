import { completionFailure } from "./completion-result";
import { createDraftStore, confirmDraft } from "./draft-lifecycle";
import type { WebMcpTool } from "./model-context";

type JsonRecord = Record<string, unknown>;

export const ENTITY_COMPONENT_TYPES = [
  "Rotate",
  "Action",
  "Moved",
  "Trigger",
  "Tooltip",
] as const;

export type EntityComponentType = (typeof ENTITY_COMPONENT_TYPES)[number];
export type ComponentOperation = "add" | "update" | "remove";
export type ComponentSettings = JsonRecord;

export type ComponentChangeInput = {
  operation: ComponentOperation;
  nodeId: string;
  componentType?: EntityComponentType;
  componentId?: string;
  settings?: ComponentSettings;
};

export type ComponentSnapshot = {
  componentId: string;
  componentType: EntityComponentType;
  settings: ComponentSettings;
};

export type NodeComponentList = {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  components: ComponentSnapshot[];
};

export type ComponentBatchPreviewItem = {
  operation: ComponentOperation;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  componentId: string;
  componentType: EntityComponentType;
  current: ComponentSnapshot | null;
  proposed: ComponentSnapshot | null;
  componentsVersion: string;
  changed: boolean;
};

export type ComponentBatchPreview = {
  entityId: number;
  changes: ComponentBatchPreviewItem[];
  changedCount: number;
};

export type ComponentBatchCompletion = {
  noChange: boolean;
  commandCount: number;
  changes: Array<{
    operation: ComponentOperation;
    nodeId: string;
    nodeName: string;
    componentId: string;
    componentType: EntityComponentType;
  }>;
};

export type EntityComponentToolOptions = {
  getEntityId: () => number | null;
  getNodeComponents: (nodeId: string) => Promise<NodeComponentList>;
  stageComponentBatch: (
    changes: ComponentChangeInput[]
  ) => Promise<ComponentBatchPreview>;
  confirmComponentBatch: (preview: ComponentBatchPreview) => Promise<boolean>;
  completeComponentBatch: (
    preview: ComponentBatchPreview
  ) => Promise<ComponentBatchCompletion>;
};

type ComponentBatchDraft = {
  preview: ComponentBatchPreview;
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

const parseComponentType = (value: unknown, label: string) => {
  if (
    typeof value !== "string" ||
    !ENTITY_COMPONENT_TYPES.includes(value as EntityComponentType)
  ) {
    throw new TypeError(`${label} 不是受支持的组件类型`);
  }
  return value as EntityComponentType;
};

const cloneSettings = (value: unknown, label: string, required: boolean) => {
  if (value === undefined && !required) return undefined;
  if (!isRecord(value)) throw new TypeError(`${label} 必须是对象`);
  if (required && Object.keys(value).length === 0) {
    throw new TypeError(`${label} 至少需要一个设置项`);
  }
  return JSON.parse(JSON.stringify(value)) as ComponentSettings;
};

const parseChanges = (value: unknown): ComponentChangeInput[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("changes 必须是非空数组");
  }
  if (value.length > MAX_CHANGES) {
    throw new RangeError(`changes 不能超过 ${MAX_CHANGES} 项`);
  }

  const identities = new Set<string>();
  return value.map((item, index) => {
    if (!isRecord(item)) throw new TypeError(`changes[${index}] 必须是对象`);
    const operation = item.operation;
    if (
      operation !== "add" &&
      operation !== "update" &&
      operation !== "remove"
    ) {
      throw new TypeError(`changes[${index}].operation 无效`);
    }
    const nodeId = parseId(item.nodeId, `changes[${index}].nodeId`);
    const componentType =
      operation === "add"
        ? parseComponentType(
            item.componentType,
            `changes[${index}].componentType`
          )
        : undefined;
    const componentId =
      operation === "add"
        ? undefined
        : parseId(item.componentId, `changes[${index}].componentId`);
    const settings =
      operation === "remove"
        ? undefined
        : cloneSettings(
            item.settings,
            `changes[${index}].settings`,
            operation === "update"
          );
    const identity = `${nodeId}:${componentId ?? `new:${componentType}`}`;
    if (identities.has(identity)) {
      throw new TypeError(`changes 中的组件目标 ${identity} 重复`);
    }
    identities.add(identity);
    return { operation, nodeId, componentType, componentId, settings };
  });
};

const settingsSchema = {
  type: "object",
  properties: {
    speed: {
      type: "object",
      properties: {
        x: { type: "number", minimum: -360000, maximum: 360000 },
        y: { type: "number", minimum: -360000, maximum: 360000 },
        z: { type: "number", minimum: -360000, maximum: 360000 },
      },
      minProperties: 1,
      additionalProperties: false,
    },
    isRotating: { type: "boolean" },
    actionName: { type: "string", maxLength: 100 },
    modes: {
      type: "array",
      items: { type: "string", enum: ["pinch", "touch"] },
      uniqueItems: true,
      minItems: 1,
      maxItems: 2,
    },
    scalable: { type: "boolean" },
    magnetic: { type: "boolean" },
    targetNodeId: { type: ["string", "null"], minLength: 1 },
    text: { type: "string", maxLength: 2000 },
    length: { type: "number", minimum: 0, maximum: 1000 },
  },
  minProperties: 1,
  additionalProperties: false,
};

const generateDraftId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `component-batch-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

export const createEntityComponentTools = (
  options: EntityComponentToolOptions
): WebMcpTool[] => {
  const drafts = createDraftStore<ComponentBatchDraft>(MAX_DRAFTS);

  const removeExpiredDrafts = drafts.prune;

  return [
    {
      name: "xrugc_get_node_components",
      title: "读取 XRUGC 节点组件",
      description:
        "读取当前实体中一个节点的组件列表、组件 UUID、类型和可编辑设置。不会修改节点或保存实体。",
      inputSchema: {
        type: "object",
        properties: { nodeId: { type: "string", minLength: 1 } },
        required: ["nodeId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input, _execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        return options.getNodeComponents(parseId(input.nodeId, "nodeId"));
      },
    },
    {
      name: "xrugc_stage_component_batch",
      title: "预览 XRUGC 组件批量修改",
      description:
        "准备一次添加、更新或移除 1 到 20 个节点组件。支持 Rotate、Action、Moved、Trigger、Tooltip；只生成五分钟有效预览，不修改或保存实体。",
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
                    nodeId: { type: "string", minLength: 1 },
                    componentType: {
                      type: "string",
                      enum: ENTITY_COMPONENT_TYPES,
                    },
                    settings: settingsSchema,
                  },
                  required: ["operation", "nodeId", "componentType"],
                  additionalProperties: false,
                },
                {
                  type: "object",
                  properties: {
                    operation: { const: "update" },
                    nodeId: { type: "string", minLength: 1 },
                    componentId: { type: "string", minLength: 1 },
                    settings: settingsSchema,
                  },
                  required: ["operation", "nodeId", "componentId", "settings"],
                  additionalProperties: false,
                },
                {
                  type: "object",
                  properties: {
                    operation: { const: "remove" },
                    nodeId: { type: "string", minLength: 1 },
                    componentId: { type: "string", minLength: 1 },
                  },
                  required: ["operation", "nodeId", "componentId"],
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
        const preview = await options.stageComponentBatch(
          parseChanges(input.changes)
        );
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
      name: "xrugc_complete_component_batch",
      title: "确认并保存 XRUGC 组件批量修改",
      description:
        "提交 xrugc_stage_component_batch 创建的草稿。用户确认且各节点组件版本未变化后，把全部添加、更新和移除作为一个可撤销历史操作执行，并只保存一次。",
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
          confirm: options.confirmComponentBatch,
          isCurrent: (preview) => options.getEntityId() === preview.entityId,
          changedStatus: "entity_changed",
          signal: execution?.signal,
        });
        if (!approval.ok) return approval.result;
        const { draft } = approval;

        try {
          const completion = await options.completeComponentBatch(
            draft.preview
          );
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
