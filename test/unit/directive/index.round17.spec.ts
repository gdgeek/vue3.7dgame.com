import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const hasPerm = {
    mounted: vi.fn(),
    updated: vi.fn(),
    unmounted: vi.fn(),
  };
  return { hasPerm };
});

vi.mock("@/directive/permission", () => ({
  hasPerm: hoisted.hasPerm,
}));

describe("src/directive/index.ts (round17)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers hasPerm directive once per invocation", async () => {
    const { setupDirective } = await import("@/directive/index");
    const app = { directive: vi.fn(), use: vi.fn() } as any;

    setupDirective(app);

    expect(app.directive).toHaveBeenCalledTimes(1);
  });

  it("registers directive with name hasPerm", async () => {
    const { setupDirective } = await import("@/directive/index");
    const app = { directive: vi.fn() } as any;

    setupDirective(app);

    expect(app.directive).toHaveBeenCalledWith("hasPerm", expect.any(Object));
  });

  it("passes the same hasPerm object reference", async () => {
    const { setupDirective } = await import("@/directive/index");
    const app = { directive: vi.fn() } as any;

    setupDirective(app);

    expect(app.directive).toHaveBeenCalledWith("hasPerm", hoisted.hasPerm);
  });

  it("returns undefined", async () => {
    const { setupDirective } = await import("@/directive/index");
    const app = { directive: vi.fn() } as any;

    const result = setupDirective(app);

    expect(result).toBeUndefined();
  });

  it("does not call unrelated app APIs", async () => {
    const { setupDirective } = await import("@/directive/index");
    const app = { directive: vi.fn(), use: vi.fn(), mount: vi.fn() } as any;

    setupDirective(app);

    expect(app.use).not.toHaveBeenCalled();
    expect(app.mount).not.toHaveBeenCalled();
  });

  it("registers on each call when invoked repeatedly", async () => {
    const { setupDirective } = await import("@/directive/index");
    const app = { directive: vi.fn() } as any;

    setupDirective(app);
    setupDirective(app);

    expect(app.directive).toHaveBeenCalledTimes(2);
  });

  it("works independently for different app instances", async () => {
    const { setupDirective } = await import("@/directive/index");
    const appA = { directive: vi.fn() } as any;
    const appB = { directive: vi.fn() } as any;

    setupDirective(appA);
    setupDirective(appB);

    expect(appA.directive).toHaveBeenCalledTimes(1);
    expect(appB.directive).toHaveBeenCalledTimes(1);
  });

  it("calls app.directive with exactly two parameters", async () => {
    const { setupDirective } = await import("@/directive/index");
    const app = { directive: vi.fn() } as any;

    setupDirective(app);

    expect(app.directive.mock.calls[0]).toHaveLength(2);
  });

  it("forwards directive object that contains mounted hook", async () => {
    const { setupDirective } = await import("@/directive/index");
    const app = { directive: vi.fn() } as any;

    setupDirective(app);

    const [, directive] = app.directive.mock.calls[0];
    expect(typeof directive.mounted).toBe("function");
  });
});
