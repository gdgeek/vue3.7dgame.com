import { describe, expect, it, vi } from "vitest";
import {
  registerMetaScriptWebMcpTools,
  type MetaScriptReplacePreview,
} from "@/services/webmcp/meta-script-tools";

const summary = {
  blockCount: 1,
  topLevelBlockCount: 1,
  variableCount: 0,
  commentCount: 0,
  blockTypes: { input_event: 1 },
  serializedBytes: 120,
  generatedJavaScriptBytes: 80,
  generatedLuaBytes: 60,
};

const preview: MetaScriptReplacePreview = {
  entityId: 35,
  entityTitle: "中国空间站",
  workspaceVersion: "current-version",
  current: summary,
  proposed: {
    ...summary,
    blockCount: 2,
    blockTypes: { input_event: 1, entity_explode: 1 },
  },
  proposedWorkspace: {
    blocks: { languageVersion: 0, blocks: [{ type: "input_event" }] },
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
      entityId: 35,
      entityTitle: "中国空间站",
      editable: true,
      ready: true,
      dirty: false,
      saving: false,
    }),
    getMetaScript: vi.fn().mockResolvedValue({
      entityId: 35,
      entityTitle: "中国空间站",
      workspaceVersion: "current-version",
      summary,
      valid: true,
    }),
    validateMetaScript: vi.fn(),
    stageMetaScriptReplace: vi.fn().mockResolvedValue(preview),
    confirmMetaScriptReplace: vi.fn().mockResolvedValue(true),
    completeMetaScriptReplace: vi.fn().mockResolvedValue({
      noChange: false,
      entityId: 35,
      workspaceVersion: "next-version",
      summary: preview.proposed,
    }),
    ...overrides,
  };
  const lifecycle = registerMetaScriptWebMcpTools(options);
  return { registered, options, lifecycle };
};

describe("meta script WebMCP tools", () => {
  it("provides a discoverable workflow guide while preserving the script result", async () => {
    const { registered } = register();
    const result = await registered[0].execute({});
    expect(result).toMatchObject({
      workflowGuide: {
        tool: "xrugc_get_workflow_guide",
        page: "entity-script",
        input: { topic: "overview" },
      },
    });
    const guide = registered.find(
      (tool) => tool.name === "xrugc_get_workflow_guide"
    )!;
    await expect(
      guide.execute({ topic: "interaction" })
    ).resolves.toMatchObject({ page: "entity-script", topic: "interaction" });
  });

  it("registers four page-scoped tools with one lifecycle", () => {
    const { registered, lifecycle } = register();
    expect(registered.map((tool) => tool.name)).toEqual([
      "xrugc_get_meta_script",
      "xrugc_validate_meta_script",
      "xrugc_stage_meta_script_replace",
      "xrugc_complete_meta_script_replace",
      "xrugc_get_workflow_guide",
    ]);
    lifecycle?.abort();
  });

  it("passes read flags to the Blockly editor callback", async () => {
    const { registered, options } = register();
    await registered[0].execute({
      includeWorkspace: true,
      includeGeneratedCode: true,
    });
    expect(options.getMetaScript).toHaveBeenCalledWith({
      includeWorkspace: true,
      includeGeneratedCode: true,
    });
  });

  it("stages without returning the full proposed workspace and completes", async () => {
    const { registered, options } = register();
    const staged = (await registered[2].execute({
      workspace: preview.proposedWorkspace,
    })) as {
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

    await expect(
      registered[3].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({
      status: "completed",
      workspaceVersion: "next-version",
    });
    expect(options.completeMetaScriptReplace).toHaveBeenCalledWith(preview);
  });

  it("enforces the workspace limit in UTF-8 bytes", async () => {
    const { registered, options } = register();
    await expect(
      registered[2].execute({ workspace: { title: "实".repeat(180000) } })
    ).resolves.toMatchObject({ isError: true, errorCode: "invalid_input" });
    expect(options.stageMetaScriptReplace).not.toHaveBeenCalled();
  });

  it("rejects oversized and non-object workspaces before staging", async () => {
    const { registered, options } = register();
    await expect(
      registered[2].execute({ workspace: "not-an-object" })
    ).resolves.toMatchObject({ isError: true, errorCode: "invalid_input" });
    await expect(
      registered[2].execute({
        workspace: { data: "x".repeat(513 * 1024) },
      })
    ).resolves.toMatchObject({ isError: true, errorCode: "invalid_input" });
    expect(options.stageMetaScriptReplace).not.toHaveBeenCalled();
  });
});
