import { describe, expect, it, vi } from "vitest";
import { createScenePublicationTools } from "@/services/webmcp/scene-publication-tools";

const preview = {
  sceneId: 1420,
  sceneVersion: "verse-v1-publish",
  sceneName: "中国空间站",
  moduleCount: 9,
  warningCount: 1,
  warnings: ["名称重复"],
  alreadyPublished: true,
};

describe("scene publication WebMCP tools", () => {
  it("stages publication and completes only after confirmation", async () => {
    const stageScenePublication = vi.fn().mockResolvedValue(preview);
    const confirmScenePublication = vi.fn().mockResolvedValue(true);
    const completeScenePublication = vi.fn().mockResolvedValue({
      sceneId: 1420,
      snapshotId: 88,
      snapshotUuid: "snapshot-88",
      published: true,
    });
    const tools = createScenePublicationTools({
      getSceneId: () => 1420,
      stageScenePublication,
      confirmScenePublication,
      completeScenePublication,
    });

    const staged = (await tools[0].execute({})) as { draftId: string };
    expect(completeScenePublication).not.toHaveBeenCalled();
    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({
      status: "completed",
      sceneId: 1420,
      snapshotId: 88,
      published: true,
    });
  });

  it("discards publication when the user cancels", async () => {
    const completeScenePublication = vi.fn();
    const tools = createScenePublicationTools({
      getSceneId: () => 1420,
      stageScenePublication: vi.fn().mockResolvedValue(preview),
      confirmScenePublication: vi.fn().mockResolvedValue(false),
      completeScenePublication,
    });
    const staged = (await tools[0].execute({})) as { draftId: string };

    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({ status: "cancelled" });
    expect(completeScenePublication).not.toHaveBeenCalled();
  });

  it("blocks a draft after the scene changes", async () => {
    let sceneId = 1420;
    const completeScenePublication = vi.fn();
    const tools = createScenePublicationTools({
      getSceneId: () => sceneId,
      stageScenePublication: vi.fn().mockResolvedValue(preview),
      confirmScenePublication: vi.fn().mockResolvedValue(true),
      completeScenePublication,
    });
    const staged = (await tools[0].execute({})) as { draftId: string };
    sceneId = 1421;

    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({ status: "scene_changed" });
    expect(completeScenePublication).not.toHaveBeenCalled();
  });
});
