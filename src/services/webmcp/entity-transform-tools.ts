import { completionFailure } from "./completion-result";
import { createDraftStore, confirmDraft } from "./draft-lifecycle";
import type { WebMcpTool } from "./model-context";

type JsonRecord = Record<string, unknown>;
type AxisVector = { x: number; y: number; z: number };

export type NodeTransformSnapshot = {
  position: AxisVector;
  rotationDegrees: AxisVector;
  scale: AxisVector;
};

export type NodeTransformPatch = {
  position?: Partial<AxisVector>;
  rotationDegrees?: Partial<AxisVector>;
  scale?: Partial<AxisVector>;
};

export type NodeTransformPreview = {
  entityId: number;
  nodeId: string;
  nodeName: string;
  current: NodeTransformSnapshot;
  proposed: NodeTransformSnapshot;
  changed: boolean;
};

export type NodeTransformCompletion = {
  nodeId: string;
  nodeName: string;
  transform: NodeTransformSnapshot;
  noChange: boolean;
};

export type EntityTransformToolOptions = {
  getEntityId: () => number | null;
  stageNodeTransform: (
    nodeId: string,
    transform: NodeTransformPatch
  ) => Promise<NodeTransformPreview>;
  confirmNodeTransform: (preview: NodeTransformPreview) => Promise<boolean>;
  completeNodeTransform: (
    preview: NodeTransformPreview
  ) => Promise<NodeTransformCompletion>;
};

type TransformDraft = {
  preview: NodeTransformPreview;
  expiresAt: number;
};

const DRAFT_TTL_MS = 5 * 60 * 1000;
const MAX_DRAFTS = 20;

const vectorPatchSchema = {
  type: "object",
  properties: {
    x: { type: "number" },
    y: { type: "number" },
    z: { type: "number" },
  },
  minProperties: 1,
  additionalProperties: false,
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseVectorPatch = (
  value: unknown,
  label: string,
  limit: number
): Partial<AxisVector> | undefined => {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new TypeError(`${label} 必须是对象`);
  const result: Partial<AxisVector> = {};
  for (const axis of ["x", "y", "z"] as const) {
    if (value[axis] === undefined) continue;
    if (typeof value[axis] !== "number" || !Number.isFinite(value[axis])) {
      throw new TypeError(`${label}.${axis} 必须是有限数字`);
    }
    if (Math.abs(value[axis]) > limit) {
      throw new RangeError(`${label}.${axis} 超出允许范围`);
    }
    result[axis] = value[axis];
  }
  if (Object.keys(result).length === 0) {
    throw new TypeError(`${label} 至少需要提供 x、y、z 中的一项`);
  }
  return result;
};

const parseTransformPatch = (value: unknown): NodeTransformPatch => {
  if (!isRecord(value)) throw new TypeError("transform 必须是对象");
  const patch: NodeTransformPatch = {
    position: parseVectorPatch(value.position, "position", 1_000_000),
    rotationDegrees: parseVectorPatch(
      value.rotationDegrees,
      "rotationDegrees",
      360_000
    ),
    scale: parseVectorPatch(value.scale, "scale", 10_000),
  };
  if (!patch.position && !patch.rotationDegrees && !patch.scale) {
    throw new TypeError(
      "transform 至少需要包含 position、rotationDegrees 或 scale"
    );
  }
  return patch;
};

const generateDraftId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `transform-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createEntityTransformTools = (
  options: EntityTransformToolOptions
): WebMcpTool[] => {
  const drafts = createDraftStore<TransformDraft>(MAX_DRAFTS);

  const removeExpiredDrafts = drafts.prune;

  return [
    {
      name: "xrugc_stage_node_transform",
      title: "预览 XRUGC 节点变换",
      description:
        "准备一次节点位置、旋转角度或缩放修改，并在编辑器中选中目标节点。只生成五分钟有效的预览草稿，不改变或保存实体。旋转使用角度制。",
      inputSchema: {
        type: "object",
        properties: {
          nodeId: { type: "string", minLength: 1 },
          transform: {
            type: "object",
            properties: {
              position: vectorPatchSchema,
              rotationDegrees: vectorPatchSchema,
              scale: vectorPatchSchema,
            },
            minProperties: 1,
            additionalProperties: false,
          },
        },
        required: ["nodeId", "transform"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        const nodeId =
          typeof input.nodeId === "string" ? input.nodeId.trim() : "";
        if (!nodeId) throw new TypeError("nodeId 不能为空");
        const transform = parseTransformPatch(input.transform);
        const preview = await options.stageNodeTransform(nodeId, transform);
        if (!preview.changed) {
          return {
            status: "no_change",
            draftId: null,
            preview,
          };
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
      name: "xrugc_complete_node_transform",
      title: "确认并保存 XRUGC 节点变换",
      description:
        "提交 xrugc_stage_node_transform 创建的草稿。调用时会向用户显示当前值和目标值；只有用户明确确认、节点没有并发变化且后端保存成功后才返回 completed。",
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
          confirm: options.confirmNodeTransform,
          isCurrent: (preview) => options.getEntityId() === preview.entityId,
          changedStatus: "entity_changed",
          signal: execution?.signal,
        });
        if (!approval.ok) return approval.result;
        const { draft } = approval;

        try {
          const completion = await options.completeNodeTransform(draft.preview);
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
