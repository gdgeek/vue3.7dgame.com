/**
 * Unit tests for src/directive/index.ts
 * Covers: setupDirective — registers 'hasPerm' directive on the app
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/directive/permission", () => ({
  hasPerm: { mounted: vi.fn(), updated: vi.fn() },
}));

describe("setupDirective", () => {
  it("registers the hasPerm directive on the Vue app", async () => {
    const directiveSpy = vi.fn();
    const mockApp = { directive: directiveSpy } as never;
    const { setupDirective } = await import("@/directive/index");
    setupDirective(mockApp);
    expect(directiveSpy).toHaveBeenCalledWith("hasPerm", expect.anything());
  });

  it("uses 'hasPerm' as the directive name", async () => {
    const directiveSpy = vi.fn();
    const mockApp = { directive: directiveSpy } as never;
    const { setupDirective } = await import("@/directive/index");
    setupDirective(mockApp);
    const [name] = directiveSpy.mock.calls[0];
    expect(name).toBe("hasPerm");
  });

  it("passes the hasPerm object from permission module", async () => {
    const { hasPerm } = await import("@/directive/permission");
    const directiveSpy = vi.fn();
    const mockApp = { directive: directiveSpy } as never;
    const { setupDirective } = await import("@/directive/index");
    setupDirective(mockApp);
    const [, directive] = directiveSpy.mock.calls[0];
    expect(directive).toBe(hasPerm);
  });

  it("calls directive() exactly once", async () => {
    const directiveSpy = vi.fn();
    const mockApp = { directive: directiveSpy } as never;
    const { setupDirective } = await import("@/directive/index");
    setupDirective(mockApp);
    expect(directiveSpy).toHaveBeenCalledTimes(1);
  });

  it("can be called multiple times without errors", async () => {
    const directiveSpy = vi.fn();
    const mockApp = { directive: directiveSpy } as never;
    const { setupDirective } = await import("@/directive/index");
    expect(() => {
      setupDirective(mockApp);
      setupDirective(mockApp);
    }).not.toThrow();
  });

  it("returns undefined (no return value)", async () => {
    const mockApp = { directive: vi.fn() } as never;
    const { setupDirective } = await import("@/directive/index");
    const result = setupDirective(mockApp);
    expect(result).toBeUndefined();
  });

  it("does not call any other app method", async () => {
    const mockApp = {
      directive: vi.fn(),
      use: vi.fn(),
      component: vi.fn(),
    } as never;
    const { setupDirective } = await import("@/directive/index");
    setupDirective(mockApp);
    expect(mockApp.use).not.toHaveBeenCalled();
    expect(mockApp.component).not.toHaveBeenCalled();
  });

  it("second call to setupDirective also registers hasPerm", async () => {
    const calls: string[] = [];
    const mockApp = { directive: (name: string) => calls.push(name) } as never;
    const { setupDirective } = await import("@/directive/index");
    setupDirective(mockApp);
    setupDirective(mockApp);
    expect(calls).toEqual(["hasPerm", "hasPerm"]);
  });
});
