import { describe, expect, it, vi } from "vitest";
import {
  createEntityComponentTools,
  type ComponentBatchPreview,
} from "@/services/webmcp/entity-component-tools";

const preview: ComponentBatchPreview = {
  entityId: 35,
  changedCount: 2,
  changes: [
    {
      operation: "add",
      nodeId: "button-node",
      nodeName: "按钮",
      nodeType: "picture",
      componentId: "action-component",
      componentType: "Action",
      current: null,
      proposed: {
        componentId: "action-component",
        componentType: "Action",
        settings: { actionName: "模型分解", modes: ["pinch"] },
      },
      componentsVersion: "version-1",
      changed: true,
    },
    {
      operation: "remove",
      nodeId: "root-node",
      nodeName: "Root",
      nodeType: "polygen",
      componentId: "rotate-component",
      componentType: "Rotate",
      current: {
        componentId: "rotate-component",
        componentType: "Rotate",
        settings: {
          speed: { x: 0, y: 10, z: 0 },
          isRotating: true,
        },
      },
      proposed: null,
      componentsVersion: "version-2",
      changed: true,
    },
  ],
};

describe("entity component WebMCP tools", () => {
  it("reads components through the editor callback", async () => {
    const getNodeComponents = vi.fn().mockResolvedValue({
      nodeId: "root-node",
      nodeName: "Root",
      nodeType: "polygen",
      components: [],
    });
    const tools = createEntityComponentTools({
      getEntityId: () => 35,
      getNodeComponents,
      stageComponentBatch: vi.fn(),
      confirmComponentBatch: vi.fn(),
      completeComponentBatch: vi.fn(),
    });

    await expect(
      tools[0].execute({ nodeId: "root-node" })
    ).resolves.toMatchObject({ nodeId: "root-node", components: [] });
    expect(getNodeComponents).toHaveBeenCalledWith("root-node");
  });

  it("stages and atomically completes mixed component changes", async () => {
    const completeComponentBatch = vi.fn().mockResolvedValue({
      noChange: false,
      commandCount: 2,
      changes: preview.changes.map((item) => ({
        operation: item.operation,
        nodeId: item.nodeId,
        nodeName: item.nodeName,
        componentId: item.componentId,
        componentType: item.componentType,
      })),
    });
    const tools = createEntityComponentTools({
      getEntityId: () => 35,
      getNodeComponents: vi.fn(),
      stageComponentBatch: vi.fn().mockResolvedValue(preview),
      confirmComponentBatch: vi.fn().mockResolvedValue(true),
      completeComponentBatch,
    });

    const staged = (await tools[1].execute({
      changes: [
        {
          operation: "add",
          nodeId: "button-node",
          componentType: "Action",
          settings: { actionName: "模型分解", modes: ["pinch"] },
        },
        {
          operation: "remove",
          nodeId: "root-node",
          componentId: "rotate-component",
        },
      ],
    })) as { draftId: string };
    await expect(
      tools[2].execute({ draftId: staged.draftId })
    ).resolves.toEqual(
      expect.objectContaining({ status: "completed", commandCount: 2 })
    );
    expect(completeComponentBatch).toHaveBeenCalledWith(preview);
  });

  it("cancels without applying changes", async () => {
    const completeComponentBatch = vi.fn();
    const tools = createEntityComponentTools({
      getEntityId: () => 35,
      getNodeComponents: vi.fn(),
      stageComponentBatch: vi.fn().mockResolvedValue(preview),
      confirmComponentBatch: vi.fn().mockResolvedValue(false),
      completeComponentBatch,
    });
    const staged = (await tools[1].execute({
      changes: [
        {
          operation: "add",
          nodeId: "button-node",
          componentType: "Action",
        },
      ],
    })) as { draftId: string };
    await expect(
      tools[2].execute({ draftId: staged.draftId })
    ).resolves.toEqual(expect.objectContaining({ status: "cancelled" }));
    expect(completeComponentBatch).not.toHaveBeenCalled();
  });

  it("rejects duplicate targets and invalid operations", async () => {
    const tools = createEntityComponentTools({
      getEntityId: () => 35,
      getNodeComponents: vi.fn(),
      stageComponentBatch: vi.fn(),
      confirmComponentBatch: vi.fn(),
      completeComponentBatch: vi.fn(),
    });
    await expect(
      tools[1].execute({
        changes: [
          {
            operation: "remove",
            nodeId: "root-node",
            componentId: "component-1",
          },
          {
            operation: "update",
            nodeId: "root-node",
            componentId: "component-1",
            settings: { isRotating: false },
          },
        ],
      })
    ).rejects.toThrow("重复");
    await expect(
      tools[1].execute({
        changes: [{ operation: "replace", nodeId: "root-node" }],
      })
    ).rejects.toThrow("operation");
  });
});
