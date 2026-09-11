import { completionFailure } from "./completion-result";
import { createDraftStore, confirmDraft } from "./draft-lifecycle";
import type { WebMcpTool } from "./model-context";

type JsonRecord = Record<string, unknown>;

export type ScenePublicationPreview = {
  sceneId: number;
  sceneVersion: string;
  sceneName: string;
  moduleCount: number;
  warningCount: number;
  warnings: string[];
  alreadyPublished: boolean | null;
};

export type ScenePublicationCompletion = {
  sceneId: number;
  snapshotId: number | null;
  snapshotUuid: string | null;
  published: boolean;
  verification?: "server_acknowledged";
  readBackVerified?: boolean;
};

export type ScenePublicationToolOptions = {
  getSceneId: () => number | null;
  stageScenePublication: () => Promise<ScenePublicationPreview>;
  confirmScenePublication: (
    preview: ScenePublicationPreview
  ) => Promise<boolean>;
  completeScenePublication: (
    preview: ScenePublicationPreview
  ) => Promise<ScenePublicationCompletion>;
};

type ScenePublicationDraft = {
  preview: ScenePublicationPreview;
  expiresAt: number;
};

const DRAFT_TTL_MS = 5 * 60 * 1000;
const MAX_DRAFTS = 10;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const generateDraftId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `scene-publication-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

export const createScenePublicationTools = (
  options: ScenePublicationToolOptions
): WebMcpTool[] => {
  const drafts = createDraftStore<ScenePublicationDraft>(MAX_DRAFTS);

  const removeExpiredDrafts = drafts.prune;

  return [
    {
      name: "xrugc_stage_scene_publication",
      title: "检查并预览发布 XRUGC 场景",
      description:
        "检查当前可见场景是否已保存、包含实体且没有结构错误，返回发布范围和警告，并创建五分钟有效的发布草稿。不会保存或发布场景。",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        const preview = await options.stageScenePublication();
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
      name: "xrugc_complete_scene_publication",
      title: "确认发布 XRUGC 场景",
      description:
        "提交 xrugc_stage_scene_publication 创建的草稿。用户明确确认且场景版本、保存状态和可用性均未变化后，调用平台现有快照接口发布当前场景。",
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
          confirm: options.confirmScenePublication,
          isCurrent: (preview) => options.getSceneId() === preview.sceneId,
          changedStatus: "scene_changed",
          signal: execution?.signal,
        });
        if (!approval.ok) return approval.result;
        const { draft } = approval;

        try {
          const completion = await options.completeScenePublication(
            draft.preview
          );
          drafts.delete(draftId);
          return {
            status: "completed",
            draftId,
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
