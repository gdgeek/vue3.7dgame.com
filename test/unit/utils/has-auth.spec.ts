/**
 * Unit tests for hasAuth() in src/plugins/permission.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock dependencies that need router/NProgress (not needed for hasAuth tests)
// ---------------------------------------------------------------------------
vi.mock("@/utils/nprogress", () => ({ default: { start: vi.fn(), done: vi.fn() } }));
vi.mock("@/router", () => ({ useRouter: vi.fn(() => ({ beforeEach: vi.fn(), afterEach: vi.fn() })) }));

// Mock useUserStore to return controlled userInfo
const mockUserInfo = vi.hoisted(() => ({ value: null as null | { roles: string[]; perms: string[] } }));

vi.mock("@/store", () => ({
  useUserStore: vi.fn(() => ({ userInfo: mockUserInfo.value })),
}));

import { hasAuth } from "@/plugins/permission";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function setUser(roles: string[], perms: string[]) {
  mockUserInfo.value = { roles, perms };
}

function clearUser() {
  mockUserInfo.value = null;
}

// ---------------------------------------------------------------------------
// hasAuth()
// ---------------------------------------------------------------------------
describe("hasAuth()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearUser();
  });

  // ── null userInfo ──────────────────────────────────────────────────────
  describe("when userInfo is null", () => {
    it("returns false for button check", () => {
      expect(hasAuth("sys:user:add")).toBe(false);
    });

    it("returns false for role check", () => {
      expect(hasAuth("admin", "role")).toBe(false);
    });

    it("returns false for array of perms", () => {
      expect(hasAuth(["sys:user:add", "sys:user:edit"])).toBe(false);
    });
  });

  // ── manager role (super admin) ─────────────────────────────────────────
  describe("when user has manager role", () => {
    beforeEach(() => setUser(["manager"], ["sys:user:add"]));

    it("returns true for any button permission (string)", () => {
      expect(hasAuth("sys:user:delete")).toBe(true);
    });

    it("returns true for any button permission (array)", () => {
      expect(hasAuth(["any:perm:whatsoever"])).toBe(true);
    });

    it("does NOT short-circuit for role check", () => {
      // manager role does NOT give all roles — only perms
      expect(hasAuth("super-admin", "role")).toBe(false);
    });
  });

  // ── button permissions ─────────────────────────────────────────────────
  describe("button permission check (type='button')", () => {
    beforeEach(() => setUser(["editor"], ["sys:user:add", "sys:user:edit"]));

    it("returns true when string perm is in perms list", () => {
      expect(hasAuth("sys:user:add")).toBe(true);
    });

    it("returns false when string perm is not in perms list", () => {
      expect(hasAuth("sys:user:delete")).toBe(false);
    });

    it("returns true when at least one perm in array matches", () => {
      expect(hasAuth(["sys:user:delete", "sys:user:edit"])).toBe(true);
    });

    it("returns false when none of the array perms match", () => {
      expect(hasAuth(["sys:user:delete", "sys:user:view"])).toBe(false);
    });

    it("returns true for exact single match in array", () => {
      expect(hasAuth(["sys:user:add"])).toBe(true);
    });
  });

  // ── role check ──────────────────────────────────────────────────────────
  describe("role check (type='role')", () => {
    beforeEach(() => setUser(["admin", "editor"], ["any:perm"]));

    it("returns true when string role is in roles list", () => {
      expect(hasAuth("admin", "role")).toBe(true);
    });

    it("returns false when string role is not in roles list", () => {
      expect(hasAuth("superuser", "role")).toBe(false);
    });

    it("returns true when at least one role in array matches", () => {
      expect(hasAuth(["superuser", "editor"], "role")).toBe(true);
    });

    it("returns false when none of the array roles match", () => {
      expect(hasAuth(["superuser", "viewer"], "role")).toBe(false);
    });
  });
});
