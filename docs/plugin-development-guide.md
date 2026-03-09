# 插件开发指南

> 本文档面向插件开发者（或用于指导 AI 实现插件），详细说明如何开发一个可被主框架加载的外部插件应用。

## 1. 架构概述

主框架采用 **iframe 宿主模式**：插件是独立部署的 Web 应用，主框架通过 iframe 加载插件 URL，通过 PostMessage 进行双向通信，通过 Token 完成身份认证。

```
┌─────────────────────────────────────────────┐
│  主框架 (Vue 3 App)                          │
│                                             │
│  ┌──────────┐  postMessage  ┌─────────────┐ │
│  │ MessageBus│◄────────────►│ iframe      │ │
│  └──────────┘               │ (你的插件)   │ │
│                             └─────────────┘ │
│  Token 注入 ──────────────► INIT 消息       │
└─────────────────────────────────────────────┘
```

关键点：
- 插件是完全独立的 Web 应用（可以用任何框架：Vue、React、原生 JS 等）
- 主框架通过 `<iframe sandbox="allow-scripts allow-same-origin">` 加载插件
- 所有通信通过 `window.postMessage` / `window.addEventListener('message')` 完成
- 主框架在插件加载后发送 INIT 消息，携带用户 Token 和配置

## 2. 消息协议

### 2.1 消息格式

所有 PostMessage 消息遵循统一格式：

```typescript
interface PluginMessage {
  /** 消息类型 */
  type: PluginMessageType
  /** 消息唯一 ID（UUID 或时间戳格式均可） */
  id: string
  /** 消息负载（可选） */
  payload?: Record<string, unknown>
  /** 关联的请求 ID，用于请求-响应配对（可选） */
  requestId?: string
}
```

### 2.2 消息类型

| 类型 | 方向 | 说明 |
|------|------|------|
| `INIT` | 主框架 → 插件 | 初始化消息，携带 token 和 config |
| `PLUGIN_READY` | 插件 → 主框架 | 插件加载完成，准备就绪 |
| `TOKEN_UPDATE` | 主框架 → 插件 | Token 刷新通知，携带新 token |
| `REQUEST` | 插件 → 主框架 | 插件向主框架发起请求 |
| `RESPONSE` | 主框架 → 插件 | 主框架对请求的响应 |
| `EVENT` | 双向 | 事件通知 |
| `DESTROY` | 主框架 → 插件 | 即将销毁，插件应做清理 |

### 2.3 生命周期时序

```
1. 主框架创建 iframe，src = 插件 URL
2. iframe 加载完成（onload）
3. 主框架发送 INIT 消息 → 插件
4. 插件收到 INIT，保存 token，完成初始化
5. 插件发送 PLUGIN_READY → 主框架
6. 运行时：双向 REQUEST/RESPONSE/EVENT 通信
7. Token 刷新时：主框架发送 TOKEN_UPDATE → 插件
8. 卸载前：主框架发送 DESTROY → 插件
9. 插件收到 DESTROY，执行清理
10. 主框架移除 iframe
```

## 3. INIT 消息详解

插件收到的第一条消息是 `INIT`，payload 结构如下：

```typescript
{
  type: "INIT",
  id: "init-{pluginId}-{timestamp}",
  payload: {
    /** 用户的 JWT access token，用于调用后端 API */
    token: string,
    /** 插件的额外配置（来自 plugins.json 的 extraConfig 字段） */
    config: Record<string, string | number | boolean>
  }
}
```

## 4. 插件端实现模板

### 4.1 最小实现（原生 JS）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>My Plugin</title>
</head>
<body>
  <div id="app">插件加载中...</div>

  <script>
    // 存储从主框架接收的 token
    let accessToken = null
    // 主框架的 origin（用于安全校验）
    const PARENT_ORIGIN = window.location.ancestorOrigins?.[0] || '*'

    /**
     * 监听来自主框架的消息
     */
    window.addEventListener('message', (event) => {
      const { type, id, payload, requestId } = event.data

      switch (type) {
        case 'INIT':
          handleInit(payload)
          break
        case 'TOKEN_UPDATE':
          handleTokenUpdate(payload)
          break
        case 'DESTROY':
          handleDestroy()
          break
        case 'RESPONSE':
          handleResponse(requestId, payload)
          break
        case 'EVENT':
          handleEvent(payload)
          break
      }
    })

    /**
     * 处理初始化
     */
    function handleInit(payload) {
      accessToken = payload.token
      const config = payload.config || {}

      console.log('[Plugin] Initialized with config:', config)

      // 在这里执行插件的初始化逻辑
      document.getElementById('app').textContent = '插件已就绪'

      // 通知主框架插件已准备好
      sendToParent({
        type: 'PLUGIN_READY',
        id: `ready-${Date.now()}`
      })
    }

    /**
     * 处理 Token 更新
     */
    function handleTokenUpdate(payload) {
      accessToken = payload.token
      console.log('[Plugin] Token updated')
    }

    /**
     * 处理销毁通知
     */
    function handleDestroy() {
      console.log('[Plugin] Destroying...')
      // 清理定时器、WebSocket 连接、事件监听等
    }

    /**
     * 处理主框架的响应
     */
    function handleResponse(requestId, payload) {
      console.log('[Plugin] Response for', requestId, payload)
      // 根据 requestId 匹配之前的请求
    }

    /**
     * 处理事件通知
     */
    function handleEvent(payload) {
      console.log('[Plugin] Event received:', payload)
    }

    /**
     * 向主框架发送消息
     */
    function sendToParent(message) {
      window.parent.postMessage(message, '*')
    }

    /**
     * 向主框架发起请求（带请求 ID，可等待响应）
     */
    function requestFromParent(payload) {
      const id = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      sendToParent({
        type: 'REQUEST',
        id,
        payload
      })
      return id
    }

    /**
     * 调用后端 API 的示例（使用主框架传入的 token）
     */
    async function callBackendAPI(url, data) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(data)
      })
      return response.json()
    }
  </script>
</body>
</html>
```

### 4.2 Vue 3 插件模板

```typescript
// src/plugin-bridge.ts — 插件端通信桥接层

export interface PluginBridge {
  token: string | null
  config: Record<string, unknown>
  onInit: (callback: (payload: InitPayload) => void) => void
  onTokenUpdate: (callback: (token: string) => void) => void
  onDestroy: (callback: () => void) => void
  onEvent: (callback: (payload: Record<string, unknown>) => void) => void
  sendReady: () => void
  sendRequest: (payload: Record<string, unknown>) => string
  sendEvent: (payload: Record<string, unknown>) => void
}

interface InitPayload {
  token: string
  config: Record<string, unknown>
}

export function createPluginBridge(): PluginBridge {
  let token: string | null = null
  let config: Record<string, unknown> = {}

  const initCallbacks: Array<(p: InitPayload) => void> = []
  const tokenCallbacks: Array<(t: string) => void> = []
  const destroyCallbacks: Array<() => void> = []
  const eventCallbacks: Array<(p: Record<string, unknown>) => void> = []

  // 监听主框架消息
  window.addEventListener('message', (event) => {
    const { type, payload } = event.data || {}

    switch (type) {
      case 'INIT':
        token = payload?.token ?? null
        config = payload?.config ?? {}
        initCallbacks.forEach((cb) => cb({ token: token!, config }))
        break
      case 'TOKEN_UPDATE':
        token = payload?.token ?? null
        tokenCallbacks.forEach((cb) => cb(token!))
        break
      case 'DESTROY':
        destroyCallbacks.forEach((cb) => cb())
        break
      case 'EVENT':
        eventCallbacks.forEach((cb) => cb(payload ?? {}))
        break
    }
  })

  function sendToParent(message: Record<string, unknown>) {
    window.parent.postMessage(message, '*')
  }

  return {
    get token() { return token },
    get config() { return config },

    onInit(callback) { initCallbacks.push(callback) },
    onTokenUpdate(callback) { tokenCallbacks.push(callback) },
    onDestroy(callback) { destroyCallbacks.push(callback) },
    onEvent(callback) { eventCallbacks.push(callback) },

    sendReady() {
      sendToParent({ type: 'PLUGIN_READY', id: `ready-${Date.now()}` })
    },

    sendRequest(payload) {
      const id = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      sendToParent({ type: 'REQUEST', id, payload })
      return id
    },

    sendEvent(payload) {
      sendToParent({
        type: 'EVENT',
        id: `evt-${Date.now()}`,
        payload
      })
    }
  }
}
```

```vue
<!-- App.vue — Vue 3 插件入口示例 -->
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { createPluginBridge } from './plugin-bridge'

const bridge = createPluginBridge()
const ready = ref(false)
const pluginConfig = ref<Record<string, unknown>>({})

onMounted(() => {
  bridge.onInit(({ token, config }) => {
    pluginConfig.value = config
    ready.value = true

    // 通知主框架已就绪
    bridge.sendReady()
  })

  bridge.onTokenUpdate((newToken) => {
    console.log('Token 已更新')
    // 如果有 axios 实例，更新其 header
  })

  bridge.onDestroy(() => {
    console.log('插件即将被销毁，执行清理...')
    // 清理 WebSocket、定时器等
  })
})
</script>

<template>
  <div v-if="ready">
    <!-- 你的插件 UI -->
    <h1>我的插件</h1>
  </div>
  <div v-else>
    加载中...
  </div>
</template>
```

### 4.3 React 插件模板

```tsx
// src/usePluginBridge.ts — React Hook 版本

import { useEffect, useRef, useState, useCallback } from 'react'

interface InitPayload {
  token: string
  config: Record<string, unknown>
}

export function usePluginBridge() {
  const [ready, setReady] = useState(false)
  const [config, setConfig] = useState<Record<string, unknown>>({})
  const tokenRef = useRef<string | null>(null)

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const { type, payload } = event.data || {}

      switch (type) {
        case 'INIT':
          tokenRef.current = payload?.token ?? null
          setConfig(payload?.config ?? {})
          setReady(true)
          // 通知主框架已就绪
          window.parent.postMessage(
            { type: 'PLUGIN_READY', id: `ready-${Date.now()}` },
            '*'
          )
          break
        case 'TOKEN_UPDATE':
          tokenRef.current = payload?.token ?? null
          break
        case 'DESTROY':
          // 清理逻辑
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const getToken = useCallback(() => tokenRef.current, [])

  const sendRequest = useCallback((payload: Record<string, unknown>) => {
    const id = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    window.parent.postMessage({ type: 'REQUEST', id, payload }, '*')
    return id
  }, [])

  return { ready, config, getToken, sendRequest }
}
```

```tsx
// App.tsx — React 插件入口示例
import { usePluginBridge } from './usePluginBridge'

export default function App() {
  const { ready, config, getToken, sendRequest } = usePluginBridge()

  if (!ready) return <div>加载中...</div>

  return (
    <div>
      <h1>我的 React 插件</h1>
      {/* 你的插件 UI */}
    </div>
  )
}
```

## 5. 插件注册配置

### 5.1 plugins.json 格式

插件需要在主框架的 `public/config/plugins.json` 中注册：

```json
{
  "version": "1.0.0",
  "menuGroups": [
    {
      "id": "editors",
      "name": "编辑工具",
      "icon": "Edit",
      "order": 1
    },
    {
      "id": "tools",
      "name": "实用工具",
      "icon": "Tools",
      "order": 2
    }
  ],
  "plugins": [
    {
      "id": "my-plugin",
      "name": "我的插件",
      "description": "插件功能描述",
      "url": "https://my-plugin.example.com",
      "icon": "Monitor",
      "group": "tools",
      "enabled": true,
      "order": 1,
      "allowedOrigin": "https://my-plugin.example.com",
      "version": "1.0.0",
      "sandbox": "allow-scripts allow-same-origin",
      "extraConfig": {
        "apiBaseUrl": "https://api.example.com",
        "theme": "dark",
        "maxItems": 100
      }
    }
  ]
}
```

### 5.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 插件唯一标识，建议 kebab-case |
| `name` | string | ✅ | 显示名称 |
| `description` | string | ✅ | 功能描述 |
| `url` | string | ✅ | 插件入口 URL（完整的 https 地址） |
| `icon` | string | ✅ | Element Plus 图标名称或图标 URL |
| `group` | string | ✅ | 所属菜单分组 ID（需在 menuGroups 中定义） |
| `enabled` | boolean | ✅ | 是否启用 |
| `order` | number | ✅ | 排序权重（越小越靠前） |
| `allowedOrigin` | string | ✅ | 允许的 PostMessage origin（安全校验用） |
| `version` | string | ✅ | 语义化版本号 |
| `sandbox` | string | ❌ | iframe sandbox 属性，默认 `allow-scripts allow-same-origin` |
| `extraConfig` | object | ❌ | 额外配置，通过 INIT 消息透传给插件 |

### 5.3 动态配置（可选）

除了静态 `plugins.json`，主框架还支持通过后端 domain API 动态下发插件配置。domain 配置中的插件会按 `id` 合并覆盖静态配置。这意味着：
- 不同域名/租户可以有不同的插件列表
- 后端可以动态启用/禁用插件
- 无需重新部署前端即可调整插件配置

## 6. 安全要求

### 6.1 Origin 校验

主框架会验证所有 PostMessage 的 `event.origin`，只接受与插件 `allowedOrigin` 匹配的消息。插件端也应校验消息来源：

```javascript
window.addEventListener('message', (event) => {
  // 建议：校验消息来源是否为主框架
  // 可以通过 event.origin 或 event.source === window.parent 判断
  if (event.source !== window.parent) return

  // 处理消息...
})
```

### 6.2 Token 安全

- Token 通过 INIT 消息传入，不要将其写入 localStorage 或 cookie
- 保持在内存中使用
- 不要在日志中输出 Token
- Token 过期后主框架会发送 TOKEN_UPDATE，插件应及时更新

### 6.3 iframe Sandbox

默认 sandbox 属性为 `allow-scripts allow-same-origin`，这意味着：
- ✅ 可以执行 JavaScript
- ✅ 可以发起同源请求
- ❌ 不能弹出新窗口（除非配置 `allow-popups`）
- ❌ 不能提交表单（除非配置 `allow-forms`）
- ❌ 不能访问主框架 DOM

如需额外权限，在 `plugins.json` 的 `sandbox` 字段中配置。

## 7. 完整案例：计数器插件

一个最简单的完整插件示例，展示所有通信流程。

### 7.1 插件代码 (index.html)

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>计数器插件</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; padding: 24px; }
    .counter { text-align: center; margin-top: 40px; }
    .counter h1 { font-size: 48px; margin-bottom: 16px; }
    .counter button {
      padding: 8px 24px; font-size: 16px; margin: 0 8px;
      cursor: pointer; border: 1px solid #ddd; border-radius: 4px;
      background: #fff;
    }
    .counter button:hover { background: #f5f5f5; }
    .status { color: #999; font-size: 12px; margin-top: 24px; }
    .token-status { color: #52c41a; }
    .token-status.expired { color: #ff4d4f; }
  </style>
</head>
<body>
  <div class="counter">
    <h1 id="count">0</h1>
    <button onclick="decrement()">-1</button>
    <button onclick="increment()">+1</button>
    <button onclick="reset()">重置</button>
    <p class="status">
      状态: <span id="status">等待初始化...</span>
    </p>
    <p class="status">
      Token: <span id="token-status" class="token-status expired">未获取</span>
    </p>
  </div>

  <script>
    let count = 0
    let token = null

    // 监听主框架消息
    window.addEventListener('message', (event) => {
      if (event.source !== window.parent) return

      const { type, payload } = event.data || {}

      switch (type) {
        case 'INIT':
          token = payload.token
          updateTokenStatus(true)
          document.getElementById('status').textContent = '已初始化'

          // 如果 extraConfig 中有初始值，使用它
          if (payload.config && payload.config.initialCount !== undefined) {
            count = Number(payload.config.initialCount)
            updateDisplay()
          }

          // 通知主框架已就绪
          window.parent.postMessage({
            type: 'PLUGIN_READY',
            id: 'ready-' + Date.now()
          }, '*')
          break

        case 'TOKEN_UPDATE':
          token = payload.token
          updateTokenStatus(true)
          break

        case 'DESTROY':
          document.getElementById('status').textContent = '正在销毁...'
          // 清理工作（如果有定时器、WebSocket 等）
          break
      }
    })

    function increment() {
      count++
      updateDisplay()
      notifyParent()
    }

    function decrement() {
      count--
      updateDisplay()
      notifyParent()
    }

    function reset() {
      count = 0
      updateDisplay()
      notifyParent()
    }

    function updateDisplay() {
      document.getElementById('count').textContent = count
    }

    function updateTokenStatus(hasToken) {
      const el = document.getElementById('token-status')
      el.textContent = hasToken ? '已获取' : '未获取'
      el.className = 'token-status' + (hasToken ? '' : ' expired')
    }

    // 通过 EVENT 消息通知主框架计数变化
    function notifyParent() {
      window.parent.postMessage({
        type: 'EVENT',
        id: 'count-change-' + Date.now(),
        payload: { action: 'countChanged', value: count }
      }, '*')
    }
  </script>
</body>
</html>
```

### 7.2 注册配置

在 `plugins.json` 的 `plugins` 数组中添加：

```json
{
  "id": "counter",
  "name": "计数器",
  "description": "简单的计数器插件示例",
  "url": "https://counter-plugin.example.com",
  "icon": "Odometer",
  "group": "tools",
  "enabled": true,
  "order": 10,
  "allowedOrigin": "https://counter-plugin.example.com",
  "version": "1.0.0",
  "extraConfig": {
    "initialCount": 0
  }
}
```

## 8. 开发与调试

### 8.1 本地开发

1. 在本地启动你的插件应用（如 `http://localhost:5173`）
2. 修改 `plugins.json` 中的 `url` 和 `allowedOrigin` 为本地地址
3. 启动主框架 `pnpm dev`
4. 在主框架中点击插件菜单加载你的插件

本地开发配置示例：

```json
{
  "id": "my-plugin-dev",
  "name": "我的插件 (开发)",
  "description": "本地开发中",
  "url": "http://localhost:5173",
  "icon": "Monitor",
  "group": "tools",
  "enabled": true,
  "order": 99,
  "allowedOrigin": "http://localhost:5173",
  "version": "0.0.1-dev"
}
```

### 8.2 调试技巧

- 在浏览器 DevTools 中可以切换到 iframe 的 console 上下文来查看插件日志
- 使用 `console.log` 在插件中输出收到的消息，确认通信正常
- 主框架的 MessageBus 在开发模式下会记录所有通信日志
- 如果消息被丢弃，检查 `allowedOrigin` 是否与插件实际 origin 一致

### 8.3 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 插件白屏 | iframe src 不可达 | 检查 URL 是否正确，插件服务是否启动 |
| 收不到 INIT 消息 | origin 不匹配 | 确保 `allowedOrigin` 与插件部署地址完全一致 |
| Token 为空 | 用户未登录 | 确保在登录状态下加载插件 |
| 加载超时 | 插件加载时间 > 30秒 | 优化插件体积，检查网络 |
| postMessage 无响应 | sandbox 限制 | 检查 sandbox 属性是否包含所需权限 |

## 9. 部署清单

插件上线前请确认：

- [ ] 插件部署在 HTTPS 地址
- [ ] `allowedOrigin` 与部署地址一致
- [ ] 插件正确处理 INIT 消息并发送 PLUGIN_READY
- [ ] 插件正确处理 TOKEN_UPDATE 消息
- [ ] 插件正确处理 DESTROY 消息（清理资源）
- [ ] Token 不写入 localStorage/cookie，不输出到日志
- [ ] 插件在 iframe sandbox 限制下正常工作
- [ ] `plugins.json` 中已添加正确的配置
- [ ] 在主框架中测试加载/卸载/重新加载流程

## 10. API 参考速查

### 插件 → 主框架

```javascript
// 通知就绪
window.parent.postMessage({
  type: 'PLUGIN_READY',
  id: `ready-${Date.now()}`
}, '*')

// 发起请求
window.parent.postMessage({
  type: 'REQUEST',
  id: `req-${Date.now()}`,
  payload: { action: 'getData', params: { key: 'value' } }
}, '*')

// 发送事件
window.parent.postMessage({
  type: 'EVENT',
  id: `evt-${Date.now()}`,
  payload: { action: 'userAction', data: { ... } }
}, '*')
```

### 主框架 → 插件（插件端监听）

```javascript
window.addEventListener('message', (event) => {
  const { type, id, payload, requestId } = event.data
  // type: 'INIT' | 'TOKEN_UPDATE' | 'RESPONSE' | 'EVENT' | 'DESTROY'
})
```
