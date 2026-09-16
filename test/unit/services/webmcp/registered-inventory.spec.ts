/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic tool payloads and deliberately malformed mock inputs. */
import { describe, it, expect, vi } from "vitest";
import {
  registerWebMcpTools,
  getRegisteredWebMcpTools,
  invokeRegisteredWebMcpTool,
  getRegisteredWebMcpSchema,
  type WebMcpTool,
} from "@/services/webmcp/model-context";
const tool: WebMcpTool = {
  name: "test",
  description: "test",
  inputSchema: {},
  execute: () => ({}),
};
describe("registered tool inventory", () => {
  it("internal invocation keeps the native loading and lifetime guards", async () => {
    const doc = {
      modelContext: { registerTool: vi.fn() },
    } as unknown as Document;
    const execute = vi.fn(() => ({ saved: true }));
    let blocked = true;
    const owner = registerWebMcpTools([{ ...tool, execute }], {
      document: doc,
      getEditorLoadingState: () => ({
        ready: !blocked,
        loading: blocked,
        blocked,
        status: blocked ? "loading" : "ready",
        error: null,
        retryAfterMs: null,
      }),
    });
    await Promise.resolve();
    expect(await invokeRegisteredWebMcpTool("test", {}, doc)).toMatchObject({
      status: "loading",
      applied: false,
    });
    expect(execute).not.toHaveBeenCalled();
    const schema = getRegisteredWebMcpSchema("test", doc)!;
    schema.inputSchema.mutated = true;
    expect(getRegisteredWebMcpSchema("test", doc)!.inputSchema).toEqual({});
    blocked = false;
    expect(await invokeRegisteredWebMcpTool("test", {}, doc)).toEqual({
      saved: true,
    });
    owner?.abort();
    expect(getRegisteredWebMcpSchema("test", doc)).toBeNull();
    await expect(invokeRegisteredWebMcpTool("test", {}, doc)).rejects.toThrow();
  });
  it("omits failed registrations and removes disposed tools", async () => {
    const doc = {
      modelContext: { registerTool: vi.fn() },
    } as unknown as Document;
    const registration = registerWebMcpTools([tool], { document: doc });
    await Promise.resolve();
    expect(getRegisteredWebMcpTools(doc).map((t) => t.name)).toEqual(["test"]);
    registration?.abort();
    expect(getRegisteredWebMcpTools(doc)).toEqual([]);
    (doc as any).modelContext.registerTool.mockRejectedValue(
      new Error("unsupported")
    );
    registerWebMcpTools([tool], { document: doc });
    await Promise.resolve();
    await Promise.resolve();
    expect(getRegisteredWebMcpTools(doc)).toEqual([]);
  });
  it("does not resurrect a tool whose registration resolves after disposal", async () => {
    let finish!: () => void;
    const doc = {
      modelContext: {
        registerTool: () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      },
    } as unknown as Document;
    const registration = registerWebMcpTools([tool], { document: doc });
    registration?.abort();
    finish();
    await Promise.resolve();
    expect(getRegisteredWebMcpTools(doc)).toEqual([]);
  });
  it("old owner abort cannot remove a newly registered tool of same name", async () => {
    const doc = {
      modelContext: { registerTool: () => {} },
    } as unknown as Document;
    const first = registerWebMcpTools([tool], { document: doc });
    await Promise.resolve();
    const second = registerWebMcpTools([tool], { document: doc });
    await Promise.resolve();
    first?.abort();
    expect(getRegisteredWebMcpTools(doc)).toHaveLength(1);
    second?.abort();
    expect(getRegisteredWebMcpTools(doc)).toHaveLength(0);
  });
  it("late completion of an older registration cannot replace the new owner", async () => {
    let finish!: () => void;
    const register = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          })
      )
      .mockReturnValue(undefined);
    const doc = {
      modelContext: { registerTool: register },
    } as unknown as Document;
    const old = registerWebMcpTools([tool], { document: doc });
    const current = registerWebMcpTools([tool], { document: doc });
    await Promise.resolve();
    finish();
    await Promise.resolve();
    old?.abort();
    expect(getRegisteredWebMcpTools(doc)).toHaveLength(1);
    current?.abort();
    expect(getRegisteredWebMcpTools(doc)).toEqual([]);
  });
});
