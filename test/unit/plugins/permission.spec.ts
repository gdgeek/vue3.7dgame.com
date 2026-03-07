/**
 * Unit tests for src/plugins/permission.ts
 * 覆盖：setupPermission() 导航守卫逻辑、hasAuth() 权限检查
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── vi.hoisted 变量（在 vi.mock 工厂函数中引用，必须提前 hoist）──────────
const mockHasToken = vi.hoisted(() => vi.fn(() => false));

// ── 捕获 router 钩子 ────────────────────────────────────────────────────────
let capturedBeforeEach:
  | ((to: any, from: any, next: any) => Promise<void>)
  | null = null;
let capturedAfterEach: (() => void) | null = null;

const mockRouter = vi.hoisted(() => ({
  beforeEach: vi.fn(),
  afterEach: vi.fn(),
}));

// ── 依赖 mock（必须在 permission.ts 被导入前声明）──────────────────────────
vi.mock("@/router", () => ({
  useRouter: () => mockRouter,
  setupRouter: vi.fn(),
}));

vi.mock("@/utils/nprogress", () => ({
  default: { start: vi.fn(), done: vi.fn() },
}));

vi.mock("@/store/modules/token", () => ({
  default: { hasToken: mockHasToken },
}));

// mockUserInfo 由各 describe 块在 beforeEach 中赋值
let mockUserInfo: { roles?: string[]; perms?: string[] } | null = null;
vi.mock("@/store", () => ({
  useUserStore: () => ({ userInfo: mockUserInfo }),
}));

import { setupPermission, hasAuth } from "@/plugins/permission";
import NProgress from "@/utils/nprogress";

// ── 辅助函数 ────────────────────────────────────────────────────────────────
const makeTo = (overrides: Record<string, any> = {}): any => ({
  path: "/home/index",
  params: {},
  query: {},
  meta: {},
  matched: [{}],
  name: "Home",
  ...overrides,
});

const makeFrom = (overrides: Record<string, any> = {}): any => ({
  name: "Previous",
  path: "/prev",
  ...overrides,
});

// ── 全局 beforeEach ──────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  capturedBeforeEach = null;
  capturedAfterEach = null;
  mockUserInfo = null;
  mockHasToken.mockReturnValue(false);

  // 设置 mock 实现以捕获注册的回调
  mockRouter.beforeEach.mockImplementation((cb: any) => {
    capturedBeforeEach = cb;
  });
  mockRouter.afterEach.mockImplementation((cb: any) => {
    capturedAfterEach = cb;
  });

  // 重新注册守卫（每个测试前保证钩子最新）
  setupPermission();
});

// ── setupPermission 注册行为 ─────────────────────────────────────────────────
describe("setupPermission() — 注册路由守卫", () => {
  it("调用 router.beforeEach 注册前置守卫", () => {
    expect(mockRouter.beforeEach).toHaveBeenCalledTimes(1);
  });

  it("调用 router.afterEach 注册后置守卫", () => {
    expect(mockRouter.afterEach).toHaveBeenCalledTimes(1);
  });

  it("capturedBeforeEach 是函数", () => {
    expect(typeof capturedBeforeEach).toBe("function");
  });

  it("capturedAfterEach 是函数", () => {
    expect(typeof capturedAfterEach).toBe("function");
  });
});

// ── 后置守卫 ────────────────────────────────────────────────────────────────
describe("afterEach 守卫", () => {
  it("调用 NProgress.done()", () => {
    capturedAfterEach!();
    expect(NProgress.done).toHaveBeenCalledTimes(1);
  });
});

// ── 前置守卫：有 token ──────────────────────────────────────────────────────
describe("beforeEach 守卫 — 有 token 时", () => {
  beforeEach(() => {
    mockHasToken.mockReturnValue(true);
  });

  it("访问 /site/login 时重定向到 /home/index", async () => {
    const next = vi.fn();
    await capturedBeforeEach!(
      makeTo({ path: "/site/login" }),
      makeFrom(),
      next
    );
    expect(next).toHaveBeenCalledWith({ path: "/home/index" });
  });

  it("访问已匹配路由时调用 next()", async () => {
    const next = vi.fn();
    await capturedBeforeEach!(
      makeTo({ path: "/home/index", matched: [{}] }),
      makeFrom(),
      next
    );
    expect(next).toHaveBeenCalledWith();
  });

  it("路由未匹配且 from.name 存在时回退到 from", async () => {
    const next = vi.fn();
    const from = makeFrom({ name: "Dashboard" });
    await capturedBeforeEach!(
      makeTo({ path: "/unknown", matched: [] }),
      from,
      next
    );
    expect(next).toHaveBeenCalledWith({ name: "Dashboard" });
  });

  it("路由未匹配且 from.name 为 undefined 时跳转到 /404", async () => {
    const next = vi.fn();
    const from = makeFrom({ name: undefined });
    await capturedBeforeEach!(
      makeTo({ path: "/unknown", matched: [] }),
      from,
      next
    );
    expect(next).toHaveBeenCalledWith("/404");
  });

  it("params.title 覆盖路由 meta.title", async () => {
    const next = vi.fn();
    const to = makeTo({
      params: { title: "自定义标题" },
      meta: { title: "原标题" },
      matched: [{}],
    });
    await capturedBeforeEach!(to, makeFrom(), next);
    expect(to.meta.title).toBe("自定义标题");
    expect(next).toHaveBeenCalledWith();
  });

  it("query.title 覆盖路由 meta.title（params.title 为空时）", async () => {
    const next = vi.fn();
    const to = makeTo({
      params: {},
      query: { title: "Query标题" },
      meta: { title: "原标题" },
      matched: [{}],
    });
    await capturedBeforeEach!(to, makeFrom(), next);
    expect(to.meta.title).toBe("Query标题");
  });

  it("无 title 参数时不修改 meta.title", async () => {
    const next = vi.fn();
    const to = makeTo({ meta: { title: "不变标题" }, matched: [{}] });
    await capturedBeforeEach!(to, makeFrom(), next);
    expect(to.meta.title).toBe("不变标题");
  });

  it("调用 NProgress.start()", async () => {
    const next = vi.fn();
    await capturedBeforeEach!(makeTo(), makeFrom(), next);
    expect(NProgress.start).toHaveBeenCalled();
  });

  it("调用 NProgress.done()", async () => {
    const next = vi.fn();
    await capturedBeforeEach!(makeTo(), makeFrom(), next);
    expect(NProgress.done).toHaveBeenCalled();
  });
});

// ── 前置守卫：无 token ──────────────────────────────────────────────────────
describe("beforeEach 守卫 — 无 token 时", () => {
  it("白名单 /site/login 直接放行", async () => {
    const next = vi.fn();
    await capturedBeforeEach!(
      makeTo({ path: "/site/login" }),
      makeFrom(),
      next
    );
    expect(next).toHaveBeenCalledWith();
  });

  it("白名单 /web/home 直接放行", async () => {
    const next = vi.fn();
    await capturedBeforeEach!(makeTo({ path: "/web/home" }), makeFrom(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it("白名单 /401 直接放行", async () => {
    const next = vi.fn();
    await capturedBeforeEach!(makeTo({ path: "/401" }), makeFrom(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it("白名单 /404 直接放行", async () => {
    const next = vi.fn();
    await capturedBeforeEach!(makeTo({ path: "/404" }), makeFrom(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it("白名单 /privacy-policy 直接放行", async () => {
    const next = vi.fn();
    await capturedBeforeEach!(
      makeTo({ path: "/privacy-policy" }),
      makeFrom(),
      next
    );
    expect(next).toHaveBeenCalledWith();
  });

  it("非白名单路由重定向到 /web/index?redirect=...", async () => {
    const next = vi.fn();
    await capturedBeforeEach!(makeTo({ path: "/dashboard" }), makeFrom(), next);
    const redirectArg = next.mock.calls[0][0] as string;
    expect(redirectArg).toContain("/web/index?redirect=");
    expect(redirectArg).toContain(encodeURIComponent("/dashboard"));
  });

  it("非白名单路由带 query 参数时 redirect 包含 queryString", async () => {
    const next = vi.fn();
    const to = makeTo({ path: "/secret", query: { foo: "bar" } });
    await capturedBeforeEach!(to, makeFrom(), next);
    const redirectArg = next.mock.calls[0][0] as string;
    expect(redirectArg).toContain("foo%3Dbar");
  });

  it("非白名单路由不调用 next() 无参", async () => {
    const next = vi.fn();
    await capturedBeforeEach!(makeTo({ path: "/admin" }), makeFrom(), next);
    // next 应以字符串参数调用，而非无参
    expect(next).toHaveBeenCalledTimes(1);
    expect(typeof next.mock.calls[0][0]).toBe("string");
  });
});

// ── hasAuth ─────────────────────────────────────────────────────────────────
describe("hasAuth()", () => {
  it("userInfo 为 null 时返回 false", () => {
    mockUserInfo = null;
    expect(hasAuth("any:permission")).toBe(false);
  });

  it("roles 包含 manager 时 button 类型返回 true（超级管理员）", () => {
    mockUserInfo = { roles: ["manager"], perms: [] };
    expect(hasAuth("any:permission", "button")).toBe(true);
  });

  it("manager 对 role 类型不自动获得超级权限", () => {
    mockUserInfo = { roles: ["manager"], perms: [] };
    // type=role 不触发超级管理员逻辑，只检查 roles.includes(value)
    expect(hasAuth("admin", "role")).toBe(false);
  });

  it("perms 包含指定权限时 button 类型返回 true", () => {
    mockUserInfo = { roles: ["user"], perms: ["user:list"] };
    expect(hasAuth("user:list", "button")).toBe(true);
  });

  it("perms 不包含指定权限时 button 类型返回 false", () => {
    mockUserInfo = { roles: ["user"], perms: ["user:list"] };
    expect(hasAuth("user:delete", "button")).toBe(false);
  });

  it("value 为数组时匹配任意一个权限返回 true", () => {
    mockUserInfo = { roles: ["user"], perms: ["user:list", "user:view"] };
    expect(hasAuth(["user:delete", "user:list"], "button")).toBe(true);
  });

  it("value 为数组且无一匹配时返回 false", () => {
    mockUserInfo = { roles: ["user"], perms: ["user:list"] };
    expect(hasAuth(["user:delete", "user:create"], "button")).toBe(false);
  });

  it("type=role 时检查 roles 而非 perms", () => {
    mockUserInfo = { roles: ["admin"], perms: [] };
    expect(hasAuth("admin", "role")).toBe(true);
  });

  it("type=role 且 roles 不含指定角色时返回 false", () => {
    mockUserInfo = { roles: ["user"], perms: ["admin"] };
    expect(hasAuth("admin", "role")).toBe(false);
  });

  it("type=role 且 value 为数组时 some 匹配", () => {
    mockUserInfo = { roles: ["editor", "viewer"], perms: [] };
    expect(hasAuth(["admin", "editor"], "role")).toBe(true);
  });

  it("type=role 且 value 为数组无匹配时返回 false", () => {
    mockUserInfo = { roles: ["viewer"], perms: [] };
    expect(hasAuth(["admin", "editor"], "role")).toBe(false);
  });

  it("默认 type 为 button", () => {
    mockUserInfo = { roles: ["user"], perms: ["dashboard:view"] };
    // 不传 type，默认 button
    expect(hasAuth("dashboard:view")).toBe(true);
  });
});
