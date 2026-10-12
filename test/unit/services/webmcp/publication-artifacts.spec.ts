import { describe, it, expect } from "vitest";
import { verifyPublicationVersion } from "@/api/v1/publication-history";
import {
  comparePublicationBodies,
  exportPublicationArtifact,
} from "@/services/webmcp/publication-artifacts";
import fixture from "../../../fixtures/publication-v1.json";
const version = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
async function archive(extra: unknown = {}, id = version, text?: string) {
  const body = {
    schemaVersion: 1,
    language: "lua",
    scene: { id: 1 },
    runtime: {
      data: JSON.stringify(extra),
      code: "",
      resources: [{ id: 9, url: "https://example.com/a.png" }],
      metas: [],
      managers: [],
    },
    dependencies: { resourceBytesArchived: false },
  };
  const canonicalBody = text ?? JSON.stringify(body);
  const bytes = new TextEncoder().encode(canonicalBody);
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (b) => b.toString(16).padStart(2, "0")
  ).join("");
  return verifyPublicationVersion(
    {
      sceneId: 1,
      snapshotId: 2,
      publicationVersionId: id,
      contentHash: `sha256:${hash}`,
      schemaVersion: 1,
      language: "lua",
      sourceServerRevision: `sha256:${"a".repeat(64)}`,
      byteLength: bytes.length,
      canonicalBody,
      integrity: "verified",
      resourceBytesArchived: false,
    },
    1,
    id
  );
}
describe("publication derived artifacts", () => {
  it("compares nested scene data and preserves original bodies", async () => {
    const a = await archive({ position: { x: 0 } });
    const b = await archive(
      { position: { x: 2 } },
      "bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee"
    );
    const before = a.canonicalBody;
    expect(comparePublicationBodies(a, b)).toMatchObject({
      identicalBytes: false,
      truncated: false,
      changes: [
        {
          path: "/runtime/data/position/x",
          kind: "changed",
          before: "0",
          after: "2",
        },
      ],
    });
    expect(a.canonicalBody).toBe(before);
    expect(exportPublicationArtifact(a)).toMatchObject({
      canonicalBody: before,
      contentHash: a.contentHash,
      resourceReferences: [{ id: 9 }],
      resourceBytesArchived: false,
      restorableEditorProject: false,
    });
  });
  it("treats hostile object keys as opaque JSON pointers", async () => {
    const a = await archive(JSON.parse('{"__proto__":{"a/b~c":0}}'));
    const b = await archive(JSON.parse('{"__proto__":{"a/b~c":1}}'));
    expect(comparePublicationBodies(a, b).changes[0].path).toBe(
      "/runtime/data/__proto__/a~1b~0c"
    );
    expect(({} as Record<string, unknown>)["a/b~c"]).toBeUndefined();
  });
  it("bounds deep, wide and large changed documents", async () => {
    let deep: unknown = 1;
    let other: unknown = 2;
    for (let i = 0; i < 100; i++) {
      deep = { next: deep };
      other = { next: other };
    }
    expect(
      comparePublicationBodies(await archive(deep), await archive(other))
        .truncated
    ).toBe(true);
    const wide = Object.fromEntries(
      Array.from({ length: 21000 }, (_, i) => [String(i), i])
    );
    expect(
      comparePublicationBodies(await archive({}), await archive(wide)).truncated
    ).toBe(true);
    const b = Object.fromEntries(
      Array.from({ length: 300 }, (_, i) => [String(i), i])
    );
    const diff = comparePublicationBodies(await archive({}), await archive(b));
    expect(diff.changes.length).toBeLessThanOrEqual(200);
    expect(diff.truncated).toBe(true);
  });
  it("exports exact numeric and unicode canonical bytes without reserializing", async () => {
    for (const row of fixture) {
      const a = await archive({}, version, row.canonicalBody);
      const artifact = exportPublicationArtifact(a);
      expect(artifact.canonicalBody).toBe(row.canonicalBody);
      expect(artifact.contentHash).toBe(row.contentHash);
    }
  });
  it("distinguishes byte equality from structural equality", async () => {
    const a = await archive();
    const b = await archive({}, version, " " + a.canonicalBody);
    expect(comparePublicationBodies(a, b)).toMatchObject({
      identicalBytes: false,
      changes: [],
      truncated: false,
    });
  });
});
