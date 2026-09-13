import {
  hasPublicationEvidence,
  readVerifiedPublication,
} from "@/api/v1/publication-history";

/** A failed refresh cannot undo the server's acknowledged publication. */
export async function readBackScenePublication<T>(options: {
  sceneId: number;
  snapshot: Record<string, unknown>;
  refresh: () => Promise<T>;
  apply: (result: T) => void;
}) {
  const snapshotId = Number(options.snapshot.id);
  if (!Number.isSafeInteger(snapshotId) || snapshotId <= 0) {
    throw new Error(
      "发布接口未返回有效快照标识，结果未知；请先核对服务器状态，不要重复发布"
    );
  }
  let refreshSucceeded = false;
  try {
    options.apply(await options.refresh());
    refreshSucceeded = true;
  } catch {
    // Preserve the receipt; callers may retry reading, never publishing this draft.
  }
  const evidence = options.snapshot.writeReceipt ?? options.snapshot;
  let readBackVerified = false;
  let archiveWarning: string | undefined;
  if (hasPublicationEvidence(evidence)) {
    try {
      await readVerifiedPublication(
        options.sceneId,
        evidence.publicationVersionId,
        evidence
      );
      readBackVerified = true;
    } catch {
      archiveWarning =
        "发布已成功；历史正文核验尚未通过，请仅重试读取该版本，不要再次发布";
    }
  } else {
    archiveWarning =
      evidence &&
      typeof evidence === "object" &&
      ["publicationVersionId", "contentHash", "schemaVersion", "language"].some(
        (key) => key in evidence
      )
        ? "发布已成功；历史归档回执格式不完整，请核对服务器版本并重试读取，不要再次发布"
        : "发布已成功；此回执没有可核验的历史归档（history_unavailable）";
  }
  return {
    ...(hasPublicationEvidence(evidence)
      ? {
          publicationVersionId: evidence.publicationVersionId,
          contentHash: evidence.contentHash,
          schemaVersion: evidence.schemaVersion,
          language: evidence.language,
        }
      : {}),
    ...(archiveWarning ? { archiveWarning } : {}),
    resourceVerification: "not_checked" as const,
    sceneId: options.sceneId,
    snapshotId,
    snapshotUuid:
      typeof options.snapshot.uuid === "string" ? options.snapshot.uuid : null,
    published: true,
    verification: "server_acknowledged" as const,
    readBackVerified,
    refreshSucceeded,
    ...(refreshSucceeded
      ? {}
      : {
          refreshWarning:
            "发布已被服务器确认；页面刷新失败，可重新读取发布状态",
        }),
  };
}
