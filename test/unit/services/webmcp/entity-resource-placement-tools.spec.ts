import { describe, expect, it, vi } from "vitest";
import { createEntityResourcePlacementTools } from "@/services/webmcp/entity-resource-placement-tools";

const preview = {
  entityId: 35,
  resourceId: 7,
  resourceType: "polygen",
  resourceName: "Root.glb",
  resourceUpdatedAt: "2026-08-31T03:00:00Z",
};

describe("entity resource placement WebMCP tools", () => {
  it("stages and completes a confirmed resource placement", async () => {
    const stageResourcePlacement = vi.fn().mockResolvedValue(preview);
    const confirmResourcePlacement = vi.fn().mockResolvedValue(true);
    const completeResourcePlacement = vi.fn().mockResolvedValue({
      nodeId: "root-node",
      nodeName: "Root.glb [polygen]",
      nodeType: "Polygen",
      resourceId: 7,
    });
    const tools = createEntityResourcePlacementTools({
      getEntityId: () => 35,
      stageResourcePlacement,
      confirmResourcePlacement,
      completeResourcePlacement,
    });

    const staged = (await tools[0].execute({
      resourceType: "polygen",
      resourceId: 7,
    })) as { draftId: string };
    expect(staged.draftId).toBeTruthy();

    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({
      status: "completed",
      nodeId: "root-node",
      resourceId: 7,
    });
    expect(confirmResourcePlacement).toHaveBeenCalledOnce();
    expect(completeResourcePlacement).toHaveBeenCalledOnce();
  });

  it("does not place a resource after cancellation", async () => {
    const completeResourcePlacement = vi.fn();
    const tools = createEntityResourcePlacementTools({
      getEntityId: () => 35,
      stageResourcePlacement: vi.fn().mockResolvedValue(preview),
      confirmResourcePlacement: vi.fn().mockResolvedValue(false),
      completeResourcePlacement,
    });
    const staged = (await tools[0].execute({
      resourceType: "polygen",
      resourceId: 7,
    })) as { draftId: string };

    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({ status: "cancelled" });
    expect(completeResourcePlacement).not.toHaveBeenCalled();
  });

  it("rejects invalid resource types and IDs before lookup", async () => {
    const stageResourcePlacement = vi.fn();
    const tools = createEntityResourcePlacementTools({
      getEntityId: () => 35,
      stageResourcePlacement,
      confirmResourcePlacement: vi.fn(),
      completeResourcePlacement: vi.fn(),
    });

    await expect(
      tools[0].execute({ resourceType: "script", resourceId: 7 })
    ).rejects.toThrow("不支持");
    await expect(
      tools[0].execute({ resourceType: "polygen", resourceId: 0 })
    ).rejects.toThrow("正整数");
    expect(stageResourcePlacement).not.toHaveBeenCalled();
  });
});
