export type WriteTarget = {
  targetType: "verse" | "meta";
  targetId: number;
  serverRevision: string;
};
export type WriteReceipt = WriteTarget & {
  operationId: string;
  action: "save" | "save_code" | "publish";
  status: "completed";
  snapshotId?: number;
  publicationVersionId?: string;
  contentHash?: string;
  schemaVersion?: number;
  language?: "lua" | "js";
};
export type WriteOptions = {
  operationId: string;
  expectedRevision: string;
  onSubmitting?: () => void;
  onAcknowledged?: (receipt: WriteReceipt) => void;
};
export const validRevision = (value: unknown): value is string =>
  typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
export const validOperationId = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);

export const createWriteOptions = (revision: unknown): WriteOptions => {
  if (!validRevision(revision))
    throw new Error("尚未取得服务器内容版本，请重新加载编辑器后再保存或发布");
  return { operationId: crypto.randomUUID(), expectedRevision: revision };
};

export const applyWriteRevision = (
  target: { serverRevision?: string } | null | undefined,
  response: { data: unknown }
) => {
  const revision = (response.data as { serverRevision?: unknown })
    ?.serverRevision;
  if (target && validRevision(revision)) target.serverRevision = revision;
};
