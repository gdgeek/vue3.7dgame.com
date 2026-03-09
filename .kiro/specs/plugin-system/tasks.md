# 实现计划：插件宿主框架

## 概述

基于简化后的设计文档，插件系统是一个轻量级宿主框架：通过 iframe 加载外部插件 URL，通过 Token 认证，通过 PostMessage 通信。不包含任何插件源码、SDK 或沙箱执行引擎。

## 任务

- [x] 1. 定义类型
  - [x] 1.1 创建 `src/plugin-system/types/manifest.ts` - 定义 PluginManifest, PluginsConfig, MenuGroup 接口
  - [x] 1.2 创建 `src/plugin-system/types/index.ts` - 定义 PluginState, PluginInfo, PluginMessage, PluginMessageType, ValidationResult 类型，并统一导出 manifest.ts 的类型

- [x] 2. 实现核心模块
  - [x] 2.1 创建 `src/plugin-system/core/PluginRegistry.ts` - 实现插件注册/注销/查询/清单验证（IPluginRegistry 接口）
  - [ ]* 2.2 编写 PluginRegistry 属性测试 - Property 1: 注册往返, Property 2: 无效清单拒绝, Property 3: 有效清单接受, Property 4: 查询过滤
  - [x] 2.3 创建 `src/plugin-system/core/MessageBus.ts` - 实现 PostMessage 双向通信、origin 验证、订阅机制（IMessageBus 接口）
  - [ ]* 2.4 编写 MessageBus 属性测试 - Property 7: 消息来源验证, Property 8: 消息往返
  - [x] 2.5 创建 `src/plugin-system/core/PluginLoader.ts` - 实现 iframe 创建/销毁、Token 注入、sandbox 设置（IPluginLoader 接口）
  - [ ]* 2.6 编写 PluginLoader 属性测试 - Property 5: Token 注入, Property 9: iframe 沙箱属性, Property 10: 卸载清理

- [x] 3. 实现服务层
  - [x] 3.1 创建 `src/plugin-system/services/AuthService.ts` - 封装现有 Token store，提供 getAccessToken/onTokenChange/isAuthenticated
  - [ ]* 3.2 编写 AuthService 属性测试 - Property 6: Token 刷新传播, Property 14: Token 不泄露
  - [x] 3.3 创建 `src/plugin-system/services/ConfigService.ts` - 先加载静态 plugins.json 作为默认配置，再检查 `useDomainStore().defaultInfo` 中是否有 plugins 字段，有则按 id 合并覆盖（domain 优先）；domain 无 plugins 字段时只用静态配置；实现缓存和 refreshConfig
  - [ ]* 3.4 编写 ConfigService 属性测试 - Property 16: 配置合并与降级（domain 有/无 plugins 字段两种场景）

- [x] 4. 检查点 - 确保所有测试通过

- [x] 5. 实现核心协调器
  - [x] 5.1 创建 `src/plugin-system/core/PluginSystem.ts` - 协调 Registry/Loader/MessageBus/AuthService/ConfigService，管理插件生命周期和状态机
  - [ ]* 5.2 编写 PluginSystem 属性测试 - Property 11: 状态有效性, Property 12: 错误隔离, Property 13: 生命周期日志, Property 15: 懒加载
  - [x] 5.3 创建 `src/plugin-system/index.ts` - 入口文件，导出 PluginSystem 实例和 Vue 插件安装方法

- [x] 6. 实现状态管理和 API
  - [x] 6.1 创建 `src/store/modules/plugin-system.ts` - Pinia store，封装 PluginSystem 方法，管理 UI 状态
  - [x] 6.2 创建 `src/api/plugins/index.ts` - 插件相关 API 调用（如有后端接口）

- [x] 7. 实现 UI 组件
  - [x] 7.1 创建 `src/plugin-system/components/PluginMenu.vue` - 侧边栏分组菜单，点击加载插件
  - [x] 7.2 创建 `src/plugin-system/views/PluginContainer.vue` - iframe 容器，显示加载/错误状态
  - [x] 7.3 创建 `src/plugin-system/views/PluginLayout.vue` - 布局组件（菜单 + 容器）

- [x] 8. 集成路由和配置
  - [x] 8.1 在 `src/router/index.ts` 中添加 `/plugins/:pluginId?` 路由
  - [x] 8.2 创建 `public/config/plugins.json` - 插件配置文件

- [x] 9. 最终检查点 - 确保所有测试通过

## 备注

- 标记 `*` 的任务为属性测试任务（可选但推荐）
- 属性测试使用 fast-check 库，每个属性至少 100 次迭代
- 测试文件放在 `test/unit/plugin-system/` 目录下
- 所有代码使用 TypeScript，禁止 any 类型，2 空格缩进
- 使用 pnpm 管理依赖
