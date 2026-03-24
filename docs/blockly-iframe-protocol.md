# Blockly 编辑器 iframe 通信协议

## 概述

Blockly 脚本编辑器以 iframe 方式嵌入主系统弹窗/页面中，通过 `window.postMessage` 进行双向通信。本协议基于插件系统的标准信封格式 `{ type, id, payload }`，但不经过 PluginSystem/MessageBus 注册，而是由 `useScriptEditorBase` composable 直接管理。

> **注意**：通用插件系统（PluginSystem）已统一采用与 Blockly 相同的"先 PLUGIN_READY 后 INIT"握手模式。两者的握手时序现在完全一致，区别仅在于管理方式和 INIT payload 结构。

## 信封格式

所有消息遵循统一结构：

```typescript
interface Message {
  type: string           // 消息类型（路由层）
  id: string             // 唯一消息 ID（时间戳 + 随机串）
  payload?: unknown      // 消息负载
  requestId?: string     // 关联的请求 ID（仅 RESPONSE 使用）
}
```

`type` 是信封层字段，决定消息走哪条路由分支。`payload` 内部的 `action` / `event` 是业务层字段，区分同一 type 下的不同操作。

## 消息类型一览

| type | 方向 | 说明 |
|------|------|------|
| `INIT` | 主系统 → Blockly | 初始化编辑器，传入配置和数据 |
| `PLUGIN_READY` | Blockly → 主系统 | 编辑器加载完成 |
| `REQUEST` | 主系统 → Blockly | 请求执行操作（如保存） |
| `RESPONSE` | Blockly → 主系统 | 对 REQUEST 的响应 |
| `EVENT` | Blockly → 主系统 | 主动通知（工作区更新、错误） |
| `THEME_CHANGE` | 主系统 → Blockly | 主题切换通知 |
| `DESTROY` | 主系统 → Blockly | 即将销毁，执行清理 |

## 生命周期时序

```
1. 主系统创建 iframe，src = Blockly URL + ?language=xx&v=buildVersion
2. Blockly 加载完成，发送 PLUGIN_READY
3. 主系统收到 PLUGIN_READY，调用 onReady → 发送 INIT
4. Blockly 收到 INIT，初始化工作区
5. 运行时：Blockly 通过 EVENT 实时推送工作区变更
6. 保存时：主系统发送 REQUEST { action: 'save' }，Blockly 回复 RESPONSE
7. 主题切换时：主系统发送 THEME_CHANGE
8. 页面卸载前：主系统发送 DESTROY
```

## 各消息详解

### INIT（主系统 → Blockly）

初始化编辑器。由各调用方（ScriptEditorModal、meta/script、verse/script）在 `onReady` 回调中发送。

```typescript
{
  type: "INIT",
  id: "1711234567890-abc1234",
  payload: {
    token: null,                    // 预留，Blockly 目前不需要 token
    config: {
      style: "base" | ["base", "verse"],  // 工具箱样式
      parameters: {                       // 编辑器参数（index、resource 等）
        index: number,
        resource?: object
      },
      data: object,                       // Blockly 工作区 JSON 数据
      userInfo: {                         // 用户信息（控制权限）
        id: number | null,
        role: string
      }
    }
  }
}
```

### PLUGIN_READY（Blockly → 主系统）

Blockly 在 `useMessageBridge` 的 `onMounted` 中自动发送，表示消息桥接已就绪。

```typescript
{
  type: "PLUGIN_READY",
  id: "1711234567890-xyz5678"
}
```

### REQUEST（主系统 → Blockly）

目前只有一个 action：`save`。

```typescript
// 保存请求
{
  type: "REQUEST",
  id: "1711234567890-save123",
  payload: {
    action: "save"
  }
}
```

Blockly 侧也可以通过 Ctrl+S 快捷键触发保存，此时内部直接调用 save handler，不经过 postMessage。

### RESPONSE（Blockly → 主系统）

对 REQUEST 的响应，通过 `postResponse` 发送，自动附加 `requestId`。

```typescript
// 有变更的保存响应
{
  type: "RESPONSE",
  id: "1711234567891-resp456",
  payload: {
    action: "save",
    js: "// generated JavaScript code...",
    lua: "-- generated Lua code...",
    data: { /* Blockly workspace JSON */ }
  },
  requestId: "1711234567890-save123"
}

// 无变更的保存响应
{
  type: "RESPONSE",
  id: "1711234567891-resp789",
  payload: {
    action: "save",
    noChange: true
  },
  requestId: "1711234567890-save123"
}
```

### EVENT（Blockly → 主系统）

Blockly 主动推送的通知，通过 `payload.event` 区分事件类型。

```typescript
// 工作区实时更新（每次积木变化时触发）
{
  type: "EVENT",
  id: "1711234567892-evt001",
  payload: {
    event: "update",
    lua: "-- current Lua code...",
    js: "// current JavaScript code...",
    blocklyData: { /* current workspace JSON */ }
  }
}

// 错误通知
{
  type: "EVENT",
  id: "1711234567893-evt002",
  payload: {
    event: "error",
    message: "Workspace failed to initialize within 5 seconds"
  }
}
```

### THEME_CHANGE（主系统 → Blockly）

主系统 `isDark` 变化时自动推送。

```typescript
{
  type: "THEME_CHANGE",
  id: "1711234567894-theme01",
  payload: {
    theme: "dark" | "light",
    dark: boolean
  }
}
```

Blockly 侧通过 `useTheme().setDark(payload.dark)` 处理。

### DESTROY（主系统 → Blockly）

页面 `onBeforeUnmount` 时发送，Blockly 收到后执行 `workspace.dispose()`。

```typescript
{
  type: "DESTROY",
  id: "1711234567895-destroy01"
}
```

## 关键实现文件

| 文件 | 角色 |
|------|------|
| `plugins/blockly.7dgame.com/src/composables/useMessageBridge.ts` | Blockly 侧消息桥接（收发、路由、postResponse） |
| `plugins/blockly.7dgame.com/src/composables/useTheme.ts` | Blockly 侧主题管理（setDark、isDark） |
| `plugins/blockly.7dgame.com/src/App.vue` | Blockly 侧消息处理（INIT、REQUEST、THEME_CHANGE、DESTROY） |
| `web/src/composables/useScriptEditorBase.ts` | 主系统侧核心（postMessage、handleMessage、save） |
| `web/src/components/ScriptEditorModal.vue` | 调用方：Meta 弹窗编辑器 |
| `web/src/components/MetaScriptEditorModal.vue` | 调用方：Meta 弹窗编辑器（另一入口） |
| `web/src/views/meta/script.vue` | 调用方：Meta 脚本页面 |
| `web/src/views/verse/script.vue` | 调用方：Verse 脚本页面 |

## 与通用插件协议的区别

| 特性 | 通用插件（PluginSystem） | Blockly 编辑器 |
|------|------------------------|---------------|
| 注册方式 | plugins.json + MessageBus | 无注册，直接 iframe |
| 管理者 | PluginSystem.ts | useScriptEditorBase.ts |
| INIT payload | `{ token, config }` | `{ token: null, config: { style, parameters, data, userInfo } }` |
| 消息过滤 | origin 校验 | `event.source === window.parent` |
| TOKEN_UPDATE | 支持 | 接收但不使用（token 在 INIT 时为 null） |
| 自定义 REQUEST | 通用 | 仅 `{ action: 'save' }` |
| 自定义 EVENT | 通用 | `update`（工作区变更）、`error`（错误） |
| 握手顺序 | 先 PLUGIN_READY 后 INIT（已统一） | 先 PLUGIN_READY 后 INIT |
