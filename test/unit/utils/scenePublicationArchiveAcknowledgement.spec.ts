import { beforeEach, describe, expect, it, vi } from "vitest";
import { readBackScenePublication } from "@/utils/scenePublicationAcknowledgement";
const { read } = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/api/v1/publication-history", async (original) => ({
  ...(await original<object>()),
  readVerifiedPublication: read,
}));
const evidence = {
  publicationVersionId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
  contentHash: `sha256:${"a".repeat(64)}`,
  schemaVersion: 1,
  language: "lua",
};
describe("publication acknowledgment versus read back", () => {
  beforeEach(() => {
    read.mockReset();
  });
  it("independently reads the receipt version and keeps refresh distinct", async () => {
    read.mockResolvedValue({ readBackVerified: true });
    const result = await readBackScenePublication({
      sceneId: 1,
      snapshot: { id: 5, writeReceipt: evidence },
      refresh: async () => {
        throw new Error("refresh lost");
      },
      apply: vi.fn(),
    });
    expect(result).toMatchObject({
      published: true,
      verification: "server_acknowledged",
      readBackVerified: true,
      refreshSucceeded: false,
    });
    expect(read).toHaveBeenCalledWith(
      1,
      evidence.publicationVersionId,
      evidence
    );
  });
  it("keeps successful publication on failed archive read without replaying", async () => {
    read.mockRejectedValue(new Error("timeout"));
    const result = await readBackScenePublication({
      sceneId: 1,
      snapshot: {
        id: 5,
        ...evidence,
        data: "large runtime body",
        resources: ["private URL"],
      },
      refresh: async () => null,
      apply: vi.fn(),
    });
    expect(result).toMatchObject({
      published: true,
      verification: "server_acknowledged",
      readBackVerified: false,
      refreshSucceeded: true,
    });
    expect(result.archiveWarning).toBeTruthy();
    expect(result).not.toHaveProperty("data");
    expect(result).not.toHaveProperty("resources");
    expect(read).toHaveBeenCalledTimes(1);
  });
  it("does not invent an archive for an old receipt", async () => {
    const result = await readBackScenePublication({
      sceneId: 1,
      snapshot: { id: 5 },
      refresh: async () => null,
      apply: vi.fn(),
    });
    expect(result.readBackVerified).toBe(false);
    expect(read).not.toHaveBeenCalled();
  });
});

it("reports incomplete archive evidence without misclassifying the acknowledged write", async () => {
  const result = await readBackScenePublication({
    sceneId: 1,
    snapshot: { id: 5, publicationVersionId: "invalid" },
    refresh: async () => null,
    apply: vi.fn(),
  });
  expect(result.verification).toBe("server_acknowledged");
  expect(result.readBackVerified).toBe(false);
  expect(result.archiveWarning).toContain("格式不完整");
});
