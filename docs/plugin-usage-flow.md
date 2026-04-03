# 插件使用流程

> 本文档面向插件开发者，描述插件从注册到运行的完整流程，以及各关键环节的实现规范。

## 1. 整体架构

```
主系统 (web)
  └── PluginLayout.vue          # iframe 容器
        └── PluginSystem.ts     # 消息总线
              │
              │  postMessage (标准信封)
              ▼
        插件 (独立 Web 应用)
              └── usePluginMessageBridge.ts  # 通信桥
                    └── api/index.ts         # HTTP 请求（带 token）
                          │
                          │  反向代理 /api/
                          ▼
                    主后端 API (http://xrugc-main-api)
```

## 2. 插件注册

在 `web/public/config/plugins.json` 中添加插件配置：

```json
{
  "id": "my-plugin",
  "name": "我的插件",
  "nameI18n": {
    "zh-CN": "我的插件",
    "en-US": "My Plugin"
  },
  "description": "功能描述",
  "url": "https://my-plugin.example.com",
  "icon": "Monitor",
  "group": "tools",
  "enabled": true,
  "order": 1,
  "allowedOrigin": "https://my-plugin.example.com",
  "version": "1.0.0"
}
```

## 3. 握手协议（PLUGIN_READY → INIT）

```
主系统                          插件
  │                              │
  │── 创建 <iframe src=url> ────►│
  │                              │ (插件加载完成)
  │◄── PLUGIN_READY ─────────────│
  │                              │
  │── INIT { token, config } ───►│
  │                              │ (插件完成初始化，开始渲染)
  │◄──── 正常业务通信 ────────────│
```

**关键规则**：插件必须先发 `PLUGIN_READY`，主系统收到后才发 `INIT`。不能假设 INIT 会自动到来。

## 4. 消息信封格式

```typescript
interface PluginMessage {
  type: string        // 消息类型
  id: string          // 唯一 ID（时间戳 + 随机串）
  payload?: Record<string, unknown>
  requestId?: string  // 仅 RESPONSE 消息使用
}
```

| type | 方向 | 说明 |
|------|------|------|
| `PLUGIN_READY` | 插件 → 主系统 | 插件就绪，请求 INIT |
| `INIT` | 主系统 → 插件 | 携带 token 和 config |
| `TOKEN_UPDATE` | 主系统 → 插件 | token 刷新 |
| `TOKEN_EXPIRED` | 插件 → 主系统 | token 彻底失效 |
| `THEME_CHANGE` | 主系统 → 插件 | 主题切换通知，携带 theme 和 dark 字段 |
| `LANG_CHANGE` | 主系统 → 插件 | 语言切换通知，携带 lang 字段 |
| `REQUEST` | 插件 → 主系统 | 向主系统请求数据 |
| `RESPONSE` | 主系统 → 插件 | 响应 REQUEST |
| `EVENT` | 双向 | 事件通知 |
| `DESTROY` | 主系统 → 插件 | 即将卸载，清理资源 |

## 5. Token 处理

### 5.1 获取 token

token 通过 `INIT` 消息传入，**不要**从 localStorage 或 URL 参数获取。

```typescript
const { token } = usePluginMessageBridge({
  onInit: ({ token, config }) => {
    // token 已就绪，可以发起 API 请求
  }
})
```

### 5.2 无 token 时的处理

如果插件收到 INIT 但 token 为空，或者超时未收到 INIT，应显示明确的错误提示，**不能**显示空白页或报错。

推荐文案：`无法打开界面，请从主系统登录后重试`

### 5.3 token 刷新

401 响应时，先通过 `TOKEN_REFRESH_REQUEST` 请求主系统刷新，超时（默认 3s）后回退到本地 refresh token。彻底失败时发送 `TOKEN_EXPIRED` 通知主系统。

## 6. API 反向代理规范

### 6.1 路径约定

所有插件的后端 API 代理路径统一使用 `/api/` 前缀，与主前端保持一致：

```
/api/  →  主后端 API（http://xrugc-main-api）
```

**不要**使用 `/v1/plugin-user/`、`/v1/plugin/` 等旧式路径作为代理入口。

### 6.2 链式 Failover 备灾（推荐）

参考主前端（`web/docker-entrypoint.sh`）的实现，使用编号格式环境变量支持多后端链式 failover：

```
APP_API_1_URL=https://api-primary.example.com   # 主后端
APP_API_2_URL=https://api-backup.example.com    # 备用后端（可选）
APP_API_N_URL=...                               # 支持任意数量
```

`docker-entrypoint.sh` 在容器启动时动态生成 nginx location 块，502/503/504 时自动切换到下一个备用地址。

docker-compose 配置示例：

```yaml
services:
  user-management:
    build:
      context: ../plugins/user-management
      dockerfile: Dockerfile
    restart: always
    environment:
      - APP_API_1_URL=http://api:80          # Docker 内部主后端
      - APP_API_2_URL=https://api-backup.example.com  # 可选备灾
```

nginx 模板中使用 `# __API_LOCATIONS__` 占位符，由 entrypoint 脚本注入动态生成的 location 块：

```nginx
server {
    listen 80;
    resolver 127.0.0.11 valid=30s ipv6=off;

    # __API_LOCATIONS__

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 6.3 开发环境代理（vite.config.ts）

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8081',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  }
}
```

### 6.4 axios 实例配置

```typescript
const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})
```

## 7. 无 token 界面规范

插件在以下情况应显示"无法打开界面"提示，而非空白或报错：

| 情况 | 说明 |
|------|------|
| 未在 iframe 中运行 | 直接访问插件 URL，没有主系统注入 token |
| INIT 超时未到达 | 主系统异常，握手失败 |
| INIT.token 为空 | 用户未登录或 token 已失效 |
| DESTROY 后未重新 INIT | 插件被卸载后状态清空 |

推荐实现（App.vue）：

```vue
<template>
  <div v-if="waiting" class="no-access">
    <el-icon><Warning /></el-icon>
    <p>{{ t('layout.waitingAuth') }}</p>
  </div>
  <div v-else-if="!hasToken" class="no-access">
    <el-icon><Lock /></el-icon>
    <p>{{ t('layout.noToken') }}</p>
  </div>
  <router-view v-else />
</template>
```

## 8. 主题同步

主系统通过 INIT 的 `config.theme` 字段传入主题（`light` / `dark`），插件应监听并同步：

```typescript
onInit: ({ config }) => {
  if (config.theme === 'dark') {
    document.documentElement.classList.add('dark')
  }
}
```

## 9. 部署清单

- [ ] nginx 反向代理路径为 `/api/`
- [ ] 环境变量 `APP_API_1_URL` 已配置（指向主后端）
- [ ] 可选：`APP_API_2_URL` 等备灾地址已配置
- [ ] `docker-entrypoint.sh` 实现 failover 链生成逻辑
- [ ] 插件发送 `PLUGIN_READY` 后等待 `INIT`
- [ ] 无 token 时显示明确提示，不显示空白页
- [ ] token 不写入 localStorage（仅内存或 sessionStorage）
- [ ] 正确处理 `TOKEN_UPDATE` 和 `DESTROY`
- [ ] `allowedOrigin` 与部署地址一致
- [ ] 在 `driver/docker-compose.yml` 中添加服务定义
- [ ] 在 `driver/docker-compose.override.yml` 中添加端口映射
