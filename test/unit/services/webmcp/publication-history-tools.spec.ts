import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPublicationHistoryTools } from "@/services/webmcp/publication-history-tools";
const api = vi.hoisted(() => ({ list: vi.fn(), read: vi.fn() }));
vi.mock("@/api/v1/publication-history", () => ({
  listScenePublications: api.list,
  readVerifiedPublication: api.read,
}));
const version = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
describe("publication history tools", () => {
  beforeEach(() => {
    api.list.mockReset();
    api.read.mockReset();
  });
  it("lists server history without touching editor contents", async () => {
    api.list.mockResolvedValue({
      data: { sceneId: 7, items: [], historyStatus: "history_unavailable" },
    });
    const tools = createPublicationHistoryTools(() => 7);
    expect(tools.every((tool) => tool.annotations?.readOnlyHint)).toBe(true);
    expect(await tools[0].execute({ limit: 5, before: 3 })).toMatchObject({
      historyStatus: "history_unavailable",
    });
    expect(api.list).toHaveBeenCalledWith(7, 5, 3);
  });
  it("reads a fixed version and returns the verifier evidence", async () => {
    api.read.mockResolvedValue({
      sceneId: 7,
      publicationVersionId: version,
      readBackVerified: true,
    });
    const tools = createPublicationHistoryTools(() => 7);
    expect(
      await tools[1].execute({ publicationVersionId: version })
    ).toMatchObject({ readBackVerified: true });
    expect(api.read).toHaveBeenCalledWith(7, version);
  });
  it("discards a response when the scene changed", async () => {
    let scene = 7;
    api.list.mockImplementation(async () => {
      scene = 8;
      return { data: { sceneId: 7 } };
    });
    await expect(
      createPublicationHistoryTools(() => scene)[0].execute({})
    ).rejects.toThrow("场景已切换");
  });
  it("does not convert read failure into publication or current-snapshot fallback", async () => {
    api.read.mockRejectedValue(new Error("timeout"));
    await expect(
      createPublicationHistoryTools(() => 7)[1].execute({
        publicationVersionId: version,
      })
    ).rejects.toThrow("timeout");
    expect(api.read).toHaveBeenCalledTimes(1);
    expect(api.list).not.toHaveBeenCalled();
  });
  it("rejects unknown parameters and absent current scene", async () => {
    await expect(
      createPublicationHistoryTools(() => 7)[0].execute({ publish: true })
    ).rejects.toThrow();
    await expect(
      createPublicationHistoryTools(() => null)[1].execute({
        publicationVersionId: version,
      })
    ).rejects.toThrow();
    expect(api.list).not.toHaveBeenCalled();
    expect(api.read).not.toHaveBeenCalled();
  });
});
