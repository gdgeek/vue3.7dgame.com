import { completionFailure } from "./completion-result";
import { createDraftStore, confirmDraft } from "./draft-lifecycle";
import type { WebMcpTool } from "./model-context";

type JsonRecord = Record<string, unknown>;

export type SceneVector3 = { x: number; y: number; z: number };

export type SceneModuleTransform = {
  position: SceneVector3;
  rotate: SceneVector3;
  scale: SceneVector3;
};

export type SceneEntityPlacementPreview = {
  operationId?: string;
  sceneId: number;
  sceneVersion: string;
  entityId: number;
  entityUuid: string;
  entityTitle: string;
  entityUpdatedAt?: string;
  proposedTitle: string;
  transform: SceneModuleTransform;
  resourceCount: number;
  emptyEntity: boolean;
};

export type SceneEntityPlacementCompletion = {
  moduleId: string;
  moduleTitle: string;
  entityId: number;
  transform: SceneModuleTransform;
};

export type SceneEntityPlacementToolOptions = {
  getSceneId: () => number | null;
  stageEntityPlacement: (input: {
    entityId: number;
    title?: string;
    transform: SceneModuleTransform;
  }) => Promise<SceneEntityPlacementPreview>;
  confirmEntityPlacement: (
    preview: SceneEntityPlacementPreview
  ) => Promise<boolean>;
  completeEntityPlacement: (
    preview: SceneEntityPlacementPreview
  ) => Promise<SceneEntityPlacementCompletion>;
};

type SceneEntityPlacementDraft = {
  preview: SceneEntityPlacementPreview;
  expiresAt: number;
};

const DRAFT_TTL_MS = 5 * 60 * 1000;
const MAX_DRAFTS = 20;
const MAX_ABSOLUTE_VALUE = 1_000_000;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseEntityId = (value: unknown) => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError("entityId 必须是正整数");
  }
  return value;
};

const parseTitle = (value: unknown) => {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("title 必须是非空字符串");
  }
  const title = value.trim();
  if (title.length > 100) throw new RangeError("title 不能超过 100 个字符");
  return title;
};

const parseCoordinate = (value: unknown, fallback: number, path: string) => {
  if (value === undefined) return fallback;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    Math.abs(value) > MAX_ABSOLUTE_VALUE
  ) {
    throw new RangeError(`${path} 必须是绝对值不超过 1000000 的有限数字`);
  }
  return value;
};

const parseVector = (
  value: unknown,
  fallback: SceneVector3,
  path: string
): SceneVector3 => {
  if (value === undefined) return { ...fallback };
  if (!isRecord(value)) throw new TypeError(`${path} 必须是对象`);
  return {
    x: parseCoordinate(value.x, fallback.x, `${path}.x`),
    y: parseCoordinate(value.y, fallback.y, `${path}.y`),
    z: parseCoordinate(value.z, fallback.z, `${path}.z`),
  };
};

const parseTransform = (value: unknown): SceneModuleTransform => {
  if (value !== undefined && !isRecord(value)) {
    throw new TypeError("transform 必须是对象");
  }
  const transform = isRecord(value) ? value : {};
  return {
    position: parseVector(
      transform.position,
      { x: 0, y: 0, z: 0 },
      "transform.position"
    ),
    rotate: parseVector(
      transform.rotate,
      { x: 0, y: 0, z: 0 },
      "transform.rotate"
    ),
    scale: parseVector(
      transform.scale,
      { x: 1, y: 1, z: 1 },
      "transform.scale"
    ),
  };
};

const generateDraftId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `scene-entity-placement-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

const vectorSchema = {
  type: "object",
  properties: {
    x: {
      type: "number",
      minimum: -MAX_ABSOLUTE_VALUE,
      maximum: MAX_ABSOLUTE_VALUE,
    },
    y: {
      type: "number",
      minimum: -MAX_ABSOLUTE_VALUE,
      maximum: MAX_ABSOLUTE_VALUE,
    },
    z: {
      type: "number",
      minimum: -MAX_ABSOLUTE_VALUE,
      maximum: MAX_ABSOLUTE_VALUE,
    },
  },
  additionalProperties: false,
};

export const createSceneEntityPlacementTools = (
  options: SceneEntityPlacementToolOptions
): WebMcpTool[] => {
  const drafts = createDraftStore<SceneEntityPlacementDraft>(MAX_DRAFTS);

  const removeExpiredDrafts = drafts.prune;

  return [
    {
      name: "xrugc_stage_scene_entity_placement",
      title: "预览把 XRUGC 实体放入场景",
      description:
        "核对实体和当前场景，准备把一个现有实体实例放入场景。可指定实例名称、位置、旋转和缩放；只生成五分钟有效的草稿，不创建、不保存也不发布场景。",
      inputSchema: {
        type: "object",
        properties: {
          entityId: { type: "integer", minimum: 1 },
          title: { type: "string", minLength: 1, maxLength: 100 },
          transform: {
            type: "object",
            properties: {
              position: vectorSchema,
              rotate: vectorSchema,
              scale: vectorSchema,
            },
            additionalProperties: false,
          },
        },
        required: ["entityId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        const preview = await options.stageEntityPlacement({
          entityId: parseEntityId(input.entityId),
          title: parseTitle(input.title),
          transform: parseTransform(input.transform),
        });

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
      name: "xrugc_complete_scene_entity_placement",
      title: "确认并把 XRUGC 实体放入场景",
      description:
        "提交 xrugc_stage_scene_entity_placement 创建的草稿。用户明确确认、场景没有并发修改且实体版本未变化后，调用可见编辑器的真实加载流程创建实例并保存一次场景；不会发布场景。",
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
          confirm: options.confirmEntityPlacement,
          isCurrent: (preview) => options.getSceneId() === preview.sceneId,
          changedStatus: "scene_changed",
          signal: execution?.signal,
        });
        if (!approval.ok) return approval.result;
        const { draft } = approval;

        try {
          const completion = await options.completeEntityPlacement(
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
