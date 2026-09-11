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
  return {
    sceneId: options.sceneId,
    snapshotId,
    snapshotUuid:
      typeof options.snapshot.uuid === "string" ? options.snapshot.uuid : null,
    published: true,
    verification: "server_acknowledged" as const,
    // The current Snapshot is mutable. A refresh cannot verify historical content.
    readBackVerified: false,
    refreshSucceeded,
    ...(refreshSucceeded
      ? {}
      : {
          refreshWarning:
            "发布已被服务器确认；页面刷新失败，可重新读取发布状态",
        }),
  };
}
