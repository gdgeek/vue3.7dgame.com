import {
  resourceReadError,
  validateResourcePin,
} from "@/services/webmcp/resource-diagnostic";
import {
  createAuthoringObject,
  getAuthoringCreation,
} from "@/api/v1/authoring-create";
import type { WebMcpTool } from "@/services/webmcp/model-context";
import {
  getRegisteredWebMcpTools,
  getRegisteredWebMcpSchema,
  invokeRegisteredWebMcpTool,
} from "@/services/webmcp/model-context";
import { createAuthoringDependencyTools } from "@/services/webmcp/authoring-dependencies";
import { serverTaskStore } from "@/services/webmcp/authoring-task-store";
import { createAuthoringTaskTools } from "@/services/webmcp/authoring-task-tools";
import { createAuthoringScriptAssistanceTools } from "@/services/webmcp/authoring-script-assistance";
import {
  createAuthoringProjectTools,
  type EditableSource,
} from "@/services/webmcp/authoring-project-tools";
import type { ObjectKind } from "@/services/webmcp/authoring-tools";
import { getMeta, putMetaCode } from "@/api/v1/meta";
import { getVerse, putVerse, putVerseCode } from "@/api/v1/verse";
import { getResource } from "@/api/v1/resources";
import {
  getWriteReceipt,
  validRevision,
  type WriteReceipt,
} from "@/api/v1/write-protocol";
import type { JsonValue } from "@/api/v1/types/common";
import type { Events } from "@/api/v1/types/meta";

type Options = {
  actor: () => string | null;
  context: () => string;
  getTarget: () => { kind: ObjectKind; id: number } | null;
  canCreate: (kind: ObjectKind) => boolean;
  confirm: (message: string) => Promise<boolean>;
};
export function createAdvancedAuthoringTools(d: Options): WebMcpTool[] {
  const read = async (
    kind: ObjectKind,
    id: number
  ): Promise<EditableSource & { relatedSceneIds?: number[] }> => {
    if (kind === "entity") {
      const data = (await getMeta(id, { expand: "metaCode,verseMetas" })).data;
      if (data.id !== id || !validRevision(data.serverRevision))
        throw new Error("实体响应缺少有效版本");
      return {
        kind,
        id,
        uuid: data.uuid,
        name: data.title,
        serverRevision: data.serverRevision,
        data: data.data,
        info: data.info,
        events: data.events,
        description: null,
        imageId: data.image_id,
        code: data.metaCode ?? null,
        resources: (data.resources ?? []).map((r) => ({
          id: r.id,
          type: r.type,
        })),
        relatedSceneIds: data.verseMetas?.map((v) => v.verse_id),
      };
    }
    const data = (await getVerse(id, "verseCode,metas,image")).data;
    if (data.id !== id || !validRevision(data.serverRevision))
      throw new Error("场景响应缺少有效版本");
    return {
      kind,
      id,
      uuid: data.uuid,
      name: data.name,
      serverRevision: data.serverRevision,
      data: data.data,
      info: data.info,
      events: null,
      description: data.description,
      imageId:
        (data.image_id === undefined ? data.image?.id : data.image_id) ?? null,
      code: data.verseCode ?? null,
      resources: [],
      entityIds: data.metas?.map((m) => m.id),
    };
  };
  const asset = async (type: string, id: number) => {
    const data = await getResource(type, id, "file")
      .then((response) => response.data)
      .catch((cause) => {
        throw resourceReadError(cause, type, id);
      });
    validateResourcePin(
      {
        id: data.id,
        type: data.type,
        fileId: data.file?.id,
        md5: data.file?.md5,
      },
      { id, type }
    );
    return {
      id,
      type,
      name: (data.name ?? "").slice(0, 200),
      fileId: data.file!.id,
      md5: data.file!.md5!,
    };
  };
  const availableTools = () => getRegisteredWebMcpTools().map((t) => t.name);
  const readReceipt = async (
    kind: ObjectKind,
    id: number,
    operationId: string
  ) =>
    (
      await getWriteReceipt(
        kind === "entity" ? "meta" : "verse",
        id,
        operationId
      )
    ).data;
  return [
    ...createAuthoringDependencyTools({ ...d, read, asset }),
    ...createAuthoringTaskTools({
      ...d,
      store: serverTaskStore,
      queryAuthoringOperation: async (operationId, preview) => {
        const kind = preview.kind;
        if (kind !== "entity" && kind !== "scene")
          throw new Error("创作目标类型不可用");
        // A live confirmation may be cancelled or still pending. Preserve its local state.
        const local = (await invokeRegisteredWebMcpTool(
          "xrugc_get_authoring_operation",
          { operationId, kind }
        )) as { status?: string };
        if (
          local &&
          !["unknown", "not_found", "not_observed"].includes(
            String(local.status)
          )
        )
          return local;
        if (preview.action === "create") {
          const ack = await getAuthoringCreation(kind, operationId);
          return {
            operationId,
            status: "completed",
            kind,
            targetId: ack.id,
            result: { id: ack.id, uuid: ack.uuid, receipt: ack.writeReceipt },
            verification: "server_acknowledged",
          };
        }
        const target = preview.target as { id?: number } | undefined;
        if (preview.action !== "cover" || !target?.id)
          throw new Error("封面目标不可用");
        const receipt = await readReceipt(kind, target.id, operationId);
        return {
          operationId,
          status: "completed",
          kind,
          targetId: target.id,
          result: {
            receipt,
            bindingVerified: false,
            coverDisplayVerified: false,
          },
          verification: "server_acknowledged",
        };
      },
      getAvailableTools: availableTools,
      invokeTool: invokeRegisteredWebMcpTool,
    }),
    ...createAuthoringScriptAssistanceTools({
      ...d,
      availableTools,
      invokeTool: invokeRegisteredWebMcpTool,
    }),
    ...createAuthoringProjectTools({
      ...d,
      download: (backup) => {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(backup, null, 2)], {
            type: "application/json",
          })
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = `xrugc-editable-${backup.body.root.kind}-${backup.body.root.id}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      read: async (kind, id) => {
        const source = await read(kind, id);
        const { relatedSceneIds: _privateRelation, ...exportable } = source;
        return exportable;
      },
      resource: async (type, id) => {
        const detail = await asset(type, id);
        return {
          id: detail.id,
          type: detail.type,
          fileId: detail.fileId,
          md5: detail.md5,
        };
      },
      async create(source, uuid, name, operationId) {
        const data = await createAuthoringObject(
          source.kind,
          operationId,
          source.kind === "entity"
            ? {
                title: name,
                uuid,
                data: source.data as JsonValue,
                info: source.info as string | null,
                events: source.events as Events | null,
              }
            : {
                name,
                uuid,
                description: (source.description ?? "").slice(0, 255),
              }
        );
        if (!validRevision(data.serverRevision))
          throw new Error("创建响应缺少服务器版本；请通过 UUID 核对");
        // Creation responses can precede the backend's JSON/default normalization.
        // Read the new object before using its revision in the first guarded write.
        const current = await read(source.kind, data.id);
        if (
          data.uuid !== uuid ||
          current.uuid !== uuid ||
          current.name !== name
        )
          throw new Error("新建对象回读不匹配；请通过 UUID 核对");
        return {
          id: current.id,
          uuid: current.uuid,
          serverRevision: current.serverRevision,
        };
      },
      async write(target, part, payload) {
        let receipt: WriteReceipt | undefined;
        const options = {
          operationId: target.operationId,
          expectedRevision: target.revision,
          onAcknowledged: (r: WriteReceipt) => {
            receipt = r;
          },
        };
        if (part === "code") {
          const code = payload as { blockly: string; lua: string; js: string };
          if (target.kind === "entity")
            await putMetaCode(target.id, code, options);
          else await putVerseCode(target.id, code, options);
        } else {
          if (target.kind !== "scene")
            throw new Error("仅场景需要重新绑定实体引用");
          await putVerse(
            target.id,
            payload as { data: JsonValue; info: string | null },
            options
          );
        }
        if (!receipt) throw new Error("未取得保存回执");
        return receipt;
      },
      receipt: readReceipt,
    }),
    {
      name: "xrugc_get_authoring_tool_schema",
      description:
        "读取当前实际注册工具的完整参数 schema，例如组件设置字段、数值范围和枚举；不存在时返回 unavailable，不能猜测未支持的参数。",
      inputSchema: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute(input) {
        const name = (input as { name?: unknown })?.name;
        if (typeof name !== "string" || name.length > 120)
          throw new Error("工具名无效");
        return {
          contractVersion: "1.2.0",
          tool: getRegisteredWebMcpSchema(name),
          available: availableTools().includes(name),
          nextStep:
            "组件类型/字段看 stage_component_batch；当前节点组件看 get_node_components；积木样例与字段看 get_script_block_catalog。",
        };
      },
    },
  ];
}
