import { describe, expect, it, vi } from "vitest";
import { createEntityNodePropertyTools } from "@/services/webmcp/entity-node-property-tools";

const preview = {
  entityId: 35,
  nodeId: "node-1",
  nodeName: "核心舱",
  current: { name: "核心舱", visible: true },
  proposed: { name: "核心舱模型", visible: false },
  changed: true,
};

describe("entity node property WebMCP tools", () => {
  it("stages and completes a confirmed property change", async () => {
    const stageNodeProperties = vi.fn().mockResolvedValue(preview);
    const confirmNodeProperties = vi.fn().mockResolvedValue(true);
    const completeNodeProperties = vi.fn().mockResolvedValue({
      nodeId: "node-1",
      nodeName: "核心舱模型",
      properties: preview.proposed,
      noChange: false,
    });
    const tools = createEntityNodePropertyTools({
      getEntityId: () => 35,
      stageNodeProperties,
      confirmNodeProperties,
      completeNodeProperties,
    });

    const staged = (await tools[0].execute({
      nodeId: "node-1",
      properties: { name: "核心舱模型", visible: false },
    })) as { draftId: string };
    expect(staged.draftId).toBeTruthy();

    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({
      status: "completed",
      nodeName: "核心舱模型",
      properties: { visible: false },
    });
    expect(confirmNodeProperties).toHaveBeenCalledOnce();
    expect(completeNodeProperties).toHaveBeenCalledOnce();
  });

  it("does not apply a cancelled property change", async () => {
    const completeNodeProperties = vi.fn();
    const tools = createEntityNodePropertyTools({
      getEntityId: () => 35,
      stageNodeProperties: vi.fn().mockResolvedValue(preview),
      confirmNodeProperties: vi.fn().mockResolvedValue(false),
      completeNodeProperties,
    });
    const staged = (await tools[0].execute({
      nodeId: "node-1",
      properties: { visible: false },
    })) as { draftId: string };

    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({ status: "cancelled" });
    expect(completeNodeProperties).not.toHaveBeenCalled();
  });

  it("rejects empty, oversized, and non-boolean properties", async () => {
    const stageNodeProperties = vi.fn();
    const tools = createEntityNodePropertyTools({
      getEntityId: () => 35,
      stageNodeProperties,
      confirmNodeProperties: vi.fn(),
      completeNodeProperties: vi.fn(),
    });

    await expect(
      tools[0].execute({ nodeId: "node-1", properties: {} })
    ).rejects.toThrow("至少需要包含");
    await expect(
      tools[0].execute({
        nodeId: "node-1",
        properties: { name: "x".repeat(101) },
      })
    ).rejects.toThrow("100");
    await expect(
      tools[0].execute({
        nodeId: "node-1",
        properties: { visible: "false" },
      })
    ).rejects.toThrow("布尔值");
    expect(stageNodeProperties).not.toHaveBeenCalled();
  });
});
