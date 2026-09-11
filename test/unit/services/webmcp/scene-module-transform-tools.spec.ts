import { describe, expect, it, vi } from "vitest";
import { createSceneModuleTransformTools } from "@/services/webmcp/scene-module-transform-tools";

const preview = {
  sceneId: 1420,
  sceneVersion: "verse-v1-transform",
  moduleId: "module-root",
  moduleTitle: "中国空间站",
  current: {
    position: { x: 0, y: 0, z: 0 },
    rotationDegrees: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },
  proposed: {
    position: { x: 10, y: 0, z: -5 },
    rotationDegrees: { x: 0, y: 90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },
  changed: true,
};

describe("scene module transform WebMCP tools", () => {
  it("stages a partial transform and completes after confirmation", async () => {
    const stageModuleTransform = vi.fn().mockResolvedValue(preview);
    const confirmModuleTransform = vi.fn().mockResolvedValue(true);
    const completeModuleTransform = vi.fn().mockResolvedValue({
      moduleId: preview.moduleId,
      moduleTitle: preview.moduleTitle,
      transform: preview.proposed,
      noChange: false,
    });
    const tools = createSceneModuleTransformTools({
      getSceneId: () => 1420,
      stageModuleTransform,
      confirmModuleTransform,
      completeModuleTransform,
    });

    const staged = (await tools[0].execute({
      moduleId: " module-root ",
      transform: {
        position: { x: 10, z: -5 },
        rotationDegrees: { y: 90 },
      },
    })) as { draftId: string };
    expect(stageModuleTransform).toHaveBeenCalledWith("module-root", {
      position: { x: 10, z: -5 },
      rotationDegrees: { y: 90 },
      scale: undefined,
    });

    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({
      status: "completed",
      sceneId: 1420,
      moduleId: "module-root",
      transform: preview.proposed,
    });
  });

  it("returns no_change without creating a completable draft", async () => {
    const tools = createSceneModuleTransformTools({
      getSceneId: () => 1420,
      stageModuleTransform: vi.fn().mockResolvedValue({
        ...preview,
        proposed: preview.current,
        changed: false,
      }),
      confirmModuleTransform: vi.fn(),
      completeModuleTransform: vi.fn(),
    });

    await expect(
      tools[0].execute({
        moduleId: "module-root",
        transform: { position: { x: 0 } },
      })
    ).resolves.toMatchObject({ status: "no_change", draftId: null });
  });

  it("blocks cancellation, scene changes and malformed patches", async () => {
    let sceneId = 1420;
    const completeModuleTransform = vi.fn();
    const tools = createSceneModuleTransformTools({
      getSceneId: () => sceneId,
      stageModuleTransform: vi.fn().mockResolvedValue(preview),
      confirmModuleTransform: vi.fn().mockResolvedValue(false),
      completeModuleTransform,
    });
    const cancelled = (await tools[0].execute({
      moduleId: "module-root",
      transform: { scale: { x: 2 } },
    })) as { draftId: string };
    await expect(
      tools[1].execute({ draftId: cancelled.draftId })
    ).resolves.toMatchObject({ status: "cancelled" });

    const switched = (await tools[0].execute({
      moduleId: "module-root",
      transform: { scale: { x: 2 } },
    })) as { draftId: string };
    sceneId = 1421;
    await expect(
      tools[1].execute({ draftId: switched.draftId })
    ).resolves.toMatchObject({ status: "scene_changed" });
    expect(completeModuleTransform).not.toHaveBeenCalled();

    await expect(
      tools[0].execute({ moduleId: "module-root", transform: {} })
    ).rejects.toThrow("至少需要包含");
    await expect(
      tools[0].execute({
        moduleId: "module-root",
        transform: { rotationDegrees: { y: Number.NaN } },
      })
    ).rejects.toThrow("有限数字");
  });
});
