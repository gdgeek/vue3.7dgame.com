import { describe, expect, it, vi } from "vitest";
import { createEntityNodeDeletionTools } from "@/services/webmcp/entity-node-deletion-tools";

const preview = {
  entityId: 35,
  nodeId: "module-node",
  nodeName: "核心舱模块",
  nodeType: "polygen",
  parent: {
    parentNodeId: "root-node",
    parentName: "Root.glb",
    index: 1,
  },
  subtreeVersion: "abc12345",
  directChildCount: 1,
  descendantCount: 2,
  descendantNames: ["介绍图片", "按钮"],
};

describe("entity node deletion WebMCP tools", () => {
  it("stages and completes a confirmed subtree deletion", async () => {
    const stageNodeDeletion = vi.fn().mockResolvedValue(preview);
    const confirmNodeDeletion = vi.fn().mockResolvedValue(true);
    const completeNodeDeletion = vi.fn().mockResolvedValue({
      nodeId: "module-node",
      nodeName: "核心舱模块",
      removedNodeCount: 3,
      parent: preview.parent,
    });
    const tools = createEntityNodeDeletionTools({
      getEntityId: () => 35,
      stageNodeDeletion,
      confirmNodeDeletion,
      completeNodeDeletion,
    });

    const staged = (await tools[0].execute({
      nodeId: "module-node",
    })) as { draftId: string };
    expect(staged.draftId).toBeTruthy();
    expect(stageNodeDeletion).toHaveBeenCalledWith("module-node");

    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({
      status: "completed",
      removedNodeCount: 3,
    });
    expect(confirmNodeDeletion).toHaveBeenCalledOnce();
    expect(completeNodeDeletion).toHaveBeenCalledWith(preview);
  });

  it("never deletes after cancellation", async () => {
    const completeNodeDeletion = vi.fn();
    const tools = createEntityNodeDeletionTools({
      getEntityId: () => 35,
      stageNodeDeletion: vi.fn().mockResolvedValue(preview),
      confirmNodeDeletion: vi.fn().mockResolvedValue(false),
      completeNodeDeletion,
    });
    const staged = (await tools[0].execute({
      nodeId: "module-node",
    })) as { draftId: string };

    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({ status: "cancelled" });
    expect(completeNodeDeletion).not.toHaveBeenCalled();
  });

  it("rejects invalid IDs and entity switches", async () => {
    let entityId = 35;
    const completeNodeDeletion = vi.fn();
    const tools = createEntityNodeDeletionTools({
      getEntityId: () => entityId,
      stageNodeDeletion: vi.fn().mockResolvedValue(preview),
      confirmNodeDeletion: vi.fn().mockResolvedValue(true),
      completeNodeDeletion,
    });

    await expect(tools[0].execute({ nodeId: "" })).rejects.toThrow("nodeId");
    const staged = (await tools[0].execute({
      nodeId: "module-node",
    })) as { draftId: string };
    entityId = 36;
    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({ status: "entity_changed" });
    expect(completeNodeDeletion).not.toHaveBeenCalled();
  });
});
