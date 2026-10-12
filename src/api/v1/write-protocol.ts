import {
  captureConflictScope,
  recordConflict,
  clearConflict,
} from "@/services/webmcp/conflict-recovery";
import request from "@/utils/request";

import {
  validRevision,
  validOperationId,
  type WriteOptions,
  type WriteReceipt,
  type WriteTarget,
} from "./write-contract";
export * from "./write-contract";

export async function guardedWrite<T>(
  url: string,
  method: "put" | "post",
  data: unknown,
  target: Pick<WriteTarget, "targetType" | "targetId">,
  action: WriteReceipt["action"],
  options: WriteOptions
) {
  if (
    !validOperationId(options.operationId) ||
    !validRevision(options.expectedRevision)
  )
    throw new Error("写入缺少有效操作 ID 或服务器版本，未提交");
  const recoveryScope = captureConflictScope(target);
  // Capture the submitted payload, not a later mutable editor reference.
  const localJson =
    recoveryScope !== null && action !== "publish"
      ? JSON.stringify(data)
      : null;
  options.onSubmitting?.();
  const response = await request<
    T & { serverRevision: string; writeReceipt: WriteReceipt }
  >({
    url,
    method,
    data,
    headers: {
      "Idempotency-Key": options.operationId,
      "If-Match": `"${options.expectedRevision}"`,
    },
  }).catch((error: unknown) => {
    if (
      localJson &&
      (error as { response?: { status?: number } })?.response?.status === 409
    )
      recordConflict(recoveryScope, {
        ...target,
        action,
        operationId: options.operationId,
        expectedRevision: options.expectedRevision,
        localJson,
      });
    throw error;
  });
  const receipt = response.data?.writeReceipt;
  if (
    !receipt ||
    receipt.operationId !== options.operationId ||
    receipt.targetType !== target.targetType ||
    receipt.targetId !== target.targetId ||
    receipt.action !== action ||
    receipt.status !== "completed" ||
    !validRevision(receipt.serverRevision)
  ) {
    throw new Error(
      `服务器未返回匹配的写入回执；请查询操作 ${options.operationId}，不要重复提交`
    );
  }
  clearConflict(recoveryScope, options.operationId);
  options.onAcknowledged?.(receipt);
  return response;
}

export const getWriteReceipt = (
  targetType: WriteTarget["targetType"],
  targetId: number,
  operationId: string
) => {
  if (
    !validOperationId(operationId) ||
    !Number.isSafeInteger(targetId) ||
    targetId <= 0
  )
    throw new Error("操作 ID 或目标 ID 无效");
  return request<WriteReceipt>({
    url: `/v1/${targetType === "verse" ? "verses" : "metas"}/${targetId}/operations/${operationId}`,
    method: "get",
    skipErrorMessage: true,
  });
};

export type ScenePublicationState = {
  sceneId: number;
  published: boolean;
  snapshotId: number | null;
  snapshotUuid: string | null;
  verification: "current_snapshot";
};
export const getScenePublication = (id: number) => {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("场景 ID 无效");
  return request<ScenePublicationState>({
    url: `/v1/verses/${id}/publication`,
    method: "get",
    skipErrorMessage: true,
  });
};
