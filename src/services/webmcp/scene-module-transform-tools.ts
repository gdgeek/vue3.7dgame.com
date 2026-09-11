import { completionFailure } from "./completion-result";
import { createDraftStore, confirmDraft } from "./draft-lifecycle";
import type { WebMcpTool } from "./model-context";

type JsonRecord = Record<string, unknown>;
type AxisVector = { x: number; y: number; z: number };

export type SceneModuleTransformSnapshot = {
  position: AxisVector;
  rotationDegrees: AxisVector;
  scale: AxisVector;
};

export type SceneModuleTransformPatch = {
  position?: Partial<AxisVector>;
  rotationDegrees?: Partial<AxisVector>;
  scale?: Partial<AxisVector>;
};

export type SceneModuleTransformPreview = {
  sceneId: number;
  sceneVersion: string;
  moduleId: string;
  moduleTitle: string;
  current: SceneModuleTransformSnapshot;
  proposed: SceneModuleTransformSnapshot;
  changed: boolean;
};

export type SceneModuleTransformCompletion = {
  moduleId: string;
  moduleTitle: string;
  transform: SceneModuleTransformSnapshot;
  noChange: boolean;
};

export type SceneModuleTransformToolOptions = {
  getSceneId: () => number | null;
  stageModuleTransform: (
    moduleId: string,
    transform: SceneModuleTransformPatch
  ) => Promise<SceneModuleTransformPreview>;
  confirmModuleTransform: (
    preview: SceneModuleTransformPreview
  ) => Promise<boolean>;
  completeModuleTransform: (
    preview: SceneModuleTransformPreview
  ) => Promise<SceneModuleTransformCompletion>;
};

type SceneModuleTransformDraft = {
  preview: SceneModuleTransformPreview;
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

const parseTransformPatch = (value: unknown): SceneModuleTransformPatch => {
  if (!isRecord(value)) throw new TypeError("transform 必须是对象");
  const patch: SceneModuleTransformPatch = {
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
  return `scene-module-transform-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

export const createSceneModuleTransformTools = (
  options: SceneModuleTransformToolOptions
): WebMcpTool[] => {
  const drafts = createDraftStore<SceneModuleTransformDraft>(MAX_DRAFTS);

  const removeExpiredDrafts = drafts.prune;

  return [
    {
      name: "xrugc_stage_scene_module_transform",
      title: "预览 XRUGC 场景实体实例变换",
      description:
        "准备修改当前场景中一个实体实例的位置、旋转角度或缩放，并在可见编辑器中选中它。只生成五分钟有效的草稿，不修改、不保存也不发布场景；旋转使用角度制。",
      inputSchema: {
        type: "object",
        properties: {
          moduleId: { type: "string", minLength: 1 },
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
        required: ["moduleId", "transform"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        const moduleId =
          typeof input.moduleId === "string" ? input.moduleId.trim() : "";
        if (!moduleId) throw new TypeError("moduleId 不能为空");
        const transform = parseTransformPatch(input.transform);
        const preview = await options.stageModuleTransform(moduleId, transform);
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
      name: "xrugc_complete_scene_module_transform",
      title: "确认并保存 XRUGC 场景实体实例变换",
      description:
        "提交 xrugc_stage_scene_module_transform 创建的草稿。用户明确确认、场景版本和实例当前值均未变化后，使用原生编辑器命令修改实例并保存一次场景；不会发布场景。",
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
          confirm: options.confirmModuleTransform,
          isCurrent: (preview) => options.getSceneId() === preview.sceneId,
          changedStatus: "scene_changed",
          signal: execution?.signal,
        });
        if (!approval.ok) return approval.result;
        const { draft } = approval;

        try {
          const completion = await options.completeModuleTransform(
            draft.preview
          );
          drafts.delete(draftId);
          return {
            status: "completed",
            draftId,
            sceneId: draft.preview.sceneId,
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
