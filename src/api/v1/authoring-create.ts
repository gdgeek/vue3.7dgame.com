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
export type CreationLookup = {
  contractVersion: "creation-recovery-v1";
  targetType: "meta" | "verse";
  operationId: string | null;
  creationUuid: string | null;
  status:
    | "completed"
    | "observed"
    | "not_observed"
    | "indeterminate"
    | "conflict";
  reason: string;
  verification: "server_acknowledged" | "uuid_readback" | "none";
  operationVerified: boolean;
  retrySafe: false;
  id?: number;
  uuid?: string;
  currentRevision?: string;
  serverRevision?: string;
  writeReceipt?: CreationAck["writeReceipt"];
  requestHash?: string;
  recordedAt?: number;
};
export class CreationEvidenceError extends Error {}
export const creationQueryFailure = (error: unknown) => {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  return {
    status: "unknown" as const,
    operationStatus: "indeterminate" as const,
    serverStatus: status === 404 ? "not_observed" : "unavailable",
    reason:
      error instanceof CreationEvidenceError
        ? "invalid_server_evidence"
        : status === 401
          ? "authentication_required"
          : status === 403
            ? "permission_denied"
            : status === 404
              ? "receipt_or_endpoint_not_observed"
              : status === 409
                ? "operation_conflict"
                : status === 400 || status === 422
                  ? "invalid_query"
                  : "query_unavailable",
    httpStatus: status ?? null,
    verification: "none" as const,
    operationVerified: false,
    retrySafe: false,
    nextStep:
      "查询原标识或检查查询权限与服务状态；未观察到证据不等于未创建，不重放创建。",
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
    throw new CreationEvidenceError(
      "未取得匹配的新建回执；请查询原操作，不要重复创建"
    );
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

export async function lookupAuthoringCreation(
  kind: ObjectKind,
  query: { operationId?: string; creationUuid?: string }
): Promise<CreationLookup> {
  if (
    (!query.operationId && !query.creationUuid) ||
    (query.operationId !== undefined && !validOperationId(query.operationId)) ||
    (query.creationUuid !== undefined && !validOperationId(query.creationUuid))
  )
    throw new Error("需要有效的原 operationId 或 creationUuid");
  const operationId = query.operationId?.toLowerCase() ?? null;
  const creationUuid = query.creationUuid?.toLowerCase() ?? null;
  const response = await request<CreationLookup>({
    url: `/v1/${collection(kind)}/create-operations`,
    method: "get",
    params: {
      operationId: operationId ?? undefined,
      creationUuid: creationUuid ?? undefined,
    },
    skipErrorMessage: true,
  });
  const data = response.data;
  const fail = () => {
    throw new CreationEvidenceError("创建查询返回的证据不匹配");
  };
  if (
    !data ||
    data.contractVersion !== "creation-recovery-v1" ||
    data.targetType !== (kind === "entity" ? "meta" : "verse") ||
    data.operationId !== operationId ||
    data.creationUuid !== creationUuid ||
    data.retrySafe !== false ||
    typeof data.reason !== "string"
  )
    fail();
  if (data.status === "completed") {
    if (
      !operationId ||
      data.verification !== "server_acknowledged" ||
      data.operationVerified !== true
    )
      fail();
    verify(
      {
        id: data.id!,
        uuid: data.uuid!,
        serverRevision: data.serverRevision!,
        writeReceipt: data.writeReceipt!,
        replayed: true,
      },
      kind,
      operationId!
    );
    if (creationUuid && data.uuid?.toLowerCase() !== creationUuid) fail();
  } else if (data.status === "observed") {
    if (
      !creationUuid ||
      data.verification !== "uuid_readback" ||
      data.operationVerified !== false ||
      !Number.isSafeInteger(data.id) ||
      data.id! <= 0 ||
      data.uuid?.toLowerCase() !== creationUuid ||
      !validRevision(data.currentRevision) ||
      data.writeReceipt !== undefined ||
      data.serverRevision !== undefined
    )
      fail();
  } else if (
    ["not_observed", "indeterminate", "conflict"].includes(data.status)
  ) {
    if (
      data.verification !== "none" ||
      data.operationVerified !== false ||
      data.id !== undefined ||
      data.uuid !== undefined ||
      data.writeReceipt !== undefined ||
      data.serverRevision !== undefined ||
      data.currentRevision !== undefined
    )
      fail();
  } else fail();
  return data;
}
