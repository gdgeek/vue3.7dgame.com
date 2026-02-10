# 密码策略前端适配 - 设计文档

## 概述

本设计将新密码策略的验证逻辑抽取为共享工具模块，创建密码强度指示器组件，并更新注册、密码重置页面及国际化文案。

## 架构

```
src/utils/password-validator.ts          ← 核心验证逻辑（纯函数）
src/components/PasswordStrength/index.vue ← 密码强度 UI 组件
src/views/site/register/index.vue        ← 注册页（集成）
src/components/Account/RegisterForm.vue  ← 注册弹窗（集成）
src/views/settings/account.vue           ← 密码重置（集成）
src/lang/*/                              ← 国际化文案更新
test/unit/utils/password-validator.spec.ts ← 属性测试
```

## 1. 密码验证工具模块

### 文件: `src/utils/password-validator.ts`

```typescript
/** 单条规则的验证结果 */
export interface PasswordRuleResult {
  key: string;        // 规则标识: 'minLength' | 'maxLength' | 'uppercase' | 'lowercase' | 'digit' | 'specialChar'
  passed: boolean;
  message: string;    // i18n key
}

/** 完整验证结果 */
export interface PasswordValidationResult {
  rules: PasswordRuleResult[];
  isValid: boolean;           // 所有规则都通过
  strength: PasswordStrength;
}

export type PasswordStrength = 'weak' | 'medium' | 'strong';

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
export function validatePassword(password: string): PasswordValidationResult;

/**
 * 计算密码强度
 * - weak: 通过 0-3 条规则
 * - medium: 通过 4-5 条规则
 * - strong: 通过全部 6 条规则
 */
export function getPasswordStrength(password: string): PasswordStrength;

/**
 * 便捷函数：密码是否满足所有规则
 */
export function isPasswordValid(password: string): boolean;

/**
 * 创建 Element Plus FormItemRule 验证器
 * 用于替换各组件中硬编码的密码验证规则
 */
export function createPasswordFormRules(t: (key: string) => string): FormItemRule[];
```

### 设计决策

- 纯函数设计，方便单元测试和属性测试
- 密码策略常量集中管理，未来修改只需改一处
- `createPasswordFormRules` 桥接验证逻辑和 Element Plus 表单系统
- 强度计算基于通过的规则数量，简单直观

## 2. 密码强度指示器组件

### 文件: `src/components/PasswordStrength/index.vue`

```
Props:
  - password: string (required)

Computed:
  - validationResult: PasswordValidationResult (from validatePassword)

Template:
  - 规则列表：每条规则显示 ✓/✗ 图标 + 描述文字
  - 强度条：根据 strength 显示不同颜色
    - weak: 红色
    - medium: 橙色
    - strong: 绿色
  - 强度文字：弱/中/强
```

组件使用 `<script setup>` + Composition API，通过 `useSettingsStore` 检测暗色主题。

## 3. 注册页面集成

### 改动点

两个注册表单（`register/index.vue` 和 `RegisterForm.vue`）做相同改动：

1. 导入 `createPasswordFormRules` 替换硬编码的 password rules
2. 在密码 `<el-form-item>` 下方添加 `<PasswordStrength :password="registerForm.password" />`
3. 在 `catch` 块中处理后端返回的密码错误数组

### 后端错误处理

```typescript
catch (error: unknown) {
  const axiosError = error as { response?: { data?: { password?: string[]; message?: string } } };
  const passwordErrors = axiosError?.response?.data?.password;
  if (Array.isArray(passwordErrors)) {
    passwordErrors.forEach((msg: string) => ElMessage.error(msg));
  } else {
    ElMessage.error(axiosError?.response?.data?.message || t("login.error"));
  }
}
```

## 4. 密码重置页面集成

### 改动点: `src/views/settings/account.vue`

1. 新密码字段的 rules 使用 `createPasswordFormRules`
2. 新密码输入框下方添加 `<PasswordStrength>`
3. 旧密码验证规则保持 `min: 6` 不变

## 5. 国际化

### 新增 i18n keys

```
passwordPolicy.minLength: "至少 12 个字符"
passwordPolicy.maxLength: "不超过 128 个字符"
passwordPolicy.uppercase: "包含大写字母 (A-Z)"
passwordPolicy.lowercase: "包含小写字母 (a-z)"
passwordPolicy.digit: "包含数字 (0-9)"
passwordPolicy.specialChar: "包含特殊字符 (!@#$%^&* 等)"
passwordPolicy.strength.weak: "弱"
passwordPolicy.strength.medium: "中"
passwordPolicy.strength.strong: "强"
passwordPolicy.description: "密码要求：至少 12 个字符，包含大写字母、小写字母、数字和特殊字符"
```

### 更新现有 keys

- `login.rules.password.message2`: "6~20 字符" → "12~128 字符"
- `login.rules.password.message3`: 添加特殊字符要求描述
- `homepage.account.rules2.new.message2`: "6 字符" → "12 字符"

## 正确性属性（Property-Based Testing）

使用 vitest + fast-check 进行属性测试。

测试文件: `test/unit/utils/password-validator.spec.ts`

### P1: 长度规则正确性
**Validates: Requirements 1.3, 3.4, 3.5**

对于任意生成的字符串 `s`：
- `s.length < 12` → minLength 规则 `passed === false`
- `12 <= s.length <= 128` → minLength 规则 `passed === true`
- `s.length > 128` → maxLength 规则 `passed === false`

### P2: 字符类别规则正确性
**Validates: Requirements 1.3, 3.6**

对于任意生成的字符串 `s`：
- uppercase 规则 `passed === /[A-Z]/.test(s)`
- lowercase 规则 `passed === /[a-z]/.test(s)`
- digit 规则 `passed === /\d/.test(s)`
- specialChar 规则 `passed` 与特殊字符正则匹配一致

### P3: isValid 与规则一致性
**Validates: Requirements 1.4**

对于任意生成的字符串 `s`：
- `isValid(s) === validatePassword(s).rules.every(r => r.passed)`

### P4: 强度等级单调性
**Validates: Requirements 1.5**

对于任意生成的字符串 `s`：
- 设 `passCount = validatePassword(s).rules.filter(r => r.passed).length`
- `passCount <= 3` → strength === 'weak'
- `passCount === 4 || passCount === 5` → strength === 'medium'
- `passCount === 6` → strength === 'strong'

### P5: 验证结果结构完整性
**Validates: Requirements 1.2**

对于任意生成的字符串 `s`：
- `validatePassword(s).rules.length === 6`
- 每条规则都有 `key`, `passed` (boolean), `message` (non-empty string)
- `rules` 包含所有 6 个 key: minLength, maxLength, uppercase, lowercase, digit, specialChar

## 测试框架

- 单元测试 & 属性测试: vitest + fast-check
- 测试文件位置: `test/unit/utils/password-validator.spec.ts`
