import { completionFailure } from "./completion-result";
import { createDraftStore, confirmDraft } from "./draft-lifecycle";
import type { WebMcpTool } from "./model-context";
import type {
  NodeTransformPatch,
  NodeTransformSnapshot,
} from "./entity-transform-tools";
import type {
  NodePropertyPatch,
  NodePropertySnapshot,
} from "./entity-node-property-tools";

type JsonRecord = Record<string, unknown>;
type Axis = "x" | "y" | "z";

export type NodeBatchChangeInput = {
  nodeId: string;
  transform?: NodeTransformPatch;
  properties?: NodePropertyPatch;
};

export type NodeBatchPreviewItem = {
  nodeId: string;
  nodeName: string;
  current: {
    transform?: NodeTransformSnapshot;
    properties?: NodePropertySnapshot;
  };
  proposed: {
    transform?: NodeTransformSnapshot;
    properties?: NodePropertySnapshot;
  };
  changed: boolean;
};

export type NodeBatchPreview = {
  entityId: number;
  changes: NodeBatchPreviewItem[];
  changedCount: number;
};

export type NodeBatchCompletion = {
  noChange: boolean;
  commandCount: number;
  changes: Array<{
    nodeId: string;
    nodeName: string;
    transform: NodeTransformSnapshot;
    properties: NodePropertySnapshot;
  }>;
};

export type EntityNodeBatchToolOptions = {
  getEntityId: () => number | null;
  stageNodeBatch: (
    changes: NodeBatchChangeInput[]
  ) => Promise<NodeBatchPreview>;
  confirmNodeBatch: (preview: NodeBatchPreview) => Promise<boolean>;
  completeNodeBatch: (
    preview: NodeBatchPreview
  ) => Promise<NodeBatchCompletion>;
};

type NodeBatchDraft = {
  preview: NodeBatchPreview;
  expiresAt: number;
};

const AXES: Axis[] = ["x", "y", "z"];
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

const parseVectorPatch = (
  value: unknown,
  label: string,
  limit: number
): Partial<Record<Axis, number>> | undefined => {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new TypeError(`${label} 必须是对象`);
  const result: Partial<Record<Axis, number>> = {};
  for (const axis of AXES) {
    if (value[axis] === undefined) continue;
    const number = value[axis];
    if (typeof number !== "number" || !Number.isFinite(number)) {
      throw new TypeError(`${label}.${axis} 必须是有限数字`);
    }
    if (Math.abs(number) > limit) {
      throw new RangeError(`${label}.${axis} 超出允许范围`);
    }
    result[axis] = number;
  }
  if (Object.keys(result).length === 0) {
    throw new TypeError(`${label} 至少需要提供 x、y、z 中的一项`);
  }
  return result;
};

const parseTransform = (value: unknown, label: string): NodeTransformPatch => {
  if (!isRecord(value)) throw new TypeError(`${label} 必须是对象`);
  const transform: NodeTransformPatch = {
    position: parseVectorPatch(value.position, `${label}.position`, 1_000_000),
    rotationDegrees: parseVectorPatch(
      value.rotationDegrees,
      `${label}.rotationDegrees`,
      360_000
    ),
    scale: parseVectorPatch(value.scale, `${label}.scale`, 10_000),
  };
  if (!transform.position && !transform.rotationDegrees && !transform.scale) {
    throw new TypeError(
      `${label} 至少需要包含 position、rotationDegrees 或 scale`
    );
  }
  return transform;
};

const parseName = (value: unknown, label: string) => {
  if (typeof value !== "string") throw new TypeError(`${label} 必须是字符串`);
  const name = value.trim();
  if (!name) throw new TypeError(`${label} 不能为空`);
  if (name.length > 100) throw new RangeError(`${label} 不能超过 100 个字符`);
  if (/[\u0000-\u001f\u007f]/.test(name)) {
    throw new TypeError(`${label} 不能包含控制字符`);
  }
  return name;
};

const parseProperties = (value: unknown, label: string): NodePropertyPatch => {
  if (!isRecord(value)) throw new TypeError(`${label} 必须是对象`);
  const properties: NodePropertyPatch = {};
  if (value.name !== undefined) {
    properties.name = parseName(value.name, `${label}.name`);
  }
  if (value.visible !== undefined) {
    if (typeof value.visible !== "boolean") {
      throw new TypeError(`${label}.visible 必须是布尔值`);
    }
    properties.visible = value.visible;
  }
  if (properties.name === undefined && properties.visible === undefined) {
    throw new TypeError(`${label} 至少需要包含 name 或 visible`);
  }
  return properties;
};

const parseChanges = (value: unknown): NodeBatchChangeInput[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("changes 必须是非空数组");
  }
  if (value.length > MAX_CHANGES) {
    throw new RangeError(`changes 不能超过 ${MAX_CHANGES} 项`);
  }
  const nodeIds = new Set<string>();
  return value.map((item, index) => {
    if (!isRecord(item)) throw new TypeError(`changes[${index}] 必须是对象`);
    const nodeId = parseId(item.nodeId, `changes[${index}].nodeId`);
    if (nodeIds.has(nodeId)) {
      throw new TypeError(`changes 中的节点 ${nodeId} 重复`);
    }
    nodeIds.add(nodeId);
    const transform =
      item.transform === undefined
        ? undefined
        : parseTransform(item.transform, `changes[${index}].transform`);
    const properties =
      item.properties === undefined
        ? undefined
        : parseProperties(item.properties, `changes[${index}].properties`);
    if (!transform && !properties) {
      throw new TypeError(
        `changes[${index}] 至少需要包含 transform 或 properties`
      );
    }
    return { nodeId, transform, properties };
  });
};

const vectorSchema = (limit: number) => ({
  type: "object",
  properties: {
    x: { type: "number", minimum: -limit, maximum: limit },
    y: { type: "number", minimum: -limit, maximum: limit },
    z: { type: "number", minimum: -limit, maximum: limit },
  },
  minProperties: 1,
  additionalProperties: false,
});

const generateDraftId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `node-batch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createEntityNodeBatchTools = (
  options: EntityNodeBatchToolOptions
): WebMcpTool[] => {
  const drafts = createDraftStore<NodeBatchDraft>(MAX_DRAFTS);

  const removeExpiredDrafts = drafts.prune;

  return [
    {
      name: "xrugc_stage_node_batch",
      title: "预览 XRUGC 批量节点修改",
      description:
        "准备一次修改 1 到 20 个不同节点的变换、名称或可见性。每个节点可同时包含 transform 和 properties。只生成统一的五分钟预览并选中首个节点，不修改或保存实体。",
      inputSchema: {
        type: "object",
        properties: {
          changes: {
            type: "array",
            minItems: 1,
            maxItems: MAX_CHANGES,
            items: {
              type: "object",
              properties: {
                nodeId: { type: "string", minLength: 1 },
                transform: {
                  type: "object",
                  properties: {
                    position: vectorSchema(1_000_000),
                    rotationDegrees: vectorSchema(360_000),
                    scale: vectorSchema(10_000),
                  },
                  minProperties: 1,
                  additionalProperties: false,
                },
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
              required: ["nodeId"],
              anyOf: [
                { required: ["transform"] },
                { required: ["properties"] },
              ],
              additionalProperties: false,
            },
          },
        },
        required: ["changes"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        const changes = parseChanges(input.changes);
        const preview = await options.stageNodeBatch(changes);
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
      name: "xrugc_complete_node_batch",
      title: "确认并原子保存 XRUGC 批量修改",
      description:
        "提交 xrugc_stage_node_batch 创建的草稿。用户确认且所有节点均未发生并发变化后，才把全部子命令作为一个历史记录执行并只保存一次；执行异常会回滚已应用的子命令。",
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
          confirm: options.confirmNodeBatch,
          isCurrent: (preview) => options.getEntityId() === preview.entityId,
          changedStatus: "entity_changed",
          signal: execution?.signal,
        });
        if (!approval.ok) return approval.result;
        const { draft } = approval;

        try {
          const completion = await options.completeNodeBatch(draft.preview);
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
