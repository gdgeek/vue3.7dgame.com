import { describe, expect, it, vi } from "vitest";
import {
  registerVerseScriptWebMcpTools,
  type VerseScriptReplacePreview,
} from "@/services/webmcp/verse-script-tools";

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

const preview: VerseScriptReplacePreview = {
  sceneId: 1420,
  sceneTitle: "中国空间站",
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
      sceneId: 1420,
      sceneTitle: "中国空间站",
      editable: true,
      ready: true,
      dirty: false,
      saving: false,
    }),
    getVerseScript: vi.fn().mockResolvedValue({
      sceneId: 1420,
      sceneTitle: "中国空间站",
      workspaceVersion: "current-version",
      summary,
      valid: true,
    }),
    validateVerseScript: vi.fn(),
    stageVerseScriptReplace: vi.fn().mockResolvedValue(preview),
    confirmVerseScriptReplace: vi.fn().mockResolvedValue(true),
    completeVerseScriptReplace: vi.fn().mockResolvedValue({
      noChange: false,
      sceneId: 1420,
      workspaceVersion: "next-version",
      summary: preview.proposed,
    }),
    ...overrides,
  };
  const lifecycle = registerVerseScriptWebMcpTools(options);
  return { registered, options, lifecycle };
};

describe("verse script WebMCP tools", () => {
  it("registers four scene page tools with one lifecycle", () => {
    const { registered, lifecycle } = register();
    expect(registered.map((tool) => tool.name)).toEqual([
      "xrugc_get_scene_script",
      "xrugc_validate_scene_script",
      "xrugc_stage_scene_script_replace",
      "xrugc_complete_scene_script_replace",
    ]);
    lifecycle?.abort();
  });

  it("passes read flags to the Blockly editor callback", async () => {
    const { registered, options } = register();
    await registered[0].execute({
      includeWorkspace: true,
      includeGeneratedCode: true,
    });
    expect(options.getVerseScript).toHaveBeenCalledWith({
      includeWorkspace: true,
      includeGeneratedCode: true,
    });
  });

  it("keeps the candidate private while staging and completes it", async () => {
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
    expect(options.completeVerseScriptReplace).toHaveBeenCalledWith(preview);
  });

  it("rejects invalid workspaces and scene switches", async () => {
    const { registered, options } = register();
    await expect(
      registered[2].execute({ workspace: "not-an-object" })
    ).rejects.toThrow("必须是对象");
    await expect(
      registered[2].execute({
        workspace: { data: "x".repeat(513 * 1024) },
      })
    ).rejects.toThrow("不能超过");

    const staged = (await registered[2].execute({
      workspace: preview.proposedWorkspace,
    })) as { draftId: string };
    options.getContext = () => ({
      sceneId: 1421,
      sceneTitle: "另一个场景",
      editable: true,
      ready: true,
      dirty: false,
      saving: false,
    });
    await expect(
      registered[3].execute({ draftId: staged.draftId })
    ).resolves.toMatchObject({ status: "scene_changed" });
    expect(options.completeVerseScriptReplace).not.toHaveBeenCalled();
  });
});
