# 插件认证授权 API 使用指南

本文档说明插件后端如何调用主后端的认证授权 API，实现用户身份验证和权限控制。

## 调用流程

```
用户浏览器 → 插件前端（携带 JWT Token）→ 插件后端 → 主后端 Plugin API → 返回用户信息/权限
```

1. 用户在主系统登录后获得 JWT Token
2. 插件前端将 Token 传递给插件后端
3. 插件后端调用主后端 API 验证 Token 和检查权限
4. 根据返回结果决定是否允许操作

## 插件后端集成示例

### Node.js (Express) 示例

```javascript
const axios = require('axios');

const MAIN_API_BASE = process.env.MAIN_API_URL || 'http://xrugc-main-api/v1/plugin';
// 开发环境直接调用：http://localhost:8081/v1/plugin

// 中间件：验证用户身份
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: '未提供认证信息' });
  }

  try {
    const response = await axios.get(`${MAIN_API_BASE}/verify-token`, {
      headers: { Authorization: authHeader }
    });

    if (response.data.code === 0) {
      req.user = response.data.data; // { id, username, nickname, roles }
      next();
    } else {
      res.status(401).json({ error: response.data.message });
    }
  } catch (err) {
    const data = err.response?.data;
    res.status(401).json({ error: data?.message || '认证失败' });
  }
}

// 中间件：检查插件权限
function checkPermission(pluginName, action) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    try {
      const response = await axios.get(`${MAIN_API_BASE}/check-permission`, {
        headers: { Authorization: authHeader },
        params: { plugin_name: pluginName, action: action }
      });

      if (response.data.code === 0 && response.data.data.allowed) {
        next();
      } else {
        res.status(403).json({ error: '无权限执行此操作' });
      }
    } catch (err) {
      res.status(403).json({ error: '权限检查失败' });
    }
  };
}

// 使用示例
app.get('/api/users',
  authMiddleware,
  checkPermission('user-management', 'manage-users'),
  (req, res) => {
    // req.user 包含用户信息
    res.json({ user: req.user, data: [] });
  }
);
```

### PHP (PSR-15) 示例

```php
use GuzzleHttp\Client;

class PluginAuthService
{
    private Client $client;
    private string $baseUrl;

    public function __construct(string $baseUrl = 'http://xrugc-main-api/v1/plugin')
    // 开发环境：http://localhost:8081/v1/plugin
    {
        $this->client = new Client(['timeout' => 5]);
        $this->baseUrl = $baseUrl;
    }

    /**
     * 验证 Token 并获取用户信息
     * @return array|null 用户信息或 null（验证失败）
     */
    public function verifyToken(string $authHeader): ?array
    {
        try {
            $response = $this->client->get($this->baseUrl . '/verify-token', [
                'headers' => ['Authorization' => $authHeader],
            ]);
            $data = json_decode($response->getBody(), true);
            return $data['code'] === 0 ? $data['data'] : null;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * 检查插件操作权限
     */
    public function checkPermission(string $authHeader, string $pluginName, string $action): bool
    {
        try {
            $response = $this->client->get($this->baseUrl . '/check-permission', [
                'headers' => ['Authorization' => $authHeader],
                'query' => ['plugin_name' => $pluginName, 'action' => $action],
            ]);
            $data = json_decode($response->getBody(), true);
            return $data['code'] === 0 && $data['data']['allowed'] === true;
        } catch (\Exception $e) {
            return false;
        }
    }
}
```

## Docker 网络内调用

在 Docker 环境中，插件后端通过容器名访问主后端 API：

```
http://xrugc-main-api/v1/plugin/verify-token
http://xrugc-main-api/v1/plugin/check-permission
```

确保插件容器和主后端容器在同一个 Docker 网络中。

## 权限配置管理

管理员通过主后端管理后台配置权限映射：

- 访问地址：主后端管理后台 → 插件权限配置
- 仅 root 角色可访问
- 配置项：角色/权限名称 + 插件标识 + 操作标识

例如，允许 `admin` 角色在 `user-management` 插件中执行 `manage-users` 操作：

| role_or_permission | plugin_name | action |
|---|---|---|
| admin | user-management | manage-users |
| teacher | user-management | view-users |
| root | system-admin | manage-plugins |

## 注意事项

- Token 由主系统签发（ES256 算法），插件不需要自行验证签名
- 每次 API 调用都会实时查询数据库，权限变更即时生效
- 建议插件后端缓存 verify-token 结果（短时间内，如 30 秒），减少对主后端的请求
- check-permission 不建议缓存，因为权限配置可能随时变更

## 发送邮件示例

插件可通过主后端发送验证码邮件，无需自行配置邮件服务。

### Node.js 示例

```javascript
async function sendVerificationCode(authHeader, email, locale = 'zh-CN') {
  const response = await axios.post(`${MAIN_API_BASE}/send-email`, {
    email,
    type: 'verification_code',
    params: { locale }
  }, {
    headers: { Authorization: authHeader }
  });

  if (response.data.code === 0) {
    return true; // 发送成功，验证码已存入 Redis，有效期 15 分钟
  }

  // 处理速率限制
  if (response.data.code === 3004) {
    const retryAfter = response.data.data?.retry_after;
    throw new Error(`发送过于频繁，请 ${retryAfter} 秒后再试`);
  }

  throw new Error(response.data.message);
}
```

### 速率限制说明

- 同一邮箱：60 秒内最多发送 1 次
- 同一用户：60 秒内最多发送 1 次
- 超限时返回 HTTP 429，响应体包含 `retry_after`（剩余等待秒数）
