import { describe, expect, it, vi } from "vitest";
import { createEntityNodeOrderTools } from "@/services/webmcp/entity-node-order-tools";

const preview = {
  entityId: 35,
  nodeId: "cargo-node",
  nodeName: "货运飞船",
  current: {
    parentNodeId: "root-node",
    parentName: "Root.glb",
    currentIndex: 2,
    siblingCount: 4,
    siblingOrderVersion: "abc12345",
  },
  proposed: {
    beforeNodeId: "core-node",
    beforeNodeName: "核心舱",
    targetIndex: 0,
  },
  changed: true,
};

describe("entity node order WebMCP tools", () => {
  it("stages and completes a confirmed sibling reorder", async () => {
    const stageNodeReorder = vi.fn().mockResolvedValue(preview);
    const confirmNodeReorder = vi.fn().mockResolvedValue(true);
    const completeNodeReorder = vi.fn().mockResolvedValue({
      nodeId: "cargo-node",
      nodeName: "货运飞船",
      order: { ...preview.current, currentIndex: 0 },
      noChange: false,
    });
    const tools = createEntityNodeOrderTools({
      getEntityId: () => 35,
      stageNodeReorder,
      confirmNodeReorder,
      completeNodeReorder,
    });

    const staged = (await tools[0].execute({
      nodeId: "cargo-node",
      beforeNodeId: "core-node",
    })) as { draftId: string };
    expect(staged.draftId).toBeTruthy();
    expect(stageNodeReorder).toHaveBeenCalledWith("cargo-node", "core-node");

    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({
      status: "completed",
      order: { currentIndex: 0 },
    });
    expect(confirmNodeReorder).toHaveBeenCalledOnce();
    expect(completeNodeReorder).toHaveBeenCalledWith(preview);
  });

  it("does not reorder after cancellation", async () => {
    const completeNodeReorder = vi.fn();
    const tools = createEntityNodeOrderTools({
      getEntityId: () => 35,
      stageNodeReorder: vi.fn().mockResolvedValue(preview),
      confirmNodeReorder: vi.fn().mockResolvedValue(false),
      completeNodeReorder,
    });
    const staged = (await tools[0].execute({
      nodeId: "cargo-node",
      beforeNodeId: "core-node",
    })) as { draftId: string };

    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({ status: "cancelled" });
    expect(completeNodeReorder).not.toHaveBeenCalled();
  });

  it("accepts null for the end position and skips an unchanged order", async () => {
    const stageNodeReorder = vi.fn().mockResolvedValue({
      ...preview,
      proposed: {
        beforeNodeId: null,
        beforeNodeName: null,
        targetIndex: 2,
      },
      current: { ...preview.current, currentIndex: 2, siblingCount: 3 },
      changed: false,
    });
    const tools = createEntityNodeOrderTools({
      getEntityId: () => 35,
      stageNodeReorder,
      confirmNodeReorder: vi.fn(),
      completeNodeReorder: vi.fn(),
    });

    await expect(
      tools[0].execute({ nodeId: "cargo-node", beforeNodeId: null })
    ).resolves.toMatchObject({ status: "no_change", draftId: null });
    expect(stageNodeReorder).toHaveBeenCalledWith("cargo-node", null);
    await expect(tools[0].execute({ nodeId: "cargo-node" })).rejects.toThrow(
      "beforeNodeId"
    );
  });
});
