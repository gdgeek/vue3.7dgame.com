# API 主备自动切换（Failover）

通用的 API 主备切换模式。当主 API 不可用时，自动切换到备用 API，对调用方透明。

## 适用场景

- 多机房部署，需要跨域名容灾
- 主 API 不稳定，需要备用兜底
- docker-compose 中配置 `API_URL` + `BACKUP_API_URL`

## 架构概览

```
docker-compose.yml
  └─ environment:
       API_URL=https://api.primary.com
       BACKUP_API_URL=https://api.backup.com

docker-entrypoint.sh
  └─ 注入 window.__API_URL__ / window.__BACKUP_API_URL__ 到 index.html

前端代码
  └─ httpClient.ts (带 failover 的 axios 封装)
       ├─ 主 API 请求
       ├─ 失败 → 自动重试备用 API
       └─ 健康检查 → 主 API 恢复后自动切回
```

## 实现步骤

### 1. Docker 环境变量注入

在 `docker-entrypoint.sh` 中注入 API 地址：

```bash
#!/bin/sh
API_URL="${API_URL:-}"
BACKUP_API_URL="${BACKUP_API_URL:-}"

sed -i "s|<head>|<head>\
<script>\
window.__API_URL__='${API_URL}';\
window.__BACKUP_API_URL__='${BACKUP_API_URL}';\
</script>|" /usr/share/nginx/html/index.html

exec "$@"
```

### 2. docker-compose 配置

```yaml
services:
  frontend:
    image: your-app:latest
    ports:
      - "80:80"
    environment:
      - API_URL=https://api.xrteeth.com
      - BACKUP_API_URL=https://api.tmrpp.com
```

### 3. Dockerfile

```dockerfile
FROM nginx:alpine
COPY --from=builder /app/dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

### 4. 前端 Failover HTTP Client（TypeScript）

核心实现，适用于任何前端框架（Vue/React/Svelte 等）：

```typescript
// src/services/failoverHttpClient.ts

import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'

export interface FailoverConfig {
  /** 主 API 地址 */
  primaryUrl: string
  /** 备用 API 地址 */
  backupUrl: string
  /** 请求超时（毫秒），默认 8000 */
  timeout?: number
  /** 主 API 健康检查间隔（毫秒），默认 30000 */
  healthCheckInterval?: number
  /** 健康检查路径，默认 /health */
  healthCheckPath?: string
}

export class FailoverHttpClient {
  private primary: AxiosInstance
  private backup: AxiosInstance | null = null
  private usePrimary = true
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null

  constructor(private config: FailoverConfig) {
    const timeout = config.timeout ?? 8000

    this.primary = axios.create({ baseURL: config.primaryUrl, timeout })

    if (config.backupUrl) {
      this.backup = axios.create({ baseURL: config.backupUrl, timeout })
      this.startHealthCheck()
    }
  }

  /**
   * GET 请求，主 API 失败自动切备用
   */
  async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('get', path, undefined, config)
  }

  /**
   * POST 请求，主 API 失败自动切备用
   */
  async post<T>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('post', path, data, config)
  }

  /**
   * PUT 请求
   */
  async put<T>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('put', path, data, config)
  }

  /**
   * DELETE 请求
   */
  async delete<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('delete', path, undefined, config)
  }

  private async request<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const activeClient = this.usePrimary ? this.primary : this.backup
    const fallbackClient = this.usePrimary ? this.backup : this.primary

    try {
      const response = method === 'get' || method === 'delete'
        ? await activeClient![method](path, config)
        : await activeClient![method](path, data, config)
      return response.data
    } catch (primaryError) {
      // 没有备用，直接抛出
      if (!fallbackClient) throw primaryError

      console.warn(
        `[Failover] ${this.usePrimary ? '主' : '备'}API 失败，切换到${this.usePrimary ? '备用' : '主'}API`,
        path,
      )

      // 标记当前活跃的已挂
      this.usePrimary = !this.usePrimary

      try {
        const response = method === 'get' || method === 'delete'
          ? await fallbackClient[method](path, config)
          : await fallbackClient[method](path, data, config)
        return response.data
      } catch (backupError) {
        console.error('[Failover] 主备 API 均不可用', path)
        throw backupError
      }
    }
  }

  /**
   * 定期检查主 API 是否恢复
   */
  private startHealthCheck() {
    const interval = this.config.healthCheckInterval ?? 30000
    const healthPath = this.config.healthCheckPath ?? '/health'

    this.healthCheckTimer = setInterval(async () => {
      if (this.usePrimary) return // 主 API 正常，不需要检查

      try {
        await this.primary.get(healthPath, { timeout: 3000 })
        console.info('[Failover] 主 API 已恢复，切回主 API')
        this.usePrimary = true
      } catch {
        // 主 API 仍不可用，继续使用备用
      }
    }, interval)
  }

  /**
   * 销毁实例，清理定时器
   */
  destroy() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
  }
}
```

### 5. 使用示例

```typescript
// src/services/api.ts

import { FailoverHttpClient } from './failoverHttpClient'

// 从 Docker 注入的全局变量读取
const apiUrl = (window as any).__API_URL__ || import.meta.env.VITE_API_URL || ''
const backupUrl = (window as any).__BACKUP_API_URL__ || import.meta.env.VITE_BACKUP_API_URL || ''

export const apiClient = new FailoverHttpClient({
  primaryUrl: apiUrl,
  backupUrl: backupUrl,
  timeout: 8000,
  healthCheckInterval: 30000,
  healthCheckPath: '/health',
})

// 业务调用
export async function getUserInfo(userId: string) {
  return apiClient.get(`/users/${userId}`)
}

export async function createOrder(data: any) {
  return apiClient.post('/orders', data)
}
```

### 6. 本地开发（.env）

```env
# 主 API
APP_API_URL=https://api.xrteeth.com
# 备用 API
APP_BACKUP_API_URL=https://api.tmrpp.com
```

### 7. docker-entrypoint.sh 完整模板

同时支持 BRAND_ID 和 API Failover：

```bash
#!/bin/sh
BRAND_ID="${BRAND_ID:-}"
API_URL="${API_URL:-}"
BACKUP_API_URL="${BACKUP_API_URL:-}"

INJECT="<script>"
[ -n "$BRAND_ID" ] && INJECT="${INJECT}window.__BRAND_ID__='${BRAND_ID}';"
[ -n "$API_URL" ] && INJECT="${INJECT}window.__API_URL__='${API_URL}';"
[ -n "$BACKUP_API_URL" ] && INJECT="${INJECT}window.__BACKUP_API_URL__='${BACKUP_API_URL}';"
INJECT="${INJECT}</script>"

sed -i "s|<head>|<head>${INJECT}|" /usr/share/nginx/html/index.html

exec "$@"
```

## 行为说明

| 场景 | 行为 |
|------|------|
| 主 API 正常 | 所有请求走主 API |
| 主 API 超时/500 | 当前请求自动重试备用 API，后续请求也走备用 |
| 备用 API 也挂 | 抛出错误，由业务层处理 |
| 主 API 恢复 | 健康检查检测到后自动切回主 API |
| 未配置备用 API | 等同于普通 HTTP 客户端，无 failover |

## 注意事项

- 备用 API 的接口路径和返回格式必须与主 API 一致
- 健康检查路径（默认 `/health`）需要后端支持
- POST/PUT 等写操作的 failover 需要考虑幂等性
- 超时时间建议设置为 5-10 秒，太短会误判
