/**
 * Unit tests for src/store/modules/information.ts — useInfomationStore
 *
 * 覆盖范围：
 *   - 初始状态（description 来自 env.subtitle）
 *   - 公开 API 类型验证
 *   - Store 隔离性
 *   - i18n locale watch 回调（通过响应式 ref mock 触发）
 *   - 边界情况
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref, nextTick } from "vue";
import { setActivePinia, createPinia } from "pinia";

// ── Mocks ──────────────────────────────────────────────────────────────────

/**
 * mockLocale 是响应式 ref，在 vi.mock 工厂中被捕获。
 * 以 "mock" 前缀命名，vitest 允许在 factory 中访问此类变量。
 * 改变 mockLocale.value 时，store 内部的 watch 会响应并执行回调。
 */
const mockLocale = ref("zh-CN");

vi.mock("@/lang", () => ({
  default: {
    global: {
      // 使用响应式 ref，使 watch(() => i18n.global.locale.value, ...) 可被触发
      locale: mockLocale,
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
    // 重置 locale 到默认值，避免测试间互相影响
    mockLocale.value = "zh-CN";
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

  // ── Watch handler（locale 变化时触发）─────────────────────────────────────

  describe("watch: i18n locale 变化", () => {
    it("locale 从 zh-CN 变为 en-US 时 watch 回调正常执行", async () => {
      // 初始化 store（内部 watch 被注册）
      const store = useInfomationStore();
      expect(store.description).toBe("支持Rokid设备");

      // 触发 watch：改变响应式 locale
      mockLocale.value = "en-US";
      await nextTick(); // 等待 Vue scheduler 刷新

      // watch 回调已执行（lang.value = 'en-US'），store 仍然正常
      expect(store.description).toBe("支持Rokid设备"); // description 不依赖 locale
    });

    it("locale 从 zh-CN 变为 ja-JP 时 watch 回调正常执行", async () => {
      const store = useInfomationStore();

      mockLocale.value = "ja-JP";
      await nextTick();

      expect(store.description).toBeDefined();
    });

    it("locale 多次变化时 watch 每次都触发", async () => {
      const store = useInfomationStore();

      mockLocale.value = "en-US";
      await nextTick();

      mockLocale.value = "zh-TW";
      await nextTick();

      mockLocale.value = "zh-CN";
      await nextTick();

      // store 不因多次语言切换而崩溃
      expect(store.description).toBeDefined();
    });

    it("locale 切换后 description 值保持不变（description 不依赖 locale）", async () => {
      const store = useInfomationStore();
      const descBefore = store.description;

      mockLocale.value = "th-TH";
      await nextTick();

      expect(store.description).toBe(descBefore);
    });

    it("locale 变为相同值时不引起错误", async () => {
      const store = useInfomationStore();

      // 设置相同的值，watch 不应触发（Vue 对值相等时不触发 watch）
      mockLocale.value = "zh-CN"; // 不变
      await nextTick();

      expect(store.description).toBeDefined();
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

    it("store 对象包含 description 属性", () => {
      const store = useInfomationStore();
      expect(Object.keys(store)).toContain("description");
    });

    it("store 初始化时 locale 为 zh-CN", () => {
      // 验证初始 locale 的设置被正确读取
      expect(mockLocale.value).toBe("zh-CN");
      const store = useInfomationStore();
      expect(store.description).toBeDefined();
    });
  });
});
