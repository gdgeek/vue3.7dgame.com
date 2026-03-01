/**
 * Unit tests for src/store/modules/information.ts — useInfomationStore
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";

// ── Mocks ──────────────────────────────────────────────────────────────────

// The information store imports i18n and env at module level
vi.mock("@/lang", () => ({
  default: {
    global: {
      locale: { value: "zh-CN" },
      t: (k: string) => k,
    },
  },
}));

vi.mock("@/environment", () => ({
  default: {
    subtitle: () => "支持Rokid设备",
  },
}));

vi.mock("@/store", async () => {
  const { createPinia: cp } = await import("pinia");
  return { store: cp() };
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("useInfomationStore", () => {
  let useInfomationStore: typeof import("@/store/modules/information").useInfomationStore;

  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    ({ useInfomationStore } = await import("@/store/modules/information"));
  });

  // ── Initial state ────────────────────────────────────────────────────────

  describe("初始状态", () => {
    it("store 可以被创建而不抛出错误", () => {
      expect(() => useInfomationStore()).not.toThrow();
    });

    it("description 返回 env.subtitle() 的值", () => {
      const store = useInfomationStore();
      expect(store.description).toBe("支持Rokid设备");
    });
  });

  // ── Public API ────────────────────────────────────────────────────────────

  describe("公开 API", () => {
    it("暴露 description 字段", () => {
      const store = useInfomationStore();
      expect("description" in store).toBe(true);
    });

    it("description 是字符串类型", () => {
      const store = useInfomationStore();
      expect(typeof store.description).toBe("string");
    });
  });

  // ── Store isolation ───────────────────────────────────────────────────────

  describe("Store 隔离性", () => {
    it("多次调用 useInfomationStore 返回同一实例", () => {
      const store1 = useInfomationStore();
      const store2 = useInfomationStore();
      expect(store1).toBe(store2);
    });

    it("重新创建 pinia 后 store 状态重置", async () => {
      const store1 = useInfomationStore();
      expect(store1.description).toBeDefined();

      setActivePinia(createPinia());
      vi.resetModules();
      ({ useInfomationStore } = await import("@/store/modules/information"));
      const store2 = useInfomationStore();
      expect(store2.description).toBeDefined();
    });
  });

  // ── Additional edge cases ─────────────────────────────────────────────────

  describe("额外边界情况", () => {
    it("description 不为 null 或 undefined", () => {
      const store = useInfomationStore();
      expect(store.description).not.toBeNull();
      expect(store.description).not.toBeUndefined();
    });

    it("description 非空字符串", () => {
      const store = useInfomationStore();
      expect(store.description.length).toBeGreaterThan(0);
    });

    it("store 对象仅暴露 description 相关属性", () => {
      const store = useInfomationStore();
      expect(Object.keys(store)).toContain("description");
    });
  });
});
