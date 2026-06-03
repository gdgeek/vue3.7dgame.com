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

export interface PasswordValidationOptions {
  accountIdentifiers?: Array<string | null | undefined>;
}

/** 密码策略常量 */
export const PASSWORD_POLICY = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 64,
  MIN_CHARACTER_CATEGORIES: 3,
  ACCOUNT_IDENTIFIER_MIN_LENGTH: 3,
  UPPERCASE_REGEX: /[A-Z]/,
  LOWERCASE_REGEX: /[a-z]/,
  DIGIT_REGEX: /\d/,
  SPECIAL_CHAR_REGEX: /[\W_]/,
  WEAK_PASSWORDS: [
    "password123!",
    "password123",
    "admin123456!",
    "qwerty123456!",
    "qwerty123!",
    "abc123456789!",
    "welcome12345!",
    "changeme1234!",
    "letmein12345!",
    "master123456!",
    "dragon123456!",
    "monkey123456!",
    "shadow123456!",
    "sunshine12345",
    "princess1234!",
    "football1234!",
    "charlie12345!",
    "password1234!",
    "passw0rd1234!",
    "iloveyou1234!",
    "trustno12345!",
    "123456789aa!",
    "abcdef123456!",
    "qwerty!@#$12",
    "admin!@#$1234",
    "p@ssw0rd1234",
    "p@$$w0rd1234",
    "test12345678!",
    "hello1234567!",
  ],
} as const;

/**
 * 验证密码是否满足所有规则
 * 纯函数，无副作用
 */
export function validatePassword(
  password: string,
  options: PasswordValidationOptions = {}
): PasswordValidationResult {
  const categoryCount = getCharacterCategoryCount(password);
  const accountIdentifiers = normalizeAccountIdentifiers(
    options.accountIdentifiers ?? []
  );
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
      key: "characterVariety",
      passed: categoryCount >= PASSWORD_POLICY.MIN_CHARACTER_CATEGORIES,
      message: "passwordPolicy.characterVariety",
    },
    {
      key: "weakPassword",
      passed: !isWeakPassword(password),
      message: "passwordPolicy.weakPassword",
    },
  ];

  if (accountIdentifiers.length > 0) {
    rules.push({
      key: "accountInfo",
      passed: !containsAccountIdentifier(password, accountIdentifiers),
      message: "passwordPolicy.accountInfo",
    });
  }

  return {
    rules,
    isValid: rules.every((r) => r.passed),
    strength: getStrength(password, categoryCount, rules),
  };
}

/**
 * 计算密码包含的字符类别数量
 */
export function getCharacterCategoryCount(password: string): number {
  return [
    PASSWORD_POLICY.UPPERCASE_REGEX,
    PASSWORD_POLICY.LOWERCASE_REGEX,
    PASSWORD_POLICY.DIGIT_REGEX,
    PASSWORD_POLICY.SPECIAL_CHAR_REGEX,
  ].filter((regex) => regex.test(password)).length;
}

function isWeakPassword(password: string): boolean {
  return (PASSWORD_POLICY.WEAK_PASSWORDS as readonly string[]).includes(
    password.toLowerCase()
  );
}

function normalizeAccountIdentifiers(
  identifiers: Array<string | null | undefined>
): string[] {
  const normalized = new Set<string>();

  identifiers.forEach((identifier) => {
    const value = identifier?.trim().toLowerCase();
    if (!value) return;

    if (value.length >= PASSWORD_POLICY.ACCOUNT_IDENTIFIER_MIN_LENGTH) {
      normalized.add(value);
    }

    const emailPrefix = value.split("@")[0];
    if (
      emailPrefix &&
      emailPrefix.length >= PASSWORD_POLICY.ACCOUNT_IDENTIFIER_MIN_LENGTH
    ) {
      normalized.add(emailPrefix);
    }
  });

  return [...normalized];
}

function containsAccountIdentifier(
  password: string,
  accountIdentifiers: string[]
): boolean {
  const lowerPassword = password.toLowerCase();
  return accountIdentifiers.some((identifier) =>
    lowerPassword.includes(identifier)
  );
}

/**
 * 根据长度、类别和硬规则计算强度等级
 */
function getStrength(
  password: string,
  categoryCount: number,
  rules: PasswordRuleResult[]
): PasswordStrength {
  if (!password || rules.some((rule) => !rule.passed)) return "weak";
  if (password.length >= 12 && categoryCount === 4) return "strong";
  return "medium";
}

/**
 * 计算密码强度
 * - weak: 未达到硬性规则
 * - medium: 达到硬性规则
 * - strong: 达到硬性规则，且长度至少 12 位并包含 4 类字符
 */
export function getPasswordStrength(
  password: string,
  options: PasswordValidationOptions = {}
): PasswordStrength {
  return validatePassword(password, options).strength;
}

/**
 * 便捷函数：密码是否满足所有规则
 */
export function isPasswordValid(
  password: string,
  options: PasswordValidationOptions = {}
): boolean {
  return validatePassword(password, options).isValid;
}

/**
 * 创建 Element Plus FormItemRule 验证器
 * 用于替换各组件中硬编码的密码验证规则
 */
export function createPasswordFormRules(
  t: (key: string) => string,
  optionsOrFactory:
    | PasswordValidationOptions
    | (() => PasswordValidationOptions) = {}
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
        const options =
          typeof optionsOrFactory === "function"
            ? optionsOrFactory()
            : optionsOrFactory;
        const result = validatePassword(value, options);
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
