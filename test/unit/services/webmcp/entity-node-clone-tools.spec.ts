import { describe, expect, it, vi } from "vitest";
import { createEntityNodeCloneTools } from "@/services/webmcp/entity-node-clone-tools";

const preview = {
  entityId: 35,
  nodeId: "core-node",
  nodeName: "核心舱",
  nodeType: "polygen",
  parent: {
    parentNodeId: "root-node",
    parentName: "Root.glb",
    index: 0,
  },
  sourceVersion: "abc12345",
  siblingOrderVersion: "def67890",
  directChildCount: 1,
  descendantCount: 2,
  proposedName: "核心舱副本",
};

describe("entity node clone WebMCP tools", () => {
  it("stages and completes a confirmed subtree clone", async () => {
    const stageNodeClone = vi.fn().mockResolvedValue(preview);
    const confirmNodeClone = vi.fn().mockResolvedValue(true);
    const completeNodeClone = vi.fn().mockResolvedValue({
      sourceNodeId: "core-node",
      nodeId: "core-clone-node",
      nodeName: "核心舱副本",
      nodeType: "polygen",
      clonedNodeCount: 3,
      parent: { ...preview.parent, index: 1 },
    });
    const tools = createEntityNodeCloneTools({
      getEntityId: () => 35,
      stageNodeClone,
      confirmNodeClone,
      completeNodeClone,
    });

    const staged = (await tools[0].execute({
      nodeId: "core-node",
      name: "核心舱副本",
    })) as { draftId: string };
    expect(staged.draftId).toBeTruthy();
    expect(stageNodeClone).toHaveBeenCalledWith("core-node", "核心舱副本");

    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({
      status: "completed",
      nodeId: "core-clone-node",
      clonedNodeCount: 3,
    });
    expect(confirmNodeClone).toHaveBeenCalledOnce();
    expect(completeNodeClone).toHaveBeenCalledWith(preview);
  });

  it("does not clone after cancellation", async () => {
    const completeNodeClone = vi.fn();
    const tools = createEntityNodeCloneTools({
      getEntityId: () => 35,
      stageNodeClone: vi.fn().mockResolvedValue(preview),
      confirmNodeClone: vi.fn().mockResolvedValue(false),
      completeNodeClone,
    });
    const staged = (await tools[0].execute({
      nodeId: "core-node",
    })) as { draftId: string };

    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({ status: "cancelled" });
    expect(completeNodeClone).not.toHaveBeenCalled();
  });

  it("allows automatic naming and rejects invalid names", async () => {
    const stageNodeClone = vi.fn().mockResolvedValue(preview);
    const tools = createEntityNodeCloneTools({
      getEntityId: () => 35,
      stageNodeClone,
      confirmNodeClone: vi.fn(),
      completeNodeClone: vi.fn(),
    });

    await expect(
      tools[0].execute({ nodeId: "core-node" })
    ).resolves.toMatchObject({ status: "staged" });
    expect(stageNodeClone).toHaveBeenCalledWith("core-node", undefined);
    await expect(
      tools[0].execute({ nodeId: "core-node", name: " " })
    ).rejects.toThrow("name");
  });
});
