import { completionFailure } from "./completion-result";
import { createDraftStore, confirmDraft } from "./draft-lifecycle";
import type { WebMcpTool } from "./model-context";

type JsonRecord = Record<string, unknown>;

export type SceneModulePropertySnapshot = {
  title: string;
  visible: boolean;
};

export type SceneModulePropertyPatch = {
  title?: string;
  visible?: boolean;
};

export type SceneModulePropertyPreview = {
  sceneId: number;
  sceneVersion: string;
  moduleId: string;
  moduleTitle: string;
  current: SceneModulePropertySnapshot;
  proposed: SceneModulePropertySnapshot;
  changed: boolean;
};

export type SceneModulePropertyCompletion = {
  moduleId: string;
  moduleTitle: string;
  properties: SceneModulePropertySnapshot;
  noChange: boolean;
};

export type SceneModulePropertyToolOptions = {
  getSceneId: () => number | null;
  stageModuleProperties: (
    moduleId: string,
    properties: SceneModulePropertyPatch
  ) => Promise<SceneModulePropertyPreview>;
  confirmModuleProperties: (
    preview: SceneModulePropertyPreview
  ) => Promise<boolean>;
  completeModuleProperties: (
    preview: SceneModulePropertyPreview
  ) => Promise<SceneModulePropertyCompletion>;
};

type SceneModulePropertyDraft = {
  preview: SceneModulePropertyPreview;
  expiresAt: number;
};

const DRAFT_TTL_MS = 5 * 60 * 1000;
const MAX_DRAFTS = 20;
const MAX_TITLE_LENGTH = 120;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parsePropertyPatch = (value: unknown): SceneModulePropertyPatch => {
  if (!isRecord(value)) throw new TypeError("properties 必须是对象");
  const patch: SceneModulePropertyPatch = {};
  if (value.title !== undefined) {
    if (typeof value.title !== "string") {
      throw new TypeError("properties.title 必须是字符串");
    }
    const title = value.title.trim();
    if (!title) throw new TypeError("properties.title 不能为空");
    if (title.length > MAX_TITLE_LENGTH) {
      throw new RangeError(
        `properties.title 不能超过 ${MAX_TITLE_LENGTH} 个字符`
      );
    }
    if (/[\u0000-\u001f\u007f]/.test(title)) {
      throw new TypeError("properties.title 不能包含控制字符");
    }
    patch.title = title;
  }
  if (value.visible !== undefined) {
    if (typeof value.visible !== "boolean") {
      throw new TypeError("properties.visible 必须是布尔值");
    }
    patch.visible = value.visible;
  }
  if (patch.title === undefined && patch.visible === undefined) {
    throw new TypeError("properties 至少需要包含 title 或 visible");
  }
  return patch;
};

const generateDraftId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `scene-module-properties-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

export const createSceneModulePropertyTools = (
  options: SceneModulePropertyToolOptions
): WebMcpTool[] => {
  const drafts = createDraftStore<SceneModulePropertyDraft>(MAX_DRAFTS);

  const removeExpiredDrafts = drafts.prune;

  return [
    {
      name: "xrugc_stage_scene_module_properties",
      title: "预览 XRUGC 场景实体实例属性",
      description:
        "准备修改当前场景中一个实体实例的名称或可见性，并在可见编辑器中选中它。只生成五分钟有效的草稿，不修改、不保存也不发布场景。",
      inputSchema: {
        type: "object",
        properties: {
          moduleId: { type: "string", minLength: 1 },
          properties: {
            type: "object",
            properties: {
              title: {
                type: "string",
                minLength: 1,
                maxLength: MAX_TITLE_LENGTH,
              },
              visible: { type: "boolean" },
            },
            minProperties: 1,
            additionalProperties: false,
          },
        },
        required: ["moduleId", "properties"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        const moduleId =
          typeof input.moduleId === "string" ? input.moduleId.trim() : "";
        if (!moduleId) throw new TypeError("moduleId 不能为空");
        const properties = parsePropertyPatch(input.properties);
        const preview = await options.stageModuleProperties(
          moduleId,
          properties
        );
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
      name: "xrugc_complete_scene_module_properties",
      title: "确认并保存 XRUGC 场景实体实例属性",
      description:
        "提交 xrugc_stage_scene_module_properties 创建的草稿。用户明确确认、场景版本和实例当前属性均未变化后，使用原生编辑器命令修改名称或可见性并保存一次场景；不会发布场景。",
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
          confirm: options.confirmModuleProperties,
          isCurrent: (preview) => options.getSceneId() === preview.sceneId,
          changedStatus: "scene_changed",
          signal: execution?.signal,
        });
        if (!approval.ok) return approval.result;
        const { draft } = approval;

        try {
          const completion = await options.completeModuleProperties(
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
