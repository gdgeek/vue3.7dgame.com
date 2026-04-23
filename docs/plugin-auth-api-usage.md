# 插件认证 API 使用指南

本文档说明插件如何使用主后端 `verify-token` 接口复用主系统登录态。接口定义见 [插件认证 API 参考](./plugin-auth-api-reference.md)。

## 推荐流程

```text
web 主系统登录
  -> iframe INIT / TOKEN_UPDATE 下发 token
  -> 插件调用 /api/v1/plugin/verify-token
  -> 插件拿到 roles
  -> 插件本地判断功能权限
```

普通插件内部不要再调用 `allowed-actions` 或 `check-permission` 作为标准权限路径。

## 前端插件示例

```ts
import axios from "axios"

const mainApi = axios.create({
  baseURL: "/api/v1",
  timeout: 10000
})

mainApi.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function loadSession() {
  const response = await mainApi.get("/plugin/verify-token")
  return response.data.data as {
    id: number
    username: string
    nickname?: string
    roles: string[]
    organizations?: unknown[]
  }
}
```

本地权限矩阵：

```ts
type Permission = "list-users" | "create-user" | "delete-user"

const rolePermissions: Record<string, Permission[]> = {
  root: ["list-users", "create-user", "delete-user"],
  admin: ["list-users", "create-user"],
  manager: ["list-users"]
}

export function can(roles: string[], permission: Permission): boolean {
  return roles.some((role) => rolePermissions[role]?.includes(permission))
}
```

## 全栈插件后端示例

有独立后端的插件可以在服务端调用主后端 `verify-token`，再基于角色执行本地鉴权。

### Node.js / Express

```js
import axios from "axios"

const HOST_API_BASE = process.env.HOST_API_BASE || "http://xrugc-main-api"

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: "missing authorization" })
  }

  try {
    const response = await axios.get(
      `${HOST_API_BASE}/v1/plugin/verify-token`,
      { headers: { Authorization: authHeader }, timeout: 5000 }
    )

    req.user = response.data.data
    return next()
  } catch (error) {
    return res.status(401).json({ error: "invalid token" })
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : []
    if (roles.some((role) => allowedRoles.includes(role))) {
      return next()
    }
    return res.status(403).json({ error: "forbidden" })
  }
}
```

使用：

```js
app.post(
  "/plugin/execute",
  authMiddleware,
  requireRole("root", "admin"),
  executeHandler
)
```

### PHP

```php
use GuzzleHttp\Client;

final class PluginHostAuth
{
    public function __construct(
        private Client $client,
        private string $hostApiBase = 'http://xrugc-main-api'
    ) {}

    public function verifyToken(string $authHeader): ?array
    {
        try {
            $response = $this->client->get(
                $this->hostApiBase . '/v1/plugin/verify-token',
                ['headers' => ['Authorization' => $authHeader], 'timeout' => 5]
            );
            $payload = json_decode((string)$response->getBody(), true);
            return ($payload['code'] ?? null) === 0 ? $payload['data'] : null;
        } catch (\Throwable) {
            return null;
        }
    }
}
```

## 邮件发送

插件可通过主后端发送验证码邮件，无需自行配置邮件服务：

```ts
export async function sendVerificationCode(email: string, locale = "zh-CN") {
  const response = await mainApi.post("/plugin/send-email", {
    email,
    type: "verification_code",
    params: { locale }
  })

  return response.data
}
```

## 配置建议

- 浏览器插件：使用 `/api/v1/plugin/verify-token`，由插件 nginx/Vite 代理到主后端。
- 全栈插件后端：使用 `HOST_API_BASE + /v1/plugin/verify-token`。
- 普通插件运行时只保留 `APP_API_*` 上游配置。
- `/api-config` 只给主前端宿主访问 `system-admin` 插件配置接口，不要在普通插件内新增依赖。
