# 插件认证授权 API 参考

主后端提供两个 REST API 端点，供插件验证用户身份和检查操作权限。

## 基础信息

- 基础路径：`/v1/plugin/`
- 主后端 API 地址：`http://localhost:8081`（开发环境）
- 认证方式：`Authorization: Bearer {jwt_token}`
- 响应格式：`application/json`

## 统一响应格式

```json
{
  "code": 0,        // 0=成功，非0=错误
  "message": "ok",  // 人类可读描述
  "data": {}        // 业务数据（错误时可省略）
}
```

## 错误码

| 错误码 | 含义 | HTTP 状态码 |
|--------|------|------------|
| 0 | 成功 | 200 |
| 1001 | 缺少有效的 Authorization 头 | 401 |
| 1002 | Token 已过期 | 401 |
| 1003 | Token 无效（签名错误/格式错误） | 401 |
| 1004 | 用户不存在 | 401 |
| 2001 | 缺少必要参数 | 400 |

---

## 1. 验证 Token 并获取用户信息

### `GET /v1/plugin/verify-token`

验证 JWT Token 有效性，返回用户基本信息和角色列表。

### 请求

```
GET /v1/plugin/verify-token
Authorization: Bearer {jwt_token}
```

### 成功响应 (200)

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 24,
    "username": "guanfei",
    "nickname": "babamama",
    "roles": ["admin", "user"]
  }
}
```

### 错误响应示例

缺少 Authorization 头 (401)：
```json
{ "code": 1001, "message": "缺少有效的 Authorization 头" }
```

Token 已过期 (401)：
```json
{ "code": 1002, "message": "Token 已过期" }
```

Token 无效 (401)：
```json
{ "code": 1003, "message": "Token 无效" }
```

用户不存在 (401)：
```json
{ "code": 1004, "message": "用户不存在" }
```

---

## 2. 检查插件操作权限

### `GET /v1/plugin/check-permission`

检查当前用户是否有权限在指定插件中执行指定操作。权限判定基于 `plugin_permission_config` 配置表。

### 请求

```
GET /v1/plugin/check-permission?plugin_name=school-management&action=manage-class
Authorization: Bearer {jwt_token}
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| plugin_name | string | 是 | 插件标识，如 `school-management` |
| action | string | 是 | 操作标识，如 `manage-class` |

### 成功响应 (200)

有权限：
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "allowed": true,
    "user_id": 24,
    "roles": ["admin", "user"]
  }
}
```

无权限：
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "allowed": false,
    "user_id": 24,
    "roles": ["user"]
  }
}
```

### 错误响应示例

缺少参数 (400)：
```json
{ "code": 2001, "message": "缺少必要参数: plugin_name, action" }
```

Token 相关错误同 verify-token 端点。

---

## 3. 批量获取允许的操作

### `GET /v1/plugin/allowed-actions`

一次性获取当前用户在指定插件下的所有允许操作列表。适用于前端初始化时批量查询权限，避免逐个 action 调用 check-permission。

### 请求

```
GET /v1/plugin/allowed-actions?plugin_name=user-management
Authorization: Bearer {jwt_token}
```

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| plugin_name | string | 是 | 插件标识，如 `user-management` |

### 成功响应 (200)

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "actions": ["list-users", "view-user", "create-user", "update-user", "delete-user"],
    "user_id": 24,
    "roles": ["admin", "user"]
  }
}
```

### 错误响应示例

缺少参数 (400)：
```json
{ "code": 2001, "message": "缺少必要参数: plugin_name" }
```

Token 相关错误同 verify-token 端点。

---

## 4. 发送邮件

### `POST /v1/plugin/send-email`

插件通过主后端发送邮件（如邮箱验证码）。验证码生成后存储在 Redis 中，有效期 15 分钟。

速率限制：同一邮箱 60 秒内最多 1 次，同一用户 60 秒内最多 1 次。

### 请求

```
POST /v1/plugin/send-email
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "email": "user@example.com",
  "type": "verification_code",
  "params": {
    "locale": "zh-CN"
  }
}
```

### 请求体参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 收件人邮箱 |
| type | string | 是 | 邮件类型，目前仅支持 `verification_code` |
| params | object | 否 | 模板参数，支持 `locale`（语言）和 `i18n`（自定义文案） |

### 成功响应 (200)

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "email": "user@example.com",
    "type": "verification_code"
  }
}
```

### 错误响应示例

缺少参数 (400)：
```json
{ "code": 3001, "message": "缺少必要参数: email, type" }
```

不支持的邮件类型 (400)：
```json
{ "code": 3002, "message": "不支持的邮件类型: xxx，仅支持: verification_code" }
```

邮箱格式无效 (400)：
```json
{ "code": 3003, "message": "邮箱格式无效" }
```

发送频率超限 (429)：
```json
{ "code": 3004, "message": "发送过于频繁，请 58 秒后再试", "data": { "retry_after": 58 } }
```

发送失败 (500)：
```json
{ "code": 3005, "message": "邮件发送失败，请稍后重试" }
```

Token 相关错误同 verify-token 端点。

---

## 权限判定逻辑

1. 解析 JWT Token 获取用户 → 获取用户的所有 RBAC 角色
2. 查询 `plugin_permission_config` 表：匹配用户角色 + plugin_name
3. `action` 字段支持逗号分隔存储多个操作（如 `list-users,create-user,update-user`）
4. check-permission：检查请求的 action 是否在匹配记录的 action 列表中
5. allowed-actions：返回所有匹配记录中的 action 合集（去重）

权限配置由管理员在主后端管理后台（`/plugin-permission/index`）维护。
