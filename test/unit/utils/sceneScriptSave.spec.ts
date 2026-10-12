import { describe, expect, it } from "vitest";
import { applySceneScriptSave } from "@/utils/sceneScriptSave";

const oldRevision = `sha256:${"a".repeat(64)}`;
const newRevision = `sha256:${"b".repeat(64)}`;
const saved = {
  sceneId: 666,
  previousRevision: oldRevision,
  serverRevision: newRevision,
  verseCode: { blockly: "{}", js: "if (false) {}", lua: "if false then end" },
};
const scene = () => ({
  id: 666,
  serverRevision: oldRevision,
  verseCode: { blockly: "{}" },
  data: { position: 0.4 },
  dirty: true,
});

describe("scene script save revision handoff", () => {
  it("advances the next scene write revision without replacing unsaved geometry", () => {
    const model = scene();
    const data = model.data;
    expect(applySceneScriptSave(model, saved)).toBe(true);
    expect(model.serverRevision).toBe(newRevision);
    expect(model.verseCode).toEqual(saved.verseCode);
    expect(model.data).toBe(data);
    expect(model.dirty).toBe(true);
  });

  it.each([
    { sceneId: 667 },
    { previousRevision: newRevision },
    { previousRevision: undefined },
    { serverRevision: "invalid" },
    { verseCode: undefined },
  ])("rejects stale or malformed save events: %o", (change) => {
    const model = scene();
    expect(applySceneScriptSave(model, { ...saved, ...change })).toBe(false);
    expect(model).toEqual(scene());
  });
});
