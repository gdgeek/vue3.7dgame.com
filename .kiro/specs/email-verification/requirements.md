# 需求文档

## 介绍

本文档定义了邮箱验证功能的需求。该功能允许用户在设置页面验证他们的邮箱地址，通过发送和验证6位数字验证码来确认邮箱所有权。

## 术语表

- **System**: 邮箱验证系统，包括前端UI组件和API接口
- **User**: 使用系统的已登录用户
- **Verification_Code**: 6位数字验证码，用于验证邮箱所有权
- **Email_Address**: 用户需要验证的邮箱地址
- **Rate_Limit**: 速率限制机制，防止恶意频繁请求
- **Account_Lock**: 账户锁定机制，防止暴力破解验证码
- **Settings_Page**: 用户设置页面 (http://localhost:3001/settings/edit)

## 需求

### 需求 1: 发送邮箱验证码

**用户故事:** 作为用户，我想要请求发送验证码到我的邮箱，以便我可以验证邮箱所有权。

#### 验收标准

1. WHEN 用户提供有效的邮箱地址并请求发送验证码 THEN THE System SHALL 生成6位数字验证码并发送到该邮箱
2. WHEN 验证码生成成功 THEN THE System SHALL 设置验证码有效期为15分钟
3. WHEN 同一邮箱在60秒内再次请求发送验证码 THEN THE System SHALL 拒绝请求并返回速率限制错误
4. WHEN 用户提供的邮箱地址格式无效 THEN THE System SHALL 返回验证错误
5. WHEN 验证码发送成功 THEN THE System SHALL 返回成功响应消息

### 需求 2: 验证邮箱验证码

**用户故事:** 作为用户，我想要输入收到的验证码，以便完成邮箱验证。

#### 验收标准

1. WHEN 用户提供正确的邮箱地址和有效的验证码 THEN THE System SHALL 验证成功并返回成功消息
2. WHEN 用户提供的验证码不正确 THEN THE System SHALL 返回验证失败错误
3. WHEN 用户提供的验证码已过期（超过15分钟）THEN THE System SHALL 返回验证码过期错误
4. WHEN 用户验证失败次数达到5次 THEN THE System SHALL 锁定账户15分钟
5. WHEN 账户被锁定期间用户尝试验证 THEN THE System SHALL 返回账户锁定错误
6. WHEN 验证码格式不正确（非6位数字）THEN THE System SHALL 返回格式验证错误
7. WHEN 验证成功后 THEN THE System SHALL 使验证码立即失效

### 需求 3: API接口实现

**用户故事:** 作为前端开发者，我需要调用API接口来实现邮箱验证功能，以便与后端服务交互。

#### 验收标准

1. THE System SHALL 提供POST接口 `/v1/email/send-verification` 用于发送验证码
2. THE System SHALL 提供POST接口 `/v1/email/verify` 用于验证验证码
3. WHEN API请求成功 THEN THE System SHALL 返回包含success字段为true的JSON响应
4. WHEN API请求失败 THEN THE System SHALL 返回包含success字段为false和error对象的JSON响应
5. THE System SHALL 在error对象中包含code、message和可选的details字段
6. WHEN 发生速率限制错误 THEN THE System SHALL 在响应中包含retry_after字段指示重试等待时间

### 需求 4: 前端UI组件

**用户故事:** 作为用户，我想要在设置页面看到邮箱验证界面，以便我可以方便地验证我的邮箱。

#### 验收标准

1. THE System SHALL 在设置页面 (src/views/settings/edit.vue) 中显示邮箱验证组件
2. THE System SHALL 提供邮箱地址输入框
3. THE System SHALL 提供验证码输入框（限制6位数字）
4. THE System SHALL 提供"发送验证码"按钮
5. THE System SHALL 提供"验证邮箱"按钮
6. WHEN 验证码发送后 THEN THE System SHALL 在"发送验证码"按钮上显示倒计时（60秒）
7. WHEN 倒计时进行中 THEN THE System SHALL 禁用"发送验证码"按钮
8. WHEN 账户被锁定 THEN THE System SHALL 显示锁定提示信息和剩余锁定时间
9. WHEN 发生错误 THEN THE System SHALL 使用Element Plus的ElMessage组件显示错误消息
10. WHEN 操作成功 THEN THE System SHALL 使用Element Plus的ElMessage组件显示成功消息

### 需求 5: 国际化支持

**用户故事:** 作为用户，我想要看到我所选语言的界面文本，以便我可以理解和使用邮箱验证功能。

#### 验收标准

1. THE System SHALL 支持中文和英文界面文本
2. THE System SHALL 使用项目的i18n系统管理所有界面文本
3. THE System SHALL 为所有用户可见的文本提供翻译键
4. THE System SHALL 在语言切换时自动更新界面文本

### 需求 6: 错误处理和用户反馈

**用户故事:** 作为用户，我想要在操作失败时看到清晰的错误提示，以便我知道如何解决问题。

#### 验收标准

1. WHEN 网络请求失败 THEN THE System SHALL 显示网络错误提示
2. WHEN 服务器返回错误 THEN THE System SHALL 显示服务器错误消息
3. WHEN 参数验证失败 THEN THE System SHALL 显示具体的验证错误信息
4. WHEN 速率限制触发 THEN THE System SHALL 显示等待时间提示
5. WHEN 账户被锁定 THEN THE System SHALL 显示锁定时间和原因
6. THE System SHALL 在错误消息显示后自动清除（3-5秒）

### 需求 7: 安全性和数据验证

**用户故事:** 作为系统管理员，我需要确保邮箱验证功能的安全性，以防止滥用和攻击。

#### 验收标准

1. THE System SHALL 在前端验证邮箱地址格式
2. THE System SHALL 在前端验证验证码格式（6位数字）
3. THE System SHALL 限制验证码输入框只接受数字字符
4. THE System SHALL 在发送请求前验证所有必填字段
5. WHEN 用户输入包含特殊字符 THEN THE System SHALL 正确处理和转义
