import { describe, expect, it, vi } from "vitest";
import {
  registerScriptBlockWebMcpTools,
  type ScriptBlockBatchPreview,
} from "@/services/webmcp/script-block-tools";

const summary = {
  blockCount: 1,
  topLevelBlockCount: 1,
  variableCount: 0,
  commentCount: 0,
  blockTypes: { scene_start: 1 },
  serializedBytes: 120,
  generatedJavaScriptBytes: 80,
  generatedLuaBytes: 60,
};

const preview: ScriptBlockBatchPreview = {
  ownerKind: "entity",
  ownerId: 35,
  ownerTitle: "中国空间站",
  workspaceVersion: "current-version",
  current: summary,
  proposed: {
    ...summary,
    blockCount: 2,
    blockTypes: { scene_start: 1, signal_trigger: 1 },
  },
  proposedWorkspace: {
    blocks: { languageVersion: 0, blocks: [{ type: "scene_start" }] },
  },
  changed: true,
  warnings: [
    {
      code: "invalid-generated-lua",
      message: "Lua syntax warning",
      blockId: "block-with-warning",
    },
  ],
  canSave: true,
  validationScope: "workspace-and-code-generation",
  operationCount: 2,
  results: [
    { index: 0, op: "create", clientId: "signal", blockId: "generated" },
    { index: 1, op: "connect", blockId: "generated" },
  ],
};

const register = (overrides = {}) => {
  const registered: Array<{
    name: string;
    execute: (input: unknown) => unknown;
  }> = [];
  const options = {
    document: {
      modelContext: {
        registerTool: (tool: {
          name: string;
          execute: (input: unknown) => unknown;
        }) => registered.push(tool),
      },
    } as unknown as Document,
    getContext: () => ({
      ownerKind: "entity" as const,
      ownerId: 35,
      ownerTitle: "中国空间站",
      editable: true,
      ready: true,
      dirty: false,
      saving: false,
    }),
    getBlockCatalog: vi.fn().mockResolvedValue({ blocks: [] }),
    getBlockStructure: vi.fn().mockResolvedValue({ blocks: [] }),
    stageBlockBatch: vi.fn().mockResolvedValue(preview),
    confirmBlockBatch: vi.fn().mockResolvedValue(true),
    completeBlockBatch: vi.fn().mockResolvedValue({
      noChange: false,
      ownerKind: "entity",
      ownerId: 35,
      workspaceVersion: "next-version",
      summary: preview.proposed,
    }),
    ...overrides,
  };
  const lifecycle = registerScriptBlockWebMcpTools(options);
  return { registered, options, lifecycle };
};

describe("script block WebMCP tools", () => {
  it("registers four shared page-scoped tools", () => {
    const { registered, lifecycle } = register();
    expect(registered.map((tool) => tool.name)).toEqual([
      "xrugc_get_script_block_catalog",
      "xrugc_get_script_block_structure",
      "xrugc_stage_script_block_batch",
      "xrugc_complete_script_block_batch",
    ]);
    lifecycle?.abort();
  });

  it("normalizes catalog and structure filters", async () => {
    const { registered, options } = register();
    await registered[0].execute({
      query: " signal ",
      category: " 场景 ",
      limit: 25,
    });
    expect(options.getBlockCatalog).toHaveBeenCalledWith({
      query: "signal",
      category: "场景",
      limit: 25,
    });

    await registered[1].execute({
      blockId: " root ",
      includeSerializedState: true,
    });
    expect(options.getBlockStructure).toHaveBeenCalledWith({
      blockId: "root",
      includeSerializedState: true,
      limit: 200,
    });
  });

  it("stages concise results without exposing the proposed workspace", async () => {
    const { registered, options } = register();
    const operations = [
      { op: "create", clientId: "signal", block: { type: "signal" } },
      {
        op: "connect",
        blockId: "signal",
        parentBlockId: "root",
        connection: "next",
      },
    ];
    const staged = (await registered[2].execute({ operations })) as {
      status: string;
      draftId: string;
      preview: Record<string, unknown>;
    };
    expect(staged.status).toBe("staged");
    expect(staged.preview).not.toHaveProperty("proposedWorkspace");
    expect(staged.preview).toMatchObject({
      warnings: preview.warnings,
      canSave: true,
      validationScope: preview.validationScope,
    });
    expect(options.stageBlockBatch).toHaveBeenCalledWith(operations);

    await expect(
      registered[3].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({
      status: "completed",
      workspaceVersion: "next-version",
    });
  });

  it("rejects invalid batches and protects owner changes", async () => {
    const { registered, options } = register();
    await expect(
      registered[2].execute({ operations: [] })
    ).resolves.toMatchObject({ isError: true, errorCode: "invalid_input" });
    await expect(
      registered[2].execute({
        operations: Array.from({ length: 101 }, () => ({ op: "delete" })),
      })
    ).resolves.toMatchObject({ isError: true, errorCode: "invalid_input" });

    const staged = (await registered[2].execute({
      operations: [{ op: "delete", blockId: "old" }],
    })) as { draftId: string };
    options.getContext = () => ({
      ownerKind: "scene",
      ownerId: 1420,
      ownerTitle: "另一个脚本",
      editable: true,
      ready: true,
      dirty: false,
      saving: false,
    });
    await expect(
      registered[3].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({ status: "owner_changed" });
    expect(options.completeBlockBatch).not.toHaveBeenCalled();
  });
});
