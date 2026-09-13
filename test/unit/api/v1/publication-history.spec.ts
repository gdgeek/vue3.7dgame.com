import { beforeEach, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import fixtures from "../../../fixtures/publication-v1.json";
import {
  getScenePublicationVersion,
  listScenePublications,
  verifyPublicationVersion,
} from "@/api/v1/publication-history";
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/utils/request", () => ({ default: request }));
const version = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const metadata = {
  publicationVersionId: version,
  sceneId: 1,
  snapshotId: 2,
  actorId: 3,
  operationId: null,
  sourceServerRevision: `sha256:${"a".repeat(64)}`,
  schemaVersion: 1 as const,
  language: "lua" as const,
  createdAt: 1,
  integrity: "verified",
  resourceBytesArchived: false,
};
describe("fixed publication versions", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", webcrypto);
    request.mockReset();
  });
  it.each(fixtures)("hashes exact shared PHP bytes: $name", async (fixture) => {
    const row = { ...metadata, ...fixture };
    expect(
      (await verifyPublicationVersion(row, 1, version, row)).readBackVerified
    ).toBe(true);
  });
  it.each([
    { sceneId: 2 },
    { publicationVersionId: "bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee" },
    { schemaVersion: 2 },
    { language: "js" },
    { canonicalBody: "{}" },
    { contentHash: `sha256:${"b".repeat(64)}` },
    { byteLength: 1 },
    { resourceBytesArchived: true },
  ])("rejects mismatched metadata or corrupted body %j", async (change) => {
    await expect(
      verifyPublicationVersion(
        { ...metadata, ...fixtures[0], ...change },
        1,
        version
      )
    ).rejects.toThrow();
  });
  it("compares to the receipt independently of the archive response", async () => {
    const row = { ...metadata, ...fixtures[0] };
    await expect(
      verifyPublicationVersion(row, 1, version, {
        ...row,
        contentHash: `sha256:${"f".repeat(64)}`,
      })
    ).rejects.toThrow();
  });
  it("only sends bounded GET requests", async () => {
    request.mockResolvedValue({ data: {} });
    await listScenePublications(1, 20, 4);
    await getScenePublicationVersion(1, version);
    expect(request.mock.calls.every(([input]) => input.method === "get")).toBe(
      true
    );
    expect(() => listScenePublications(1, 51)).toThrow();
    expect(() => getScenePublicationVersion(1, "../../other")).toThrow();
  });
});
