# Requirements Document

## Introduction

本规格文档旨在修复实体复制功能的 bug。当前实现只复制了部分字段（title、uuid、image_id、metaCode），导致复制后的实体缺失重要数据（data、info、events、prefab）。本需求确保复制功能能够完整地复制实体的所有必要配置和数据。

## Glossary

- **Entity (实体)**: 系统中的元数据对象，包含配置、数据、事件和代码等信息
- **Copy_Function (复制函数)**: 位于 `src/views/meta/list.vue` 中的 `copy()` 函数，负责复制实体
- **Meta_API (实体API)**: 后端 API 接口，用于创建、读取、更新实体数据
- **MetaCode (实体代码)**: 实体的 Lua/Blockly 代码配置
- **Events (事件配置)**: 实体的输入输出事件配置，包含 inputs 和 outputs 数组
- **Data (实体数据)**: 实体的核心数据结构
- **Info (实体信息)**: 实体的描述信息
- **Prefab (预制体标记)**: 标识实体是否为预制体的数值字段

## Requirements

### Requirement 1: 完整复制实体数据字段

**User Story:** 作为用户，我希望复制实体时能够复制所有必要的数据字段，以便复制后的实体与原实体具有相同的配置和功能。

#### Acceptance Criteria

1. WHEN 用户触发实体复制操作 THEN THE Copy_Function SHALL 从原实体获取完整的数据
2. WHEN 创建新实体时 THEN THE Copy_Function SHALL 复制 data 字段到新实体
3. WHEN 创建新实体时 THEN THE Copy_Function SHALL 复制 info 字段到新实体
4. WHEN 创建新实体时 THEN THE Copy_Function SHALL 复制 events 字段到新实体
5. WHEN 创建新实体时 THEN THE Copy_Function SHALL 复制 prefab 字段到新实体
6. WHEN 创建新实体时 THEN THE Copy_Function SHALL 保持复制 image_id 字段到新实体
7. WHEN 创建新实体时 THEN THE Copy_Function SHALL 保持复制 metaCode 字段到新实体

### Requirement 2: 生成唯一标识符

**User Story:** 作为系统，我需要为复制的实体生成新的唯一标识符，以便区分原实体和复制实体。

#### Acceptance Criteria

1. WHEN 创建新实体时 THEN THE Copy_Function SHALL 生成新的 uuid 值
2. WHEN 创建新实体时 THEN THE Copy_Function SHALL 使用用户提供的新 title 值
3. WHEN 新实体创建成功后 THEN THE Meta_API SHALL 自动分配新的 id 值

### Requirement 3: 保持向后兼容性

**User Story:** 作为开发者，我希望修复后的复制功能能够处理各种数据状态，以便系统在不同情况下都能正常工作。

#### Acceptance Criteria

1. WHEN 原实体的 data 字段为 null THEN THE Copy_Function SHALL 正确处理并复制 null 值
2. WHEN 原实体的 info 字段为 null THEN THE Copy_Function SHALL 正确处理并复制 null 值
3. WHEN 原实体的 events 字段为 null THEN THE Copy_Function SHALL 正确处理并复制 null 值
4. WHEN 原实体的 metaCode 字段不存在或为 undefined THEN THE Copy_Function SHALL 正确处理并使用默认值

### Requirement 4: 错误处理和用户反馈

**User Story:** 作为用户，我希望在复制操作失败时能够收到清晰的错误提示，以便了解问题所在。

#### Acceptance Criteria

1. WHEN 复制操作成功完成 THEN THE Copy_Function SHALL 显示成功消息并刷新列表
2. WHEN 复制操作失败 THEN THE Copy_Function SHALL 显示错误消息
3. WHEN 复制操作进行中 THEN THE Copy_Function SHALL 显示加载状态
4. WHEN 复制操作完成或失败后 THEN THE Copy_Function SHALL 清除加载状态

### Requirement 5: API 调用顺序

**User Story:** 作为系统，我需要按正确的顺序调用 API，以便确保数据完整性和一致性。

#### Acceptance Criteria

1. WHEN 开始复制操作 THEN THE Copy_Function SHALL 首先调用 getMeta 获取原实体完整数据
2. WHEN 获取原实体数据后 THEN THE Copy_Function SHALL 调用 postMeta 创建新实体（包含所有必要字段）
3. WHEN 新实体创建成功后 THEN THE Copy_Function SHALL 调用 putMetaCode 更新代码配置
4. WHEN 所有 API 调用成功后 THEN THE Copy_Function SHALL 刷新实体列表
