/**
 * Unit tests for src/plugins/index.ts
 *
 * 覆盖：
 *   - install() 调用了所有 setup 函数
 *   - 传入的 app 实例被正确传给每个 setup 函数
 *   - setupPermission 被调用（无 app 参数）
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── mocks：隔离所有插件依赖 ───────────────────────────────────────────────────
const mockSetupDirective = vi.hoisted(() => vi.fn());
const mockSetupRouter = vi.hoisted(() => vi.fn());
const mockSetupStore = vi.hoisted(() => vi.fn());
const mockSetupI18n = vi.hoisted(() => vi.fn());
const mockSetupPermission = vi.hoisted(() => vi.fn());

vi.mock("@/directive", () => ({ setupDirective: mockSetupDirective }));
vi.mock("@/router", () => ({ setupRouter: mockSetupRouter }));
vi.mock("@/store", () => ({ setupStore: mockSetupStore }));
vi.mock("@/lang", () => ({ setupI18n: mockSetupI18n }));
vi.mock("@/plugins/permission", () => ({
  setupPermission: mockSetupPermission,
}));

import plugin from "@/plugins";

describe("plugins/index.ts — install(app)", () => {
  let mockApp: { use: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockApp = { use: vi.fn() };
    vi.clearAllMocks();
  });

  it("调用 setupDirective 并传入 app", () => {
    plugin.install(mockApp as any);
    expect(mockSetupDirective).toHaveBeenCalledTimes(1);
    expect(mockSetupDirective).toHaveBeenCalledWith(mockApp);
  });

  it("调用 setupRouter 并传入 app", () => {
    plugin.install(mockApp as any);
    expect(mockSetupRouter).toHaveBeenCalledTimes(1);
    expect(mockSetupRouter).toHaveBeenCalledWith(mockApp);
  });

  it("调用 setupStore 并传入 app", () => {
    plugin.install(mockApp as any);
    expect(mockSetupStore).toHaveBeenCalledTimes(1);
    expect(mockSetupStore).toHaveBeenCalledWith(mockApp);
  });

  it("调用 setupI18n 并传入 app", () => {
    plugin.install(mockApp as any);
    expect(mockSetupI18n).toHaveBeenCalledTimes(1);
    expect(mockSetupI18n).toHaveBeenCalledWith(mockApp);
  });

  it("调用 setupPermission（无参数）", () => {
    plugin.install(mockApp as any);
    expect(mockSetupPermission).toHaveBeenCalledTimes(1);
  });

  it("install() 共触发 5 个 setup 函数", () => {
    plugin.install(mockApp as any);
    const totalCalls = [
      mockSetupDirective,
      mockSetupRouter,
      mockSetupStore,
      mockSetupI18n,
      mockSetupPermission,
    ].reduce((sum, fn) => sum + fn.mock.calls.length, 0);
    expect(totalCalls).toBe(5);
  });

  it("多次调用 install 时每个 setup 被调用相应次数", () => {
    plugin.install(mockApp as any);
    plugin.install(mockApp as any);
    expect(mockSetupDirective).toHaveBeenCalledTimes(2);
    expect(mockSetupPermission).toHaveBeenCalledTimes(2);
  });
});
