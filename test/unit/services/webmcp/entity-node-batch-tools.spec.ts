import { describe, expect, it, vi } from "vitest";
import { createEntityNodeBatchTools } from "@/services/webmcp/entity-node-batch-tools";

const transform = {
  position: { x: 0, y: 0, z: 0 },
  rotationDegrees: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

const preview = {
  entityId: 35,
  changes: [
    {
      nodeId: "core-node",
      nodeName: "核心舱",
      current: { transform },
      proposed: {
        transform: { ...transform, position: { x: 10, y: 0, z: 0 } },
      },
      changed: true,
    },
    {
      nodeId: "cargo-node",
      nodeName: "货运飞船",
      current: { properties: { name: "货运飞船", visible: true } },
      proposed: { properties: { name: "货运飞船", visible: false } },
      changed: true,
    },
  ],
  changedCount: 2,
};

const inputChanges = [
  { nodeId: "core-node", transform: { position: { x: 10 } } },
  { nodeId: "cargo-node", properties: { visible: false } },
];

describe("entity node batch WebMCP tools", () => {
  it("stages and completes one confirmed atomic batch", async () => {
    const stageNodeBatch = vi.fn().mockResolvedValue(preview);
    const confirmNodeBatch = vi.fn().mockResolvedValue(true);
    const completeNodeBatch = vi.fn().mockResolvedValue({
      noChange: false,
      commandCount: 2,
      changes: [],
    });
    const tools = createEntityNodeBatchTools({
      getEntityId: () => 35,
      stageNodeBatch,
      confirmNodeBatch,
      completeNodeBatch,
    });

    const staged = (await tools[0].execute({
      changes: inputChanges,
    })) as { draftId: string };
    expect(staged.draftId).toBeTruthy();
    expect(stageNodeBatch).toHaveBeenCalledWith(inputChanges);

    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({
      status: "completed",
      commandCount: 2,
    });
    expect(confirmNodeBatch).toHaveBeenCalledOnce();
    expect(completeNodeBatch).toHaveBeenCalledWith(preview);
  });

  it("does not execute a cancelled batch", async () => {
    const completeNodeBatch = vi.fn();
    const tools = createEntityNodeBatchTools({
      getEntityId: () => 35,
      stageNodeBatch: vi.fn().mockResolvedValue(preview),
      confirmNodeBatch: vi.fn().mockResolvedValue(false),
      completeNodeBatch,
    });
    const staged = (await tools[0].execute({
      changes: inputChanges,
    })) as { draftId: string };

    await expect(
      tools[1].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({ status: "cancelled" });
    expect(completeNodeBatch).not.toHaveBeenCalled();
  });

  it("rejects duplicate nodes and skips an unchanged batch", async () => {
    const stageNodeBatch = vi.fn().mockResolvedValue({
      ...preview,
      changedCount: 0,
      changes: preview.changes.map((item) => ({ ...item, changed: false })),
    });
    const tools = createEntityNodeBatchTools({
      getEntityId: () => 35,
      stageNodeBatch,
      confirmNodeBatch: vi.fn(),
      completeNodeBatch: vi.fn(),
    });

    await expect(
      tools[0].execute({ changes: [inputChanges[0], inputChanges[0]] })
    ).rejects.toThrow("重复");
    await expect(
      tools[0].execute({ changes: inputChanges })
    ).resolves.toMatchObject({ status: "no_change", draftId: null });
  });
});
