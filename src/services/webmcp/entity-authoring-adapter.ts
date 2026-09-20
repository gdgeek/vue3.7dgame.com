import type {
  EntityAuthoringExtensions,
  EntityAuthoringPreview,
} from "./entity-authoring-extension-tools";
import { WebMcpCompletionError } from "./completion-result";

type Json = Record<string, unknown>;
type Dependencies = {
  getEntityId: () => number | null;
  assertWritable: () => Promise<void>;
  request: (action: string, input?: Json, timeout?: number) => Promise<Json>;
  fetchResource: (type: string, id: number) => Promise<Json>;
  confirm: (preview: EntityAuthoringPreview) => Promise<boolean>;
  save: (response: Json, message: string, preview: object) => Promise<Json>;
};
const checked = (response: Json) => {
  if (response.ok !== true)
    throw Object.assign(
      new Error(String(response.error ?? "编辑器扩展操作失败")),
      { code: response.code, bridgeResult: stripSnapshot(response) }
    );
  return response;
};
const stripSnapshot = (value: Json) => {
  // Full scene bodies and signed resource URLs are not needed in tool results.
  const { meta, events, resources, ...result } = value;
  void meta;
  void events;
  void resources;
  return result;
};
const summaryItems = (items: unknown) =>
  Array.isArray(items)
    ? items.map((item) => {
        const { resource, ...rest } = item as Json;
        const r = resource as Json | undefined;
        return {
          ...rest,
          ...(r ? { resourceId: r.id, resourceType: r.type } : {}),
        };
      })
    : items;

export function createEntityAuthoringAdapter(
  d: Dependencies
): EntityAuthoringExtensions {
  const request = async (action: string, input: Json) => {
    const capabilities = checked(await d.request("webmcp-get-capabilities"));
    if (
      action !== "webmcp-get-capabilities" &&
      (!Array.isArray(capabilities.capabilities) ||
        !capabilities.capabilities.includes(action))
    )
      throw Object.assign(
        new Error("编辑器尚未提供此能力，请先更新编辑器并重新发现工具"),
        { code: "CAPABILITY_UNAVAILABLE" }
      );
    if (action === "webmcp-get-capabilities") return capabilities;
    const result = await d.request(action, input, 120000);
    return action === "webmcp-get-node-creation-operation"
      ? result
      : checked(result);
  };
  const resources = async (input: Json) => {
    const items = input.items as Json[];
    const output: Json[] = [];
    const resolved = new Map<string, Promise<Json>>();
    for (const item of items) {
      if (item.kind !== "resource") {
        output.push({ ...item });
        continue;
      }
      if (
        !["polygen", "picture", "video", "voxel", "audio", "particle"].includes(
          String(item.resourceType)
        )
      )
        throw new TypeError("resourceType 无效");
      const key = `${item.resourceType}:${item.resourceId}`;
      if (!resolved.has(key))
        resolved.set(
          key,
          d.fetchResource(String(item.resourceType), Number(item.resourceId))
        );
      const resource = await resolved.get(key)!;
      if (
        String(resource.id) !== String(item.resourceId) ||
        resource.type !== item.resourceType
      )
        throw new Error("素材身份或类型不匹配");
      output.push({ ...item, resource });
    }
    return { ...input, items: output };
  };
  return {
    getEntityId: d.getEntityId,
    confirm: d.confirm,
    async read(action, input) {
      const result = stripSnapshot(await request(action, input));
      if (action === "webmcp-get-capabilities")
        return {
          ...result,
          scope: "entity-editor",
          runtimeAnimationControl: false,
          unityRuntimeControl: false,
          creationBatchSupported:
            Array.isArray(result.capabilities) &&
            result.capabilities.includes("webmcp-complete-node-creation-batch"),
          maxCreationBatchItems:
            Array.isArray(result.capabilities) &&
            result.capabilities.includes("webmcp-complete-node-creation-batch")
              ? 20
              : null,
          creationRecovery: "read_saved_nodes_and_original_save_receipt",
        };
      return result;
    },
    async stage(action, input) {
      await d.assertWritable();
      const entityId = d.getEntityId();
      if (!entityId) throw new Error("实体未就绪");
      const creation = action === "webmcp-preview-node-creation-batch";
      const payload = creation ? await resources(input) : input;
      const result = await request(action, payload);
      // The draft keeps only IDs/version metadata; complete resolves resource URLs afresh.
      return {
        ...stripSnapshot(result),
        items: summaryItems(result.items),
        entityId,
        proposalType: creation
          ? "node-creation-batch"
          : "node-authoring-properties",
        resourceVersions: creation
          ? (payload.items as Json[])
              .filter((x) => x.resource)
              .map((x) => {
                const r = x.resource as Json;
                return {
                  clientKey: x.clientKey,
                  id: r.id,
                  type: r.type,
                  updatedAt: r.updated_at,
                  fileId: (r.file as Json)?.id,
                  md5: (r.file as Json)?.md5,
                };
              })
          : undefined,
      };
    },
    async complete(action, preview) {
      await d.assertWritable();
      const creation = action === "webmcp-complete-node-creation-batch";
      let payload: Json = { ...preview };
      if (creation) {
        payload = await resources({ ...preview, items: preview.items });
        const versions = preview.resourceVersions as Json[];
        for (const item of payload.items as Json[]) {
          if (!item.resource) continue;
          const r = item.resource as Json,
            old = versions.find((v) => v.clientKey === item.clientKey),
            file = r.file as Json;
          if (
            !old ||
            old.updatedAt !== r.updated_at ||
            old.fileId !== file?.id ||
            old.md5 !== file?.md5
          )
            throw new Error("素材在预览后变化，请重新预览");
        }
      }
      let response: Json;
      try {
        response = await request(action, payload);
      } catch (error) {
        const failed = (error as { bridgeResult?: Json })?.bridgeResult;
        const rejectedBeforeWrite = [
          "ANIMATION_PREVIEW_ACTIVE",
          "CAPABILITY_UNAVAILABLE",
        ].includes(String((error as { code?: string })?.code));
        if (failed?.status === "not_applied" || rejectedBeforeWrite)
          return {
            status: "failed",
            errorCode: failed?.code ?? (error as { code?: string })?.code,
            editorApplied: false,
            persistence: "not_submitted",
            operationId: preview.operationId,
            items: failed?.items,
            recovery: failed?.recovery,
          };
        // A transport failure after dispatch does not prove that the editor applied nothing.
        throw new WebMcpCompletionError(
          {
            status: "partial",
            editorApplied: "unknown",
            persistence: "unverified",
            operationId: preview.operationId,
            plannedItems: summaryItems(preview.items),
            retry: "read_state_before_retry",
          },
          error instanceof Error ? error.message : undefined
        );
      }
      let saved: Json;
      try {
        saved = await d.save(
          response,
          "编辑器已应用变更，但保存尚未核实，请查原回执与节点 UUID",
          preview
        );
      } catch (error) {
        const prior =
          error instanceof WebMcpCompletionError
            ? error.result
            : {
                status: "partial",
                persistence: "unverified",
                retry: "read_state_before_retry",
              };
        throw new WebMcpCompletionError(
          {
            ...stripSnapshot(response),
            editorApplied: true,
            editorStatus: response.status,
            operationId: preview.operationId,
            ...prior,
          },
          "编辑器变更已应用，保存尚未核实；保留节点 UUID 并查询原保存回执，不要重建。"
        );
      }
      return {
        ...stripSnapshot(response),
        editorStatus: response.status,
        ...saved,
        status: "completed",
      };
    },
  };
}
