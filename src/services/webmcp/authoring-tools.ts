import type { WebMcpTool } from "./model-context";
import { validRevision, type WriteReceipt } from "@/api/v1/write-contract";

export type ObjectKind = "entity" | "scene";
export const ASSET_TYPES = [
  "picture",
  "polygen",
  "audio",
  "video",
  "voxel",
  "particle",
] as const;
export type AssetKind = (typeof ASSET_TYPES)[number];
export type AuthoringObject = {
  uuid?: string;
  id: number;
  kind: ObjectKind;
  name: string;
  editable: boolean;
  serverRevision?: string;
  imageId: number | null;
};
export type AuthoringAsset = {
  id: number;
  type: AssetKind;
  name: string;
  imageId: number | null;
  fileId: number | null;
  mimeType: string | null;
  size: number | null;
  metadata: unknown;
  animationNames?: string[];
  animationSource?: "stored_metadata" | "unknown";
};
type Operation = {
  operationId: string;
  actor: string;
  action: "create" | "cover";
  kind: ObjectKind;
  targetId?: number;
  status:
    | "awaiting_confirmation"
    | "submitting"
    | "completed"
    | "cancelled"
    | "conflict"
    | "rejected"
    | "unknown";
  createdAt: number;
  uuid?: string;
  result?: Record<string, unknown>;
};
type Draft = {
  operationId: string;
  actor: string;
  context: string;
  expiresAt: number;
  action: Operation["action"];
  kind: ObjectKind;
  name?: string;
  description?: string;
  uuid?: string;
  target?: AuthoringObject;
  pictureResourceId?: number;
  imageId?: number;
};
export type AuthoringDependencies = {
  actor: () => string | null;
  context: () => string;
  canCreate: (kind: ObjectKind) => boolean;
  canUpload: (kind: AssetKind) => boolean;
  capabilities: () => Record<string, unknown>;
  search: (
    kind: ObjectKind,
    query: string,
    page: number,
    pageSize: number
  ) => Promise<AuthoringObject[]>;
  read: (kind: ObjectKind, id: number) => Promise<AuthoringObject>;
  asset: (kind: AssetKind, id: number) => Promise<AuthoringAsset>;
  searchAssets: (
    kind: AssetKind,
    query: string,
    page: number,
    pageSize: number
  ) => Promise<AuthoringAsset[]>;
  create: (draft: {
    kind: ObjectKind;
    name: string;
    description: string;
    uuid: string;
    imageId?: number;
  }) => Promise<{ id: number; uuid: string }>;
  cover: (draft: {
    kind: ObjectKind;
    id: number;
    imageId: number;
    revision: string;
    operationId: string;
  }) => Promise<WriteReceipt>;
  receipt: (
    kind: ObjectKind,
    id: number,
    operationId: string
  ) => Promise<WriteReceipt>;
  open: (kind: ObjectKind, id: number) => Promise<boolean>;
  startUpload: (kind: AssetKind) => Promise<Record<string, unknown>>;
  uploadStatus: (id: string) => unknown;
  confirm: (message: string) => Promise<boolean>;
  storage?: Pick<Storage, "getItem" | "setItem">;
  now?: () => number;
};
const KEY = "xrugc-webmcp-authoring-v1";
const MAX = 100;
const TTL = 5 * 60 * 1000;
const record = (input: unknown): Record<string, unknown> => {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Expected an object");
  return input as Record<string, unknown>;
};
const positive = (value: unknown) => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)
    throw new Error("Expected a positive integer ID");
  return value;
};
const string = (value: unknown, max = 200) => {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error(`Expected text of 1–${max} characters`);
  return value.trim();
};
const kind = (value: unknown): ObjectKind => {
  if (value !== "entity" && value !== "scene")
    throw new Error("kind must be entity or scene");
  return value;
};
const assetKind = (value: unknown): AssetKind => {
  if (!ASSET_TYPES.includes(value as AssetKind))
    throw new Error("Unsupported resource type");
  return value as AssetKind;
};
const httpStatus = (e: unknown) =>
  (e as { response?: { status?: number } })?.response?.status;
const fields = {
  kind: { type: "string", enum: ["entity", "scene"] },
  id: { type: "integer", minimum: 1 },
};
const assetFields = {
  resourceType: { type: "string", enum: [...ASSET_TYPES] },
  id: fields.id,
};
const queryFields = {
  query: { type: "string", maxLength: 200 },
  page: { type: "integer", minimum: 1 },
  pageSize: { type: "integer", minimum: 1, maximum: 50 },
};
const coverAdvice =
  "强烈建议配清晰且符合内容的封面：AI 能生成则生成，否则合法网络图片或真实编辑器截图。上传素材后再绑定封面；不得假装已生图或已显示。";

export function createAuthoringTools(d: AuthoringDependencies): WebMcpTool[] {
  const now = d.now ?? Date.now;
  const drafts = new Map<string, Draft>();
  const operations = new Map<string, Operation>();
  let storageAvailable = Boolean(d.storage);
  try {
    const saved: unknown = JSON.parse(d.storage?.getItem(KEY) ?? "[]");
    if (Array.isArray(saved))
      for (const op of saved.slice(-MAX)) {
        if (
          op &&
          typeof op.operationId === "string" &&
          typeof op.actor === "string" &&
          ["create", "cover"].includes(op.action) &&
          ["entity", "scene"].includes(op.kind) &&
          Number.isFinite(op.createdAt)
        ) {
          if (op.status === "submitting") op.status = "unknown";
          if (op.status === "awaiting_confirmation") op.status = "cancelled";
          operations.set(op.operationId, op);
        }
      }
  } catch {
    storageAvailable = false;
  }
  const persist = () => {
    try {
      d.storage?.setItem(KEY, JSON.stringify([...operations.values()]));
    } catch {
      storageAvailable = false;
    }
  };
  const actor = () => {
    const id = d.actor();
    if (!id) throw new Error("请先登录");
    return id;
  };
  const assertActor = (id: string) => {
    if (d.actor() !== id) throw new Error("账号已改变，请重新读取上下文");
  };
  const current = (draft: Draft) =>
    d.actor() === draft.actor &&
    d.context() === draft.context &&
    draft.expiresAt > now();
  const publicOp = (op: Operation) => ({
    operationId: op.operationId,
    creationUuid: op.uuid,
    action: op.action,
    kind: op.kind,
    targetId: op.targetId,
    status: op.status,
    result: op.result,
    storageAvailable,
    retrySafe: false,
    nextStep:
      op.status === "unknown"
        ? "不要重新提交创建。封面可再次查询回执；创建请搜索核对对象。"
        : undefined,
  });
  const remember = (draft: Draft) => {
    for (const [id, entry] of drafts)
      if (entry.expiresAt <= now()) drafts.delete(id);
    if (drafts.size >= 20) throw new Error("待确认草稿过多，请完成或等待过期");
    drafts.set(draft.operationId, structuredClone(draft));
    return {
      draftId: draft.operationId,
      operationId: draft.operationId,
      expiresAt: draft.expiresAt,
      preview: {
        action: draft.action,
        kind: draft.kind,
        name: draft.name,
        creationUuid: draft.uuid,
        target: draft.target,
        pictureResourceId: draft.pictureResourceId,
        imageId: draft.imageId,
      },
      coverAdvice,
    };
  };
  const resolvePicture = async (id: number) => {
    const resource = await d.asset("picture", id);
    if (resource.type !== "picture" || resource.id !== id || !resource.fileId)
      throw new Error("需要可访问的图片素材及其原始图片文件");
    // Bind the picture itself, not its thumbnail or the resource row ID.
    return positive(resource.fileId);
  };
  const run = async (draft: Draft, op: Operation) => {
    try {
      const approved = await d.confirm(
        draft.action === "create"
          ? `新建${draft.kind === "scene" ? "场景" : "实体"}：${draft.name}\n${draft.description ?? ""}\n封面文件：${draft.imageId ?? "暂缺，创建后请补齐"}`
          : `设置${draft.kind === "scene" ? "场景" : "实体"} #${draft.target!.id}「${draft.target!.name}」的封面\n原文件：${draft.target!.imageId ?? "无"} → 新文件：${draft.imageId}\n当前编辑器不会自动刷新，请保护未保存内容。`
      );
      if (!approved || !current(draft)) {
        op.status = "cancelled";
        return;
      }
      if (draft.action === "create" && !d.canCreate(draft.kind)) {
        op.status = "rejected";
        return;
      }
      if (
        draft.pictureResourceId &&
        (await resolvePicture(draft.pictureResourceId)) !== draft.imageId
      ) {
        op.status = "conflict";
        return;
      }
      if (!current(draft)) {
        op.status = "cancelled";
        return;
      }
      op.status = "submitting";
      persist();
      if (draft.action === "create") {
        const result = await d.create({
          kind: draft.kind,
          name: draft.name!,
          description: draft.description ?? "",
          uuid: draft.uuid!,
          imageId: draft.imageId,
        });
        positive(result.id);
        if (result.uuid !== draft.uuid)
          throw new Error("Creation acknowledgment mismatch");
        op.targetId = result.id;
        op.result = {
          id: result.id,
          uuid: result.uuid,
          coverImageId: draft.imageId ?? null,
          coverDisplayVerified: false,
        };
        op.status = "completed";
      } else {
        const receipt = await d.cover({
          kind: draft.kind,
          id: draft.target!.id,
          imageId: draft.imageId!,
          revision: draft.target!.serverRevision!,
          operationId: op.operationId,
        });
        op.status = "completed";
        op.result = {
          receipt,
          coverImageId: draft.imageId,
          bindingVerified: false,
          coverDisplayVerified: false,
          editorReloadRequired: true,
        };
        persist();
        // An acknowledged save remains completed even if readback fails or identity changes.
        if (d.actor() !== op.actor) return;
        try {
          const refreshed = await d.read(draft.kind, draft.target!.id);
          assertActor(op.actor);
          op.result.bindingVerified = refreshed.imageId === draft.imageId;
        } catch {
          /* Keep acknowledged receipt. */
        }
      }
    } catch (error) {
      if (op.status !== "completed") {
        const status = httpStatus(error);
        op.status =
          status === 409 || status === 412
            ? "conflict"
            : status && [400, 401, 403, 404, 422].includes(status)
              ? "rejected"
              : op.status === "submitting"
                ? "unknown"
                : "rejected";
      }
    } finally {
      persist();
    }
  };
  const tool = (
    name: string,
    description: string,
    properties: Record<string, unknown>,
    required: string[],
    readOnly: boolean,
    execute: (input: Record<string, unknown>) => unknown
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
    execute: (input) => execute(record(input)),
  });
  const paging = (input: Record<string, unknown>) => ({
    query:
      input.query === undefined || input.query === ""
        ? ""
        : string(input.query),
    page: input.page === undefined ? 1 : positive(input.page),
    pageSize:
      input.pageSize === undefined
        ? 20
        : Math.min(50, positive(input.pageSize)),
  });
  return [
    tool(
      "xrugc_get_authoring_capabilities",
      "读取实际注册工具、契约版本和当前权限。对象级写权限以 API 为准。",
      {},
      [],
      true,
      () => ({
        contractVersion: "1.1.0",
        ...d.capabilities(),
        authenticated: Boolean(d.actor()),
        createKinds: (["entity", "scene"] as const).filter(
          (k) => d.actor() && d.canCreate(k)
        ),
        uploadTypes: ASSET_TYPES.filter((k) => d.actor() && d.canUpload(k)),
        limitations: {
          durableCreateIdempotency: false,
          uploadNeedsUserFileSelection: true,
          generatedImagesProvidedByClient: true,
          runtimeAcceptanceIncluded: false,
        },
        coverAdvice,
      })
    ),
    tool(
      "xrugc_search_authoring_objects",
      "按名称查找可访问的场景或实体，分页结果不代表全部对象。",
      { kind: fields.kind, ...queryFields },
      ["kind"],
      true,
      async (input) => {
        const owner = actor();
        const k = kind(input.kind);
        const p = paging(input);
        const items = await d.search(k, p.query, p.page, p.pageSize);
        assertActor(owner);
        return {
          kind: k,
          ...p,
          items,
          hasMorePossible: items.length === p.pageSize,
        };
      }
    ),
    tool(
      "xrugc_open_authoring_object",
      "打开场景或实体编辑器，保留现有未保存提示；被取消时 opened=false。",
      fields,
      ["kind", "id"],
      false,
      async (input) => {
        const owner = actor();
        const context = d.context();
        const k = kind(input.kind);
        const id = positive(input.id);
        await d.read(k, id);
        assertActor(owner);
        if (d.context() !== context)
          return { opened: false, reason: "context_changed" };
        const opened = await d.open(k, id);
        assertActor(owner);
        return { opened, kind: k, id };
      }
    ),
    tool(
      "xrugc_stage_authoring_creation",
      `预览新建场景或实体，不写入。${coverAdvice}`,
      {
        kind: fields.kind,
        name: { type: "string", minLength: 1, maxLength: 200 },
        description: { type: "string", maxLength: 255 },
        pictureResourceId: fields.id,
      },
      ["kind", "name"],
      true,
      async (input) => {
        const owner = actor();
        const context = d.context();
        const k = kind(input.kind);
        if (!d.canCreate(k)) throw new Error("当前账号不能创建此类对象");
        const name = string(input.name);
        const description =
          input.description === undefined || input.description === ""
            ? ""
            : string(input.description, 255);
        const pictureResourceId =
          input.pictureResourceId === undefined
            ? undefined
            : positive(input.pictureResourceId);
        const imageId = pictureResourceId
          ? await resolvePicture(pictureResourceId)
          : undefined;
        assertActor(owner);
        if (context !== d.context()) throw new Error("页面已改变");
        return remember({
          operationId: crypto.randomUUID(),
          actor: owner,
          context,
          expiresAt: now() + TTL,
          action: "create",
          kind: k,
          name,
          description,
          uuid: crypto.randomUUID(),
          pictureResourceId,
          imageId,
        });
      }
    ),
    tool(
      "xrugc_get_object_cover",
      "读取已保存封面关联，不代表图片已在页面显示。",
      fields,
      ["kind", "id"],
      true,
      async (input) => {
        const owner = actor();
        const object = await d.read(kind(input.kind), positive(input.id));
        assertActor(owner);
        return {
          object,
          hasCover: Boolean(object.imageId),
          coverDisplayVerified: false,
          coverAdvice,
        };
      }
    ),
    tool(
      "xrugc_stage_object_cover",
      "预览绑定图片素材为封面；只改 image_id，不保存编辑器未保存内容。",
      { ...fields, pictureResourceId: fields.id },
      ["kind", "id", "pictureResourceId"],
      true,
      async (input) => {
        const owner = actor();
        const context = d.context();
        const k = kind(input.kind);
        const id = positive(input.id);
        const target = await d.read(k, id);
        assertActor(owner);
        if (!target.editable || !validRevision(target.serverRevision))
          throw new Error("对象不可编辑或服务器未提供版本，请重新读取");
        const pictureResourceId = positive(input.pictureResourceId);
        const imageId = await resolvePicture(pictureResourceId);
        assertActor(owner);
        if (context !== d.context()) throw new Error("页面已改变");
        return remember({
          operationId: crypto.randomUUID(),
          actor: owner,
          context,
          expiresAt: now() + TTL,
          action: "cover",
          kind: k,
          target,
          pictureResourceId,
          imageId,
        });
      }
    ),
    tool(
      "xrugc_complete_authoring_draft",
      "请求用户确认新建或封面草稿，立即返回 operationId。重复调用同一草稿不会重复写入；请查询操作状态。",
      { draftId: { type: "string" } },
      ["draftId"],
      false,
      (input) => {
        const owner = actor();
        const id = string(input.draftId);
        const previous = operations.get(id);
        if (previous?.actor === owner) return publicOp(previous);
        const draft = drafts.get(id);
        if (!draft || !current(draft)) throw new Error("草稿失效，请重新预览");
        if (operations.size >= MAX)
          throw new Error("本会话操作记录已满，请先核对结果后使用新标签页");
        drafts.delete(id);
        const op: Operation = {
          operationId: id,
          actor: owner,
          action: draft.action,
          kind: draft.kind,
          targetId: draft.target?.id,
          status: "awaiting_confirmation",
          createdAt: now(),
          uuid: draft.uuid,
        };
        operations.set(id, op);
        persist();
        void run(draft, op);
        return publicOp(op);
      }
    ),
    tool(
      "xrugc_get_authoring_operation",
      "查询本会话创作操作；unknown 封面尝试读取服务端回执，新建绝不自动重试。",
      { operationId: { type: "string" } },
      ["operationId"],
      true,
      async (input) => {
        const owner = actor();
        const op = operations.get(string(input.operationId));
        if (!op || op.actor !== owner) return { status: "not_found" };
        if (op.status === "unknown" && op.action === "cover" && op.targetId) {
          try {
            const receipt = await d.receipt(
              op.kind,
              op.targetId,
              op.operationId
            );
            assertActor(owner);
            op.status = "completed";
            op.result = {
              receipt,
              bindingVerified: false,
              coverDisplayVerified: false,
              editorReloadRequired: true,
            };
            persist();
          } catch {
            /* Unknown is not failure or permission to replay. */
          }
        }
        assertActor(owner);
        return publicOp(op);
      }
    ),
    tool(
      "xrugc_reconcile_authoring_creation",
      "新建结果 unknown 时，通过搜索得到的对象 ID 与该操作 creationUuid 精确对照；只核对，不重建或覆盖对象。",
      { operationId: { type: "string" }, id: fields.id },
      ["operationId", "id"],
      true,
      async (input) => {
        const owner = actor();
        const op = operations.get(string(input.operationId));
        if (
          !op ||
          op.actor !== owner ||
          op.action !== "create" ||
          op.status !== "unknown" ||
          !op.uuid
        )
          throw new Error("当前操作不需要新建核对");
        const found = await d.read(op.kind, positive(input.id));
        assertActor(owner);
        if (found.uuid !== op.uuid)
          throw new Error("对象 UUID 与创建操作不匹配");
        op.targetId = found.id;
        op.status = "completed";
        op.result = {
          id: found.id,
          uuid: found.uuid,
          verification: "uuid_readback",
          coverImageId: found.imageId,
          coverDisplayVerified: false,
        };
        persist();
        return publicOp(op);
      }
    ),
    tool(
      "xrugc_search_authoring_assets",
      "按类型和名称搜索素材，返回有界元数据，不读取文件二进制。",
      { resourceType: assetFields.resourceType, ...queryFields },
      ["resourceType"],
      true,
      async (input) => {
        const owner = actor();
        const type = assetKind(input.resourceType);
        const p = paging(input);
        const items = await d.searchAssets(type, p.query, p.page, p.pageSize);
        assertActor(owner);
        return {
          resourceType: type,
          ...p,
          items,
          hasMorePossible: items.length === p.pageSize,
        };
      }
    ),
    tool(
      "xrugc_get_asset_metadata",
      "查询素材真实类型、文件 ID、大小及平台存储的有界元数据；未知字段不推测。",
      assetFields,
      ["resourceType", "id"],
      true,
      async (input) => {
        const owner = actor();
        const result = await d.asset(
          assetKind(input.resourceType),
          positive(input.id)
        );
        assertActor(owner);
        return result;
      }
    ),
    tool(
      "xrugc_start_authoring_upload",
      "在当前标签页打开现有素材上传页面，需要用户选择文件。返回 uploadId 后查询状态，打开窗口不代表上传完成。",
      { resourceType: assetFields.resourceType },
      ["resourceType"],
      false,
      async (input) => {
        const owner = actor();
        const type = assetKind(input.resourceType);
        if (!d.canUpload(type)) throw new Error("当前账号不能上传此类型");
        const result = await d.startUpload(type);
        assertActor(owner);
        return result;
      }
    ),
    tool(
      "xrugc_get_authoring_upload",
      "查询当前标签页上传工作流的真实资源创建回调。刷新不保留此跟踪；无回调不能声称上传成功。",
      { uploadId: { type: "string" } },
      ["uploadId"],
      true,
      (input) => {
        actor();
        return d.uploadStatus(string(input.uploadId));
      }
    ),
  ];
}
