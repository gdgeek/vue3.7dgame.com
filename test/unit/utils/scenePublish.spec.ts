import { describe, expect, it, vi } from "vitest";
import { saveThenPublishScene } from "@/utils/scenePublish";

describe("saveThenPublishScene", () => {
  it("saves the latest editor payload before publishing", async () => {
    const calls: string[] = [];
    const payload = { verse: { children: { modules: [{ id: 1 }] } } };
    const save = vi.fn(async (received: typeof payload) => {
      calls.push("save");
      expect(received).toBe(payload);
      return true;
    });
    const publish = vi.fn(async () => {
      calls.push("publish");
    });

    await expect(saveThenPublishScene(payload, save, publish)).resolves.toBe(
      true
    );
    expect(calls).toEqual(["save", "publish"]);
  });

  it("does not publish when saving fails", async () => {
    const save = vi.fn().mockResolvedValue(false);
    const publish = vi.fn();

    await expect(
      saveThenPublishScene({ verse: {} }, save, publish)
    ).resolves.toBe(false);
    expect(publish).not.toHaveBeenCalled();
  });

  it("surfaces publication failures to the caller", async () => {
    const error = new Error("snapshot failed");

    await expect(
      saveThenPublishScene(
        { verse: {} },
        vi.fn().mockResolvedValue(true),
        vi.fn().mockRejectedValue(error)
      )
    ).rejects.toBe(error);
  });
});
