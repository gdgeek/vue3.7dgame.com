# Web 插件系统整理文档

本文档面向主框架（web）维护者，梳理插件系统的目录结构、核心模块、配置来源与运行时流程。若你需要开发插件端应用，请参考 `web/docs/plugin-development-guide.md`。

## 1. 目录结构与职责

- 核心实现：`web/src/plugin-system/core/`
  - `PluginSystem.ts`：插件系统总协调器，管理注册、加载、状态机与广播。
  - `PluginLoader.ts`：iframe 创建/销毁、加载超时、INIT 注入。
  - `PluginRegistry.ts`：插件清单注册与校验。
  - `MessageBus.ts`：postMessage 双向通信总线（origin 校验 + 路由）。
- 服务层：`web/src/plugin-system/services/`
  - `ConfigService.ts`：加载 plugins.json + domain 配置合并。
  - `AuthService.ts`：Token 读取与轮询监听，触发 TOKEN_UPDATE。
- 类型定义：`web/src/plugin-system/types/`
  - `manifest.ts`：plugins.json 结构与清单字段定义。
  - `index.ts`：运行时 PluginInfo / PluginMessage 类型。
- 视图层：`web/src/plugin-system/views/`
  - `PluginLayout.vue`：插件容器页，处理路由、加载、错误/空态。
  - `PluginDebug.vue`：调试面板（统计、清单、权限、JSON）。
- 组件：`web/src/plugin-system/components/PluginMenu.vue`（插件菜单）
- 工具：`web/src/plugin-system/utils/i18n.ts`（i18n 名称解析）
- 状态管理：`web/src/store/modules/plugin-system.ts`
- 路由：`web/src/router/modules/plugin.ts`
- 配置文件：`web/public/config/plugins.json`
- 构建期替换：`web/build/vite-plugin-env-json.ts`

## 2. 配置加载与合并

配置入口为 `public/config/plugins.json`，由 `ConfigService` 统一加载并缓存。

加载与合并策略（`web/src/plugin-system/services/ConfigService.ts`）：

1. 读取静态配置 `/config/plugins.json`。
2. 尝试从 `domainStore.defaultInfo` 中读取 `plugins` 字段（后端动态下发）。
3. 若存在 domain 配置，按 `id` 合并：domain 覆盖静态；新增插件追加。
4. 若 domain 未提供或尚未加载，回退仅静态配置。

补充：
- 开发/构建阶段会对 `plugins.json` 中的 `__VITE_XXX__` 占位符做环境变量替换（见 `web/build/vite-plugin-env-json.ts`）。

### plugins.json 关键字段

见 `web/src/plugin-system/types/manifest.ts`：

- `id`：唯一标识
- `name` / `nameI18n`
- `description`
- `url`：插件入口 URL（iframe src）
- `allowedOrigin`：消息来源白名单（MessageBus origin 校验）
- `sandbox`：iframe sandbox 覆盖（可选）
- `extraConfig`：透传给插件端 INIT 的配置
- `group` / `icon` / `order` / `enabled` / `version`

## 3. 运行时流程（主框架侧）

### 3.1 初始化流程

入口：`usePluginSystemStore().init()` -> `PluginSystem.initialize()`

1. `ConfigService.loadConfig()` 读取并合并配置。
2. 遍历所有 `enabled` 插件，注册到 `PluginRegistry`，同时生成 `PluginInfo`（状态 `unloaded`）。
3. `AuthService.onTokenChange()` 启动轮询，一旦 token 变化通过 `MessageBus` 广播 `TOKEN_UPDATE`。
4. `MessageBus.onMessageType("PLUGIN_READY")` 监听插件就绪事件。

### 3.2 激活流程（加载插件）

入口：`PluginLayout.vue` 监听路由变化，调用 `store.activatePlugin()`。

1. `PluginSystem.loadPlugin()` 将插件状态切换为 `loading`。
2. `PluginLoader.load()` 创建 iframe，等待 `load`，注册连接到 `MessageBus`。
3. 插件端发送 `PLUGIN_READY`。
4. `PluginSystem.handlePluginReady()` 发送 `INIT`（token + extraConfig）。
5. 状态机进入 `active`。

### 3.3 卸载流程

入口：`store.deactivatePlugin()`

1. 若插件 `active`，先发送 `DESTROY`。
2. `PluginLoader.unload()` 移除 iframe。
3. 从 `MessageBus` 注销连接。
4. 状态机进入 `unloaded`。

### 3.4 状态机

`PluginSystem.ts` 内部强制状态迁移：

- `unloaded -> loading -> active | error`
- `active -> unloaded`
- `error -> loading | unloaded`

## 4. 通信协议（主框架侧视角）

插件通信基于 postMessage，类型定义见 `web/src/plugin-system/types/index.ts`。

主要类型：
- `INIT`、`PLUGIN_READY`、`TOKEN_UPDATE`、`THEME_CHANGE`、`REQUEST`、`RESPONSE`、`EVENT`、`DESTROY`

插件端实现与详细协议请参考：
- `web/docs/plugin-development-guide.md`

## 5. 菜单与权限逻辑

插件菜单渲染由 `store.modules/plugin-system.ts` 管理。

关键策略：

- 插件是否可见：
  - 必须 `enabled=true` 且权限 API 返回 `actions.length > 0`。
  - 默认收口：未拿到权限或返回空数组则隐藏。
- 权限获取逻辑：
  - API：`GET /v1/plugin/allowed-actions?plugin_name=xxx`。
  - 若 API 404，则认为后端未实现，所有插件放开：`actions = ["*"]`。

侧边栏集成位置：
- `web/src/layout/components/Sidebar/SidebarLeft.vue`

## 6. 主题与语言透传

- 语言：`PluginLayout.vue` 在加载插件时将 `lang` 作为 query 参数追加到 `url`。
- 主题：`PluginLayout.vue` 监听主题变化，广播 `THEME_CHANGE`。同时加载时会把 `theme` 加到 url query。

## 7. 调试面板

`/plugin-debug` 路由（仅开发环境使用）提供：

- 配置概览
- 运行时插件状态
- 清单内容
- 权限分配
- 原始 JSON 输出

见 `web/src/plugin-system/views/PluginDebug.vue`。

## 8. 测试与注意事项

- 配置加载单测：`web/test/unit/plugin-system/ConfigService.spec.ts`
- MessageBus 会对 `event.origin` 进行严格匹配，不在 `allowedOrigin` 的消息会被丢弃。
- `AuthService` 通过轮询检测 token 变化（默认 1s）。

## 9. 常见维护入口

- 新增/修改插件：更新 `web/public/config/plugins.json`（或 domain 下发）。
- 插件权限问题：检查 `pluginPermissions` 与 `/v1/plugin/allowed-actions` 响应。
- 插件初始化失败：查看 `PluginDebug` 面板中的 `lastError`。

