# 插件认证 API 参考

主后端当前提供给插件体系的稳定接口是：

- `GET /v1/plugin/verify-token`
- `POST /v1/plugin/send-email`

浏览器插件通常通过自身域名下的 `/api/*` 代理访问这些接口，例如 `GET /api/v1/plugin/verify-token`。插件后端直接调用主后端时使用真实主后端地址加 `/v1/plugin/*`。

旧文档中出现过的 `check-permission`、`allowed-actions` 不再是普通插件内部的标准接口。当前普通插件应通过 `verify-token` 获取角色，并在插件本地做权限矩阵判断。

## 基础信息

| 项 | 说明 |
|----|------|
| 主后端本地地址 | `http://localhost:8081` |
| 直接 API 前缀 | `/v1/plugin` |
| 插件浏览器代理前缀 | `/api/v1/plugin` |
| 认证方式 | `Authorization: Bearer {jwt_token}` |
| 响应格式 | `application/json` |

统一响应格式：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

## GET /v1/plugin/verify-token

验证当前 JWT，并返回用户基础信息、角色和组织信息。

请求：

```http
GET /v1/plugin/verify-token
Authorization: Bearer {jwt_token}
```

插件前端经 `/api` 代理时：

```http
GET /api/v1/plugin/verify-token
Authorization: Bearer {jwt_token}
```

成功响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 24,
    "username": "guanfei",
    "nickname": "babamama",
    "roles": ["admin", "user"],
    "organizations": []
  }
}
```

常见错误：

| HTTP | code | 说明 |
|------|------|------|
| 401 | 1001 | 缺少有效的 Authorization 头 |
| 401 | 1002 | Token 已过期 |
| 401 | 1003 | Token 无效 |
| 401 | 1004 | 用户不存在 |

## POST /v1/plugin/send-email

插件通过主后端发送验证码邮件。验证码存储在 Redis 中，有效期 15 分钟。

请求：

```http
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

参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | 是 | 收件人邮箱 |
| `type` | string | 是 | 邮件类型，目前仅支持 `verification_code` |
| `params` | object | 否 | 模板参数，支持 `locale` 和 `i18n` |

成功响应：

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

错误：

| HTTP | code | 说明 |
|------|------|------|
| 400 | 3001 | 缺少必要参数：`email` 或 `type` |
| 400 | 3002 | 不支持的邮件类型 |
| 400 | 3003 | 邮箱格式无效 |
| 429 | 3004 | 发送频率超限，响应中包含 `retry_after` |
| 500 | 3005 | 邮件发送失败 |

速率限制：

- 同一邮箱 60 秒内最多 1 次
- 同一用户 60 秒内最多 1 次

## 权限建议

当前推荐模型：

1. 插件通过 `INIT` / `TOKEN_UPDATE` 获取 token。
2. 插件调用 `verify-token` 获取 `roles`。
3. 插件本地根据角色映射功能权限。
4. 主前端菜单可见性通过插件注册中的 `accessScope` 控制。

主前端宿主访问动态插件配置时仍会通过 `/api-config/api/v1/plugin/list` 调用 `system-admin`，这是宿主层能力，不是普通插件内部依赖。
