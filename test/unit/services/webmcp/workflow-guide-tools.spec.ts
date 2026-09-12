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
        version: "1.0.1",
        page: "entity",
        language: "zh-CN",
        documentationUrl: `/webmcp/scene-studio/1.0.1/${id}.md`,
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

  it("unregisters and rejects stale calls when the page lifecycle ends", async () => {
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
    const lifecycle = registerWebMcpTools(withWorkflowGuide([], "scene"), {
      document: doc,
    });
    const tool = registry.get("xrugc_get_workflow_guide")!;
    await expect(tool.execute({})).resolves.toMatchObject({ page: "scene" });
    lifecycle!.abort();
    expect(registry.size).toBe(0);
    await expect(tool.execute({})).rejects.toThrow();
    const next = registerWebMcpTools(withWorkflowGuide([], "entity"), {
      document: doc,
    });
    expect(registry.size).toBe(1);
    await expect(
      registry.get("xrugc_get_workflow_guide")!.execute({})
    ).resolves.toMatchObject({ page: "entity" });
    next!.abort();
  });

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
    expect(
      registerWebMcpTools(withWorkflowGuide([], "scene"), {
        document: {} as Document,
      })
    ).toBeNull();
  });
});
