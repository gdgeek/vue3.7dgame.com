import { describe, expect, it, vi } from "vitest";
import { createSceneModuleDeletionTools } from "@/services/webmcp/scene-module-deletion-tools";

const preview = {
  sceneId: 1420,
  sceneVersion: "verse-v1-deletion",
  moduleId: "module-label",
  moduleTitle: "讲解牌",
  entityId: 41,
  visible: true,
  descendantCount: 12,
};

describe("scene module deletion WebMCP tools", () => {
  it("stages deletion and completes only after confirmation", async () => {
    const stageModuleDeletion = vi.fn().mockResolvedValue(preview);
    const confirmModuleDeletion = vi.fn().mockResolvedValue(true);
    const completeModuleDeletion = vi.fn().mockResolvedValue({
      moduleId: preview.moduleId,
      moduleTitle: preview.moduleTitle,
      entityId: preview.entityId,
      removedObjectCount: 13,
    });
    const tools = createSceneModuleDeletionTools({
      getSceneId: () => 1420,
      stageModuleDeletion,
      confirmModuleDeletion,
      completeModuleDeletion,
    });

    const staged = (await tools[0].execute({
      moduleId: " module-label ",
    })) as { draftId: string };
    expect(stageModuleDeletion).toHaveBeenCalledWith("module-label");
    expect(completeModuleDeletion).not.toHaveBeenCalled();

    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({
      status: "completed",
      sceneId: 1420,
      moduleId: "module-label",
      removedObjectCount: 13,
    });
  });

  it("discards a deletion draft when the user cancels", async () => {
    const completeModuleDeletion = vi.fn();
    const tools = createSceneModuleDeletionTools({
      getSceneId: () => 1420,
      stageModuleDeletion: vi.fn().mockResolvedValue(preview),
      confirmModuleDeletion: vi.fn().mockResolvedValue(false),
      completeModuleDeletion,
    });
    const staged = (await tools[0].execute({
      moduleId: "module-label",
    })) as { draftId: string };

    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({ status: "cancelled" });
    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({ status: "expired_or_missing" });
    expect(completeModuleDeletion).not.toHaveBeenCalled();
  });

  it("blocks scene changes and malformed identifiers", async () => {
    let sceneId = 1420;
    const completeModuleDeletion = vi.fn();
    const tools = createSceneModuleDeletionTools({
      getSceneId: () => sceneId,
      stageModuleDeletion: vi.fn().mockResolvedValue(preview),
      confirmModuleDeletion: vi.fn().mockResolvedValue(true),
      completeModuleDeletion,
    });
    const staged = (await tools[0].execute({
      moduleId: "module-label",
    })) as { draftId: string };
    sceneId = 1421;

    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({ status: "scene_changed" });
    expect(completeModuleDeletion).not.toHaveBeenCalled();
    await expect(tools[0].execute({ moduleId: " " })).rejects.toThrow(
      "不能为空"
    );
  });
});
