import type { AssetKind } from "./authoring-tools";

type Session = {
  uploadId: string;
  actor: string;
  resourceType: AssetKind;
  status:
    | "awaiting_confirmation"
    | "opening"
    | "awaiting_file_selection"
    | "collecting"
    | "closed"
    | "not_opened";
  items: Array<{
    status: "submitting" | "completed" | "unknown";
    resourceId?: number;
  }>;
};
const sessions = new Map<string, Session>();
export const beginAuthoringUpload = (
  actor: string,
  resourceType: AssetKind
) => {
  if (sessions.size >= 30)
    throw new Error("本标签页上传跟踪已满，请核对已有结果");
  const uploadId = crypto.randomUUID();
  sessions.set(uploadId, {
    uploadId,
    actor,
    resourceType,
    status: "opening",
    items: [],
  });
  return uploadId;
};
export const authoringUploadStatus = (id: string, actor: string | null) => {
  const session = sessions.get(id);
  if (!actor || session?.actor !== actor) return { status: "not_found" };
  return {
    ...structuredClone(session),
    actor: undefined,
    completedResourceIds: session.items
      .filter((i) => i.status === "completed")
      .map((i) => i.resourceId),
    allFilesUploaded: false, // File picker selection count is not known here.
    note: "仅 completedResourceIds 已取得资源创建回执；不代表全部文件上传、封面绑定或页面显示。",
  };
};
export const setAuthoringUploadState = (
  id: string,
  actor: string | null,
  status: Session["status"]
) => {
  const session = sessions.get(id);
  if (session && actor === session.actor) session.status = status;
};
export const claimAuthoringUpload = (
  id: string,
  actor: string | null,
  type: string
) => {
  const session = sessions.get(id);
  if (
    !session ||
    session.actor !== actor ||
    session.resourceType !== type ||
    session.status !== "opening"
  )
    return false;
  session.status = "awaiting_file_selection";
  return true;
};
/** Wrap only the resource POST initiated by this upload page, never guess from lists. */
export async function trackAuthoringUpload<T extends { data: { id?: number } }>(
  id: string | null,
  actor: string | null,
  task: () => Promise<T>
): Promise<T> {
  const session = id ? sessions.get(id) : undefined;
  const tracked =
    session &&
    session.actor === actor &&
    ["awaiting_file_selection", "collecting"].includes(session.status)
      ? session
      : undefined;
  if (tracked && tracked.items.length >= 100)
    throw new Error("本次上传跟踪数量已满，请结束后再上传");
  const item: Session["items"][number] = { status: "submitting" };
  if (tracked) {
    tracked.status = "collecting";
    tracked.items.push(item);
  }
  try {
    const response = await task();
    if (
      Number.isSafeInteger(response.data.id) &&
      Number(response.data.id) > 0
    ) {
      item.resourceId = response.data.id;
      item.status = "completed";
    } else {
      item.status = "unknown";
    }
    return response;
  } catch (e) {
    item.status = "unknown";
    throw e;
  }
}
