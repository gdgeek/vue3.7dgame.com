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

vi.mock("@/router", () => ({
  setupRouter: hoisted.setupRouter,
}));

vi.mock("@/store", () => ({
  setupStore: hoisted.setupStore,
}));

vi.mock("@/lang", () => ({
  setupI18n: hoisted.setupI18n,
}));

vi.mock("@/plugins/permission", () => ({
  setupPermission: hoisted.setupPermission,
}));

describe("src/plugins/index.ts (round17)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("exports an object with install function", async () => {
    const plugin = (await import("@/plugins/index")).default;

    expect(typeof plugin).toBe("object");
    expect(typeof plugin.install).toBe("function");
  });

  it("install calls setupDirective with app", async () => {
    const plugin = (await import("@/plugins/index")).default;
    const app = {} as any;

    plugin.install(app);

    expect(hoisted.setupDirective).toHaveBeenCalledWith(app);
  });

  it("install calls setupRouter with app", async () => {
    const plugin = (await import("@/plugins/index")).default;
    const app = {} as any;

    plugin.install(app);

    expect(hoisted.setupRouter).toHaveBeenCalledWith(app);
  });

  it("install calls setupStore with app", async () => {
    const plugin = (await import("@/plugins/index")).default;
    const app = {} as any;

    plugin.install(app);

    expect(hoisted.setupStore).toHaveBeenCalledWith(app);
  });

  it("install calls setupI18n with app", async () => {
    const plugin = (await import("@/plugins/index")).default;
    const app = {} as any;

    plugin.install(app);

    expect(hoisted.setupI18n).toHaveBeenCalledWith(app);
  });

  it("install calls setupPermission without arguments", async () => {
    const plugin = (await import("@/plugins/index")).default;

    plugin.install({} as any);

    expect(hoisted.setupPermission).toHaveBeenCalledWith();
    expect(hoisted.setupPermission).toHaveBeenCalledTimes(1);
  });

  it("install runs setup functions in expected order", async () => {
    const plugin = (await import("@/plugins/index")).default;

    plugin.install({} as any);

    expect(hoisted.setupDirective.mock.invocationCallOrder[0]).toBeLessThan(
      hoisted.setupRouter.mock.invocationCallOrder[0],
    );
    expect(hoisted.setupRouter.mock.invocationCallOrder[0]).toBeLessThan(
      hoisted.setupStore.mock.invocationCallOrder[0],
    );
    expect(hoisted.setupStore.mock.invocationCallOrder[0]).toBeLessThan(
      hoisted.setupI18n.mock.invocationCallOrder[0],
    );
    expect(hoisted.setupI18n.mock.invocationCallOrder[0]).toBeLessThan(
      hoisted.setupPermission.mock.invocationCallOrder[0],
    );
  });

  it("install returns undefined", async () => {
    const plugin = (await import("@/plugins/index")).default;

    const result = plugin.install({} as any);

    expect(result).toBeUndefined();
  });

  it("install can be invoked multiple times", async () => {
    const plugin = (await import("@/plugins/index")).default;
    const app = {} as any;

    plugin.install(app);
    plugin.install(app);

    expect(hoisted.setupDirective).toHaveBeenCalledTimes(2);
    expect(hoisted.setupRouter).toHaveBeenCalledTimes(2);
    expect(hoisted.setupStore).toHaveBeenCalledTimes(2);
    expect(hoisted.setupI18n).toHaveBeenCalledTimes(2);
    expect(hoisted.setupPermission).toHaveBeenCalledTimes(2);
  });
});
