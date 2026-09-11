import type { ScenePublicationState } from "@/api/v1/write-protocol";
import { validOperationId, validRevision } from "@/api/v1/write-contract";
/** A failed refresh cannot undo the server's acknowledged publication. */
export async function readBackScenePublication<T>(options: {
  sceneId: number;
  snapshot: Record<string, unknown>;
  refresh: () => Promise<T>;
  apply: (result: T) => void;
  readSnapshot?: (revision: string) => Promise<ScenePublicationState>;
}) {
  const snapshotId = Number(options.snapshot.id);
  if (!Number.isSafeInteger(snapshotId) || snapshotId <= 0) {
    throw new Error(
      "发布接口未返回有效快照标识，结果未知；请先核对服务器状态，不要重复发布"
    );
  }
  const publicationRevision = validOperationId(
    options.snapshot.publicationRevision
  )
    ? options.snapshot.publicationRevision
    : null;
  const contentHash = validRevision(options.snapshot.contentHash)
    ? options.snapshot.contentHash
    : null;
  let readBackVerified = false;
  if (publicationRevision && contentHash && options.readSnapshot) {
    try {
      const published = await options.readSnapshot(publicationRevision);
      readBackVerified =
        published.sceneId === options.sceneId &&
        published.published === true &&
        published.snapshotId === snapshotId &&
        published.publicationRevision === publicationRevision &&
        published.contentHash === contentHash &&
        typeof published.snapshot === "object" &&
        published.snapshot !== null;
    } catch {
      /* Publication acknowledgment survives a failed independent read. */
    }
  }
  let refreshSucceeded = false;
  try {
    options.apply(await options.refresh());
    refreshSucceeded = true;
  } catch {
    // Preserve the receipt; callers may retry reading, never publishing this draft.
  }
  return {
    sceneId: options.sceneId,
    snapshotId,
    snapshotUuid:
      typeof options.snapshot.uuid === "string" ? options.snapshot.uuid : null,
    published: true,
    verification: readBackVerified
      ? ("snapshot_read_back" as const)
      : ("server_acknowledged" as const),
    readBackVerified,
    publicationRevision,
    contentHash,
    refreshSucceeded,
    ...(refreshSucceeded
      ? {}
      : {
          refreshWarning:
            "发布已被服务器确认；页面刷新失败，可重新读取发布状态",
        }),
  };
}
