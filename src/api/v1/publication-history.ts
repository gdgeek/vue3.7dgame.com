// Load the authenticated transport only when a history query is actually requested.
const request = async <T>(config: {
  url: string;
  method: "get";
  params?: Record<string, number>;
  skipErrorMessage: boolean;
}) => (await import("@/utils/request")).default<T>(config);
import { validOperationId, validRevision } from "./write-contract";

export type PublicationEvidence = {
  publicationVersionId: string;
  contentHash: string;
  schemaVersion: 1;
  language: "lua" | "js";
};
export type PublicationMetadata = PublicationEvidence & {
  sceneId: number;
  snapshotId: number;
  actorId: number;
  operationId: string | null;
  sourceServerRevision: string;
  createdAt: number;
  byteLength: number;
};
export type PublicationVersion = PublicationMetadata & {
  canonicalBody: string;
  integrity: "verified";
  resourceBytesArchived: false;
};
export type PublicationHistory = {
  sceneId: number;
  items: PublicationMetadata[];
  nextBefore: number | null;
  historyStatus: "available" | "history_unavailable";
  total: number;
  totalBytes: number;
  maxBodyBytes: number;
  sceneBudgetBytes: number;
  capacityWarning: boolean;
  resourceBytesArchived: false;
};
const scenePath = (id: number) => {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Invalid scene ID");
  return `/v1/verses/${id}/publications`;
};
export const listScenePublications = (id: number, limit = 20, before = 0) => {
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50 ||
    !Number.isSafeInteger(before) ||
    before < 0
  )
    throw new Error("Invalid history pagination");
  return request<PublicationHistory>({
    url: scenePath(id),
    method: "get",
    params: { limit, before },
    skipErrorMessage: true,
  });
};
export const getScenePublicationVersion = (id: number, version: string) => {
  if (!validOperationId(version))
    throw new Error("Invalid publication version");
  return request<PublicationVersion>({
    url: `${scenePath(id)}/${version}`,
    method: "get",
    skipErrorMessage: true,
  });
};
export const hasPublicationEvidence = (
  value: unknown
): value is PublicationEvidence => {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<PublicationEvidence>;
  return (
    validOperationId(row.publicationVersionId) &&
    validRevision(row.contentHash) &&
    row.schemaVersion === 1 &&
    (row.language === "lua" || row.language === "js")
  );
};

/** Hash the received UTF-8 text, never JSON.stringify the parsed object. */
export async function verifyPublicationVersion(
  input: unknown,
  sceneId: number,
  versionId: string,
  expected?: PublicationEvidence
): Promise<
  PublicationVersion & {
    readBackVerified: true;
    resourceVerification: "not_checked";
  }
> {
  const row = input as PublicationVersion | null;
  if (
    !row ||
    !hasPublicationEvidence(row) ||
    row.sceneId !== sceneId ||
    row.publicationVersionId !== versionId ||
    row.integrity !== "verified" ||
    row.resourceBytesArchived !== false ||
    typeof row.canonicalBody !== "string" ||
    !Number.isSafeInteger(row.snapshotId) ||
    row.snapshotId <= 0 ||
    !validRevision(row.sourceServerRevision) ||
    (expected &&
      (!hasPublicationEvidence(expected) ||
        row.publicationVersionId !== expected.publicationVersionId ||
        row.contentHash !== expected.contentHash ||
        row.schemaVersion !== expected.schemaVersion ||
        row.language !== expected.language))
  )
    throw new Error("publication_metadata_mismatch");
  const bytes = new TextEncoder().encode(row.canonicalBody);
  if (bytes.byteLength !== row.byteLength || bytes.byteLength > 8 * 1024 * 1024)
    throw new Error("publication_size_mismatch");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = `sha256:${Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")}`;
  if (hash !== row.contentHash) throw new Error("publication_hash_mismatch");
  const body = JSON.parse(row.canonicalBody);
  if (
    body?.schemaVersion !== row.schemaVersion ||
    body?.language !== row.language ||
    body?.scene?.id !== sceneId ||
    !body.runtime ||
    typeof body.runtime !== "object" ||
    Array.isArray(body.runtime) ||
    typeof body.runtime.data !== "string" ||
    typeof body.runtime.code !== "string" ||
    !Array.isArray(body.runtime.metas) ||
    !Array.isArray(body.runtime.resources) ||
    !Array.isArray(body.runtime.managers) ||
    body?.dependencies?.resourceBytesArchived !== false
  )
    throw new Error("publication_format_mismatch");
  return {
    ...row,
    readBackVerified: true,
    resourceVerification: "not_checked",
  };
}
export async function readVerifiedPublication(
  id: number,
  version: string,
  expected?: PublicationEvidence
) {
  return verifyPublicationVersion(
    (await getScenePublicationVersion(id, version)).data,
    id,
    version,
    expected
  );
}
