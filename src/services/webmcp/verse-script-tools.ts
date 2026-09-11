import {
  getWorkflowGuideEntry,
  withWorkflowGuide,
} from "./workflow-guide-tools";
import { completionFailure } from "./completion-result";
import { createDraftStore, confirmDraft } from "./draft-lifecycle";
import {
  registerWebMcpTools,
  type WebMcpRegistrationOptions,
  type WebMcpTool,
} from "./model-context";
import type {
  ScriptValidationIssue,
  ScriptValidationMetadata,
  ScriptWorkspaceSummary,
} from "./meta-script-tools";

type JsonRecord = Record<string, unknown>;

export type VerseScriptSnapshot = ScriptValidationMetadata & {
  sceneId: number;
  sceneTitle: string;
  workspaceVersion: string;
  summary: ScriptWorkspaceSummary;
  valid: boolean;
  issue?: ScriptValidationIssue;
  workspace?: JsonRecord;
  generatedCode?: { js: string; lua: string };
};

export type VerseScriptReplacePreview = ScriptValidationMetadata & {
  sceneId: number;
  sceneTitle: string;
  workspaceVersion: string;
  current: ScriptWorkspaceSummary;
  proposed: ScriptWorkspaceSummary;
  proposedWorkspace: JsonRecord;
  changed: boolean;
};

export type VerseScriptReplaceCompletion = {
  noChange: boolean;
  sceneId: number;
  workspaceVersion: string;
  summary: ScriptWorkspaceSummary;
};

export type RegisterVerseScriptWebMcpOptions = WebMcpRegistrationOptions & {
  getContext: () => {
    sceneId: number | null;
    sceneTitle: string;
    editable: boolean;
    ready: boolean;
    dirty: boolean;
    saving: boolean;
  };
  getVerseScript: (options: {
    includeWorkspace: boolean;
    includeGeneratedCode: boolean;
  }) => Promise<VerseScriptSnapshot>;
  validateVerseScript: (focusIssue: boolean) => Promise<VerseScriptSnapshot>;
  stageVerseScriptReplace: (
    workspace: JsonRecord
  ) => Promise<VerseScriptReplacePreview>;
  confirmVerseScriptReplace: (
    preview: VerseScriptReplacePreview
  ) => Promise<boolean>;
  completeVerseScriptReplace: (
    preview: VerseScriptReplacePreview
  ) => Promise<VerseScriptReplaceCompletion>;
};

type ScriptDraft = {
  preview: VerseScriptReplacePreview;
  expiresAt: number;
};

const MAX_WORKSPACE_BYTES = 512 * 1024;
const DRAFT_TTL_MS = 5 * 60 * 1000;
const MAX_DRAFTS = 10;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const cloneWorkspace = (value: unknown) => {
  if (!isRecord(value)) throw new TypeError("workspace 必须是对象");
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new TypeError("workspace 必须可以序列化为 JSON");
  }
  if (new TextEncoder().encode(serialized).byteLength > MAX_WORKSPACE_BYTES) {
    throw new RangeError(
      `workspace 不能超过 ${Math.floor(MAX_WORKSPACE_BYTES / 1024)} KB`
    );
  }
  return JSON.parse(serialized) as JsonRecord;
};

const generateDraftId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `verse-script-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const publicPreview = (preview: VerseScriptReplacePreview) => ({
  sceneId: preview.sceneId,
  sceneTitle: preview.sceneTitle,
  workspaceVersion: preview.workspaceVersion,
  current: preview.current,
  proposed: preview.proposed,
  changed: preview.changed,
  warnings: preview.warnings ?? [],
  canSave: preview.canSave,
  validationScope: preview.validationScope,
});

const createTools = (
  options: RegisterVerseScriptWebMcpOptions
): WebMcpTool[] => {
  const drafts = createDraftStore<ScriptDraft>(MAX_DRAFTS);

  const removeExpiredDrafts = drafts.prune;

  return [
    {
      name: "xrugc_get_scene_script",
      title: "读取 XRUGC 场景脚本",
      description:
        "读取当前场景 Blockly 工作区的版本、块类型统计、校验状态和代码长度。按需返回完整工作区与平台真实生成的 Lua/JavaScript；不会修改脚本。",
      inputSchema: {
        type: "object",
        properties: {
          includeWorkspace: { type: "boolean", default: false },
          includeGeneratedCode: { type: "boolean", default: false },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input, _execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        const result = await options.getVerseScript({
          includeWorkspace: parseBoolean(input.includeWorkspace, false),
          includeGeneratedCode: parseBoolean(input.includeGeneratedCode, false),
        });
        return {
          ...result,
          workflowGuide: getWorkflowGuideEntry("scene-script"),
        };
      },
    },
    {
      name: "xrugc_validate_scene_script",
      title: "校验 XRUGC 场景脚本",
      description:
        "使用 Blockly 编辑器当前的块级规则、场景信号字段规则和真实 Lua/JavaScript 生成器校验可见工作区。focusIssue 为 true 时会把首个错误块移到视野中；不会保存脚本。",
      inputSchema: {
        type: "object",
        properties: {
          focusIssue: { type: "boolean", default: true },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input, _execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        return options.validateVerseScript(
          parseBoolean(input.focusIssue, true)
        );
      },
    },
    {
      name: "xrugc_stage_scene_script_replace",
      title: "预览 XRUGC 场景脚本替换",
      description:
        "把完整 Blockly 序列化工作区放入临时 Blockly 工作区，执行真实反序列化、块校验及 Lua/JavaScript 生成。仅生成五分钟有效预览，不改变可见工作区或服务器数据。",
      inputSchema: {
        type: "object",
        properties: {
          workspace: { type: "object" },
        },
        required: ["workspace"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        const preview = await options.stageVerseScriptReplace(
          cloneWorkspace(input.workspace)
        );
        if (!preview.changed) {
          return {
            status: "no_change",
            draftId: null,
            preview: publicPreview(preview),
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
          preview: publicPreview(preview),
        };
      },
    },
    {
      name: "xrugc_complete_scene_script_replace",
      title: "确认并保存 XRUGC 场景脚本替换",
      description:
        "提交 xrugc_stage_scene_script_replace 草稿。用户确认且工作区版本未变化后，以一个 Blockly 撤销组更新可见工作区，再调用平台原有脚本保存链路持久化；不会绕过平台的场景发布确认。",
      inputSchema: {
        type: "object",
        properties: { draftId: { type: "string", minLength: 1 } },
        required: ["draftId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, execution) {
        if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
        if (typeof input.draftId !== "string" || !input.draftId.trim()) {
          throw new TypeError("draftId 不能为空");
        }
        const draftId = input.draftId.trim();
        const approval = await confirmDraft(drafts, draftId, {
          confirm: options.confirmVerseScriptReplace,
          isCurrent: (preview) =>
            options.getContext().sceneId === preview.sceneId,
          changedStatus: "scene_changed",
          signal: execution?.signal,
        });
        if (!approval.ok) return approval.result;
        const { draft } = approval;

        try {
          const completion = await options.completeVerseScriptReplace(
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

export const registerVerseScriptWebMcpTools = (
  options: RegisterVerseScriptWebMcpOptions
) =>
  registerWebMcpTools(withWorkflowGuide(createTools(options), "scene-script"), {
    document: options.document,
    operations: options.operations,
    onRegistrationError: options.onRegistrationError,
  });
