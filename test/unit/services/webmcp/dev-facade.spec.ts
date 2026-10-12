import { describe, expect, it, vi } from "vitest";
import {
  createWebMcpDevFacade,
  type WebMcpDevResult,
} from "@/services/webmcp/dev-facade";
import {
  registerWebMcpTools,
  type WebMcpTool,
} from "@/services/webmcp/model-context";
import { getWebMcpToolRegistry } from "@/services/webmcp/tool-registry";
import { createScenePublicationTools } from "@/services/webmcp/scene-publication-tools";

const unpack = (result: unknown) => {
  const response = result as WebMcpDevResult;
  expect(response.content).toHaveLength(1);
  expect(response.content[0].type).toBe("text");
  return JSON.parse(response.content[0].text);
};
const tool = (overrides: Partial<WebMcpTool> = {}): WebMcpTool => ({
  name: "read_scene",
  description: "Read the current scene",
  inputSchema: {
    type: "object",
    properties: { count: { type: "integer", minimum: 1 } },
    required: ["count"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true },
  execute: (input) => input,
  ...overrides,
});

function setup(tools = [tool()]) {
  const page = {} as Document;
  const owner = registerWebMcpTools(tools, { document: page })!;
  const registry = getWebMcpToolRegistry(page)!;
  const assertActive = vi.fn();
  const [list, call] = createWebMcpDevFacade(registry, assertActive);
  const request = (toolName = "read_scene", args: unknown = { count: 1 }) => ({
    contextToken: registry.snapshot().contextToken,
    toolName,
    arguments: args,
  });
  return { page, owner, registry, assertActive, list, call, request };
}

describe("webmcp.dev fixed tool facade", () => {
  it("discovers tools registered before a connection without requiring native support", async () => {
    const x = setup();
    const discovered = unpack(await x.list.execute({}));
    expect(discovered.contextToken).toBe(x.request().contextToken);
    expect(discovered.tools).toEqual([
      {
        name: "read_scene",
        description: tool().description,
        inputSchema: tool().inputSchema,
        annotations: { readOnlyHint: true },
      },
    ]);
    expect(unpack(await x.call.execute(x.request()))).toEqual({ count: 1 });
    x.owner.abort();
  });

  it.each([
    { count: "1" },
    { count: 0 },
    { count: 1, extra: true },
    {},
    [],
    null,
  ])("rejects invalid schema arguments without coercion: %j", async (args) => {
    const execute = vi.fn();
    const x = setup([tool({ execute })]);
    const result = await x.call.execute(x.request("read_scene", args));
    expect(result).toMatchObject({ isError: true });
    expect(unpack(result)).toMatchObject({ code: "invalid_arguments" });
    expect(execute).not.toHaveBeenCalled();
    x.owner.abort();
  });

  it("rejects unknown or extra facade parameters", async () => {
    const x = setup();
    expect(await x.list.execute({ unexpected: true })).toMatchObject({
      isError: true,
    });
    expect(await x.list.execute(null)).toMatchObject({ isError: true });
    expect(
      await x.call.execute({ ...x.request(), unexpected: true })
    ).toMatchObject({
      isError: true,
    });
    expect(unpack(await x.call.execute(x.request("missing")))).toMatchObject({
      code: "unknown_tool",
    });
    x.owner.abort();
  });

  it("rejects a stale context before invoking a tool on the new scene", async () => {
    const x = setup();
    const stale = x.request();
    const execute = vi.fn();
    const next = registerWebMcpTools([tool({ execute })], {
      document: x.page,
    })!;
    const result = await x.call.execute(stale);
    expect(result).toMatchObject({ isError: true });
    expect(unpack(result)).toMatchObject({ code: "stale_context" });
    expect(execute).not.toHaveBeenCalled();
    x.owner.abort();
    next.abort();
  });

  it("rechecks connection identity before returning a delayed read", async () => {
    let finish!: (value: unknown) => void;
    const x = setup([
      tool({ execute: () => new Promise((resolve) => (finish = resolve)) }),
    ]);
    const pending = x.call.execute(x.request());
    x.assertActive.mockImplementation(() => {
      throw new Error("登录身份已变化");
    });
    finish({ confidential: "old account" });
    const result = await pending;
    expect(result).toMatchObject({ isError: true });
    expect(JSON.stringify(result)).not.toContain("confidential");
    x.owner.abort();
  });

  it.each(["awaiting_confirmation", "partial", "unknown"])(
    "preserves the %s result without claiming completion",
    async (status) => {
      const result = { status, operationId: crypto.randomUUID() };
      const x = setup([tool({ execute: () => result })]);
      const response = await x.call.execute(x.request());
      expect(response).not.toHaveProperty("isError");
      expect(unpack(response)).toEqual(result);
      x.owner.abort();
    }
  );

  it("reports execution errors using MCP error content", async () => {
    const x = setup([
      tool({
        execute: () => {
          throw new Error("permission denied");
        },
      }),
    ]);
    const response = await x.call.execute(x.request());
    expect(response).toMatchObject({ isError: true });
    expect(unpack(response)).toMatchObject({
      errorCode: "tool_failed",
      status: "failed",
    });
    x.owner.abort();
  });

  it("shares drafts and receipts with native calls, including duplicate completion", async () => {
    const native = new Map<string, WebMcpTool>();
    const page = {
      modelContext: {
        registerTool: (registered: WebMcpTool) =>
          native.set(registered.name, registered),
      },
    } as unknown as Document;
    let confirm!: (accepted: boolean) => void;
    const complete = vi.fn(async () => ({ sceneId: 42, published: true }));
    const lifecycle = registerWebMcpTools(
      createScenePublicationTools({
        getSceneId: () => 42,
        stageScenePublication: async () => ({
          sceneId: 42,
          sceneVersion: "local-1",
          sceneName: "Test",
          moduleCount: 1,
          warningCount: 0,
          warnings: [],
          alreadyPublished: false,
        }),
        confirmScenePublication: () =>
          new Promise((resolve) => (confirm = resolve)),
        completeScenePublication: complete,
      }),
      {
        document: page,
        operations: {
          getScope: () => ({
            actorId: "test-facade-actor",
            targetType: "verse",
            targetId: 42,
            serverRevision: `sha256:${"a".repeat(64)}`,
          }),
          readReceipt: async () => {
            throw new Error("not observed");
          },
        },
      }
    )!;
    const registry = getWebMcpToolRegistry(page)!;
    const [, call] = createWebMcpDevFacade(registry);
    const staged = (await native
      .get("xrugc_stage_scene_publication")!
      .execute({})) as {
      draftId: string;
    };
    const request = {
      contextToken: registry.snapshot().contextToken,
      toolName: "xrugc_complete_scene_publication",
      arguments: { draftId: staged.draftId },
    };
    expect(unpack(await call.execute(request))).toMatchObject({
      operationId: staged.draftId,
      status: "awaiting_confirmation",
    });
    expect(
      await native.get(request.toolName)!.execute(request.arguments)
    ).toMatchObject({
      operationId: staged.draftId,
      status: "awaiting_confirmation",
    });
    confirm(true);
    for (let i = 0; i < 12; i++) await Promise.resolve();
    expect(complete).toHaveBeenCalledOnce();
    const receipt = unpack(
      await call.execute({
        ...request,
        toolName: "xrugc_get_operation_status",
        arguments: { operationId: staged.draftId },
      })
    );
    expect(receipt.status).toBe("completed");
    await call.execute(request);
    expect(complete).toHaveBeenCalledOnce();
    lifecycle.abort();
  });
  it("marks structured business errors as MCP errors and redacts thrown details", async () => {
    const structured = {
      isError: true,
      status: "failed",
      errorCode: "permission_denied",
    };
    const x = setup([tool({ execute: () => structured })]);
    const response = await x.call.execute(x.request());
    expect(response).toMatchObject({ isError: true });
    expect(unpack(response)).toEqual(structured);
    x.owner.abort();
    const y = setup([
      tool({
        execute: () => {
          throw new Error("secret-token-in-network-error");
        },
      }),
    ]);
    const error = await y.call.execute(y.request());
    expect(error).toMatchObject({ isError: true });
    expect(JSON.stringify(error)).not.toContain(
      "secret-token-in-network-error"
    );
    y.owner.abort();
  });
});
