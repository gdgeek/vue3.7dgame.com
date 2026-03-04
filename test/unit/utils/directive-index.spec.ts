/**
 * Unit tests for src/directive/index.ts
 *
 * 覆盖：
 *   - setupDirective 向 Vue app 注册 v-hasPerm 指令
 *   - 只调用一次 app.directive
 *   - 传入的指令对象来自 ./permission/hasPerm
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// 先 mock 掉 permission 模块，避免引入真实权限逻辑
const mockHasPerm = vi.hoisted(() => ({ mounted: vi.fn(), updated: vi.fn() }));

vi.mock("@/directive/permission", () => ({
  hasPerm: mockHasPerm,
}));

import { setupDirective } from "@/directive";

describe("setupDirective (src/directive/index.ts)", () => {
  let mockApp: { directive: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockApp = { directive: vi.fn() };
    vi.clearAllMocks();
  });

  it("调用 app.directive 恰好一次", () => {
    setupDirective(mockApp as any);
    expect(mockApp.directive).toHaveBeenCalledTimes(1);
  });

  it("将指令注册为 'hasPerm'", () => {
    setupDirective(mockApp as any);
    const [name] = mockApp.directive.mock.calls[0];
    expect(name).toBe("hasPerm");
  });

  it("传入的指令对象与 hasPerm 相同", () => {
    setupDirective(mockApp as any);
    const [, directiveObj] = mockApp.directive.mock.calls[0];
    expect(directiveObj).toBe(mockHasPerm);
  });

  it("多次调用时每次都注册一个指令", () => {
    setupDirective(mockApp as any);
    setupDirective(mockApp as any);
    expect(mockApp.directive).toHaveBeenCalledTimes(2);
  });
});
