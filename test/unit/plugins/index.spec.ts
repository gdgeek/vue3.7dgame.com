/**
 * Unit tests for src/plugins/index.ts
 * Covers: default plugin install() — calls all setup functions
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  setupDirective: vi.fn(),
  setupRouter: vi.fn(),
  setupStore: vi.fn(),
  setupI18n: vi.fn(),
  setupPermission: vi.fn(),
}));

vi.mock("@/directive", () => ({
  setupDirective: hoisted.setupDirective,
}));

vi.mock("@/lang", () => ({
  setupI18n: hoisted.setupI18n,
}));

vi.mock("@/router", () => ({
  setupRouter: hoisted.setupRouter,
}));

vi.mock("@/store", () => ({
  setupStore: hoisted.setupStore,
}));

vi.mock("@/plugins/permission", () => ({
  setupPermission: hoisted.setupPermission,
}));

describe("plugins/index", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("plugin object has an install property", async () => {
    const plugin = (await import("@/plugins/index")).default;

    expect(typeof plugin).toBe("object");
    expect(plugin).toHaveProperty("install");
    expect(typeof plugin.install).toBe("function");
  });

  it("install() calls setupDirective with the app", async () => {
    const plugin = (await import("@/plugins/index")).default;
    const mockApp = {} as never;

    plugin.install(mockApp);

    expect(hoisted.setupDirective).toHaveBeenCalledWith(mockApp);
  });

  it("install() calls setupRouter with the app", async () => {
    const plugin = (await import("@/plugins/index")).default;
    const mockApp = {} as never;

    plugin.install(mockApp);

    expect(hoisted.setupRouter).toHaveBeenCalledWith(mockApp);
  });

  it("install() calls setupStore with the app", async () => {
    const plugin = (await import("@/plugins/index")).default;
    const mockApp = {} as never;

    plugin.install(mockApp);

    expect(hoisted.setupStore).toHaveBeenCalledWith(mockApp);
  });

  it("install() calls setupI18n with the app", async () => {
    const plugin = (await import("@/plugins/index")).default;
    const mockApp = {} as never;

    plugin.install(mockApp);

    expect(hoisted.setupI18n).toHaveBeenCalledWith(mockApp);
  });

  it("install() calls setupPermission (no arguments)", async () => {
    const plugin = (await import("@/plugins/index")).default;

    plugin.install({} as never);

    expect(hoisted.setupPermission).toHaveBeenCalledWith();
    expect(hoisted.setupPermission).toHaveBeenCalledTimes(1);
  });

  it("install() is callable without throwing", async () => {
    const plugin = (await import("@/plugins/index")).default;

    expect(() => plugin.install({} as never)).not.toThrow();
  });

  it("install() returns undefined", async () => {
    const plugin = (await import("@/plugins/index")).default;

    const result = plugin.install({} as never);

    expect(result).toBeUndefined();
  });

  it("install() calls all 5 setup functions", async () => {
    const plugin = (await import("@/plugins/index")).default;

    plugin.install({} as never);

    expect(hoisted.setupDirective).toHaveBeenCalled();
    expect(hoisted.setupRouter).toHaveBeenCalled();
    expect(hoisted.setupStore).toHaveBeenCalled();
    expect(hoisted.setupI18n).toHaveBeenCalled();
    expect(hoisted.setupPermission).toHaveBeenCalled();
  });

  it("install() runs setup functions in expected order", async () => {
    const plugin = (await import("@/plugins/index")).default;

    plugin.install({} as never);

    expect(hoisted.setupDirective.mock.invocationCallOrder[0]).toBeLessThan(
      hoisted.setupRouter.mock.invocationCallOrder[0]
    );
    expect(hoisted.setupRouter.mock.invocationCallOrder[0]).toBeLessThan(
      hoisted.setupStore.mock.invocationCallOrder[0]
    );
    expect(hoisted.setupStore.mock.invocationCallOrder[0]).toBeLessThan(
      hoisted.setupI18n.mock.invocationCallOrder[0]
    );
    expect(hoisted.setupI18n.mock.invocationCallOrder[0]).toBeLessThan(
      hoisted.setupPermission.mock.invocationCallOrder[0]
    );
  });

  it("install() can be invoked multiple times", async () => {
    const plugin = (await import("@/plugins/index")).default;
    const app = {} as never;

    plugin.install(app);
    plugin.install(app);

    expect(hoisted.setupDirective).toHaveBeenCalledTimes(2);
    expect(hoisted.setupRouter).toHaveBeenCalledTimes(2);
    expect(hoisted.setupStore).toHaveBeenCalledTimes(2);
    expect(hoisted.setupI18n).toHaveBeenCalledTimes(2);
    expect(hoisted.setupPermission).toHaveBeenCalledTimes(2);
  });
});
