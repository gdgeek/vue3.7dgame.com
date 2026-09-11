import { describe, expect, it, vi } from "vitest";
import { createSceneEntityPlacementTools } from "@/services/webmcp/scene-entity-placement-tools";

const preview = {
  sceneId: 1420,
  sceneVersion: "verse-v1-100-abcd1234",
  entityId: 35,
  entityUuid: "entity-35",
  entityTitle: "中国空间站",
  entityUpdatedAt: "2026-08-31T03:00:00Z",
  proposedTitle: "中国空间站",
  transform: {
    position: { x: 0, y: 1, z: 2 },
    rotate: { x: 0, y: 90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },
  resourceCount: 9,
  emptyEntity: false,
};

describe("scene entity placement WebMCP tools", () => {
  it("stages normalized placement and completes after confirmation", async () => {
    const stageEntityPlacement = vi.fn().mockResolvedValue(preview);
    const confirmEntityPlacement = vi.fn().mockResolvedValue(true);
    const completeEntityPlacement = vi.fn().mockResolvedValue({
      moduleId: "module-1",
      moduleTitle: "中国空间站",
      entityId: 35,
      transform: preview.transform,
    });
    const tools = createSceneEntityPlacementTools({
      getSceneId: () => 1420,
      stageEntityPlacement,
      confirmEntityPlacement,
      completeEntityPlacement,
    });

    const staged = (await tools[0].execute({
      entityId: 35,
      title: " 中国空间站 ",
      transform: {
        position: { y: 1, z: 2 },
        rotate: { y: 90 },
      },
    })) as { draftId: string };
    expect(stageEntityPlacement).toHaveBeenCalledWith({
      entityId: 35,
      title: "中国空间站",
      transform: preview.transform,
    });

    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({
      status: "completed",
      sceneId: 1420,
      moduleId: "module-1",
      entityId: 35,
    });
    expect(confirmEntityPlacement).toHaveBeenCalledWith(preview);
    expect(completeEntityPlacement).toHaveBeenCalledWith(preview);
  });

  it("does not mutate after cancellation or a scene switch", async () => {
    let sceneId = 1420;
    const completeEntityPlacement = vi.fn();
    const confirmEntityPlacement = vi.fn().mockResolvedValue(false);
    const tools = createSceneEntityPlacementTools({
      getSceneId: () => sceneId,
      stageEntityPlacement: vi.fn().mockResolvedValue(preview),
      confirmEntityPlacement,
      completeEntityPlacement,
    });

    const cancelled = (await tools[0].execute({ entityId: 35 })) as {
      draftId: string;
    };
    await expect(
      tools[1].execute({ draftId: cancelled.draftId })
    ).resolves.toMatchObject({ status: "cancelled" });

    const switched = (await tools[0].execute({ entityId: 35 })) as {
      draftId: string;
    };
    sceneId = 1421;
    await expect(
      tools[1].execute({ draftId: switched.draftId })
    ).resolves.toMatchObject({ status: "scene_changed" });
    expect(completeEntityPlacement).not.toHaveBeenCalled();
  });

  it("rejects invalid IDs, titles and transform values before staging", async () => {
    const stageEntityPlacement = vi.fn();
    const tools = createSceneEntityPlacementTools({
      getSceneId: () => 1420,
      stageEntityPlacement,
      confirmEntityPlacement: vi.fn(),
      completeEntityPlacement: vi.fn(),
    });

    await expect(tools[0].execute({ entityId: 0 })).rejects.toThrow("正整数");
    await expect(
      tools[0].execute({ entityId: 35, title: " " })
    ).rejects.toThrow("非空字符串");
    await expect(
      tools[0].execute({
        entityId: 35,
        transform: { scale: { x: Number.POSITIVE_INFINITY } },
      })
    ).rejects.toThrow("有限数字");
    expect(stageEntityPlacement).not.toHaveBeenCalled();
  });
});
