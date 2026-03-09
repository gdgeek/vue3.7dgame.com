/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit tests for src/utils/ability.ts
 * Tests all exported classes and the UpdateAbility function.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AbilityRouter,
  AbilityEdit,
  AbilityEditable,
  AbilityRole,
  AbilityViewable,
  AbilityWorks,
  AbilityMessage,
  UpdateAbility,
} from "@/utils/ability";

// ---------------------------------------------------------------------------
// AbilityRouter
// ---------------------------------------------------------------------------
describe("AbilityRouter", () => {
  it("stores the path passed to the constructor", () => {
    const instance = new AbilityRouter("/home");
    expect(instance.path).toBe("/home");
  });

  it("stores a deep path", () => {
    const instance = new AbilityRouter("/verse/scene/123");
    expect(instance.path).toBe("/verse/scene/123");
  });

  it("stores an empty string path", () => {
    const instance = new AbilityRouter("");
    expect(instance.path).toBe("");
  });
});

// ---------------------------------------------------------------------------
// AbilityEdit
// ---------------------------------------------------------------------------
describe("AbilityEdit", () => {
  it("stores the type passed to the constructor", () => {
    const instance = new AbilityEdit("polygen");
    expect(instance.type).toBe("polygen");
  });

  it("stores audio type", () => {
    const instance = new AbilityEdit("audio");
    expect(instance.type).toBe("audio");
  });

  it("stores an arbitrary type string", () => {
    const instance = new AbilityEdit("customType");
    expect(instance.type).toBe("customType");
  });
});

// ---------------------------------------------------------------------------
// AbilityEditable
// ---------------------------------------------------------------------------
describe("AbilityEditable", () => {
  it("stores true when passed true", () => {
    const instance = new AbilityEditable(true);
    expect(instance.editable).toBe(true);
  });

  it("stores false when passed false", () => {
    const instance = new AbilityEditable(false);
    expect(instance.editable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AbilityViewable
// ---------------------------------------------------------------------------
describe("AbilityViewable", () => {
  it("stores true when passed true", () => {
    const instance = new AbilityViewable(true);
    expect(instance.viewable).toBe(true);
  });

  it("stores false when passed false", () => {
    const instance = new AbilityViewable(false);
    expect(instance.viewable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AbilityWorks
// ---------------------------------------------------------------------------
describe("AbilityWorks", () => {
  it("stores the id passed to the constructor", () => {
    const instance = new AbilityWorks(42);
    expect(instance.id).toBe(42);
  });

  it("stores 0 as id", () => {
    const instance = new AbilityWorks(0);
    expect(instance.id).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AbilityMessage
// ---------------------------------------------------------------------------
describe("AbilityMessage", () => {
  it("stores both id and managed values", () => {
    const instance = new AbilityMessage(10, 1);
    expect(instance.id).toBe(10);
    expect(instance.managed).toBe(1);
  });

  it("stores zero values", () => {
    const instance = new AbilityMessage(0, 0);
    expect(instance.id).toBe(0);
    expect(instance.managed).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AbilityRole – role priority resolution
// ---------------------------------------------------------------------------
describe("AbilityRole", () => {
  it("resolves to 'root' when roles includes root", () => {
    const instance = new AbilityRole(["root"]);
    expect(instance.role).toBe("root");
  });

  it("root has priority over admin", () => {
    const instance = new AbilityRole(["admin", "root"]);
    expect(instance.role).toBe("root");
  });

  it("resolves to 'admin' when roles includes admin but not root", () => {
    const instance = new AbilityRole(["admin"]);
    expect(instance.role).toBe("admin");
  });

  it("admin has priority over manager", () => {
    const instance = new AbilityRole(["manager", "admin"]);
    expect(instance.role).toBe("admin");
  });

  it("resolves to 'manager' when roles includes manager but not root or admin", () => {
    const instance = new AbilityRole(["manager"]);
    expect(instance.role).toBe("manager");
  });

  it("manager has priority over user", () => {
    const instance = new AbilityRole(["user", "manager"]);
    expect(instance.role).toBe("manager");
  });

  it("resolves to 'user' when roles includes user but not higher roles", () => {
    const instance = new AbilityRole(["user"]);
    expect(instance.role).toBe("user");
  });

  it("user has priority over guest (empty)", () => {
    const instance = new AbilityRole(["user", "someOtherRole"]);
    expect(instance.role).toBe("user");
  });

  it("resolves to 'guest' when roles array is empty", () => {
    const instance = new AbilityRole([]);
    expect(instance.role).toBe("guest");
  });

  it("resolves to 'guest' for unknown roles", () => {
    const instance = new AbilityRole(["viewer", "editor"]);
    expect(instance.role).toBe("guest");
  });

  it("stores the original roles array", () => {
    const roles = ["user", "admin"];
    const instance = new AbilityRole(roles);
    expect(instance.roles).toBe(roles);
  });

  it("resolves all roles together with root winning", () => {
    const instance = new AbilityRole([
      "guest",
      "user",
      "manager",
      "admin",
      "root",
    ]);
    expect(instance.role).toBe("root");
  });
});

// ---------------------------------------------------------------------------
// UpdateAbility
// ---------------------------------------------------------------------------
describe("UpdateAbility", () => {
  let mockAbility: { update: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAbility = { update: vi.fn() };
  });

  it("calls ability.update exactly once", () => {
    UpdateAbility(mockAbility, ["user"], 1);
    expect(mockAbility.update).toHaveBeenCalledTimes(1);
  });

  it("calls ability.update with an array of rules", () => {
    UpdateAbility(mockAbility, ["user"], 1);
    const [rules] = mockAbility.update.mock.calls[0];
    expect(Array.isArray(rules)).toBe(true);
  });

  it("handles null roles without throwing", () => {
    expect(() => UpdateAbility(mockAbility, null, 1)).not.toThrow();
    expect(mockAbility.update).toHaveBeenCalledTimes(1);
  });

  it("handles empty roles array without throwing", () => {
    expect(() => UpdateAbility(mockAbility, [], 1)).not.toThrow();
    expect(mockAbility.update).toHaveBeenCalledTimes(1);
  });

  it("generates more rules for root than for guest", () => {
    const guestAbility = { update: vi.fn() };
    const rootAbility = { update: vi.fn() };

    UpdateAbility(guestAbility, [], 1);
    UpdateAbility(rootAbility, ["root"], 1);

    const guestRules: unknown[] = guestAbility.update.mock.calls[0][0];
    const rootRules: unknown[] = rootAbility.update.mock.calls[0][0];

    expect(rootRules.length).toBeGreaterThan(guestRules.length);
  });

  it("generates more rules for admin than for user", () => {
    const userAbility = { update: vi.fn() };
    const adminAbility = { update: vi.fn() };

    UpdateAbility(userAbility, ["user"], 1);
    UpdateAbility(adminAbility, ["admin"], 1);

    const userRules: unknown[] = userAbility.update.mock.calls[0][0];
    const adminRules: unknown[] = adminAbility.update.mock.calls[0][0];

    expect(adminRules.length).toBeGreaterThan(userRules.length);
  });

  it("produces same number of rules for root regardless of userId", () => {
    const ability1 = { update: vi.fn() };
    const ability2 = { update: vi.fn() };

    UpdateAbility(ability1, ["root"], 1);
    UpdateAbility(ability2, ["root"], 999);

    const rules1: unknown[] = ability1.update.mock.calls[0][0];
    const rules2: unknown[] = ability2.update.mock.calls[0][0];

    expect(rules1.length).toBe(rules2.length);
  });

  it("handles manager role", () => {
    expect(() => UpdateAbility(mockAbility, ["manager"], 1)).not.toThrow();
    const rules: unknown[] = mockAbility.update.mock.calls[0][0];
    expect(rules.length).toBeGreaterThan(0);
  });

  it("adds base site navigation rules for guests", () => {
    UpdateAbility(mockAbility, [], 7);
    const rules: any[] = mockAbility.update.mock.calls[0][0];
    expect(
      rules.some(
        (rule) =>
          rule.subject === AbilityRouter.name &&
          rule.action === "goto" &&
          rule.conditions?.path === "/site/index"
      )
    ).toBe(true);
  });

  it("adds edit permission for user resource types", () => {
    UpdateAbility(mockAbility, ["user"], 7);
    const rules: any[] = mockAbility.update.mock.calls[0][0];
    expect(
      rules.some(
        (rule) =>
          rule.subject === AbilityEdit.name &&
          rule.action === "edit" &&
          rule.conditions?.type === "polygen"
      )
    ).toBe(true);
  });

  it("binds work ownership rules to the given userId", () => {
    UpdateAbility(mockAbility, ["user"], 321);
    const rules: any[] = mockAbility.update.mock.calls[0][0];
    expect(
      rules.some(
        (rule) =>
          rule.subject === AbilityWorks.name &&
          Array.isArray(rule.action) &&
          rule.action.includes("update") &&
          rule.conditions?.id === 321
      )
    ).toBe(true);
  });

  it("adds admin people management rules", () => {
    UpdateAbility(mockAbility, ["admin"], 1);
    const rules: any[] = mockAbility.update.mock.calls[0][0];
    expect(
      rules.some(
        (rule) =>
          rule.subject === AbilityRole.name &&
          rule.action === "people" &&
          rule.conditions?.role === "manager"
      )
    ).toBe(true);
    expect(
      rules.some(
        (rule) =>
          rule.subject === AbilityRole.name &&
          rule.action === "people" &&
          rule.conditions?.role === "user"
      )
    ).toBe(true);
  });

  it("adds root-only phototype menu visibility rule", () => {
    UpdateAbility(mockAbility, ["root"], 1);
    const rules: any[] = mockAbility.update.mock.calls[0][0];
    expect(
      rules.some(
        (rule) =>
          rule.subject === AbilityRouter.name &&
          Array.isArray(rule.action) &&
          rule.action.includes("open") &&
          rule.conditions?.path?.$regex instanceof RegExp &&
          rule.conditions.path.$regex.test("/phototype/list")
      )
    ).toBe(true);
  });

  it("supports regex edit rule branch when edit list contains RegExp", () => {
    const originalConcat = Array.prototype.concat;
    const concatSpy = vi
      .spyOn(Array.prototype, "concat")
      .mockImplementation(function (...args: any[]) {
        const result = originalConcat.apply(this, args as any);
        if (
          Array.isArray(this) &&
          this.length === 0 &&
          Array.isArray(args[0]) &&
          args[0].includes("polygen")
        ) {
          return [...(result as any[]), /^regex-edit$/];
        }
        return result;
      });

    UpdateAbility(mockAbility, ["user"], 7);
    const rules: any[] = mockAbility.update.mock.calls[0][0];
    expect(
      rules.some(
        (rule) =>
          rule.subject === AbilityEdit.name &&
          rule.action === "edit" &&
          rule.conditions?.type?.$regex instanceof RegExp &&
          rule.conditions.type.$regex.test("regex-edit")
      )
    ).toBe(true);
    concatSpy.mockRestore();
  });
});
