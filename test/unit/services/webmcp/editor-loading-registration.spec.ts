import { describe, expect, it, vi } from "vitest";
import {
  registerWebMcpTools,
  type WebMcpTool,
} from "@/services/webmcp/model-context";

describe("editor loading WebMCP guard", () => {
  it("blocks reads and writes before they run, exposes retry state, and permits them after loading", async () => {
    const registry = new Map<string, WebMcpTool>();
    const execute = vi.fn(() => ({ applied: true }));
    let ready = false;
    let failed = false;
    const names = [
      "xrugc_save_scene",
      "xrugc_get_entity_tree",
      "xrugc_get_scene_editor_context",
      "xrugc_get_workflow_guide",
      "xrugc_get_operation_status",
      "xrugc_cancel_operation",
    ];
    const lifecycle = registerWebMcpTools(
      names.map((name) => ({
        name,
        description: name,
        inputSchema: {},
        execute,
      })),
      {
        document: {
          modelContext: {
            registerTool: (tool: WebMcpTool) => registry.set(tool.name, tool),
          },
        } as unknown as Document,
        getEditorLoadingState: () => ({
          ready,
          loading: !ready && !failed,
          blocked: !ready,
          status: ready ? "ready" : failed ? "error" : "loading",
          error: failed ? "timeout" : null,
          retryAfterMs: ready || failed ? null : 500,
        }),
      }
    );
    for (const name of names.slice(0, 2)) {
      await expect(registry.get(name)!.execute({})).resolves.toMatchObject({
        status: "loading",
        applied: false,
        retryAfterMs: 500,
      });
    }
    expect(execute).not.toHaveBeenCalled();
    for (const name of names.slice(2)) await registry.get(name)!.execute({});
    expect(execute).toHaveBeenCalledTimes(4);
    failed = true;
    await expect(registry.get(names[0])!.execute({})).resolves.toMatchObject({
      status: "error",
      applied: false,
      retryAfterMs: null,
    });
    ready = true;
    await expect(registry.get(names[0])!.execute({})).resolves.toEqual({
      applied: true,
    });
    lifecycle!.abort();
    await expect(registry.get(names[0])!.execute({})).rejects.toThrow();
  });
});
