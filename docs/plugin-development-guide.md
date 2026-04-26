# 插件开发指南

本文档是当前 xrugc 插件接入标准。新插件优先从 `plugins/plugin-template-frontend-only/` 复制；如果历史文档与本文档冲突，以本文档和模板 README / QUICK_START / ARCHITECTURE 为准。

## 适用范围

适用于通过主前端 `web` 的插件系统加载的 iframe 插件：

- 管理类或工具类 Vue/React/原生 Web 插件
- 需要复用主系统登录态、主题、语言和菜单入口的插件
- 有独立后端的全栈插件，但仍通过 iframe 接入主系统

不强行适用于：

- `web` 自身，`web` 是插件宿主，不是普通插件
- `blockly.7dgame.com`、`editor.7dgame.com` 这类嵌入式编辑器工具
- `3d-model-optimizer` 这类专用服务型工具

## 当前架构

```text
web 主前端
  PluginSystem / PluginLoader / MessageBus
  PluginLayout.vue
    iframe src = plugin.url + pluginUrl + ?lang=...&theme=...
      插件独立 Web 应用
        usePluginMessageBridge
        /api/* 反向代理
        主后端 GET /api/v1/plugin/verify-token
```

主前端负责：

- 加载本地 `web/public/config/plugins.json`
- 通过 `system-admin` 插件配置接口补充动态插件列表
- 合并菜单分组和插件清单
- 按 `accessScope` 决定菜单可见性
- 创建 iframe，校验 `allowedOrigin`，执行 `PLUGIN_READY -> INIT` 握手
- 通过宿主路由的 `?pluginUrl=` 记录插件内部相对路径，并在刷新时恢复插件内部页面
- 在 token 刷新时向已加载插件广播 `TOKEN_UPDATE`

普通插件负责：

- 启动后发送 `PLUGIN_READY`
- 收到 `INIT` 后保存 token、主题和额外配置
- 用 `/api/v1/plugin/verify-token` 获取当前用户角色
- 在插件本地做能力判断
- 内部路由变化后发送 `plugin-url-changed` 事件，把当前插件相对路径同步给宿主
- 处理 `TOKEN_UPDATE`、`THEME_CHANGE`、`LANG_CHANGE`、`DESTROY`

## 插件注册

本地开发时在 `web/public/config/plugins.json` 注册；生产环境优先通过 `system-admin` 的插件注册管理动态下发。

```json
{
  "version": "1.0.0",
  "menuGroups": [
    {
      "id": "builtins",
      "name": "基础工具",
      "nameI18n": { "zh-CN": "基础工具", "en-US": "Core Tools" },
      "icon": "Setting",
      "order": 99
    }
  ],
  "plugins": [
    {
      "id": "my-plugin",
      "name": "我的插件",
      "nameI18n": { "zh-CN": "我的插件", "en-US": "My Plugin" },
      "description": "插件功能描述",
      "url": "http://localhost:3006/",
      "icon": "Tools",
      "group": "builtins",
      "enabled": true,
      "order": 10,
      "accessScope": "auth-only",
      "allowedOrigin": "http://localhost:3006",
      "version": "1.0.0",
      "extraConfig": {
        "featureFlag": true
      }
    }
  ]
}
```

字段说明：

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | 是 | 插件唯一标识，对应路由 `/plugins/{id}` |
| `name` / `nameI18n` | 是/否 | 默认名称和多语言名称 |
| `description` | 是 | 插件描述 |
| `url` | 是 | iframe 入口 URL |
| `icon` | 是 | Element Plus 图标名或 URL |
| `group` | 是 | 所属菜单分组 id |
| `enabled` | 是 | 是否启用 |
| `order` | 是 | 排序权重，越小越靠前 |
| `accessScope` | 否 | 菜单可见性范围，默认 `auth-only` |
| `allowedOrigin` | 否 | postMessage 允许来源；缺省时宿主会从 `url` 派生 |
| `allowedHostOrigins` | 否 | 允许嵌入当前插件的主站 origin 白名单 |
| `sandbox` | 否 | iframe sandbox 覆盖值 |
| `extraConfig` | 否 | 通过 `INIT.payload.config` 透传给插件 |

`accessScope` 取值：

| 值 | 可见条件 |
|----|----------|
| `auth-only` | 已登录用户 |
| `admin-only` | `root` 或 `admin` |
| `manager-only` | `root` 或 `manager` |
| `root-only` | `root` |

## 握手协议

标准时序是先 `PLUGIN_READY`，后 `INIT`：

```text
web                         plugin
 | 创建 iframe                |
 |-------------------------->|
 |                            | 注册 message listener
 |<------ PLUGIN_READY -------|
 |------ INIT { token } ----->|
 |                            | 完成初始化并开始渲染
```

消息信封：

```ts
interface PluginMessage {
  type: string
  id: string
  payload?: Record<string, unknown>
  requestId?: string
}
```

常用消息：

| type | 方向 | 说明 |
|------|------|------|
| `PLUGIN_READY` | 插件 -> 主系统 | 插件已注册监听器，请求 INIT |
| `INIT` | 主系统 -> 插件 | 携带 token、主题、语言和 `extraConfig` |
| `TOKEN_UPDATE` | 主系统 -> 插件 | 主系统 token 刷新 |
| `TOKEN_REFRESH_REQUEST` | 插件 -> 主系统 | 插件遇到 401，请求主系统刷新 token |
| `THEME_CHANGE` | 主系统 -> 插件 | 主题切换 |
| `LANG_CHANGE` | 主系统 -> 插件 | 语言切换 |
| `DESTROY` | 主系统 -> 插件 | iframe 即将卸载 |
| `REQUEST` / `RESPONSE` / `EVENT` | 双向 | 扩展通信 |

## 插件 URL 刷新恢复

宿主路由形态是 `/plugins/{pluginId}?pluginUrl=/plugin/internal/path`。`pluginUrl` 只允许插件内部相对路径，宿主会拒绝外部 URL、协议 URL、`//` 开头路径和反斜杠路径，并会移除 `lang`、`theme`、`v`、`cb` 等宿主控制参数。

加载插件 iframe 时，宿主会把 `pluginUrl` 合并到插件入口 URL：

```text
/plugins/my-plugin?pluginUrl=/sample?tab=detail#top
→ iframe src = http://plugin-host/sample?tab=detail&lang=zh-CN&theme=modern-blue&v=...
```

标准插件应在内部路由变化后通知宿主：

```ts
router.afterEach((to) => {
  window.parent.postMessage(
    {
      type: "EVENT",
      id: `plugin-url-changed-${Date.now()}`,
      payload: {
        event: "plugin-url-changed",
        pluginUrl: to.fullPath
      }
    },
    "*"
  )
})
```

宿主收到同一已挂载插件 iframe 发出的 `plugin-url-changed` 后，会用 `router.replace` 更新当前宿主地址栏的 `pluginUrl` 查询参数。这样用户刷新浏览器、复制链接或重新打开当前插件页时，可以回到插件内部的同一个相对路由。

插件端最小实现：

```ts
window.addEventListener("message", (event) => {
  if (event.source !== window.parent) return
  const { type, payload } = event.data ?? {}

  if (type === "INIT") {
    setToken(payload?.token)
    applyTheme(payload?.config?.theme)
  }

  if (type === "TOKEN_UPDATE" && payload?.token) {
    setToken(payload.token)
  }

  if (type === "DESTROY") {
    cleanup()
  }
})

window.parent.postMessage(
  { type: "PLUGIN_READY", id: `ready-${Date.now()}` },
  "*"
)
```

实际项目应优先复制模板中的 `usePluginMessageBridge.ts`，避免每个插件手写监听逻辑。

## 会话与权限

插件通过 `INIT` 拿到 token 后，调用主后端会话接口：

```ts
const mainApi = axios.create({ baseURL: "/api/v1", timeout: 10000 })

export function verifyToken() {
  return mainApi.get("/plugin/verify-token")
}
```

浏览器内请求路径是：

```text
GET /api/v1/plugin/verify-token
Authorization: Bearer <token>
```

插件后端或服务端代码直接调用主后端时使用：

```text
GET <HOST_API_BASE>/v1/plugin/verify-token
Authorization: Bearer <token>
```

返回中的 `roles` 是插件本地权限矩阵的输入。普通插件不要再调用 `allowed-actions` 或 `check-permission` 作为内部标准路径。

本地矩阵示例：

```ts
type Permission = "list-users" | "create-user" | "update-user"

const roleMatrix: Record<string, Permission[]> = {
  root: ["list-users", "create-user", "update-user"],
  admin: ["list-users", "create-user"],
  manager: ["list-users"]
}

export function can(roles: string[], permission: Permission): boolean {
  return roles.some((role) => roleMatrix[role]?.includes(permission))
}
```

## API 代理

普通插件容器只需要生成 `/api/*` 代理：

```text
/api/* -> APP_API_N_URL/*
```

Vite 开发代理：

```ts
server: {
  proxy: {
    "/api": {
      target: "http://localhost:8081",
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, "")
    }
  }
}
```

nginx 运行时建议沿用模板的 `APP_API_1_URL`、`APP_API_2_URL` 链式 failover 方式。旧模板里出现过的 `APP_BACKEND_*`、`APP_CONFIG_*` 不是当前普通插件推荐配置。

`/api-config/*` 的当前职责：

- 只由主前端 `web` 用来访问 `system-admin` 的插件注册/配置接口
- 不作为普通插件内部权限或业务 API 的标准入口

## 新插件流程

1. 复制 `plugins/plugin-template-frontend-only/` 到新目录。
2. 修改 `package.json`、端口、插件 id、语言包里的 `pluginMeta`。
3. 按 `docs/QUICK_START.md` 修改 `plugins.json.example`。
4. 在本地 `web/public/config/plugins.json` 或 `system-admin` 中注册插件。
5. 确认插件挂载时只发送一次 `PLUGIN_READY`，收到 `INIT` 后再渲染受保护页面。
6. 用 `verify-token` 返回的 `roles` 实现本地权限矩阵。
7. 部署时确认 `url`、`allowedOrigin`、`APP_API_1_URL` 与实际环境一致。

## 文档维护

- 插件体系总览：`docs/plugin-system.md`
- 当前纯前端模板：`plugins/plugin-template-frontend-only/`
- user-management 仅作为业务实现参考，不再作为通用协议权威来源。
- 历史 `docs/superpowers/`、work-log 和旧插件长文档只作背景，不作为当前接入规范。
