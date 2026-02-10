/**
 * 密码验证工具 - 属性测试 (Property-Based Testing)
 * 使用 vitest + fast-check
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

import {
  validatePassword,
  isPasswordValid,
  getPasswordStrength,
  PASSWORD_POLICY,
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
   * - s.length < 12 → minLength rule passed === false
   * - 12 <= s.length <= 128 → minLength rule passed === true
   * - s.length > 128 → maxLength rule passed === false
   */
  describe("P1: 长度规则正确性", () => {
    it("strings shorter than 12 chars → minLength failed", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 11 }), (s) => {
          const result = validatePassword(s);
          const minLengthRule = findRule(result.rules, "minLength");
          expect(minLengthRule.passed).toBe(false);
        })
      );
    });

    it("strings with length 12-128 → minLength passed", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 12, maxLength: 128 }), (s) => {
          const result = validatePassword(s);
          const minLengthRule = findRule(result.rules, "minLength");
          expect(minLengthRule.passed).toBe(true);
        })
      );
    });

    it("strings longer than 128 chars → maxLength failed", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 129, maxLength: 300 }), (s) => {
          const result = validatePassword(s);
          const maxLengthRule = findRule(result.rules, "maxLength");
          expect(maxLengthRule.passed).toBe(false);
        })
      );
    });
  });

  /**
   * P2: 字符类别规则正确性
   * **Validates: Requirements 1.3, 3.6**
   *
   * - uppercase rule passed === /[A-Z]/.test(s)
   * - lowercase rule passed === /[a-z]/.test(s)
   * - digit rule passed === /\d/.test(s)
   * - specialChar rule matches special char regex
   */
  describe("P2: 字符类别规则正确性", () => {
    it("uppercase rule matches /[A-Z]/ test result", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 200 }), (s) => {
          const result = validatePassword(s);
          const uppercaseRule = findRule(result.rules, "uppercase");
          expect(uppercaseRule.passed).toBe(/[A-Z]/.test(s));
        })
      );
    });

    it("lowercase rule matches /[a-z]/ test result", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 200 }), (s) => {
          const result = validatePassword(s);
          const lowercaseRule = findRule(result.rules, "lowercase");
          expect(lowercaseRule.passed).toBe(/[a-z]/.test(s));
        })
      );
    });

    it("digit rule matches /\\d/ test result", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 200 }), (s) => {
          const result = validatePassword(s);
          const digitRule = findRule(result.rules, "digit");
          expect(digitRule.passed).toBe(/\d/.test(s));
        })
      );
    });

    it("specialChar rule matches SPECIAL_CHAR_REGEX test result", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 200 }), (s) => {
          const result = validatePassword(s);
          const specialCharRule = findRule(result.rules, "specialChar");
          expect(specialCharRule.passed).toBe(
            PASSWORD_POLICY.SPECIAL_CHAR_REGEX.test(s)
          );
        })
      );
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
   * passCount 0-3 → 'weak', 4-5 → 'medium', 6 → 'strong'
   */
  describe("P4: 强度等级单调性", () => {
    it("strength maps correctly based on passCount", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 200 }), (s) => {
          const result = validatePassword(s);
          const passCount = result.rules.filter((r) => r.passed).length;

          if (passCount <= 3) {
            expect(result.strength).toBe("weak");
          } else if (passCount <= 5) {
            expect(result.strength).toBe("medium");
          } else {
            expect(result.strength).toBe("strong");
          }
        })
      );
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
   * - Always 6 rules, each with key/passed/message fields
   * - All 6 keys present: minLength, maxLength, uppercase, lowercase, digit, specialChar
   */
  describe("P5: 验证结果结构完整性", () => {
    const EXPECTED_KEYS = [
      "minLength",
      "maxLength",
      "uppercase",
      "lowercase",
      "digit",
      "specialChar",
    ];

    it("always returns exactly 6 rules", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 200 }), (s) => {
          const result = validatePassword(s);
          expect(result.rules).toHaveLength(6);
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

    it("contains all 6 expected rule keys", () => {
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
  });
});
