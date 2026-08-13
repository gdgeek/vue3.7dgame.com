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
  payload?: Record<string, unknown>  // 消息负载
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
| `SAVE_ACK` | 主系统 → Blockly | 确认保存载荷已完成服务端持久化 |
| `SAVE_NACK` | 主系统 → Blockly | 保存载荷持久化失败，保留待保存状态以便重试 |
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
6. 保存时：主系统发送 REQUEST，Blockly 回复 RESPONSE；持久化成功后主系统发送 SAVE_ACK，失败则发送 SAVE_NACK
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
      code?: {                            // 可选；当前已保存的原始生成代码
        js: string,
        lua: string
      },
      persisted?: {                       // v2；服务端确认的保存基线
        data: object,                     // 与 data 分离，data 可为未保存草稿
        code: { js: string, lua: string }
      },
      hostSessionId?: string,             // v2；当前 iframe/脚本会话标识
      userInfo: {                         // 用户信息（控制权限）
        id: number | null,
        role: string
      }
    }
  }
}
```

`data` 表示本次 iframe 应加载的工作区，语言切换或 iframe 重建时可以是尚未保存的草稿；`persisted` 始终表示服务端最后确认的工作区和代码。新版 Blockly 必须用 `persisted` 建立 dirty/save 基线，并在 `EVENT`、`RESPONSE` 中原样回传 `hostSessionId`。旧版不识别这些字段时仍按 `data`、`code` 工作。

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
    action: "save",
    hostSessionId: "script-...",
    workspaceRevision: 12
  }
}
```

新版 Blockly 通过 `EVENT { event: "save-request" }` 把 Ctrl/Cmd+S 交给宿主，再由宿主发送带会话和 revision 的标准 `REQUEST`。滚动发布期间，宿主仍兼容旧版 Blockly 直接返回的可信 `RESPONSE`，但 v2 会话一旦确认就只接受标准请求关联响应。

### RESPONSE（Blockly → 主系统）

对 REQUEST 的响应，通过 `postResponse` 发送，自动附加 `requestId`。

```typescript
// 有变更的保存响应
{
  type: "RESPONSE",
  id: "1711234567891-resp456",
  payload: {
    action: "save",
    saveId: "save-1711234567891-1",      // 用于持久化成功确认
    js: "// generated JavaScript code...",
    lua: "-- generated Lua code...",
    data: { /* Blockly workspace JSON */ },
    warnings: [                           // 可选；不会阻止保存
      {
        code: "invalid-generated-javascript",
        message: "生成的 JavaScript 存在语法错误",
        language: "javascript",
        line: 12,
        column: 8
      }
    ]
  },
  requestId: "1711234567890-save123"
}

// 无变更的保存响应
{
  type: "RESPONSE",
  id: "1711234567891-resp789",
  payload: {
    action: "save",
    noChange: true,
    hostSessionId: "script-...",
    workspaceRevision: 12,
    js: "// compared JavaScript code...",
    lua: "-- compared Lua code...",
    data: { /* compared Blockly workspace JSON */ },
    warnings: ["存在未连接到流程的积木"] // 同样可选
  },
  requestId: "1711234567890-save123"
}
```

`noChange` 必须返回本次比较使用的完整快照。宿主只把该快照推进为已保存基线；如果保存请求发出后又有编辑，更新后的内容继续保持 dirty，不会被迟到的 `noChange` 清除。

`warnings` 是向后兼容的可选字段，推荐使用带 `message` 的对象；主系统也兼容字符串。主系统只读取非空字符串或对象中的非空 `message`，忽略其他内容。警告不会改变 `action: "save"` 的成功语义：有变更时先完成服务端保存，无变更时完成正常响应，然后显示一条简洁的警告汇总。

`action: "save-error"` 仅保留给无法构造保存载荷的技术故障，例如工作区序列化失败。脚本结构问题及已经生成出的 JavaScript/Lua 语法问题应放入 `warnings`，不能用于阻断保存。某一种语言的代码生成器执行失败时，Blockly 应使用 INIT 中的 `config.code` 回退并附带警告，避免以空字符串覆盖当前已保存代码。

主系统完成服务端持久化后，会把 `saveId` 原样回传。Blockly 只有收到该确认后才推进“已保存”快照；若服务端保存失败则不确认，下一次保存仍会发送完整数据：

```js
{
  type: "SAVE_ACK",
  id: "1711234567999-ack123",
  payload: { saveId: "save-1711234567891-1" }
}
```

`SAVE_ACK` 同样向后兼容：旧版 Blockly 会忽略它；新版 Blockly 面对不会回执的旧宿主时会重复发送完整保存载荷，以数据安全优先。

如果主系统未能完成服务端持久化（包括脚本在响应到达前变为不可保存），不得发送 `SAVE_ACK`。当响应携带 `saveId` 时，主系统发送失败确认，Blockly 保留对应保存载荷和 dirty 状态，允许用户再次保存：

```js
{
  type: "SAVE_NACK",
  id: "1711234568000-nack123",
  payload: { saveId: "save-1711234567891-1" }
}
```

`SAVE_ACK` 是服务端已持久化的唯一成功证明；仅显示成功提示、提前返回或本地处理完成都不能视为保存成功。

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
    blocklyData: { /* current workspace JSON */ },
    dirty: true,
    workspaceRevision: 12,
    hostSessionId: "script-..."
  }
}

// Blockly 内部 Ctrl/Cmd+S 请求宿主发起标准保存握手
{
  type: "EVENT",
  id: "1711234567892-save001",
  payload: {
    event: "save-request",
    hostSessionId: "script-..."
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

宿主仅处理来自当前 iframe `contentWindow`、预期 Blockly origin 和当前 `hostSessionId` 的消息；旧 frame、旧会话及倒退的 `workspaceRevision` 会被忽略。Blockly 声明 `dirty` 时该值是权威状态，宿主仅对旧版 Blockly 使用快照签名回退。

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
| INIT payload | `{ token, config }` | `{ token: null, config: { style, parameters, data, code, userInfo } }` |
| 消息过滤 | origin 校验 | `event.source === window.parent` |
| TOKEN_UPDATE | 支持 | 接收但不使用（token 在 INIT 时为 null） |
| 自定义 REQUEST | 通用 | 仅 `{ action: 'save' }` |
| 自定义 EVENT | 通用 | `update`（工作区变更）、`error`（错误） |
| 握手顺序 | 先 PLUGIN_READY 后 INIT（已统一） | 先 PLUGIN_READY 后 INIT |
