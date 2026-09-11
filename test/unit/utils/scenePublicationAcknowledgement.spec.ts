import { describe, expect, it, vi } from "vitest";
import { readBackScenePublication } from "@/utils/scenePublicationAcknowledgement";
describe("acknowledged scene publication", () => {
  it("preserves the snapshot receipt when the follow-up refresh fails", async () => {
    const result = await readBackScenePublication({
      sceneId: 2,
      snapshot: { id: 123, uuid: "snapshot" },
      refresh: vi.fn().mockRejectedValue(new Error("offline")),
      apply: vi.fn(),
    });
    expect(result).toMatchObject({
      published: true,
      snapshotId: 123,
      verification: "server_acknowledged",
      readBackVerified: false,
      refreshSucceeded: false,
    });
    expect(result.refreshWarning).toContain("发布已被服务器确认");
  });
  it("distinguishes a refreshed scene from verification of the release snapshot", async () => {
    const apply = vi.fn();
    const result = await readBackScenePublication({
      sceneId: 2,
      snapshot: { id: 123 },
      refresh: async () => ({ id: 2 }),
      apply,
    });
    expect(apply).toHaveBeenCalledWith({ id: 2 });
    expect(result.refreshSucceeded).toBe(true);
    expect(result.readBackVerified).toBe(false);
  });
  it("does not claim publication without a server snapshot id", async () => {
    const refresh = vi.fn();
    await expect(
      readBackScenePublication({
        sceneId: 2,
        snapshot: {},
        refresh,
        apply: vi.fn(),
      })
    ).rejects.toThrow("结果未知");
    expect(refresh).not.toHaveBeenCalled();
  });
});
