import { describe, expect, it, vi } from "vitest";
import { createSceneRuntimePreviewTools } from "@/services/webmcp/scene-runtime-preview-tools";

const closed = {
  sceneId: 1420,
  sceneName: "中国空间站",
  visible: false,
  frameVisible: false,
  ready: false,
  phase: "closed" as const,
  status: "预览已关闭",
};

describe("scene runtime preview WebMCP tools", () => {
  it("reads preview status without changing it", () => {
    const getPreviewStatus = vi.fn(() => closed);
    const tools = createSceneRuntimePreviewTools({
      getPreviewStatus,
      startPreview: vi.fn(),
      stopPreview: vi.fn(),
    });

    expect(tools[0].execute({})).toEqual(closed);
    expect(getPreviewStatus).toHaveBeenCalledOnce();
  });

  it("starts the visible preview", async () => {
    const loading = {
      ...closed,
      visible: true,
      frameVisible: true,
      phase: "loading" as const,
      status: "正在加载 Unity 运行器...",
    };
    const startPreview = vi.fn().mockResolvedValue(loading);
    const tools = createSceneRuntimePreviewTools({
      getPreviewStatus: vi.fn(() => closed),
      startPreview,
      stopPreview: vi.fn(),
    });

    await expect(tools[1].execute({})).resolves.toEqual(loading);
    expect(startPreview).toHaveBeenCalledOnce();
  });

  it("stops the preview and rejects malformed input", async () => {
    const stopPreview = vi.fn().mockResolvedValue(closed);
    const tools = createSceneRuntimePreviewTools({
      getPreviewStatus: vi.fn(() => closed),
      startPreview: vi.fn(),
      stopPreview,
    });

    await expect(tools[2].execute({})).resolves.toEqual(closed);
    expect(stopPreview).toHaveBeenCalledOnce();
    expect(() => tools[0].execute(null)).toThrow("必须是对象");
  });
});
