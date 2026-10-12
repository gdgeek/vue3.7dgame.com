import { completionFailure } from "./completion-result";
import { createDraftStore, confirmDraft } from "./draft-lifecycle";
import type { WebMcpTool } from "./model-context";

type JsonRecord = Record<string, unknown>;

export type SceneModuleDeletionPreview = {
  sceneId: number;
  sceneVersion: string;
  moduleId: string;
  moduleTitle: string;
  entityId: number | null;
  visible: boolean;
  descendantCount: number;
};

export type SceneModuleDeletionCompletion = {
  moduleId: string;
  moduleTitle: string;
  entityId: number | null;
  removedObjectCount: number;
};

export type SceneModuleDeletionToolOptions = {
  getSceneId: () => number | null;
  stageModuleDeletion: (
    moduleId: string
  ) => Promise<SceneModuleDeletionPreview>;
  confirmModuleDeletion: (
    preview: SceneModuleDeletionPreview
  ) => Promise<boolean>;
  completeModuleDeletion: (
    preview: SceneModuleDeletionPreview
  ) => Promise<SceneModuleDeletionCompletion>;
};

type SceneModuleDeletionDraft = {
  preview: SceneModuleDeletionPreview;
  expiresAt: number;
};

const DRAFT_TTL_MS = 5 * 60 * 1000;
const MAX_DRAFTS = 20;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const generateDraftId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `scene-module-deletion-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

export const createSceneModuleDeletionTools = (
  options: SceneModuleDeletionToolOptions
): WebMcpTool[] => {
  const drafts = createDraftStore<SceneModuleDeletionDraft>(MAX_DRAFTS);

  const removeExpiredDrafts = drafts.prune;

  return [
    {
      name: "xrugc_stage_scene_module_deletion",
      title: "预览删除 XRUGC 场景实体实例",
      description:
        "准备删除当前场景中的一个实体实例，在可见编辑器中选中目标并返回删除范围。只生成五分钟有效的草稿，不删除、不保存也不发布场景。",
      inputSchema: {
        type: "object",
        properties: {
          moduleId: { type: "string", minLength: 1 },
        },
        required: ["moduleId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        const moduleId =
          typeof input.moduleId === "string" ? input.moduleId.trim() : "";
        if (!moduleId) throw new TypeError("moduleId 不能为空");

        const preview = await options.stageModuleDeletion(moduleId);
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
      name: "xrugc_complete_scene_module_deletion",
      title: "确认删除 XRUGC 场景实体实例",
      description:
        "提交 xrugc_stage_scene_module_deletion 创建的草稿。用户明确确认且场景版本未变化后，使用原生可撤销命令删除整个实体实例并保存一次场景；不会发布场景。",
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
          confirm: options.confirmModuleDeletion,
          isCurrent: (preview) => options.getSceneId() === preview.sceneId,
          changedStatus: "scene_changed",
          signal: execution?.signal,
        });
        if (!approval.ok) return approval.result;
        const { draft } = approval;

        try {
          const completion = await options.completeModuleDeletion(
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
