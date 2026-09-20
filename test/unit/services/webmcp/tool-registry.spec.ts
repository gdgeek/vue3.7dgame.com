import { describe, expect, it, vi } from "vitest";
import {
  registerWebMcpTools,
  type WebMcpTool,
} from "@/services/webmcp/model-context";
import { getWebMcpToolRegistry } from "@/services/webmcp/tool-registry";

const makeTool = (overrides: Partial<WebMcpTool> = {}): WebMcpTool => ({
  name: "read_scene",
  description: "Read the current scene",
  inputSchema: { type: "object", additionalProperties: false },
  annotations: { readOnlyHint: true },
  execute: () => ({ sceneId: 42 }),
  ...overrides,
});

describe("page tool registry", () => {
  it("does not require secure-context randomUUID for ordinary page registration", () => {
    const randomUUID = vi.spyOn(crypto, "randomUUID").mockImplementation(() => {
      throw new Error("randomUUID unavailable outside a secure context");
    });
    try {
      const page = {} as Document;
      const lifecycle = registerWebMcpTools([makeTool()], { document: page })!;
      expect(getWebMcpToolRegistry(page)!.snapshot().tools).toHaveLength(1);
      lifecycle.abort();
      expect(randomUUID).not.toHaveBeenCalled();
    } finally {
      randomUUID.mockRestore();
    }
  });

  it("retains current tools without a native API and isolates documents", async () => {
    const page = {} as Document;
    const lifecycle = registerWebMcpTools([makeTool()], { document: page });
    const registry = getWebMcpToolRegistry(page)!;
    expect(lifecycle).toBeInstanceOf(AbortController);
    expect(getWebMcpToolRegistry(page)).toBe(registry);
    expect(registry.snapshot().tools).toHaveLength(1);
    expect(getWebMcpToolRegistry({} as Document)!.snapshot().tools).toEqual([]);
    await expect(registry.lookup("read_scene")!.execute({})).resolves.toEqual({
      sceneId: 42,
    });
    const token = registry.snapshot().contextToken;
    lifecycle!.abort();
    expect(registry.snapshot().tools).toEqual([]);
    expect(registry.snapshot().contextToken).not.toBe(token);
  });

  it("shares the exact tool object with native registration and preserves loading guards", async () => {
    const native: WebMcpTool[] = [];
    const execute = vi.fn(() => ({ sceneId: 42 }));
    const page = {
      modelContext: { registerTool: (tool: WebMcpTool) => native.push(tool) },
    } as unknown as Document;
    let ready = false;
    const lifecycle = registerWebMcpTools([makeTool({ execute })], {
      document: page,
      getEditorLoadingState: () => ({
        ready,
        loading: !ready,
        blocked: !ready,
        status: ready ? "ready" : "loading",
        error: null,
        retryAfterMs: ready ? null : 500,
      }),
    })!;
    const tool = getWebMcpToolRegistry(page)!.lookup("read_scene")!;
    expect(tool.name).toBe(native[0].name);
    await expect(tool.execute({})).resolves.toMatchObject({
      status: "loading",
      applied: false,
    });
    expect(execute).not.toHaveBeenCalled();
    ready = true;
    await expect(native[0].execute({})).resolves.toEqual({ sceneId: 42 });
    expect(execute).toHaveBeenCalledOnce();
    lifecycle.abort();
  });

  it("old owner disposal cannot remove its replacement or revive its callback", async () => {
    const signals: AbortSignal[] = [];
    const page = {
      modelContext: {
        registerTool: (_tool: WebMcpTool, options: { signal: AbortSignal }) =>
          signals.push(options.signal),
      },
    } as unknown as Document;
    const registry = getWebMcpToolRegistry(page)!;
    const first = registerWebMcpTools([makeTool()], { document: page })!;
    const oldTool = registry.lookup("read_scene")!;
    const firstToken = registry.snapshot().contextToken;
    const second = registerWebMcpTools(
      [makeTool({ execute: () => ({ sceneId: 43 }) })],
      { document: page }
    )!;
    const newToken = registry.snapshot().contextToken;
    expect(newToken).not.toBe(firstToken);
    expect(signals[0].aborted).toBe(true);
    first.abort();
    expect(signals[1].aborted).toBe(false);
    expect(registry.snapshot().contextToken).toBe(newToken);
    await expect(oldTool.execute({})).rejects.toMatchObject({
      name: "AbortError",
    });
    await expect(registry.lookup("read_scene")!.execute({})).resolves.toEqual({
      sceneId: 43,
    });
    second.abort();
  });

  it("drops an asynchronous read from an editor session that has ended", async () => {
    let finish!: (value: unknown) => void;
    const page = {} as Document;
    const lifecycle = registerWebMcpTools(
      [
        makeTool({
          execute: () => new Promise((resolve) => (finish = resolve)),
        }),
      ],
      { document: page }
    )!;
    const pending = getWebMcpToolRegistry(page)!
      .lookup("read_scene")!
      .execute({});
    lifecycle.abort();
    finish({ sceneId: 42 });
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });

  it("keeps a write acknowledgment when disposal races its delivery", async () => {
    let finish!: (value: unknown) => void;
    const page = {} as Document;
    const lifecycle = registerWebMcpTools(
      [
        makeTool({
          annotations: { readOnlyHint: false },
          execute: () => new Promise((resolve) => (finish = resolve)),
        }),
      ],
      { document: page }
    )!;
    const pending = getWebMcpToolRegistry(page)!
      .lookup("read_scene")!
      .execute({});
    lifecycle.abort();
    finish({ status: "completed", verification: "server_acknowledged" });
    await expect(pending).resolves.toMatchObject({ status: "completed" });
  });

  it("identity invalidation revokes every owner and notifies subscribers", async () => {
    const page = {} as Document;
    const registry = getWebMcpToolRegistry(page)!;
    const changed = vi.fn();
    const unsubscribe = registry.subscribe(changed);
    const first = registerWebMcpTools([makeTool()], { document: page })!;
    const second = registerWebMcpTools([makeTool()], { document: page })!;
    const callback = registry.lookup("read_scene")!;
    registry.invalidate();
    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(true);
    expect(changed).toHaveBeenCalledTimes(3);
    expect(registry.snapshot().tools).toEqual([]);
    await expect(callback.execute({})).rejects.toMatchObject({
      name: "AbortError",
    });
    unsubscribe();
    registry.invalidate();
    expect(changed).toHaveBeenCalledTimes(3);
  });

  it("does not lose compatibility tools when native registration rejects", async () => {
    const onRegistrationError = vi.fn();
    const page = {
      modelContext: {
        registerTool: () => Promise.reject(new Error("unsupported")),
      },
    } as unknown as Document;
    const lifecycle = registerWebMcpTools([makeTool()], {
      document: page,
      onRegistrationError,
    })!;
    await Promise.resolve();
    expect(onRegistrationError).toHaveBeenCalledOnce();
    expect(getWebMcpToolRegistry(page)!.lookup("read_scene")).toBeDefined();
    lifecycle.abort();
  });
});
