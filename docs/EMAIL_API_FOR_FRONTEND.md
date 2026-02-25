# 邮箱功能 API 文档（前端对接版）

## 1. 基础信息

- Base URL（示例）: `http://localhost:8081`
- 当前环境实测: `http://localhost:81`（以 `docker ps` 端口映射为准）
- 认证方式: `Authorization: Bearer <access_token>`
- 响应格式: JSON
- 除 `GET /v1/email/test` 外，其余接口都需要登录态

---

## 2. 接口总览

| 功能 | 方法 | 路径 |
|---|---|---|
| 查询邮箱状态 | GET | `/v1/email/status` |
| 发送邮箱验证码（绑定/改绑新邮箱） | POST | `/v1/email/send-verification` |
| 校验验证码并绑定/改绑邮箱 | POST | `/v1/email/verify` |
| 发送旧邮箱二次确认验证码 | POST | `/v1/email/send-change-confirmation` |
| 校验旧邮箱验证码并获取改绑令牌 | POST | `/v1/email/verify-change-confirmation` |
| 解绑邮箱 | POST | `/v1/email/unbind` |
| 查询验证码发送冷却时间 | GET | `/v1/email/cooldown` |
| 测试邮件服务（开发用） | GET | `/v1/email/test` |

---

## 3. 详细接口

## 3.1 查询当前邮箱状态

**GET** `/v1/email/status`

### Header
```http
Authorization: Bearer <token>
```

### 成功响应示例
```json
{
  "success": true,
  "data": {
    "user_id": 123,
    "username": "demo",
    "email": "demo@example.com",
    "email_verified": true,
    "email_verified_at": 1739860000,
    "email_verified_at_formatted": "2025-02-18 10:13:20"
  }
}
```

---

## 3.2 发送邮箱验证码（绑定/改绑新邮箱）

**POST** `/v1/email/send-verification`

### Header
```http
Authorization: Bearer <token>
Content-Type: application/json
```

### 请求体
```json
{
  "email": "new@example.com"
}
```

### 成功响应示例
```json
{
  "success": true,
  "message": "验证码已发送到您的邮箱"
}
```

### 常见错误
- `400 VALIDATION_ERROR` 参数错误/邮箱格式错误
- `429 RATE_LIMIT_EXCEEDED` 发送过于频繁（含 `retry_after`）

---

## 3.3 校验验证码并绑定/改绑邮箱

**POST** `/v1/email/verify`

### Header
```http
Authorization: Bearer <token>
Content-Type: application/json
```

### 请求体（首次绑定）
```json
{
  "email": "new@example.com",
  "code": "123456"
}
```

### 请求体（改绑，必须携带 change_token）
```json
{
  "email": "new@example.com",
  "code": "123456",
  "change_token": "xxxxx"
}
```

### 成功响应示例
```json
{
  "success": true,
  "message": "邮箱验证并绑定成功",
  "data": {
    "user": {
      "id": 123,
      "username": "demo",
      "email": "new@example.com",
      "email_verified_at": 1739860000
    }
  }
}
```

### 常见错误
- `400 INVALID_CODE` 验证码错误或过期
- `400 INVALID_REQUEST` 改绑时缺少/无效 `change_token`
- `429 ACCOUNT_LOCKED` 连续输错被锁定（含 `retry_after`）

---

## 3.4 发送旧邮箱二次确认验证码（改绑/解绑前）

**POST** `/v1/email/send-change-confirmation`

### Header
```http
Authorization: Bearer <token>
```

### 请求体
无

### 成功响应示例
```json
{
  "success": true,
  "message": "二次确认验证码已发送到当前绑定邮箱"
}
```

---

## 3.5 校验旧邮箱验证码并获取改绑令牌

**POST** `/v1/email/verify-change-confirmation`

### Header
```http
Authorization: Bearer <token>
Content-Type: application/json
```

### 请求体
```json
{
  "code": "123456"
}
```

### 成功响应示例
```json
{
  "success": true,
  "message": "旧邮箱验证成功，请在 10 分钟内完成新邮箱绑定",
  "data": {
    "change_token": "xxxxx",
    "expires_in": 600
  }
}
```

---

## 3.6 解绑邮箱

**POST** `/v1/email/unbind`

### Header
```http
Authorization: Bearer <token>
Content-Type: application/json
```

### 请求体
```json
{
  "code": "123456"
}
```

### 成功响应示例
```json
{
  "success": true,
  "message": "邮箱解绑成功",
  "data": {
    "user": {
      "id": 123,
      "email": null,
      "email_verified_at": null
    }
  }
}
```

---

## 3.7 查询验证码发送冷却时间

**GET** `/v1/email/cooldown?email=new@example.com`

### Header
```http
Authorization: Bearer <token>
```

### 说明
- `email` 可选
- 不传时，后端优先使用当前登录用户已绑定邮箱

### 成功响应示例
```json
{
  "success": true,
  "data": {
    "email": "new@example.com",
    "can_send": false,
    "retry_after": 23,
    "limit_seconds": 60
  }
}
```

---

## 3.8 测试邮件服务（开发用）

**GET** `/v1/email/test`

### Header
无（可不带 token）

### 成功响应示例
```json
{
  "success": true,
  "message": "测试邮件发送成功",
  "data": {
    "from": "xxx@example.com",
    "to": "nethz@163.com",
    "time": "2026-02-25 12:00:00"
  }
}
```

---

## 4. 前端推荐流程

1. 页面初始化：`GET /v1/email/status`
2. 首次绑定：
   - `POST /v1/email/send-verification`
   - `POST /v1/email/verify`
3. 改绑邮箱：
   - `POST /v1/email/send-change-confirmation`
   - `POST /v1/email/verify-change-confirmation`（拿 `change_token`）
   - `POST /v1/email/send-verification`（新邮箱）
   - `POST /v1/email/verify`（携带 `change_token`）
4. 解绑邮箱：
   - `POST /v1/email/send-change-confirmation`
   - `POST /v1/email/unbind`
5. 倒计时显示：`GET /v1/email/cooldown`

---

## 5. 错误码建议处理

- `VALIDATION_ERROR`: 表单提示
- `RATE_LIMIT_EXCEEDED`: 显示倒计时 `retry_after`
- `ACCOUNT_LOCKED`: 提示账号锁定剩余时间
- `INVALID_CODE`: 验证码错误/过期
- `INVALID_REQUEST` / `INVALID_STATE`: 流程状态不合法（比如未先二次确认）
- `UNAUTHORIZED`: 跳登录
- `INTERNAL_ERROR`: 通用错误提示，允许重试

---

## 6. 相关文档

- 密码接口文档（验证码找回 + 登录态改密）：`docs/PASSWORD_API_FOR_FRONTEND.md`
