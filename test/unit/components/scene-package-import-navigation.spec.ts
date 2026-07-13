import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

const source = readFileSync(
  `${process.cwd()}/src/components/ScenePackage/ImportDialog.vue`,
  "utf-8"
);

describe("ScenePackage ImportDialog navigation", () => {
  it("opens the imported scene through the registered editor route", () => {
    expect(source).toContain('name: "VerseSceneEditor"');
    expect(source).toContain("query: { id: String(newVerseId.value) }");
    expect(source).not.toContain('name: "verse-edit"');
  });
});
