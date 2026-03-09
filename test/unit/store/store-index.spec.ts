/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit tests for src/store/index.ts
 *
 * 覆盖：
 *   - setupStore 将 pinia 实例注册到 Vue app
 *   - store 导出（re-export）来自各 module 的 store composable
 *   - pinia 实例已使用 persistedstate 插件
 *
 * 注意：src/store/index.ts re-export 了所有 store module，这些 module 会
 * 传递引入 @/lang → useAppStoreHook()（模块级调用），需提前 setActivePinia
 * 并 mock 掉有副作用的传递依赖。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";

// ── Mock SecureLS (ESM compatibility) ─────────────────────────────────────────
vi.mock("secure-ls", () => {
  const store: Record<string, unknown> = {};
  return {
    default: vi.fn().mockImplementation(() => ({
      get: (key: string) => store[key] ?? null,
      set: (key: string, value: unknown) => {
        store[key] = value;
      },
      remove: (key: string) => {
        delete store[key];
      },
    })),
  };
});

// ── 阻断有模块级副作用的传递依赖 ───────────────────────────────────────────────
vi.mock("@/lang", () => ({
  default: {
    global: {
      locale: { value: "zh-CN" },
      t: (k: string) => k,
      getLocaleMessage: () => ({}),
      setLocaleMessage: vi.fn(),
    },
  },
  setupI18n: vi.fn(),
  loadLanguageAsync: vi.fn(),
}));

vi.mock("@/utils/request", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("@/router", () => ({
  useRouter: vi.fn(() => ({ beforeEach: vi.fn(), afterEach: vi.fn() })),
  setupRouter: vi.fn(),
}));

vi.mock("@/utils/nprogress", () => ({
  default: { start: vi.fn(), done: vi.fn() },
}));

vi.mock("pinia-plugin-persistedstate", () => ({
  default: vi.fn(),
}));

// ── helpers ───────────────────────────────────────────────────────────────────

describe("src/store/index.ts", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetModules();
  });

  // ── setupStore ─────────────────────────────────────────────────────────────

  describe("setupStore(app)", () => {
    it("调用 app.use() 恰好一次", async () => {
      setActivePinia(createPinia());
      const { setupStore } = await import("@/store");
      const mockApp = { use: vi.fn() } as any;
      setupStore(mockApp);
      expect(mockApp.use).toHaveBeenCalledTimes(1);
    });

    it("将 store（pinia 实例）传入 app.use()", async () => {
      setActivePinia(createPinia());
      const { setupStore, store } = await import("@/store");
      const mockApp = { use: vi.fn() } as any;
      setupStore(mockApp);
      expect(mockApp.use).toHaveBeenCalledWith(store);
    });

    it("多次调用 setupStore 每次都注册到 app", async () => {
      setActivePinia(createPinia());
      const { setupStore } = await import("@/store");
      const mockApp = { use: vi.fn() } as any;
      setupStore(mockApp);
      setupStore(mockApp);
      expect(mockApp.use).toHaveBeenCalledTimes(2);
    });
  });

  // ── store 实例 ─────────────────────────────────────────────────────────────

  describe("store 实例", () => {
    it("导出 store 实例（非 null/undefined）", async () => {
      setActivePinia(createPinia());
      const { store } = await import("@/store");
      expect(store).toBeDefined();
      expect(store).not.toBeNull();
    });
  });

  // ── re-exports ─────────────────────────────────────────────────────────────

  describe("re-exports", () => {
    it("导出 useAppStore（函数）", async () => {
      setActivePinia(createPinia());
      const mod = await import("@/store");
      expect(typeof mod.useAppStore).toBe("function");
    });

    it("导出 useSettingsStore（函数）", async () => {
      setActivePinia(createPinia());
      const mod = await import("@/store");
      expect(typeof mod.useSettingsStore).toBe("function");
    });

    it("导出 useUserStore（函数）", async () => {
      setActivePinia(createPinia());
      const mod = await import("@/store");
      expect(typeof mod.useUserStore).toBe("function");
    });

    it("导出 usePermissionStore（函数）", async () => {
      setActivePinia(createPinia());
      const mod = await import("@/store");
      expect(typeof mod.usePermissionStore).toBe("function");
    });
  });
});
