# 密码功能 API 文档（前端对接版）

更新时间：2026-02-25

## 1. 基础信息

- Base URL：`http://localhost:8081`
- 响应格式：JSON
- 认证：
  - 登录态修改密码接口需要 `Authorization: Bearer <access_token>`
  - 找回密码接口不需要登录态

---

## 2. 功能与前置条件

### 2.1 修改密码（登录态）

- 接口：`POST /v1/password/change`
- 前置条件：当前账号邮箱必须已验证（`email_verified_at` 不为空）

### 2.2 找回密码（未登录，验证码模式）

- 接口链路：
  1. `POST /v1/password/request-reset`（发送验证码）
  2. `POST /v1/password/verify-code`（可选，前端先校验验证码）
  3. `POST /v1/password/reset`（提交 `email + code + password` 直接重置）
- 前置条件：目标邮箱必须是已绑定且已验证邮箱

建议前端先通过 `GET /v1/email/status` 判断邮箱状态，再展示对应入口。

---

## 3. 接口明细

## 3.1 登录态修改密码

**POST** `/v1/password/change`

### Header
```http
Authorization: Bearer <token>
Content-Type: application/json
```

### 请求体
```json
{
  "old_password": "OldPassword123!",
  "new_password": "NewPassword123!",
  "confirm_password": "NewPassword123!"
}
```

### 成功响应
```json
{
  "success": true,
  "message": "密码修改成功，请重新登录"
}
```

### 失败响应（示例）
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "邮箱未验证，请先完成邮箱验证后再修改密码"
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "旧密码不正确"
  }
}
```

说明：
- 修改成功后服务端会使该用户已有会话失效（需重新登录）。

---

## 3.2 请求找回密码（发送验证码）

**POST** `/v1/password/request-reset`

### Header
```http
Content-Type: application/json
```

### 请求体
```json
{
  "email": "user@example.com"
}
```

### 成功响应
```json
{
  "success": true,
  "message": "找回密码验证码已发送到您的邮箱"
}
```

### 失败响应（示例）
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "email": ["该邮箱未注册"]
    }
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_NOT_VERIFIED",
    "message": "邮箱未验证，无法重置密码"
  }
}
```

---

## 3.3 校验找回验证码（可选）

**POST** `/v1/password/verify-code`

### Header
```http
Content-Type: application/json
```

### 请求体
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

### 成功响应
```json
{
  "success": true,
  "valid": true,
  "message": "验证码有效"
}
```

### 失败响应（示例）
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败"
  }
}
```

---

## 3.4 提交新密码（找回密码最终步骤）

**POST** `/v1/password/reset`

### Header
```http
Content-Type: application/json
```

### 请求体
```json
{
  "email": "user@example.com",
  "code": "123456",
  "password": "NewPassword123!"
}
```

### 成功响应
```json
{
  "success": true,
  "message": "密码重置成功，请使用新密码登录"
}
```

### 失败响应（示例）
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CODE",
    "message": "验证码不存在或已过期"
  }
}
```

---

## 4. 前端推荐流程

### 4.1 修改密码（登录后）

1. 调 `GET /v1/email/status` 判断 `email_verified`。
2. 若 `email_verified = false`：提示先完成邮箱验证，不展示改密表单。
3. 若 `email_verified = true`：展示改密表单并调用 `POST /v1/password/change`。
4. 成功后清理本地登录态并跳转登录页。

### 4.2 找回密码（未登录）

1. 用户输入邮箱，调用 `POST /v1/password/request-reset`。
2. 用户输入邮箱收到的验证码，可先调 `POST /v1/password/verify-code`（可选）。
3. 提交 `email + code + password` 到 `POST /v1/password/reset`。
4. 成功后跳转登录页。

---

## 5. 错误码处理建议

- `VALIDATION_ERROR`：字段级提示
- `EMAIL_NOT_VERIFIED`：提示用户先去完成邮箱验证
- `INVALID_REQUEST`：流程前置条件不满足（如旧密码错误、邮箱未验证）
- `INVALID_CODE`：验证码错误/过期，引导重新获取验证码
- `RATE_LIMIT_EXCEEDED`：显示 `retry_after` 倒计时
- `UNAUTHORIZED`：跳登录
- `INTERNAL_ERROR`：统一“稍后重试”提示
