export type EditorLoadPhase =
  | "connecting"
  | "data"
  | "initializing"
  | "assets"
  | "finishing"
  | "ready"
  | "error";
export interface EditorLoadProgress {
  phase: EditorLoadPhase;
  completed: number | null;
  total: number | null;
  currentKind: string | null;
  currentItem: string | null;
}
export const emptyEditorProgress = (
  phase: EditorLoadPhase
): EditorLoadProgress => ({
  phase,
  completed: null,
  total: null,
  currentKind: null,
  currentItem: null,
});
/** Accept only bounded counters and known phases from the current iframe RPC. */
export function parseEditorLoadProgress(
  value: unknown
): EditorLoadProgress | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (!["assets", "finishing", "ready", "error"].includes(String(data.phase)))
    return null;
  const validCounts =
    typeof data.total === "number" &&
    Number.isSafeInteger(data.total) &&
    data.total >= 0 &&
    typeof data.completed === "number" &&
    Number.isSafeInteger(data.completed) &&
    data.completed >= 0 &&
    data.completed <= data.total;
  return {
    phase: data.phase as EditorLoadPhase,
    completed: validCounts ? (data.completed as number) : null,
    total: validCounts ? (data.total as number) : null,
    currentKind: ["model", "module", "anchor", "space"].includes(
      String(data.currentKind)
    )
      ? String(data.currentKind)
      : null,
    currentItem:
      typeof data.currentItem === "string"
        ? data.currentItem.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 120)
        : null,
  };
}
