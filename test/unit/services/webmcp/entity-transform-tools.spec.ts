import { describe, expect, it, vi } from "vitest";
import {
  createEntityTransformTools,
  type NodeTransformPreview,
} from "@/services/webmcp/entity-transform-tools";

const snapshot = {
  position: { x: 0, y: 0, z: 0 },
  rotationDegrees: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

const preview: NodeTransformPreview = {
  entityId: 35,
  nodeId: "root-node",
  nodeName: "Root.glb",
  current: snapshot,
  proposed: {
    ...snapshot,
    position: { x: 10, y: 0, z: 0 },
  },
  changed: true,
};

describe("entity transform WebMCP tools", () => {
  it("stages a draft and completes it only after confirmation", async () => {
    const stageNodeTransform = vi.fn().mockResolvedValue(preview);
    const confirmNodeTransform = vi.fn().mockResolvedValue(true);
    const completeNodeTransform = vi.fn().mockResolvedValue({
      nodeId: preview.nodeId,
      nodeName: preview.nodeName,
      transform: preview.proposed,
      noChange: false,
    });
    const tools = createEntityTransformTools({
      getEntityId: () => 35,
      stageNodeTransform,
      confirmNodeTransform,
      completeNodeTransform,
    });

    const staged = (await tools[0].execute({
      nodeId: "root-node",
      transform: { position: { x: 10 } },
    })) as { status: string; draftId: string };
    expect(staged.status).toBe("staged");
    expect(stageNodeTransform).toHaveBeenCalledWith("root-node", {
      position: { x: 10 },
    });

    const completed = (await tools[1].execute({
      draftId: staged.draftId,
    })) as { status: string };
    expect(completed.status).toBe("completed");
    expect(confirmNodeTransform).toHaveBeenCalledWith(preview);
    expect(completeNodeTransform).toHaveBeenCalledWith(preview);
  });

  it("does not apply a draft when the user cancels", async () => {
    const completeNodeTransform = vi.fn();
    const tools = createEntityTransformTools({
      getEntityId: () => 35,
      stageNodeTransform: vi.fn().mockResolvedValue(preview),
      confirmNodeTransform: vi.fn().mockResolvedValue(false),
      completeNodeTransform,
    });
    const staged = (await tools[0].execute({
      nodeId: "root-node",
      transform: { scale: { x: 2 } },
    })) as { draftId: string };
    const result = (await tools[1].execute({
      draftId: staged.draftId,
    })) as { status: string };

    expect(result.status).toBe("cancelled");
    expect(completeNodeTransform).not.toHaveBeenCalled();
  });

  it("rejects non-finite and out-of-range values before reaching the editor", async () => {
    const stageNodeTransform = vi.fn();
    const tools = createEntityTransformTools({
      getEntityId: () => 35,
      stageNodeTransform,
      confirmNodeTransform: vi.fn(),
      completeNodeTransform: vi.fn(),
    });

    await expect(
      tools[0].execute({
        nodeId: "root-node",
        transform: { position: { x: Number.POSITIVE_INFINITY } },
      })
    ).rejects.toThrow("有限数字");
    await expect(
      tools[0].execute({
        nodeId: "root-node",
        transform: { scale: { x: 10001 } },
      })
    ).rejects.toThrow("超出允许范围");
    expect(stageNodeTransform).not.toHaveBeenCalled();
  });
});
