import { describe, expect, it, vi } from "vitest";
import { createEntityHierarchyTools } from "@/services/webmcp/entity-hierarchy-tools";

const preview = {
  entityId: 35,
  nodeId: "module-node",
  nodeName: "核心舱模块",
  currentParent: {
    parentNodeId: null,
    parentName: "实体根层级",
    index: 1,
  },
  proposedParent: {
    parentNodeId: "root-node",
    parentName: "Root.glb",
  },
  changed: true,
};

describe("entity hierarchy WebMCP tools", () => {
  it("stages and completes a confirmed reparent", async () => {
    const stageNodeReparent = vi.fn().mockResolvedValue(preview);
    const confirmNodeReparent = vi.fn().mockResolvedValue(true);
    const completeNodeReparent = vi.fn().mockResolvedValue({
      nodeId: "module-node",
      nodeName: "核心舱模块",
      parent: { parentNodeId: "root-node", parentName: "Root.glb", index: 0 },
      noChange: false,
    });
    const tools = createEntityHierarchyTools({
      getEntityId: () => 35,
      stageNodeReparent,
      confirmNodeReparent,
      completeNodeReparent,
    });

    const staged = (await tools[0].execute({
      nodeId: "module-node",
      parentNodeId: "root-node",
    })) as { draftId: string };
    expect(staged.draftId).toBeTruthy();

    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({
      status: "completed",
      parent: { parentNodeId: "root-node" },
    });
    expect(confirmNodeReparent).toHaveBeenCalledOnce();
    expect(completeNodeReparent).toHaveBeenCalledOnce();
  });

  it("does not move a node after cancellation", async () => {
    const completeNodeReparent = vi.fn();
    const tools = createEntityHierarchyTools({
      getEntityId: () => 35,
      stageNodeReparent: vi.fn().mockResolvedValue(preview),
      confirmNodeReparent: vi.fn().mockResolvedValue(false),
      completeNodeReparent,
    });
    const staged = (await tools[0].execute({
      nodeId: "module-node",
      parentNodeId: "root-node",
    })) as { draftId: string };

    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({ status: "cancelled" });
    expect(completeNodeReparent).not.toHaveBeenCalled();
  });

  it("accepts null for the entity root and rejects missing IDs", async () => {
    const stageNodeReparent = vi.fn().mockResolvedValue({
      ...preview,
      proposedParent: { parentNodeId: null, parentName: "实体根层级" },
    });
    const tools = createEntityHierarchyTools({
      getEntityId: () => 35,
      stageNodeReparent,
      confirmNodeReparent: vi.fn(),
      completeNodeReparent: vi.fn(),
    });

    await expect(
      tools[0].execute({ nodeId: "module-node", parentNodeId: null })
    ).resolves.toMatchObject({ status: "staged" });
    await expect(
      tools[0].execute({ nodeId: "", parentNodeId: null })
    ).rejects.toThrow("nodeId");
  });
});
