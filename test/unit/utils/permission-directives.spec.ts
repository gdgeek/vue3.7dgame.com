/**
 * Unit tests for src/directive/permission/index.ts
 * Covers: hasPerm directive, hasRole directive
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock hasAuth so we can control authorization results
// ---------------------------------------------------------------------------
const mockHasAuth = vi.hoisted(() => vi.fn());

vi.mock("@/plugins/permission", () => ({
  hasAuth: mockHasAuth,
}));

import { hasPerm, hasRole } from "@/directive/permission/index";
import type { DirectiveBinding } from "vue";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeEl(): HTMLElement {
  const parent = document.createElement("div");
  const child = document.createElement("button");
  parent.appendChild(child);
  return child;
}

function makeBinding(value: unknown): DirectiveBinding {
  return { value } as DirectiveBinding;
}

function callMounted(directive: { mounted?: Function }, el: HTMLElement, binding: DirectiveBinding) {
  directive.mounted!(el, binding, null as any, null as any);
}

// ---------------------------------------------------------------------------
// hasPerm directive
// ---------------------------------------------------------------------------
describe("hasPerm directive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps element when hasAuth returns true (user has permission)", () => {
    mockHasAuth.mockReturnValue(true);
    const el = makeEl();
    const parent = el.parentNode!;
    callMounted(hasPerm, el, makeBinding(["sys:user:add"]));
    expect(parent.contains(el)).toBe(true);
  });

  it("removes element from DOM when hasAuth returns false", () => {
    mockHasAuth.mockReturnValue(false);
    const el = makeEl();
    const parent = el.parentNode!;
    callMounted(hasPerm, el, makeBinding(["sys:user:add"]));
    expect(parent.contains(el)).toBe(false);
  });

  it("calls hasAuth with the binding value (button type by default)", () => {
    mockHasAuth.mockReturnValue(true);
    const el = makeEl();
    const perms = ["sys:user:add", "sys:user:edit"];
    callMounted(hasPerm, el, makeBinding(perms));
    expect(mockHasAuth).toHaveBeenCalledWith(perms);
  });

  it("does not call hasAuth when binding value is falsy", () => {
    const el = makeEl();
    expect(() => callMounted(hasPerm, el, makeBinding(null))).toThrow();
    expect(mockHasAuth).not.toHaveBeenCalled();
  });

  it("throws error when binding value is null", () => {
    const el = makeEl();
    expect(() => callMounted(hasPerm, el, makeBinding(null))).toThrowError(
      /need perms/
    );
  });

  it("throws error when binding value is undefined", () => {
    const el = makeEl();
    expect(() => callMounted(hasPerm, el, makeBinding(undefined))).toThrowError(
      /need perms/
    );
  });

  it("throws error when binding value is empty string", () => {
    const el = makeEl();
    expect(() => callMounted(hasPerm, el, makeBinding(""))).toThrowError(
      /need perms/
    );
  });

  it("works with a string permission value", () => {
    mockHasAuth.mockReturnValue(true);
    const el = makeEl();
    callMounted(hasPerm, el, makeBinding("sys:user:view"));
    expect(mockHasAuth).toHaveBeenCalledWith("sys:user:view");
  });

  it("does not throw when element has no parent", () => {
    mockHasAuth.mockReturnValue(false);
    const el = document.createElement("button"); // No parent
    expect(() => callMounted(hasPerm, el, makeBinding(["any:perm"]))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// hasRole directive
// ---------------------------------------------------------------------------
describe("hasRole directive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps element when hasAuth returns true (user has role)", () => {
    mockHasAuth.mockReturnValue(true);
    const el = makeEl();
    const parent = el.parentNode!;
    callMounted(hasRole, el, makeBinding(["admin"]));
    expect(parent.contains(el)).toBe(true);
  });

  it("removes element from DOM when hasAuth returns false", () => {
    mockHasAuth.mockReturnValue(false);
    const el = makeEl();
    const parent = el.parentNode!;
    callMounted(hasRole, el, makeBinding(["admin"]));
    expect(parent.contains(el)).toBe(false);
  });

  it("calls hasAuth with binding value and 'role' type", () => {
    mockHasAuth.mockReturnValue(true);
    const el = makeEl();
    const roles = ["admin", "test"];
    callMounted(hasRole, el, makeBinding(roles));
    expect(mockHasAuth).toHaveBeenCalledWith(roles, "role");
  });

  it("throws error when binding value is null", () => {
    const el = makeEl();
    expect(() => callMounted(hasRole, el, makeBinding(null))).toThrowError(
      /need roles/
    );
  });

  it("throws error when binding value is undefined", () => {
    const el = makeEl();
    expect(() => callMounted(hasRole, el, makeBinding(undefined))).toThrowError(
      /need roles/
    );
  });

  it("throws error when binding value is empty string", () => {
    const el = makeEl();
    expect(() => callMounted(hasRole, el, makeBinding(""))).toThrowError(
      /need roles/
    );
  });

  it("does not call hasAuth when binding value is falsy", () => {
    const el = makeEl();
    expect(() => callMounted(hasRole, el, makeBinding(null))).toThrow();
    expect(mockHasAuth).not.toHaveBeenCalled();
  });

  it("works with string role value", () => {
    mockHasAuth.mockReturnValue(true);
    const el = makeEl();
    callMounted(hasRole, el, makeBinding("admin"));
    expect(mockHasAuth).toHaveBeenCalledWith("admin", "role");
  });

  it("does not throw when element has no parent (no-op removal)", () => {
    mockHasAuth.mockReturnValue(false);
    const el = document.createElement("div"); // No parent
    expect(() => callMounted(hasRole, el, makeBinding(["admin"]))).not.toThrow();
  });
});
