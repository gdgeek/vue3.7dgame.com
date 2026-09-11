import { describe, expect, it, vi } from "vitest";
import { createSceneModulePropertyTools } from "@/services/webmcp/scene-module-property-tools";

const preview = {
  sceneId: 1420,
  sceneVersion: "verse-v1-properties",
  moduleId: "module-root",
  moduleTitle: "中国空间站",
  current: { title: "中国空间站", visible: true },
  proposed: { title: "完整空间站", visible: false },
  changed: true,
};

describe("scene module property WebMCP tools", () => {
  it("stages property changes and completes after confirmation", async () => {
    const stageModuleProperties = vi.fn().mockResolvedValue(preview);
    const confirmModuleProperties = vi.fn().mockResolvedValue(true);
    const completeModuleProperties = vi.fn().mockResolvedValue({
      moduleId: preview.moduleId,
      moduleTitle: preview.proposed.title,
      properties: preview.proposed,
      noChange: false,
    });
    const tools = createSceneModulePropertyTools({
      getSceneId: () => 1420,
      stageModuleProperties,
      confirmModuleProperties,
      completeModuleProperties,
    });

    const staged = (await tools[0].execute({
      moduleId: " module-root ",
      properties: { title: " 完整空间站 ", visible: false },
    })) as { draftId: string };
    expect(stageModuleProperties).toHaveBeenCalledWith("module-root", {
      title: "完整空间站",
      visible: false,
    });

    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({
      status: "completed",
      sceneId: 1420,
      moduleId: "module-root",
      properties: preview.proposed,
    });
  });

  it("returns no_change without creating a completable draft", async () => {
    const tools = createSceneModulePropertyTools({
      getSceneId: () => 1420,
      stageModuleProperties: vi.fn().mockResolvedValue({
        ...preview,
        proposed: preview.current,
        changed: false,
      }),
      confirmModuleProperties: vi.fn(),
      completeModuleProperties: vi.fn(),
    });

    await expect(
      tools[0].execute({
        moduleId: "module-root",
        properties: { visible: true },
      })
    ).resolves.toMatchObject({ status: "no_change", draftId: null });
  });

  it("blocks cancellation, scene changes and malformed properties", async () => {
    let sceneId = 1420;
    const completeModuleProperties = vi.fn();
    const tools = createSceneModulePropertyTools({
      getSceneId: () => sceneId,
      stageModuleProperties: vi.fn().mockResolvedValue(preview),
      confirmModuleProperties: vi.fn().mockResolvedValue(false),
      completeModuleProperties,
    });
    const cancelled = (await tools[0].execute({
      moduleId: "module-root",
      properties: { visible: false },
    })) as { draftId: string };
    await expect(
      tools[1].execute({ draftId: cancelled.draftId })
    ).resolves.toMatchObject({ status: "cancelled" });

    const switched = (await tools[0].execute({
      moduleId: "module-root",
      properties: { title: "完整空间站" },
    })) as { draftId: string };
    sceneId = 1421;
    await expect(
      tools[1].execute({ draftId: switched.draftId })
    ).resolves.toMatchObject({ status: "scene_changed" });
    expect(completeModuleProperties).not.toHaveBeenCalled();

    await expect(
      tools[0].execute({ moduleId: "module-root", properties: {} })
    ).rejects.toThrow("至少需要包含");
    await expect(
      tools[0].execute({
        moduleId: "module-root",
        properties: { title: "\n" },
      })
    ).rejects.toThrow("不能为空");
    await expect(
      tools[0].execute({
        moduleId: "module-root",
        properties: { visible: "yes" },
      })
    ).rejects.toThrow("布尔值");
  });
});
