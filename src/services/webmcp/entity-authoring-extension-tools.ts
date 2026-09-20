import type { WebMcpTool } from "./model-context";
import { createDraftStore, confirmDraft } from "./draft-lifecycle";
import { completionFailure } from "./completion-result";

type Json = Record<string, unknown>;
export type EntityAuthoringPreview = Json & {
  entityId: number;
  operationId?: string;
};
export type EntityAuthoringExtensions = {
  getEntityId: () => number | null;
  read: (action: string, input: Json) => Promise<Json>;
  stage: (action: string, input: Json) => Promise<EntityAuthoringPreview>;
  confirm: (preview: EntityAuthoringPreview) => Promise<boolean>;
  complete: (action: string, preview: EntityAuthoringPreview) => Promise<Json>;
};

const record = (v: unknown): Json => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new TypeError("需要对象参数");
  return v as Json;
};
const nonempty = (v: unknown, name: string) => {
  if (typeof v !== "string" || !v.trim() || v.length > 200)
    throw new TypeError(`${name} 无效`);
  return v;
};
const vector = {
  type: "object",
  properties: {
    x: { type: "number" },
    y: { type: "number" },
    z: { type: "number" },
  },
  required: ["x", "y", "z"],
  additionalProperties: false,
};
const textProperties = {
  text: { type: "string", maxLength: 10000 },
  rect: {
    type: "object",
    properties: {
      x: { type: "number", minimum: 0.01, maximum: 10 },
      y: { type: "number", minimum: 0.01, maximum: 10 },
    },
    required: ["x", "y"],
    additionalProperties: false,
  },
  size: { type: "integer", minimum: 8, maximum: 200 },
  color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
  align: {
    type: "object",
    properties: {
      horizontal: { type: "string", enum: ["left", "center", "right"] },
      vertical: { type: "string", enum: ["top", "middle", "bottom"] },
    },
    required: ["horizontal", "vertical"],
    additionalProperties: false,
  },
  background: {
    type: "object",
    properties: {
      enable: { type: "boolean" },
      color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
      opacity: { type: "number", minimum: 0, maximum: 1 },
    },
    required: ["enable", "color", "opacity"],
    additionalProperties: false,
  },
  follow: { type: "boolean" },
};
const nodeProperties = {
  type: "object",
  properties: {
    ...textProperties,
    loop: { type: "boolean" },
    play: { type: "boolean" },
    volume: { type: "number", minimum: 0, maximum: 1 },
    rate: { type: "number", minimum: 0.25, maximum: 4 },
  },
  minProperties: 1,
  additionalProperties: false,
};
const creationTextProperties = Object.fromEntries(
  Object.entries(textProperties).filter(([key]) => key !== "text")
);
const creationItem = {
  type: "object",
  properties: {
    clientKey: { type: "string", minLength: 1, maxLength: 100 },
    kind: { type: "string", enum: ["resource", "empty", "text"] },
    resourceType: {
      type: "string",
      enum: ["polygen", "picture", "video", "voxel", "audio", "particle"],
    },
    resourceId: { type: "integer", minimum: 1 },
    parentNodeId: { type: ["string", "null"] },
    parentClientKey: { type: "string" },
    name: { type: "string", maxLength: 100 },
    visible: { type: "boolean" },
    transform: {
      type: "object",
      properties: { position: vector, rotationDegrees: vector, scale: vector },
      additionalProperties: false,
    },
    text: {
      type: "object",
      properties: {
        ...creationTextProperties,
        content: { type: "string", maxLength: 10000 },
      },
      additionalProperties: false,
    },
  },
  required: ["clientKey", "kind"],
  additionalProperties: false,
};

export function createEntityAuthoringExtensionTools(
  d: EntityAuthoringExtensions
): WebMcpTool[] {
  const drafts = createDraftStore<{
    preview: EntityAuthoringPreview;
    action: string;
    expiresAt: number;
  }>(20);
  const tool = (
    name: string,
    description: string,
    properties: Json,
    required: string[],
    readOnly: boolean,
    execute: WebMcpTool["execute"]
  ): WebMcpTool => ({
    name,
    description,
    inputSchema: {
      type: "object",
      properties,
      required,
      additionalProperties: false,
    },
    annotations: { readOnlyHint: readOnly, untrustedContentHint: true },
    execute: (input, execution) => {
      const params = record(input);
      if (Object.keys(params).some((key) => !Object.hasOwn(properties, key)))
        throw new TypeError("包含不支持的参数");
      if (required.some((key) => params[key] === undefined))
        throw new TypeError("缺少必填参数");
      return execute(params, execution);
    },
  });
  const node = { nodeId: { type: "string", minLength: 1, maxLength: 200 } };
  const read = (name: string, description: string, action: string) =>
    tool(name, description, node, ["nodeId"], true, (input) => {
      const p = record(input);
      return d.read(action, { nodeId: nonempty(p.nodeId, "nodeId") });
    });
  const staged = (
    name: string,
    description: string,
    properties: Json,
    required: string[],
    action: string,
    validate: (p: Json) => void
  ) =>
    tool(
      name,
      description,
      properties,
      required,
      false,
      async (input, execution) => {
        const p = record(input);
        validate(p);
        const preview = await d.stage(
          `webmcp-${action === "node-creation-batch" ? "preview" : "stage"}-${action}`,
          p
        );
        execution?.signal.throwIfAborted();
        const draftId = crypto.randomUUID(),
          expiresAt = Date.now() + 300000;
        preview.operationId = draftId;
        drafts.set(draftId, { preview, action, expiresAt });
        return {
          status: "staged",
          draftId,
          expiresAt: new Date(expiresAt).toISOString(),
          preview,
        };
      }
    );
  const complete = (action: string) =>
    tool(
      `xrugc_complete_${action.replaceAll("-", "_")}`,
      "确认已预览的变更并保存实体。页面确认后查询 operationId；编辑器应用和服务端保存分别报告，未知结果不可重放创建。",
      { draftId: { type: "string", minLength: 1 } },
      ["draftId"],
      false,
      async (input, execution) => {
        const draftId = nonempty(record(input).draftId, "draftId");
        // Each completion can consume only its own proposal type.
        const approval = await confirmDraft(drafts, draftId, {
          confirm: d.confirm,
          isCurrent: (p) =>
            p.entityId === d.getEntityId() && p.proposalType === action,
          changedStatus: "entity_or_proposal_changed",
          signal: execution?.signal,
        });
        if (!approval.ok) return approval.result;
        try {
          return {
            status: "completed",
            draftId,
            ...(await d.complete(
              `webmcp-complete-${action}`,
              approval.draft.preview
            )),
          };
        } catch (error) {
          return completionFailure(error, draftId);
        }
      }
    );
  return [
    tool(
      "xrugc_get_entity_authoring_capabilities",
      "读取当前实体编辑器实际可用的扩展协议。运行器控制与编辑器预览分别声明；旧编辑器未升级不代表支持。",
      {},
      [],
      true,
      () => d.read("webmcp-get-capabilities", {})
    ),
    read(
      "xrugc_get_model_animation_metadata",
      "读取当前实体已导入模型的真实 clips、解析状态和版本。unknown/pending 不能当作无动画。",
      "webmcp-get-model-animation-metadata"
    ),
    read(
      "xrugc_get_node_authoring_properties",
      "读取 Sound 或 Text 节点可编辑字段、默认值与约束；不代表运行器已使用配置。",
      "webmcp-get-node-authoring-properties"
    ),
    staged(
      "xrugc_stage_node_authoring_properties",
      "预览 Sound 或 Text 节点属性；音频 loop/play/volume/rate 和文字内容/样式按实际节点类型校验。",
      { ...node, properties: nodeProperties },
      ["nodeId", "properties"],
      "node-authoring-properties",
      (p) => {
        nonempty(p.nodeId, "nodeId");
        record(p.properties);
      }
    ),
    complete("node-authoring-properties"),
    staged(
      "xrugc_stage_node_creation_batch",
      "预览一次创建 1–20 个资源实例、空分组或文字节点，支持同批父引用。先加载校验再整体应用，一次确认保存。跨刷新恢复先按回执和已保存 UUID 核对，勿重放整批。",
      {
        items: {
          type: "array",
          items: creationItem,
          minItems: 1,
          maxItems: 20,
        },
      },
      ["items"],
      "node-creation-batch",
      (p) => {
        if (
          !Array.isArray(p.items) ||
          p.items.length < 1 ||
          p.items.length > 20
        )
          throw new TypeError("items 需要 1–20 项");
        const keys = new Set<string>();
        for (const item of p.items) {
          const x = record(item),
            key = nonempty(x.clientKey, "clientKey");
          if (keys.has(key)) throw new TypeError("clientKey 重复");
          keys.add(key);
          if (!["resource", "empty", "text"].includes(String(x.kind)))
            throw new TypeError("kind 无效");
          if (
            x.kind === "resource" &&
            (!Number.isSafeInteger(x.resourceId) || Number(x.resourceId) <= 0)
          )
            throw new TypeError("resourceId 无效");
          if ("resource" in x)
            throw new TypeError("仅接受资源 ID，不接受资源 URL 或原始对象");
        }
      }
    ),
    complete("node-creation-batch"),
    tool(
      "xrugc_get_node_creation_operation",
      "查询当前编辑器会话内批次创建回执与每项 UUID；刷新后 unknown 不能证明未创建，须查询原服务端保存回执并读取已保存实体。",
      { operationId: { type: "string", minLength: 1 } },
      ["operationId"],
      true,
      (input) =>
        d.read("webmcp-get-node-creation-operation", {
          operationId: nonempty(record(input).operationId, "operationId"),
        })
    ),
    read(
      "xrugc_get_editor_animation_preview",
      "读取指定模型的编辑器预览状态。scope=editor-preview，不代表课程/Unity 运行状态，也不是保存回执。",
      "webmcp-get-editor-animation-preview"
    ),
    tool(
      "xrugc_control_editor_animation_preview",
      "控制编辑器预览的播放、暂停、恢复、停止或定位。仅影响临时预览；先读动画 metadata 取得 expectedAnimationVersion。不能用它配置课程按钮或承诺运行端停止。",
      {
        ...node,
        command: {
          type: "string",
          enum: ["play", "pause", "resume", "stop", "seek"],
        },
        clipIndex: { type: "integer", minimum: 0 },
        time: { type: "number", minimum: 0 },
        expectedAnimationVersion: { type: "string", minLength: 1 },
      },
      ["nodeId", "command", "expectedAnimationVersion"],
      false,
      (input) => {
        const p = record(input);
        nonempty(p.nodeId, "nodeId");
        nonempty(p.expectedAnimationVersion, "expectedAnimationVersion");
        if (
          !["play", "pause", "resume", "stop", "seek"].includes(
            String(p.command)
          )
        )
          throw new TypeError("command 无效");
        return d.read("webmcp-control-editor-animation-preview", p);
      }
    ),
  ];
}
