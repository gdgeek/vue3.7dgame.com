import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("editor mode tag integration", () => {
  it("uses the shared tag in both script editor modal headers", () => {
    const verseModal = readSource("src/components/ScriptEditorModal.vue");
    const metaModal = readSource("src/components/MetaScriptEditorModal.vue");

    for (const source of [verseModal, metaModal]) {
      expect(source).toContain("EditorModeTag");
      expect(source).toContain(':dirty="hasUnsavedChanges"');
      expect(source).not.toMatch(/\/【\{\{\s*\$t\([^\n]+script\.title/);
    }
  });
});
