# 设计文档

## 概述

邮箱验证功能为用户提供了一种安全的方式来验证其邮箱地址的所有权。该功能集成在用户设置页面中，通过发送6位数字验证码到用户邮箱，然后验证用户输入的验证码来完成验证流程。

本设计采用前后端分离架构，前端使用Vue 3 + TypeScript + Element Plus构建UI组件，后端通过RESTful API提供验证码发送和验证服务。

## 架构

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户设置页面                              │
│                  (src/views/settings/edit.vue)               │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │          邮箱验证UI组件                               │    │
│  │  ┌──────────────┐  ┌──────────────┐                │    │
│  │  │ 邮箱输入框    │  │ 验证码输入框  │                │    │
│  │  └──────────────┘  └──────────────┘                │    │
│  │  ┌──────────────┐  ┌──────────────┐                │    │
│  │  │ 发送验证码按钮│  │ 验证邮箱按钮  │                │    │
│  │  └──────────────┘  └──────────────┘                │    │
│  │  ┌──────────────────────────────────┐              │    │
│  │  │  错误/成功消息显示 (ElMessage)    │              │    │
│  │  └──────────────────────────────────┘              │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                    │
│                          ▼                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │          Composable函数层                             │    │
│  │      (useEmailVerification)                          │    │
│  │  - 状态管理 (loading, error, countdown)              │    │
│  │  - 业务逻辑 (sendCode, verifyCode)                   │    │
│  │  - 倒计时管理                                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                    │
│                          ▼                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              API服务层                                │    │
│  │         (src/api/v1/email.ts)                        │    │
│  │  - sendVerificationCode()                            │    │
│  │  - verifyEmailCode()                                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                    │
└──────────────────────────┼────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   Axios请求拦截器       │
              │  (src/utils/request.ts) │
              │  - 添加认证token        │
              │  - 错误处理             │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │      后端API服务        │
              │  /v1/email/*           │
              └────────────────────────┘
```

### 技术栈

- **前端框架**: Vue 3 (Composition API)
- **类型系统**: TypeScript
- **UI组件库**: Element Plus
- **HTTP客户端**: Axios
- **国际化**: Vue I18n
- **状态管理**: Composable函数 (Vue 3 Composition API)

## 组件和接口

### 1. API服务层 (src/api/v1/email.ts)

#### 类型定义

```typescript
// API响应基础类型
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: ApiError;
}

// API错误类型
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  retry_after?: number;
}

// 发送验证码请求参数
interface SendVerificationRequest {
  email: string;
}

// 验证验证码请求参数
interface VerifyEmailRequest {
  email: string;
  code: string;
}
```

#### API函数

```typescript
/**
 * 发送邮箱验证码
 * @param email - 邮箱地址
 * @returns Promise<ApiResponse>
 */
export const sendVerificationCode = (email: string): Promise<ApiResponse>

/**
 * 验证邮箱验证码
 * @param email - 邮箱地址
 * @param code - 6位数字验证码
 * @returns Promise<ApiResponse>
 */
export const verifyEmailCode = (email: string, code: string): Promise<ApiResponse>
```

### 2. Composable函数 (useEmailVerification)

该Composable函数封装了邮箱验证的所有业务逻辑和状态管理。

#### 状态定义

```typescript
interface EmailVerificationState {
  // 加载状态
  loading: Ref<boolean>;

  // 错误消息
  error: Ref<string | null>;

  // 发送验证码倒计时（秒）
  countdown: Ref<number>;

  // 账户是否被锁定
  isLocked: Ref<boolean>;

  // 锁定剩余时间（秒）
  lockTime: Ref<number>;

  // 是否可以发送验证码
  canSendCode: ComputedRef<boolean>;

  // 是否可以验证
  canVerify: ComputedRef<boolean>;
}
```

#### 方法定义

```typescript
interface EmailVerificationMethods {
  /**
   * 发送验证码
   * @param email - 邮箱地址
   * @returns Promise<boolean> - 是否成功
   */
  sendCode: (email: string) => Promise<boolean>;

  /**
   * 验证验证码
   * @param email - 邮箱地址
   * @param code - 验证码
   * @returns Promise<boolean> - 是否成功
   */
  verifyCode: (email: string, code: string) => Promise<boolean>;

  /**
   * 清理定时器资源
   */
  cleanup: () => void;
}
```

#### 内部逻辑

**倒计时管理**:
- 使用`setInterval`实现倒计时
- 倒计时结束时自动清理定时器
- 组件卸载时清理所有定时器

**错误处理**:
- 捕获API错误并提取错误消息
- 处理速率限制错误，启动倒计时
- 处理账户锁定错误，启动锁定倒计时

**状态计算**:
- `canSendCode`: 当不在加载中且倒计时为0时可发送
- `canVerify`: 当不在加载中且账户未锁定时可验证

### 3. UI组件集成

邮箱验证UI将直接集成到现有的设置页面 (`src/views/settings/edit.vue`) 中。

#### 组件结构

```vue
<template>
  <!-- 邮箱验证部分 -->
  <el-divider></el-divider>

  <div class="box-title box-margin-bottom">
    <h3 class="font-color">{{ $t("homepage.edit.emailVerification") }}</h3>
    <small>{{ $t("homepage.edit.emailVerificationStatement") }}</small>
  </div>

  <el-row :gutter="24">
    <el-col :xs="23" :sm="16" :md="14" :lg="12" :xl="10" class="section-margin-left">
      <el-form ref="emailFormRef" :model="emailForm" :rules="emailRules" label-width="auto">
        <!-- 邮箱输入 -->
        <el-form-item :label="$t('homepage.edit.email')" prop="email">
          <el-input
            v-model="emailForm.email"
            type="email"
            :placeholder="$t('homepage.edit.emailPlaceholder')"
            :disabled="loading"
          />
        </el-form-item>

        <!-- 验证码输入 -->
        <el-form-item :label="$t('homepage.edit.verificationCode')" prop="code">
          <div style="display: flex; gap: 10px;">
            <el-input
              v-model="emailForm.code"
              :placeholder="$t('homepage.edit.codePlaceholder')"
              maxlength="6"
              :disabled="loading || isLocked"
              @input="handleCodeInput"
            />
            <el-button
              type="primary"
              :disabled="!canSendCode || !emailForm.email"
              :loading="loading"
              @click="handleSendCode"
            >
              {{ sendCodeButtonText }}
            </el-button>
          </div>
        </el-form-item>

        <!-- 锁定提示 -->
        <el-alert
          v-if="isLocked"
          type="warning"
          :closable="false"
          show-icon
        >
          {{ $t('homepage.edit.accountLocked', { time: lockTime }) }}
        </el-alert>

        <!-- 验证按钮 -->
        <el-form-item>
          <el-button
            type="success"
            :disabled="!canVerify || !emailForm.email || !emailForm.code"
            :loading="loading"
            @click="handleVerify"
          >
            {{ $t('homepage.edit.verifyEmail') }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-col>
  </el-row>
</template>
```

#### 表单验证规则

```typescript
const emailRules = {
  email: [
    {
      required: true,
      message: t('homepage.edit.rules.email.required'),
      trigger: 'blur'
    },
    {
      type: 'email',
      message: t('homepage.edit.rules.email.invalid'),
      trigger: 'blur'
    }
  ],
  code: [
    {
      required: true,
      message: t('homepage.edit.rules.code.required'),
      trigger: 'blur'
    },
    {
      pattern: /^\d{6}$/,
      message: t('homepage.edit.rules.code.invalid'),
      trigger: 'blur'
    }
  ]
}
```

## 数据模型

### 前端数据模型

```typescript
// 邮箱验证表单数据
interface EmailVerificationForm {
  email: string;      // 邮箱地址
  code: string;       // 验证码
}

// 验证码状态
interface VerificationCodeState {
  countdown: number;      // 倒计时秒数
  canResend: boolean;     // 是否可以重新发送
}

// 账户锁定状态
interface AccountLockState {
  isLocked: boolean;      // 是否被锁定
  lockTime: number;       // 剩余锁定时间（秒）
  failedAttempts: number; // 失败尝试次数
}
```

### API请求/响应模型

```typescript
// 发送验证码请求
interface SendVerificationCodeRequest {
  email: string;
}

// 发送验证码成功响应
interface SendVerificationCodeResponse {
  success: true;
  message: string;  // "验证码已发送到您的邮箱"
}

// 验证邮箱请求
interface VerifyEmailRequest {
  email: string;
  code: string;
}

// 验证邮箱成功响应
interface VerifyEmailResponse {
  success: true;
  message: string;  // "邮箱验证成功"
}

// 错误响应
interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, string[]>;
    retry_after?: number;  // 速率限制或锁定时的重试等待时间
  };
}

// 错误代码枚举
type ErrorCode =
  | 'VALIDATION_ERROR'      // 参数验证失败
  | 'RATE_LIMIT_EXCEEDED'   // 速率限制
  | 'INVALID_CODE'          // 验证码错误
  | 'ACCOUNT_LOCKED'        // 账户锁定
  | 'INTERNAL_ERROR'        // 服务器错误
  | 'NETWORK_ERROR';        // 网络错误
```

## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1: 有效邮箱发送验证码成功

*对于任何*有效格式的邮箱地址，当调用发送验证码功能时，系统应该成功调用API并启动60秒倒计时。

**验证: 需求 1.1, 1.5**

### 属性 2: 速率限制机制

*对于任何*邮箱地址，在成功发送验证码后的60秒内，"发送验证码"按钮应该被禁用，且倒计时应该从60递减到0。

**验证: 需求 1.3, 4.6, 4.7**

### 属性 3: 无效邮箱格式拒绝

*对于任何*不符合邮箱格式规范的字符串（缺少@符号、缺少域名、包含非法字符等），表单验证应该拒绝该输入并显示验证错误消息。

**验证: 需求 1.4, 7.1**

### 属性 4: 验证码格式验证

*对于任何*不是6位纯数字的字符串，验证码输入验证应该拒绝该输入并显示格式错误消息。

**验证: 需求 2.6, 7.2**

### 属性 5: 验证码输入过滤

*对于任何*输入到验证码输入框的字符串，系统应该自动过滤掉所有非数字字符，只保留数字字符，且最多保留6位。

**验证: 需求 7.3**

### 属性 6: 正确验证码验证成功

*对于任何*有效的邮箱地址和正确的6位数字验证码组合，验证操作应该成功并显示成功消息。

**验证: 需求 2.1**

### 属性 7: 错误验证码验证失败

*对于任何*有效的邮箱地址和错误的6位数字验证码组合，验证操作应该失败并显示验证失败错误消息。

**验证: 需求 2.2**

### 属性 8: 账户锁定机制

*对于任何*邮箱地址，当验证失败次数达到5次时，系统应该设置isLocked状态为true，lockTime为900秒，并显示账户锁定提示。

**验证: 需求 2.4**

### 属性 9: 锁定状态下禁用验证

*对于任何*处于锁定状态（isLocked为true）的账户，验证按钮应该被禁用，且应该显示包含剩余锁定时间的提示信息。

**验证: 需求 2.5, 4.8**

### 属性 10: API响应结构正确性

*对于任何*API调用，成功响应应该包含success字段为true，失败响应应该包含success字段为false和包含code、message字段的error对象。

**验证: 需求 3.3, 3.4, 3.5**

### 属性 11: 错误消息显示

*对于任何*API错误响应或验证失败，系统应该使用ElMessage组件显示相应的错误消息。

**验证: 需求 4.9, 6.2, 6.3**

### 属性 12: 成功消息显示

*对于任何*成功的操作（发送验证码成功、验证成功），系统应该使用ElMessage组件显示成功消息。

**验证: 需求 4.10**

### 属性 13: 必填字段验证

*对于任何*表单提交操作，当必填字段（邮箱或验证码）为空时，提交应该被阻止，按钮应该被禁用。

**验证: 需求 7.4**

### 属性 14: 特殊字符处理

*对于任何*包含特殊字符的邮箱输入，系统应该正确处理而不会导致JavaScript错误或安全问题。

**验证: 需求 7.5**

### 属性 15: 翻译键完整性

*对于所有*在代码中使用的i18n翻译键，都应该在中文和英文语言文件中存在对应的翻译。

**验证: 需求 5.3**

## 错误处理

### 错误类型和处理策略

#### 1. 网络错误 (NETWORK_ERROR)

**场景**: 网络连接失败、请求超时

**处理**:
- 显示用户友好的错误消息："网络连接失败，请检查网络"
- 不启动倒计时或锁定
- 允许用户重试

**实现**:
```typescript
if (error.code === 'NETWORK_ERROR') {
  ElMessage.error(t('errors.networkError'));
  return;
}
```

#### 2. 验证错误 (VALIDATION_ERROR)

**场景**: 请求参数验证失败

**处理**:
- 显示具体的验证错误信息
- 从error.details中提取字段级错误
- 在对应的表单字段下显示错误

**实现**:
```typescript
if (error.code === 'VALIDATION_ERROR' && error.details) {
  Object.entries(error.details).forEach(([field, messages]) => {
    ElMessage.error(messages[0]);
  });
}
```

#### 3. 速率限制错误 (RATE_LIMIT_EXCEEDED)

**场景**: 60秒内重复发送验证码

**处理**:
- 显示速率限制消息
- 从error.retry_after获取等待时间
- 启动倒计时

**实现**:
```typescript
if (error.code === 'RATE_LIMIT_EXCEEDED') {
  const retryAfter = error.retry_after || 60;
  startCountdown(retryAfter);
  ElMessage.warning(t('errors.rateLimitExceeded', { seconds: retryAfter }));
}
```

#### 4. 验证码错误 (INVALID_CODE)

**场景**: 验证码不正确或已过期

**处理**:
- 显示验证码错误消息
- 清空验证码输入框
- 聚焦到验证码输入框
- 增加失败计数

**实现**:
```typescript
if (error.code === 'INVALID_CODE') {
  ElMessage.error(error.message);
  emailForm.value.code = '';
  // 聚焦到验证码输入框
}
```

#### 5. 账户锁定错误 (ACCOUNT_LOCKED)

**场景**: 验证失败5次

**处理**:
- 显示账户锁定消息
- 从error.retry_after获取锁定时间
- 启动锁定倒计时
- 禁用所有验证相关操作

**实现**:
```typescript
if (error.code === 'ACCOUNT_LOCKED') {
  const lockTime = error.retry_after || 900;
  startLockCountdown(lockTime);
  ElMessage.error(t('errors.accountLocked', { seconds: lockTime }));
}
```

#### 6. 服务器错误 (INTERNAL_ERROR)

**场景**: 服务器内部错误

**处理**:
- 显示通用错误消息
- 建议用户稍后重试
- 记录错误到控制台

**实现**:
```typescript
if (error.code === 'INTERNAL_ERROR') {
  console.error('Server error:', error);
  ElMessage.error(t('errors.serverError'));
}
```

### 错误恢复机制

#### 自动重试

对于网络错误，不自动重试，由用户手动重试。

#### 状态重置

- 验证成功后重置所有错误状态
- 锁定时间到期后自动解锁
- 倒计时结束后允许重新发送

#### 错误消息自动清除

使用Element Plus的ElMessage组件，错误消息会在3-5秒后自动消失。

## 测试策略

### 测试方法

本项目采用**双重测试方法**：

1. **单元测试**: 验证特定示例、边缘情况和错误条件
2. **属性测试**: 验证跨所有输入的通用属性

两者是互补的，都是全面覆盖所必需的：
- 单元测试捕获具体的错误
- 属性测试验证一般正确性

### 单元测试策略

单元测试应该专注于：
- **特定示例**: 演示正确行为的具体案例
- **集成点**: 组件之间的交互
- **边缘情况**: 边界条件和特殊情况
- **错误条件**: 各种错误场景

**避免编写过多的单元测试** - 属性测试已经处理了大量输入的覆盖。

#### 测试工具

- **测试框架**: Vitest
- **组件测试**: @vue/test-utils
- **Mock工具**: vi.mock (Vitest内置)

#### 单元测试示例

```typescript
// 测试API端点正确性
describe('Email API', () => {
  it('should call correct endpoint for sending verification code', async () => {
    const mockPost = vi.spyOn(axios, 'post');
    await sendVerificationCode('test@example.com');
    expect(mockPost).toHaveBeenCalledWith(
      '/v1/email/send-verification',
      { email: 'test@example.com' }
    );
  });
});

// 测试UI元素存在性
describe('Email Verification Component', () => {
  it('should render all required form elements', () => {
    const wrapper = mount(EmailVerificationComponent);
    expect(wrapper.find('input[type="email"]').exists()).toBe(true);
    expect(wrapper.find('input[maxlength="6"]').exists()).toBe(true);
    expect(wrapper.findAll('button').length).toBe(2);
  });
});

// 测试验证码过期场景
describe('Code Expiration', () => {
  it('should show expiration error after 15 minutes', async () => {
    // Mock时间
    vi.useFakeTimers();
    await sendCode('test@example.com');
    vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
    const result = await verifyCode('test@example.com', '123456');
    expect(result).toBe(false);
    expect(error.value).toContain('过期');
  });
});
```

### 属性测试策略

属性测试验证跨所有输入的通用属性。

#### 配置

- **测试库**: fast-check (JavaScript/TypeScript的属性测试库)
- **最小迭代次数**: 100次
- **标签格式**: `Feature: email-verification, Property {number}: {property_text}`

#### 属性测试示例

```typescript
import fc from 'fast-check';

// 属性 1: 有效邮箱发送验证码成功
describe('Property 1: Valid email sends code successfully', () => {
  it('should successfully send code for any valid email', async () => {
    // Feature: email-verification, Property 1: 有效邮箱发送验证码成功
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        async (email) => {
          const result = await sendCode(email);
          expect(result).toBe(true);
          expect(countdown.value).toBe(60);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// 属性 3: 无效邮箱格式拒绝
describe('Property 3: Invalid email format rejection', () => {
  it('should reject any invalid email format', async () => {
    // Feature: email-verification, Property 3: 无效邮箱格式拒绝
    const invalidEmailGen = fc.oneof(
      fc.string().filter(s => !s.includes('@')),
      fc.string().map(s => s + '@'),
      fc.string().map(s => '@' + s),
      fc.string().filter(s => s.includes(' '))
    );

    await fc.assert(
      fc.asyncProperty(
        invalidEmailGen,
        async (invalidEmail) => {
          const isValid = validateEmail(invalidEmail);
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// 属性 5: 验证码输入过滤
describe('Property 5: Code input filtering', () => {
  it('should filter non-digit characters from any input', () => {
    // Feature: email-verification, Property 5: 验证码输入过滤
    fc.assert(
      fc.property(
        fc.string(),
        (input) => {
          const filtered = handleCodeInput(input);
          expect(filtered).toMatch(/^\d{0,6}$/);
          expect(filtered.length).toBeLessThanOrEqual(6);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// 属性 14: 特殊字符处理
describe('Property 14: Special character handling', () => {
  it('should handle any special characters without errors', () => {
    // Feature: email-verification, Property 14: 特殊字符处理
    fc.assert(
      fc.property(
        fc.string(),
        (input) => {
          expect(() => {
            emailForm.value.email = input;
            validateEmail(input);
          }).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 集成测试

测试完整的用户流程：

```typescript
describe('Complete Email Verification Flow', () => {
  it('should complete full verification flow', async () => {
    // 1. 输入邮箱
    await wrapper.find('input[type="email"]').setValue('test@example.com');

    // 2. 发送验证码
    await wrapper.find('button').trigger('click');
    expect(countdown.value).toBe(60);

    // 3. 输入验证码
    await wrapper.find('input[maxlength="6"]').setValue('123456');

    // 4. 验证
    await wrapper.findAll('button')[1].trigger('click');
    expect(ElMessage.success).toHaveBeenCalled();
  });
});
```

### 测试覆盖率目标

- **代码覆盖率**: 至少80%
- **属性覆盖率**: 所有15个属性都应该有对应的属性测试
- **错误场景覆盖**: 所有6种错误类型都应该有测试

