import request from "@/utils/request";
import { validOperationId, validRevision } from "./write-contract";
import type { ObjectKind } from "@/services/webmcp/authoring-tools";
export type CreationAck = {
  id: number;
  uuid: string;
  serverRevision: string;
  replayed: boolean;
  writeReceipt: {
    operationId: string;
    action: "create";
    status: "completed";
    targetType: "meta" | "verse";
    targetId: number;
    serverRevision: string;
    uuid: string;
  };
};
const collection = (kind: ObjectKind) =>
  kind === "entity" ? "metas" : "verses";
const verify = (data: CreationAck, kind: ObjectKind, operationId: string) => {
  const r = data?.writeReceipt;
  if (
    !r ||
    r.operationId !== operationId ||
    r.action !== "create" ||
    r.status !== "completed" ||
    r.targetType !== (kind === "entity" ? "meta" : "verse") ||
    !Number.isSafeInteger(data.id) ||
    data.id <= 0 ||
    r.targetId !== data.id ||
    typeof data.uuid !== "string" ||
    !data.uuid ||
    r.uuid !== data.uuid ||
    data.serverRevision !== r.serverRevision ||
    !validRevision(r.serverRevision)
  )
    throw new Error("未取得匹配的新建回执；请查询原操作，不要重复创建");
  return data;
};
export async function createAuthoringObject(
  kind: ObjectKind,
  operationId: string,
  body: Record<string, unknown>
) {
  if (!validOperationId(operationId)) throw new Error("新建操作 ID 无效");
  const response = await request<CreationAck>({
    url: `/v1/${collection(kind)}`,
    method: "post",
    data: body,
    headers: { "Idempotency-Key": operationId },
  });
  return verify(response.data, kind, operationId);
}
export async function getAuthoringCreation(
  kind: ObjectKind,
  operationId: string
) {
  if (!validOperationId(operationId)) throw new Error("新建操作 ID 无效");
  const response = await request<CreationAck>({
    url: `/v1/${collection(kind)}/create-operations/${encodeURIComponent(operationId)}`,
    method: "get",
    skipErrorMessage: true,
  });
  return verify(response.data, kind, operationId);
}
