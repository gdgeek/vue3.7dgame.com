import type { FormItemRule } from "element-plus";

/** 单条规则的验证结果 */
export interface PasswordRuleResult {
  key: string;
  passed: boolean;
  message: string;
}

/** 完整验证结果 */
export interface PasswordValidationResult {
  rules: PasswordRuleResult[];
  isValid: boolean;
  strength: PasswordStrength;
}

export type PasswordStrength = "weak" | "medium" | "strong";

/** 密码策略常量 */
export const PASSWORD_POLICY = {
  MIN_LENGTH: 12,
  MAX_LENGTH: 128,
  UPPERCASE_REGEX: /[A-Z]/,
  LOWERCASE_REGEX: /[a-z]/,
  DIGIT_REGEX: /\d/,
  SPECIAL_CHAR_REGEX: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/,
} as const;

/**
 * 验证密码是否满足所有规则
 * 纯函数，无副作用
 */
export function validatePassword(password: string): PasswordValidationResult {
  const rules: PasswordRuleResult[] = [
    {
      key: "minLength",
      passed: password.length >= PASSWORD_POLICY.MIN_LENGTH,
      message: "passwordPolicy.minLength",
    },
    {
      key: "maxLength",
      passed: password.length <= PASSWORD_POLICY.MAX_LENGTH,
      message: "passwordPolicy.maxLength",
    },
    {
      key: "uppercase",
      passed: PASSWORD_POLICY.UPPERCASE_REGEX.test(password),
      message: "passwordPolicy.uppercase",
    },
    {
      key: "lowercase",
      passed: PASSWORD_POLICY.LOWERCASE_REGEX.test(password),
      message: "passwordPolicy.lowercase",
    },
    {
      key: "digit",
      passed: PASSWORD_POLICY.DIGIT_REGEX.test(password),
      message: "passwordPolicy.digit",
    },
    {
      key: "specialChar",
      passed: PASSWORD_POLICY.SPECIAL_CHAR_REGEX.test(password),
      message: "passwordPolicy.specialChar",
    },
  ];

  const passedCount = rules.filter((r) => r.passed).length;

  return {
    rules,
    isValid: rules.every((r) => r.passed),
    strength: getStrengthFromCount(passedCount),
  };
}

/**
 * 根据通过的规则数量计算强度等级
 */
function getStrengthFromCount(passedCount: number): PasswordStrength {
  if (passedCount >= 6) return "strong";
  if (passedCount >= 4) return "medium";
  return "weak";
}

/**
 * 计算密码强度
 * - weak: 通过 0-3 条规则
 * - medium: 通过 4-5 条规则
 * - strong: 通过全部 6 条规则
 */
export function getPasswordStrength(password: string): PasswordStrength {
  return validatePassword(password).strength;
}

/**
 * 便捷函数：密码是否满足所有规则
 */
export function isPasswordValid(password: string): boolean {
  return validatePassword(password).isValid;
}

/**
 * 创建 Element Plus FormItemRule 验证器
 * 用于替换各组件中硬编码的密码验证规则
 */
export function createPasswordFormRules(
  t: (key: string) => string
): FormItemRule[] {
  return [
    {
      required: true,
      message: t("login.rules.password.message1"),
      trigger: "blur",
    },
    {
      validator: (_rule, value: string, callback) => {
        if (!value) {
          callback();
          return;
        }
        const result = validatePassword(value);
        const failedRules = result.rules.filter((r) => !r.passed);
        if (failedRules.length > 0) {
          callback(new Error(failedRules.map((r) => t(r.message)).join("；")));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ];
}
