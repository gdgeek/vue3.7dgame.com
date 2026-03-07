/**
 * Unit tests for src/plugins/index.ts
 * Covers: default plugin install() — calls all setup functions
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/directive", () => ({ setupDirective: vi.fn() }));
vi.mock("@/lang", () => ({ setupI18n: vi.fn() }));
vi.mock("@/router", () => ({ setupRouter: vi.fn() }));
vi.mock("@/store", () => ({ setupStore: vi.fn() }));
vi.mock("@/plugins/permission", () => ({ setupPermission: vi.fn() }));

describe("plugins/index", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("install() calls setupDirective with the app", async () => {
    const { setupDirective } = await import("@/directive");
    const plugin = (await import("@/plugins/index")).default;
    const mockApp = {} as never;
    plugin.install(mockApp);
    expect(setupDirective).toHaveBeenCalledWith(mockApp);
  });

  it("install() calls setupRouter with the app", async () => {
    const { setupRouter } = await import("@/router");
    const plugin = (await import("@/plugins/index")).default;
    const mockApp = {} as never;
    plugin.install(mockApp);
    expect(setupRouter).toHaveBeenCalledWith(mockApp);
  });

  it("install() calls setupStore with the app", async () => {
    const { setupStore } = await import("@/store");
    const plugin = (await import("@/plugins/index")).default;
    const mockApp = {} as never;
    plugin.install(mockApp);
    expect(setupStore).toHaveBeenCalledWith(mockApp);
  });

  it("install() calls setupI18n with the app", async () => {
    const { setupI18n } = await import("@/lang");
    const plugin = (await import("@/plugins/index")).default;
    const mockApp = {} as never;
    plugin.install(mockApp);
    expect(setupI18n).toHaveBeenCalledWith(mockApp);
  });

  it("install() calls setupPermission (no arguments)", async () => {
    const { setupPermission } = await import("@/plugins/permission");
    const plugin = (await import("@/plugins/index")).default;
    plugin.install({} as never);
    expect(setupPermission).toHaveBeenCalled();
  });

  it("install() is callable without throwing", async () => {
    const plugin = (await import("@/plugins/index")).default;
    expect(() => plugin.install({} as never)).not.toThrow();
  });

  it("plugin object has an install property", async () => {
    const plugin = (await import("@/plugins/index")).default;
    expect(plugin).toHaveProperty("install");
    expect(typeof plugin.install).toBe("function");
  });

  it("install() returns undefined", async () => {
    const plugin = (await import("@/plugins/index")).default;
    const result = plugin.install({} as never);
    expect(result).toBeUndefined();
  });

  it("install() calls all 5 setup functions", async () => {
    const { setupDirective } = await import("@/directive");
    const { setupRouter } = await import("@/router");
    const { setupStore } = await import("@/store");
    const { setupI18n } = await import("@/lang");
    const { setupPermission } = await import("@/plugins/permission");
    const plugin = (await import("@/plugins/index")).default;
    plugin.install({} as never);
    expect(setupDirective).toHaveBeenCalled();
    expect(setupRouter).toHaveBeenCalled();
    expect(setupStore).toHaveBeenCalled();
    expect(setupI18n).toHaveBeenCalled();
    expect(setupPermission).toHaveBeenCalled();
  });
});
