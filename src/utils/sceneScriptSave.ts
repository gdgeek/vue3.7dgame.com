import type { VerseCode, VerseData } from "@/api/v1/types/verse";
import { validRevision } from "@/api/v1/write-contract";

export type SceneScriptSaved = {
  sceneId: number;
  previousRevision?: string;
  serverRevision?: string;
  verseCode: VerseCode;
};

/** Advance only the script revision; never mark unsaved 3D edits as saved. */
export function applySceneScriptSave(
  scene: Pick<VerseData, "id" | "serverRevision" | "verseCode">,
  result: unknown
) {
  if (!result || typeof result !== "object") return false;
  const saved = result as Partial<SceneScriptSaved>;
  if (
    saved.sceneId !== scene.id ||
    !validRevision(saved.previousRevision) ||
    saved.previousRevision !== scene.serverRevision ||
    !validRevision(saved.serverRevision) ||
    !saved.verseCode ||
    typeof saved.verseCode.blockly !== "string"
  )
    return false;
  scene.serverRevision = saved.serverRevision;
  scene.verseCode = { ...saved.verseCode };
  return true;
}
