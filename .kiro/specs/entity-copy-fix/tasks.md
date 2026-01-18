# Implementation Plan: Entity Copy Fix

## Overview

本实现计划修复实体复制功能的 bug，确保复制时包含所有必要的数据字段（data、info、events、prefab）。修改仅限于 `src/views/meta/list.vue` 中的 `copy()` 函数，不涉及 API 层或后端变更。

## Tasks

- [x] 1. 修改 copy() 函数以复制完整字段
  - [x] 1.1 更新 postMeta 调用以包含所有数据字段
    - 在 `newMeta` 对象中添加 `data`、`info`、`events`、`prefab` 字段
    - 确保直接复制字段值，包括 null 值（不使用默认值替换）
    - 保持现有的 `title`、`uuid`、`image_id` 字段
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 3.2, 3.3_

  - [x] 1.2 改进 metaCode 的 null 值处理
    - 添加条件检查：只在 `meta.metaCode` 存在时调用 `putMetaCode()`
    - 移除 `metaCode?.lua` 的可选链，因为已经检查了 `metaCode` 存在
    - _Requirements: 1.7, 3.4_

  - [x] 1.3 添加 expand 参数以获取完整数据
    - 在调用 `getMeta(id)` 时添加 `{ expand: 'image,author' }` 参数
    - 确保获取到完整的关联数据（image 对象）
    - 添加调试日志以验证 image_id 的复制
    - _Requirements: 1.1, 1.8_

- [x] 2. 设置测试环境
  - [x] 2.1 安装 fast-check 测试库
    - 运行 `npm install --save-dev fast-check @types/fast-check`
    - 验证测试框架配置正确
    - _Requirements: Testing Strategy_

  - [x] 2.2 创建测试文件结构
    - 创建 `src/views/meta/__tests__/list.spec.ts` 用于单元测试
    - 创建 `src/views/meta/__tests__/list.property.spec.ts` 用于属性测试
    - 创建 `src/views/meta/__tests__/generators.ts` 用于测试数据生成器
    - _Requirements: Testing Strategy_

- [x] 3. 实现测试数据生成器
  - [x] 3.1 创建 metaInfo 数据生成器
    - 在 `generators.ts` 中实现 `arbitraryMetaInfo` 生成器
    - 生成包含所有字段的随机实体数据
    - 确保生成器能产生 null 值以测试边界情况
    - _Requirements: Testing Strategy_

  - [x] 3.2 创建辅助生成器
    - 实现 `arbitraryNewTitle` 生成器（随机标题字符串）
    - 实现 `arbitraryEvents` 生成器（events 对象）
    - 实现 `arbitraryMetaCode` 生成器（metaCode 对象）
    - _Requirements: Testing Strategy_

- [x] 4. 编写单元测试
  - [x] 4.1 测试 API 调用顺序
    - Mock getMeta、postMeta、putMetaCode API 调用
    - 验证调用顺序：getMeta → postMeta → putMetaCode
    - 验证每个 API 被调用时的参数正确
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 4.2 测试成功场景
    - Mock 成功的 API 响应
    - 验证成功消息显示（ElMessage.success）
    - 验证列表刷新被调用（refreshList）
    - _Requirements: 4.1_

  - [x] 4.3 测试错误场景
    - Mock getMeta 失败的情况
    - Mock postMeta 失败的情况
    - 验证错误消息显示（ElMessage.error）
    - 验证加载状态被正确清除
    - _Requirements: 4.2_

  - [x] 4.4 测试边界情况
    - 测试 metaCode 为 undefined 时跳过 putMetaCode 调用
    - 测试 data、info、events 为 null 时正确复制
    - 验证 null 值不被转换为默认值
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 4.5 测试完整数据获取
    - 验证 getMeta 被调用以获取完整实体数据
    - 验证返回的数据包含所有必要字段
    - _Requirements: 1.1_

- [x] 5. 编写属性测试
  - [x] 5.1 Property 1: 字段完整复制测试
    - 使用 arbitraryMetaInfo 生成随机实体
    - 执行复制操作
    - 验证 data、info、events、prefab、image_id 字段相同
    - 配置 100 次迭代
    - 添加标签：`Feature: entity-copy-fix, Property 1: 字段完整复制`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 5.2 Property 2: MetaCode 完整复制测试
    - 生成包含 metaCode 的随机实体
    - 执行复制操作
    - 验证 lua 和 blockly 代码相同
    - 配置 100 次迭代
    - 添加标签：`Feature: entity-copy-fix, Property 2: MetaCode 完整复制`
    - _Requirements: 1.7_

  - [x] 5.3 Property 3: UUID 唯一性测试
    - 生成随机实体
    - 执行复制操作
    - 验证新 UUID 与原 UUID 不同
    - 验证新 UUID 符合 UUID v4 格式
    - 配置 100 次迭代
    - 添加标签：`Feature: entity-copy-fix, Property 3: UUID 唯一性`
    - _Requirements: 2.1_

  - [x] 5.4 Property 4: 标题更新测试
    - 生成随机实体和随机新标题
    - 执行复制操作
    - 验证新实体使用新标题而非原标题
    - 配置 100 次迭代
    - 添加标签：`Feature: entity-copy-fix, Property 4: 标题更新`
    - _Requirements: 2.2_

  - [x] 5.5 Property 5: ID 自动生成测试
    - 生成随机实体
    - 执行复制操作
    - 验证新 ID 与原 ID 不同
    - 配置 100 次迭代
    - 添加标签：`Feature: entity-copy-fix, Property 5: ID 自动生成`
    - _Requirements: 2.3_

  - [x] 5.6 Property 6: 加载状态管理测试
    - 生成随机实体
    - 执行复制操作（模拟成功和失败场景）
    - 验证加载状态在操作中为 true
    - 验证加载状态在完成后为 false
    - 配置 100 次迭代
    - 添加标签：`Feature: entity-copy-fix, Property 6: 加载状态管理`
    - _Requirements: 4.3, 4.4_

- [x] 6. Checkpoint - 运行所有测试
  - 运行单元测试和属性测试
  - 确保所有测试通过
  - 如有问题，询问用户

- [ ] 7. 手动测试验证
  - [ ] 7.1 在开发环境中测试复制功能
    - 复制包含所有字段的完整实体
    - 复制字段为 null 的实体
    - 复制没有 metaCode 的实体
    - 验证复制后的实体可以正常编辑
    - 验证复制后的实体可以再次复制
    - 验证错误情况下的用户反馈
    - _Requirements: All_

- [x] 8. 运行测试并验证
  - [x] 8.1 运行单元测试
    - 执行 `npm run test src/views/meta/__tests__/list.spec.ts`
    - 确保所有单元测试通过 ✅ 18/18 测试通过
    - 如有失败，分析并修复问题
    - _Requirements: Testing Strategy_

  - [x] 8.2 运行属性测试
    - 执行 `npm run test src/views/meta/__tests__/list.property.spec.ts`
    - 确保所有属性测试通过（每个测试 100 次迭代） ✅ 6/6 属性测试通过
    - 如有失败，分析反例并修复问题
    - _Requirements: Testing Strategy_

  - [ ] 8.3 验证测试覆盖率
    - 检查测试覆盖率报告
    - 确保 copy() 函数的所有分支都被覆盖
    - _Requirements: Testing Strategy_

## Notes

- 核心修改集中在任务 1，其他任务主要是测试相关
- 属性测试使用 fast-check 库，每个测试运行 100 次迭代
- 所有测试都应该引用对应的需求编号以保持可追溯性
- Checkpoint 任务确保在完成后进行验证
- 所有任务都是必需的，以确保全面的测试覆盖
