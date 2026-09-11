import { describe, expect, it, vi } from "vitest";
import {
  createEntitySignalTools,
  type SignalBatchPreview,
} from "@/services/webmcp/entity-signal-tools";

const preview: SignalBatchPreview = {
  entityId: 35,
  changedCount: 2,
  blockedCount: 0,
  changes: [
    {
      operation: "add",
      direction: "input",
      signalId: "new-input",
      current: null,
      proposed: {
        signalId: "new-input",
        direction: "input",
        title: "开始分解",
      },
      signalsVersion: "version-1",
      changed: true,
      references: [],
    },
    {
      operation: "rename",
      direction: "output",
      signalId: "done-output",
      current: {
        signalId: "done-output",
        direction: "output",
        title: "完成",
      },
      proposed: {
        signalId: "done-output",
        direction: "output",
        title: "分解完成",
      },
      signalsVersion: "version-1",
      changed: true,
      references: [],
    },
  ],
};

const createOptions = () => ({
  getEntityId: () => 35,
  getEntitySignals: vi.fn(),
  stageSignalBatch: vi.fn().mockResolvedValue(preview),
  confirmSignalBatch: vi.fn().mockResolvedValue(true),
  completeSignalBatch: vi.fn().mockResolvedValue({
    noChange: false,
    commandCount: 2,
    changes: preview.changes.map((item) => ({
      operation: item.operation,
      direction: item.direction,
      signalId: item.signalId,
      title: (item.proposed ?? item.current)!.title,
    })),
  }),
});

describe("entity signal WebMCP tools", () => {
  it("reads signals and their script references", async () => {
    const options = createOptions();
    options.getEntitySignals.mockResolvedValue({
      entityId: 35,
      inputs: [
        {
          signalId: "start-input",
          direction: "input",
          title: "开始",
          references: [{ scope: "entity_script", source: "blockly", count: 1 }],
        },
      ],
      outputs: [],
    });
    const tools = createEntitySignalTools(options);

    await expect(tools[0].execute({})).resolves.toMatchObject({
      entityId: 35,
      inputs: [{ signalId: "start-input" }],
    });
  });

  it("stages and completes a mixed signal batch", async () => {
    const options = createOptions();
    const tools = createEntitySignalTools(options);
    const staged = (await tools[1].execute({
      changes: [
        { operation: "add", direction: "input", title: "开始分解" },
        {
          operation: "rename",
          direction: "output",
          signalId: "done-output",
          title: "分解完成",
        },
      ],
    })) as { status: string; draftId: string };

    expect(staged.status).toBe("staged");
    await expect(
      tools[2].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({ status: "completed", commandCount: 2 });
    expect(options.completeSignalBatch).toHaveBeenCalledWith(preview);
  });

  it("does not create a draft when a removed signal is referenced", async () => {
    const options = createOptions();
    options.stageSignalBatch.mockResolvedValue({
      ...preview,
      changedCount: 1,
      blockedCount: 1,
      changes: [
        {
          operation: "remove",
          direction: "input",
          signalId: "start-input",
          current: {
            signalId: "start-input",
            direction: "input",
            title: "开始",
          },
          proposed: null,
          signalsVersion: "version-1",
          changed: true,
          references: [
            {
              scope: "scene_script",
              source: "blockly",
              count: 1,
              sceneId: 1420,
              sceneName: "中国空间站",
            },
          ],
          blockedReason: "信号仍被 1 处脚本来源引用",
        },
      ],
    });
    const tools = createEntitySignalTools(options);

    await expect(
      tools[1].execute({
        changes: [
          {
            operation: "remove",
            direction: "input",
            signalId: "start-input",
          },
        ],
      })
    ).resolves.toMatchObject({
      status: "blocked_by_references",
      draftId: null,
    });
    expect(options.confirmSignalBatch).not.toHaveBeenCalled();
  });

  it("rejects duplicate signal targets and invalid directions", async () => {
    const tools = createEntitySignalTools(createOptions());
    await expect(
      tools[1].execute({
        changes: [
          {
            operation: "rename",
            direction: "input",
            signalId: "signal-1",
            title: "新名称",
          },
          {
            operation: "remove",
            direction: "input",
            signalId: "signal-1",
          },
        ],
      })
    ).rejects.toThrow("重复");
    await expect(
      tools[1].execute({
        changes: [{ operation: "add", direction: "sideways", title: "测试" }],
      })
    ).rejects.toThrow("input 或 output");
  });
});
