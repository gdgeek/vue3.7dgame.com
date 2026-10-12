import { describe, expect, it, vi } from "vitest";
import {
  registerWebMcpTools,
  type WebMcpTool,
} from "@/services/webmcp/model-context";
import {
  getWorkflowGuideEntry,
  withWorkflowGuide,
} from "@/services/webmcp/workflow-guide-tools";
import {
  WORKFLOW_GUIDE_TOPICS,
  type WorkflowGuidePage,
} from "@/services/webmcp/workflow-guide-catalog";

const createGuide = (page: WorkflowGuidePage = "entity") => {
  const edit = vi.fn();
  const tools = withWorkflowGuide(
    [
      {
        name: "example_edit",
        description: "edit",
        inputSchema: {},
        execute: edit,
      },
    ],
    page
  );
  return { guide: tools.at(-1)!, edit };
};

describe("site workflow guide", () => {
  it.each(WORKFLOW_GUIDE_TOPICS)(
    "reads the $id topic without calling editing tools",
    async ({ id, title }) => {
      const { guide, edit } = createGuide();
      const result = await guide.execute({ topic: id });
      expect(result).toMatchObject({
        topic: id,
        title,
        version: "1.7.0",
        page: "entity",
        language: "zh-CN",
        documentationUrl: `/webmcp/scene-studio/1.7.0/${id}.md`,
        primaryPageTools: ["example_edit"],
        content: expect.stringMatching(/^# /),
      });
      expect(edit).not.toHaveBeenCalled();
      expect(guide.annotations).toEqual({
        readOnlyHint: true,
        untrustedContentHint: true,
      });
      expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    }
  );

  it.each([
    null,
    undefined,
    [],
    "overview",
    { topic: null },
    { topic: 1 },
    { topic: "../secrets" },
    { topic: "constructor" },
    { topic: "OVERVIEW" },
    { topic: "overview", url: "https://example.invalid" },
  ])("rejects malformed or out-of-scope input: %j", async (input) => {
    await expect(createGuide().guide.execute(input)).rejects.toThrow(TypeError);
  });

  it("defaults to the overview and returns independent metadata on each read", async () => {
    const { guide } = createGuide();
    const first = (await guide.execute({})) as {
      topic: string;
      topics: Array<{ title: string }>;
      primaryPageTools: string[];
    };
    expect(first.topic).toBe("overview");
    first.topics[0].title = "changed by caller";
    first.primaryPageTools.push("invented_tool");
    const next = (await guide.execute({})) as typeof first;
    expect(next.topics[0].title).toBe("场景制作总览");
    expect(next.primaryPageTools).toEqual(["example_edit"]);
  });

  it.each([
    ["entity", "xrugc_get_editor_context"],
    ["scene", "xrugc_get_scene_editor_context"],
    ["entity-script", "xrugc_get_meta_script"],
    ["scene-script", "xrugc_get_scene_script"],
  ] as const)(
    "links the %s page to its own context reader",
    async (page, contextTool) => {
      const result = await createGuide(page).guide.execute({});
      expect(result).toMatchObject({
        ...getWorkflowGuideEntry(page),
        contextTool,
      });
    }
  );

  it.each([
    ["entity", "xrugc_get_editor_context"],
    ["scene", "xrugc_get_scene_editor_context"],
    ["entity-script", "xrugc_get_meta_script"],
    ["scene-script", "xrugc_get_scene_script"],
  ] as const)(
    "surfaces cover guidance at %s discovery without changing tool execution",
    async (page, name) => {
      const result = { workflowGuide: getWorkflowGuideEntry(page) };
      const execute = vi.fn().mockResolvedValue(result);
      const context: WebMcpTool = {
        name,
        description: "Read current context.",
        inputSchema: { type: "object", additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute,
      };
      const edit: WebMcpTool = {
        name: "example_edit",
        description: "Keep existing confirmation.",
        inputSchema: {},
        execute: vi.fn(),
      };
      const [reader, unchangedEdit, guide] = withWorkflowGuide(
        [context, edit],
        page
      );
      expect(reader.description).toContain("强烈建议");
      expect(reader.description).toContain("生图能力时优先生成");
      expect(reader.description).toContain("网络图片");
      expect(reader.description).toContain("截图");
      expect(guide.description).toContain("cover");
      expect(context.description).toBe("Read current context.");
      expect(reader.inputSchema).toBe(context.inputSchema);
      expect(reader.annotations).toBe(context.annotations);
      expect(unchangedEdit).toBe(edit);
      const input = {};
      const execution = { signal: new AbortController().signal };
      await expect(reader.execute(input, execution)).resolves.toBe(result);
      expect(execute).toHaveBeenCalledOnce();
      expect(execute).toHaveBeenCalledWith(input, execution);
      expect(edit.execute).not.toHaveBeenCalled();
      const metadata = result.workflowGuide.coverGuidance;
      expect(metadata.priority).toBe("strong_recommendation");
      const cover = await guide.execute(metadata.input);
      expect(cover).toMatchObject({
        topic: "cover",
        documentationUrl: metadata.documentationUrl,
      });
    }
  );

  it.each(["overview", "interaction", "audio", "troubleshooting"])(
    "explains readiness and rediscovery after opening the same-URL drawer in %s",
    async (topic) => {
      const result = (await createGuide("scene").guide.execute({ topic })) as {
        content: string;
      };
      expect(result.content).toContain("xrugc_open_scene_script_editor");
      expect(result.content).toContain("`opened` 只表示");
      expect(result.content).toContain("xrugc_get_scene_workspace_context");
      expect(result.content).toContain("script.ready");
      expect(result.content).toMatch(
        /即使 URL 不变[^。；]*重新发现|即使不改 URL 也会切换工具/
      );
    }
  );

  it.each([
    "overview",
    "interaction",
    "audio",
    "acceptance",
    "troubleshooting",
  ])(
    "preserves the unsaved decision and drawer-only workflow in %s",
    async (topic) => {
      const result = (await createGuide("scene-script").guide.execute({
        topic,
      })) as { content: string };
      expect(result.content).toContain("xrugc_close_scene_script_editor");
      expect(result.content).toContain("未保存确认");
      expect(result.content).toContain("不自动保存或放弃");
      expect(result.content).toMatch(/`cancelled` 时(?:保留抽屉|抽屉保持打开)/);
      expect(result.content).toContain("关闭成功后");
      expect(result.content).toContain("scene.ready");
      expect(result.content).toContain("正常流程只使用场景内脚本抽屉");
    }
  );

  it("documents persistent workspace helpers without claiming they are primary tools", async () => {
    const result = (await createGuide("scene").guide.execute({})) as {
      primaryPageTools: string[];
      toolAvailability: string;
      content: string;
    };
    expect(result.primaryPageTools).toEqual(["example_edit"]);
    for (const helper of [
      "xrugc_get_scene_workspace_context",
      "xrugc_open_scene_script_editor",
      "xrugc_close_scene_script_editor",
      "xrugc_get_entity_workspace_context",
      "xrugc_open_entity_script_editor",
      "xrugc_close_entity_script_editor",
    ]) {
      expect(result.primaryPageTools).not.toContain(helper);
      expect(result.toolAvailability).toContain(helper);
    }
    expect(result.toolAvailability).toContain("须独立发现");
    expect(result.toolAvailability).toContain("即使 URL 不变也需重新发现");
    expect(result.toolAvailability).toContain("抽屉内场景主工具暂停");
    expect(result.toolAvailability).toContain("关闭后脚本工具注销");
    expect(result.content).toContain("awaiting_confirmation");
    expect(result.content).toContain("xrugc_get_operation_status");
    expect(result.content).toContain("server_acknowledged");
  });

  it.each(["overview", "interaction", "audio", "troubleshooting"])(
    "describes the entity drawer without routing away in %s",
    async (topic) => {
      const { content } = (await createGuide("entity").guide.execute({
        topic,
      })) as { content: string };
      expect(content).toContain("xrugc_open_entity_script_editor");
      expect(content).toContain("xrugc_get_entity_workspace_context");
      expect(content).toContain("script.ready");
      expect(content).toContain("xrugc_close_entity_script_editor");
      expect(content).toContain("不自动保存或放弃");
      expect(content).toContain("`cancelled` 时保留抽屉");
      expect(content).toContain("entity.ready");
      expect(content).toContain("/meta/script");
      expect(content).toMatch(/即使 URL 不变[^。；]*重新发现/);
    }
  );

  it("requires returning to the scene before starting runtime from a drawer", async () => {
    const { content } = (await createGuide("scene-script").guide.execute({
      topic: "acceptance",
    })) as { content: string };
    expect(content).toContain("场景脚本抽屉不提供运行工具");
    expect(content).toContain("保留抽屉且不能继续启动运行");
    expect(content.indexOf("xrugc_close_scene_script_editor")).toBeLessThan(
      content.indexOf("xrugc_start_scene_runtime_preview")
    );
  });

  it.each(["scene", "entity"] as const)(
    "unregisters and rejects stale calls when the %s editor lifecycle ends",
    async (page) => {
      const registry = new Map<string, WebMcpTool>();
      const doc = {
        modelContext: {
          registerTool(tool: WebMcpTool, options: { signal: AbortSignal }) {
            expect(registry.has(tool.name)).toBe(false);
            registry.set(tool.name, tool);
            options.signal.addEventListener("abort", () =>
              registry.delete(tool.name)
            );
          },
        },
      } as unknown as Document;
      const lifecycle = registerWebMcpTools(withWorkflowGuide([], page), {
        document: doc,
      });
      const tool = registry.get("xrugc_get_workflow_guide")!;
      await expect(tool.execute({})).resolves.toMatchObject({ page });
      lifecycle!.abort();
      expect(registry.size).toBe(0);
      await expect(tool.execute({})).resolves.toMatchObject({
        isError: true,
        errorCode: "session_closed",
      });
      const next = registerWebMcpTools(
        withWorkflowGuide([], `${page}-script`),
        {
          document: doc,
        }
      );
      expect(registry.size).toBe(1);
      await expect(
        registry.get("xrugc_get_workflow_guide")!.execute({})
      ).resolves.toMatchObject({ page: `${page}-script` });
      next!.abort();
      const restored = registerWebMcpTools(withWorkflowGuide([], page), {
        document: doc,
      });
      expect(registry.size).toBe(1);
      await expect(
        registry.get("xrugc_get_workflow_guide")!.execute({})
      ).resolves.toMatchObject({ page });
      restored!.abort();
    }
  );

  it("does not return a guide after disposal during loading", async () => {
    const lifecycle = new AbortController();
    const loading = createGuide().guide.execute(
      {},
      { signal: lifecycle.signal }
    );
    lifecycle.abort();
    await expect(loading).rejects.toThrow();
  });

  it("keeps ordinary pages functional without browser WebMCP support", () => {
    const lifecycle = registerWebMcpTools(withWorkflowGuide([], "scene"), {
      document: {} as Document,
    });
    expect(lifecycle).toBeInstanceOf(AbortController);
    lifecycle?.abort();
  });
});
