/**
 * Unit tests for src/directive/index.ts — setupDirective
 *
 * 覆盖率目标：src/directive/index.ts（当前 0%）
 *
 * 覆盖范围：
 *   - setupDirective 调用 app.directive 注册 v-hasPerm
 *   - 指令名称正确为 "hasPerm"
 *   - 传入的指令对象与 permission 模块导出的 hasPerm 相同
 *   - 边界：多次调用时每次都注册
 *   - 边界：app.directive 只在 setupDirective 执行期间被调用
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// mock permission 模块，避免引入真实权限检查逻辑
const mockHasPerm = vi.hoisted(() => ({
  mounted: vi.fn(),
  unmounted: vi.fn(),
}));

vi.mock("@/directive/permission", () => ({
  hasPerm: mockHasPerm,
}));

import { setupDirective } from "@/directive";

// ── 工具函数：创建模拟 Vue App ─────────────────────────────────────────────
function createMockApp() {
  return {
    directive: vi.fn(),
    use: vi.fn(),
    mount: vi.fn(),
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("setupDirective (src/directive/index.ts)", () => {
  let mockApp: ReturnType<typeof createMockApp>;

  beforeEach(() => {
    mockApp = createMockApp();
    vi.clearAllMocks();
  });

  // ── 基本注册 ──────────────────────────────────────────────────────────────

  describe("基本指令注册", () => {
    it("调用 app.directive 恰好一次", () => {
      setupDirective(mockApp as any);
      expect(mockApp.directive).toHaveBeenCalledTimes(1);
    });

    it("注册的指令名称为 'hasPerm'", () => {
      setupDirective(mockApp as any);
      const [name] = mockApp.directive.mock.calls[0];
      expect(name).toBe("hasPerm");
    });

    it("传入 app.directive 的第二个参数与 hasPerm 相同（同一引用）", () => {
      setupDirective(mockApp as any);
      const [, directiveObj] = mockApp.directive.mock.calls[0];
      expect(directiveObj).toBe(mockHasPerm);
    });

    it("setupDirective 执行后 app.directive 被正确调用", () => {
      setupDirective(mockApp as any);
      expect(mockApp.directive).toHaveBeenCalledWith("hasPerm", mockHasPerm);
    });
  });

  // ── 返回值 ────────────────────────────────────────────────────────────────

  describe("返回值", () => {
    it("setupDirective 无显式返回值（undefined）", () => {
      const result = setupDirective(mockApp as any);
      expect(result).toBeUndefined();
    });
  });

  // ── 边界情况 ─────────────────────────────────────────────────────────────

  describe("边界情况", () => {
    it("多次调用 setupDirective 时每次都调用 app.directive", () => {
      setupDirective(mockApp as any);
      setupDirective(mockApp as any);
      expect(mockApp.directive).toHaveBeenCalledTimes(2);
    });

    it("多次调用时每次传入的指令名称都是 'hasPerm'", () => {
      setupDirective(mockApp as any);
      setupDirective(mockApp as any);
      for (const call of mockApp.directive.mock.calls) {
        expect(call[0]).toBe("hasPerm");
      }
    });

    it("不同 app 实例各自独立注册指令", () => {
      const app1 = createMockApp();
      const app2 = createMockApp();

      setupDirective(app1 as any);
      setupDirective(app2 as any);

      expect(app1.directive).toHaveBeenCalledTimes(1);
      expect(app2.directive).toHaveBeenCalledTimes(1);
      expect(app1.directive).not.toBe(app2.directive);
    });

    it("app.directive 不在 setupDirective 调用之前被执行", () => {
      // 在调用之前 directive 不应被调用
      expect(mockApp.directive).not.toHaveBeenCalled();
      setupDirective(mockApp as any);
      expect(mockApp.directive).toHaveBeenCalled();
    });
  });

  // ── hasPerm 指令结构验证 ───────────────────────────────────────────────────

  describe("hasPerm 指令对象结构", () => {
    it("hasPerm 指令对象有 mounted 钩子", () => {
      setupDirective(mockApp as any);
      const [, directiveObj] = mockApp.directive.mock.calls[0];
      expect(directiveObj).toHaveProperty("mounted");
    });

    it("hasPerm 指令对象的 mounted 是函数", () => {
      setupDirective(mockApp as any);
      const [, directiveObj] = mockApp.directive.mock.calls[0];
      expect(typeof directiveObj.mounted).toBe("function");
    });
  });
});
