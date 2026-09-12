import { describe, expect, it, vi } from "vitest";
import {
  createSceneWorkspaceTools,
  type SceneWorkspaceContext,
} from "@/services/webmcp/scene-workspace-tools";

const sceneContext = (): SceneWorkspaceContext => ({
  sceneId: 2307,
  sceneName: "鲸须",
  activeEditor: "scene",
  scene: { ready: true, dirty: false, saving: false },
  script: {
    open: false,
    ready: false,
    dirty: false,
    saving: false,
    tab: null,
  },
});

const makeWorkspace = () => {
  const state = { context: sceneContext() };
  const getContext = vi.fn(() => state.context);
  const openScriptEditor = vi.fn<() => Promise<void>>().mockResolvedValue();
  const closeScriptEditor = vi
    .fn<() => Promise<boolean>>()
    .mockResolvedValue(true);
  const tools = createSceneWorkspaceTools({
    getContext,
    openScriptEditor,
    closeScriptEditor,
  });
  return { state, getContext, openScriptEditor, closeScriptEditor, tools };
};

describe("scene workspace WebMCP tools", () => {
  it("exposes stable names and reads context without changing the workspace", () => {
    const { state, tools, openScriptEditor, closeScriptEditor } =
      makeWorkspace();

    expect(tools.map((tool) => tool.name)).toEqual([
      "xrugc_get_scene_workspace_context",
      "xrugc_open_scene_script_editor",
      "xrugc_close_scene_script_editor",
    ]);
    expect(tools[0].annotations?.readOnlyHint).toBe(true);
    expect(tools[0].execute({})).toEqual({
      ...state.context,
      toolDiscoveryHint: expect.stringContaining("重新发现工具"),
    });
    expect(openScriptEditor).not.toHaveBeenCalled();
    expect(closeScriptEditor).not.toHaveBeenCalled();
  });

  it.each([0, 1, 2])(
    "tool %i rejects non-empty or malformed parameters before doing work",
    async (index) => {
      const { tools, getContext, openScriptEditor, closeScriptEditor } =
        makeWorkspace();
      expect(tools[index].inputSchema).toEqual({
        type: "object",
        properties: {},
        additionalProperties: false,
      });
      for (const input of [
        undefined,
        null,
        [],
        "",
        1,
        true,
        { save: true },
        { discard: true },
        new Date(),
      ]) {
        await expect(
          Promise.resolve().then(() => tools[index].execute(input))
        ).rejects.toThrow("必须是空对象");
      }
      expect(getContext).not.toHaveBeenCalled();
      expect(openScriptEditor).not.toHaveBeenCalled();
      expect(closeScriptEditor).not.toHaveBeenCalled();
    }
  );

  it("reports an opened drawer even while the script editor is still loading and preserves dirty state", async () => {
    const { state, tools, openScriptEditor, closeScriptEditor } =
      makeWorkspace();
    state.context.scene.dirty = true;
    state.context.script.dirty = true;
    openScriptEditor.mockImplementation(async () => {
      state.context.activeEditor = "scene-script";
      state.context.script.open = true;
      state.context.script.tab = "blockly";
    });

    await expect(tools[1].execute({})).resolves.toEqual({
      status: "opened",
      context: {
        ...state.context,
        activeEditor: "scene-script",
        script: { ...state.context.script, open: true, tab: "blockly" },
      },
      rediscoverTools: true,
    });
    expect(state.context.script.ready).toBe(false);
    expect(state.context.scene.dirty).toBe(true);
    expect(state.context.script.dirty).toBe(true);
    expect(openScriptEditor).toHaveBeenCalledOnce();
    expect(openScriptEditor).toHaveBeenCalledWith();
    expect(closeScriptEditor).not.toHaveBeenCalled();
  });

  it("lets the page cancel closing without forcing save or discard", async () => {
    const { state, tools, openScriptEditor, closeScriptEditor } =
      makeWorkspace();
    state.context.activeEditor = "scene-script";
    state.context.script = {
      open: true,
      ready: true,
      dirty: true,
      saving: false,
      tab: "script",
    };
    const before = structuredClone(state.context);
    closeScriptEditor.mockResolvedValue(false);

    await expect(tools[2].execute({})).resolves.toEqual({
      status: "cancelled",
      context: before,
      rediscoverTools: false,
    });
    expect(state.context).toEqual(before);
    expect(closeScriptEditor).toHaveBeenCalledOnce();
    expect(closeScriptEditor).toHaveBeenCalledWith();
    expect(openScriptEditor).not.toHaveBeenCalled();
  });

  it("returns the current scene context after the page finishes closing", async () => {
    const { state, tools, closeScriptEditor } = makeWorkspace();
    state.context.activeEditor = "scene-script";
    state.context.script.open = true;
    closeScriptEditor.mockImplementation(async () => {
      state.context = sceneContext();
      return true;
    });

    await expect(tools[2].execute({})).resolves.toEqual({
      status: "closed",
      context: sceneContext(),
      rediscoverTools: true,
    });
  });

  it.each([1, 2])(
    "propagates action %i failure instead of reporting a successful switch",
    async (index) => {
      const { tools, getContext, openScriptEditor, closeScriptEditor } =
        makeWorkspace();
      const error = new Error("编辑器会话已经切换");
      if (index === 1) openScriptEditor.mockRejectedValue(error);
      else closeScriptEditor.mockRejectedValue(error);

      await expect(tools[index].execute({})).rejects.toBe(error);
      expect(getContext).not.toHaveBeenCalled();
    }
  );

  it.each([0, 1, 2])(
    "tool %i honors an aborted signal before calling the page",
    async (index) => {
      const { tools, getContext, openScriptEditor, closeScriptEditor } =
        makeWorkspace();
      const controller = new AbortController();
      controller.abort();

      await expect(
        Promise.resolve().then(() =>
          tools[index].execute({}, { signal: controller.signal })
        )
      ).rejects.toMatchObject({ name: "AbortError" });
      expect(getContext).not.toHaveBeenCalled();
      expect(openScriptEditor).not.toHaveBeenCalled();
      expect(closeScriptEditor).not.toHaveBeenCalled();
    }
  );

  it.each([1, 2])(
    "preserves action %i acknowledgment if switching aborts the old tool lifecycle",
    async (index) => {
      const { tools, openScriptEditor, closeScriptEditor } = makeWorkspace();
      const controller = new AbortController();
      openScriptEditor.mockImplementation(async () => controller.abort());
      closeScriptEditor.mockImplementation(async () => {
        controller.abort();
        return true;
      });

      await expect(
        tools[index].execute({}, { signal: controller.signal })
      ).resolves.toMatchObject({
        status: index === 1 ? "opened" : "closed",
        rediscoverTools: true,
      });
    }
  );
});
