/**
 * 密码验证工具 - 属性测试 (Property-Based Testing)
 * 使用 vitest + fast-check
 */
import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";

import {
  validatePassword,
  isPasswordValid,
  getPasswordStrength,
  PASSWORD_POLICY,
  createPasswordFormRules,
  getCharacterCategoryCount,
} from "@/utils/password-validator";
import type { PasswordRuleResult } from "@/utils/password-validator";

/** 辅助函数：从验证结果中按 key 查找规则 */
function findRule(
  rules: PasswordRuleResult[],
  key: string
): PasswordRuleResult {
  const rule = rules.find((r) => r.key === key);
  if (!rule) throw new Error(`Rule with key "${key}" not found`);
  return rule;
}

describe("password-validator property-based tests", () => {
  /**
   * P1: 长度规则正确性
   * **Validates: Requirements 1.3, 3.4, 3.5**
   *
   * - s.length < 8 → minLength rule passed === false
   * - 8 <= s.length <= 64 → minLength rule passed === true
   * - s.length > 64 → maxLength rule passed === false
   */
  describe("P1: 长度规则正确性", () => {
    it("strings shorter than 8 chars → minLength failed", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 7 }), (s) => {
          const result = validatePassword(s);
          const minLengthRule = findRule(result.rules, "minLength");
          expect(minLengthRule.passed).toBe(false);
        })
      );
    });

    it("strings with length 8-64 → minLength passed", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 8, maxLength: 64 }), (s) => {
          const result = validatePassword(s);
          const minLengthRule = findRule(result.rules, "minLength");
          expect(minLengthRule.passed).toBe(true);
        })
      );
    });

    it("strings longer than 64 chars → maxLength failed", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 65, maxLength: 300 }), (s) => {
          const result = validatePassword(s);
          const maxLengthRule = findRule(result.rules, "maxLength");
          expect(maxLengthRule.passed).toBe(false);
        })
      );
    });
  });

  /**
   * P2: 字符类别组合规则正确性
   * **Validates: Requirements 1.3, 3.6**
   *
   * - characterVariety rule passed === 至少包含 3 类字符
   * - getCharacterCategoryCount 与四类 regex 结果一致
   */
  describe("P2: 字符类别组合规则正确性", () => {
    it("characterVariety rule matches category count >= 3", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 200 }), (s) => {
          const result = validatePassword(s);
          const characterVarietyRule = findRule(
            result.rules,
            "characterVariety"
          );
          expect(characterVarietyRule.passed).toBe(
            getCharacterCategoryCount(s) >=
              PASSWORD_POLICY.MIN_CHARACTER_CATEGORIES
          );
        })
      );
    });

    it("getCharacterCategoryCount matches all category regexes", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 200 }), (s) => {
          const expected = [
            /[A-Z]/,
            /[a-z]/,
            /\d/,
            PASSWORD_POLICY.SPECIAL_CHAR_REGEX,
          ].filter((regex) => regex.test(s)).length;
          expect(getCharacterCategoryCount(s)).toBe(expected);
        })
      );
    });

    it("passwords with 3 categories pass character variety", () => {
      const result = validatePassword("Validpass1");
      expect(findRule(result.rules, "characterVariety").passed).toBe(true);
    });

    it("passwords with only 2 categories fail character variety", () => {
      const result = validatePassword("lowercase1");
      expect(findRule(result.rules, "characterVariety").passed).toBe(false);
    });
  });

  /**
   * P3: isValid 与规则一致性
   * **Validates: Requirements 1.4**
   *
   * isPasswordValid(s) === validatePassword(s).rules.every(r => r.passed)
   */
  describe("P3: isValid 与规则一致性", () => {
    it("isPasswordValid(s) === validatePassword(s).rules.every(r => r.passed)", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 200 }), (s) => {
          const result = validatePassword(s);
          const allPassed = result.rules.every((r) => r.passed);
          expect(isPasswordValid(s)).toBe(allPassed);
        })
      );
    });
  });

  /**
   * P4: 强度等级单调性
   * **Validates: Requirements 1.5**
   *
   * invalid → 'weak', valid with 3 classes → 'medium',
   * valid with length >= 12 and 4 classes → 'strong'
   */
  describe("P4: 强度等级单调性", () => {
    it("invalid passwords are weak", () => {
      expect(validatePassword("short1").strength).toBe("weak");
    });

    it("valid passwords with 3 categories are medium", () => {
      expect(validatePassword("Validpass1").strength).toBe("medium");
    });

    it("valid passwords with length >= 12 and 4 categories are strong", () => {
      expect(validatePassword("Validpass1!x").strength).toBe("strong");
    });

    it("getPasswordStrength returns same as validatePassword().strength", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 200 }), (s) => {
          expect(getPasswordStrength(s)).toBe(validatePassword(s).strength);
        })
      );
    });
  });

  /**
   * P5: 验证结果结构完整性
   * **Validates: Requirements 1.2**
   *
   * - Always includes base hard rules with key/passed/message fields
   * - Account info rule appears only when account identifiers are supplied
   */
  describe("P5: 验证结果结构完整性", () => {
    const EXPECTED_KEYS = [
      "minLength",
      "maxLength",
      "characterVariety",
      "weakPassword",
    ];

    it("always returns base hard rules", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 200 }), (s) => {
          const result = validatePassword(s);
          expect(result.rules).toHaveLength(EXPECTED_KEYS.length);
        })
      );
    });

    it("every rule has key (string), passed (boolean), message (non-empty string)", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 200 }), (s) => {
          const result = validatePassword(s);
          for (const rule of result.rules) {
            expect(typeof rule.key).toBe("string");
            expect(rule.key.length).toBeGreaterThan(0);
            expect(typeof rule.passed).toBe("boolean");
            expect(typeof rule.message).toBe("string");
            expect(rule.message.length).toBeGreaterThan(0);
          }
        })
      );
    });

    it("contains all expected rule keys", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 200 }), (s) => {
          const result = validatePassword(s);
          const keys = result.rules.map((r) => r.key);
          for (const expectedKey of EXPECTED_KEYS) {
            expect(keys).toContain(expectedKey);
          }
        })
      );
    });

    it("includes accountInfo rule when account identifiers are supplied", () => {
      const result = validatePassword("Validpass1", {
        accountIdentifiers: ["valid"],
      });
      expect(result.rules.map((r) => r.key)).toContain("accountInfo");
    });
  });

  describe("P6: 弱密码和账号信息", () => {
    it("rejects common weak passwords", () => {
      const result = validatePassword("Password123!");
      expect(findRule(result.rules, "weakPassword").passed).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it("rejects passwords containing account identifiers", () => {
      const result = validatePassword("Dirui2026!", {
        accountIdentifiers: ["dirui"],
      });
      expect(findRule(result.rules, "accountInfo").passed).toBe(false);
      expect(result.isValid).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// createPasswordFormRules
// ---------------------------------------------------------------------------
describe("createPasswordFormRules()", () => {
  const t = (key: string) => `[${key}]`;

  it("returns an array of 2 rules", () => {
    const rules = createPasswordFormRules(t);
    expect(rules).toHaveLength(2);
  });

  it("first rule is required with trigger=blur", () => {
    const rules = createPasswordFormRules(t);
    expect(rules[0].required).toBe(true);
    expect(rules[0].trigger).toBe("blur");
  });

  it("second rule has a validator function and trigger=blur", () => {
    const rules = createPasswordFormRules(t);
    expect(typeof rules[1].validator).toBe("function");
    expect(rules[1].trigger).toBe("blur");
  });

  it("validator calls callback() with no error for a valid password", () => {
    const rules = createPasswordFormRules(t);
    const validator = rules[1].validator as (
      rule: unknown,
      value: string,
      callback: (err?: Error) => void
    ) => void;
    const callback = vi.fn();
    validator({}, "Validpass1", callback);
    expect(callback).toHaveBeenCalledWith();
  });

  it("validator calls callback(Error) for an invalid password", () => {
    const rules = createPasswordFormRules(t);
    const validator = rules[1].validator as (
      rule: unknown,
      value: string,
      callback: (err?: Error) => void
    ) => void;
    const callback = vi.fn();
    validator({}, "short", callback);
    expect(callback).toHaveBeenCalledWith(expect.any(Error));
  });

  it("validator calls callback() with no error for empty value", () => {
    const rules = createPasswordFormRules(t);
    const validator = rules[1].validator as (
      rule: unknown,
      value: string,
      callback: (err?: Error) => void
    ) => void;
    const callback = vi.fn();
    validator({}, "", callback);
    expect(callback).toHaveBeenCalledWith();
  });

  it("error message includes translated rule messages joined by ；", () => {
    const rules = createPasswordFormRules(t);
    const validator = rules[1].validator as (
      rule: unknown,
      value: string,
      callback: (err?: Error) => void
    ) => void;
    const callback = vi.fn();
    validator({}, "short", callback);
    const err = callback.mock.calls[0][0] as Error;
    expect(err.message).toContain("；");
  });
});
