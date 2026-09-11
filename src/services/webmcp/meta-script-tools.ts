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

type JsonRecord = Record<string, unknown>;

export type ScriptWorkspaceSummary = {
  blockCount: number;
  topLevelBlockCount: number;
  variableCount: number;
  commentCount: number;
  blockTypes: Record<string, number>;
  serializedBytes: number;
  generatedJavaScriptBytes: number;
  generatedLuaBytes: number;
};

export type ScriptValidationIssue = {
  message: string;
  blockId?: string;
  blockType?: string;
  blockText?: string;
  code?: string;
  kind?: string;
  language?: string;
};

export type ScriptValidationMetadata = {
  warnings?: ScriptValidationIssue[];
  canSave?: boolean;
  validationScope?: string;
};

export type MetaScriptSnapshot = ScriptValidationMetadata & {
  entityId: number;
  entityTitle: string;
  workspaceVersion: string;
  summary: ScriptWorkspaceSummary;
  valid: boolean;
  issue?: ScriptValidationIssue;
  workspace?: JsonRecord;
  generatedCode?: { js: string; lua: string };
};

export type MetaScriptReplacePreview = ScriptValidationMetadata & {
  entityId: number;
  entityTitle: string;
  workspaceVersion: string;
  current: ScriptWorkspaceSummary;
  proposed: ScriptWorkspaceSummary;
  proposedWorkspace: JsonRecord;
  changed: boolean;
};

export type MetaScriptReplaceCompletion = {
  noChange: boolean;
  entityId: number;
  workspaceVersion: string;
  summary: ScriptWorkspaceSummary;
};

export type RegisterMetaScriptWebMcpOptions = WebMcpRegistrationOptions & {
  getContext: () => {
    entityId: number | null;
    entityTitle: string;
    editable: boolean;
    ready: boolean;
    dirty: boolean;
    saving: boolean;
  };
  getMetaScript: (options: {
    includeWorkspace: boolean;
    includeGeneratedCode: boolean;
  }) => Promise<MetaScriptSnapshot>;
  validateMetaScript: (focusIssue: boolean) => Promise<MetaScriptSnapshot>;
  stageMetaScriptReplace: (
    workspace: JsonRecord
  ) => Promise<MetaScriptReplacePreview>;
  confirmMetaScriptReplace: (
    preview: MetaScriptReplacePreview
  ) => Promise<boolean>;
  completeMetaScriptReplace: (
    preview: MetaScriptReplacePreview
  ) => Promise<MetaScriptReplaceCompletion>;
};

type ScriptDraft = {
  preview: MetaScriptReplacePreview;
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
  return `meta-script-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const publicPreview = (preview: MetaScriptReplacePreview) => ({
  entityId: preview.entityId,
  entityTitle: preview.entityTitle,
  workspaceVersion: preview.workspaceVersion,
  current: preview.current,
  proposed: preview.proposed,
  changed: preview.changed,
  warnings: preview.warnings ?? [],
  canSave: preview.canSave,
  validationScope: preview.validationScope,
});

const createTools = (
  options: RegisterMetaScriptWebMcpOptions
): WebMcpTool[] => {
  const drafts = createDraftStore<ScriptDraft>(MAX_DRAFTS);

  const removeExpiredDrafts = drafts.prune;

  return [
    {
      name: "xrugc_get_meta_script",
      title: "读取 XRUGC 实体脚本",
      description:
        "读取当前实体 Blockly 工作区的版本、块类型统计、校验状态和代码长度。按需返回完整工作区与平台真实生成的 Lua/JavaScript；不会修改脚本。",
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
        const result = await options.getMetaScript({
          includeWorkspace: parseBoolean(input.includeWorkspace, false),
          includeGeneratedCode: parseBoolean(input.includeGeneratedCode, false),
        });
        return {
          ...result,
          workflowGuide: getWorkflowGuideEntry("entity-script"),
        };
      },
    },
    {
      name: "xrugc_validate_meta_script",
      title: "校验 XRUGC 实体脚本",
      description:
        "使用 Blockly 编辑器当前的块级规则、资源字段规则和真实 Lua/JavaScript 生成器校验可见工作区。focusIssue 为 true 时会把首个错误块移到视野中；不会保存脚本。",
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
        return options.validateMetaScript(parseBoolean(input.focusIssue, true));
      },
    },
    {
      name: "xrugc_stage_meta_script_replace",
      title: "预览 XRUGC 实体脚本替换",
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
        const preview = await options.stageMetaScriptReplace(
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
      name: "xrugc_complete_meta_script_replace",
      title: "确认并保存 XRUGC 实体脚本替换",
      description:
        "提交 xrugc_stage_meta_script_replace 草稿。用户确认且工作区版本未变化后，以一个 Blockly 撤销组更新可见工作区，再调用平台原有脚本保存链路持久化。",
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
          confirm: options.confirmMetaScriptReplace,
          isCurrent: (preview) =>
            options.getContext().entityId === preview.entityId,
          changedStatus: "entity_changed",
          signal: execution?.signal,
        });
        if (!approval.ok) return approval.result;
        const { draft } = approval;

        try {
          const completion = await options.completeMetaScriptReplace(
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

export const registerMetaScriptWebMcpTools = (
  options: RegisterMetaScriptWebMcpOptions
) =>
  registerWebMcpTools(
    withWorkflowGuide(createTools(options), "entity-script"),
    {
      document: options.document,
      operations: options.operations,
      onRegistrationError: options.onRegistrationError,
    }
  );
