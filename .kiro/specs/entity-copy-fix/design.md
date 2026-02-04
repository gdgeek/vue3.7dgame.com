# Design Document: Entity Copy Fix

## Overview

本设计文档描述了如何修复实体复制功能的 bug。当前的 `copy()` 函数只复制了部分字段（title、uuid、image_id、metaCode），导致复制后的实体缺失关键数据。本设计将修改 `copy()` 函数，确保复制所有必要的字段，包括 data、info、events 和 prefab。

修复方案的核心是在调用 `postMeta()` 时传递完整的字段集合，而不仅仅是 title、uuid 和 image_id。

## Architecture

本修复涉及的架构层次：

```
┌─────────────────────────────────────┐
│   Vue Component (list.vue)          │
│   ┌─────────────────────────────┐   │
│   │  copy() function            │   │
│   │  - Get original entity      │   │
│   │  - Create new entity        │   │
│   │  - Update code              │   │
│   └─────────────────────────────┘   │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│   API Layer (meta.ts)                │
│   - getMeta(id)                      │
│   - postMeta(data)                   │
│   - putMetaCode(id, code)            │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│   Backend API                        │
│   - GET /metas/:id                   │
│   - POST /metas                      │
│   - PUT /metas/:id/code              │
└─────────────────────────────────────┘
```

修改仅限于 `copy()` 函数的实现，不涉及 API 层或后端的变更。

## Components and Interfaces

### Modified Component: copy() Function

**位置**: `src/views/meta/list.vue`

**当前实现问题**:
```typescript
const copy = async (id: number, newTitle: string) => {
  copyLoadingMap.value.set(id, true);
  try {
    const response = await getMeta(id);
    const meta = response.data;

    // ❌ 问题：只复制了部分字段
    const newMeta = {
      title: newTitle,
      uuid: uuidv4(),
      image_id: meta.image_id,
    };

    const createResponse = await postMeta(newMeta);
    const newMetaId = createResponse.data.id;

    // ❌ 问题：metaCode 可能为 undefined
    await putMetaCode(newMetaId, {
      lua: meta.metaCode?.lua,
      blockly: meta.metaCode?.blockly || "",
    });

    refreshList();
  } catch (error) {
    console.error(error);
    ElMessage.error(t("meta.copy.error"));
  } finally {
    copyLoadingMap.value.set(id, false);
  }
};
```

**修复后的实现**:
```typescript
const copy = async (id: number, newTitle: string) => {
  copyLoadingMap.value.set(id, true);
  try {
    // 1. 获取原实体的完整数据
    const response = await getMeta(id);
    const meta = response.data;

    // 2. 创建新实体，包含所有必要字段
    const newMeta = {
      title: newTitle,           // 新标题（用户输入）
      uuid: uuidv4(),            // 新 UUID
      image_id: meta.image_id,   // 复制图片 ID
      data: meta.data,           // ✅ 复制实体数据
      info: meta.info,           // ✅ 复制实体信息
      events: meta.events,       // ✅ 复制事件配置
      prefab: meta.prefab,       // ✅ 复制预制体标记
    };

    const createResponse = await postMeta(newMeta);
    const newMetaId = createResponse.data.id;

    // 3. 更新代码配置（如果存在）
    if (meta.metaCode) {
      await putMetaCode(newMetaId, {
        lua: meta.metaCode.lua,
        blockly: meta.metaCode.blockly || "",
      });
    }

    refreshList();
  } catch (error) {
    console.error(error);
    ElMessage.error(t("meta.copy.error"));
  } finally {
    copyLoadingMap.value.set(id, false);
  }
};
```

### Interface: metaInfo Type

**位置**: `src/api/v1/meta.ts`

```typescript
export type metaInfo = {
  id: number;                    // 实体 ID（自动生成）
  author_id: number;             // 作者 ID（自动设置）
  info: string | null;           // ✅ 需要复制
  data: any | null;              // ✅ 需要复制
  created_at?: string;           // 创建时间（自动生成）
  image_id: number | null;       // ✅ 已复制
  uuid: string;                  // ✅ 需要生成新值
  events: Events | null;         // ✅ 需要复制
  title: string;                 // ✅ 需要使用新值
  prefab: number;                // ✅ 需要复制
  image: ImageDetails;           // 关联数据（通过 image_id）
  resources: ResourceInfo[];     // 关联数据（不需要复制）
  editable: boolean;             // 权限标记（自动设置）
  viewable: boolean;             // 权限标记（自动设置）
  custome?: boolean;             // 自定义标记（可选）
  cyber: cybersType;             // 关联数据（不需要复制）
  author?: Author;               // 关联数据（不需要复制）
  verseMetas: any[];             // 关联数据（不需要复制）
  metaCode?: MetaCode;           // ✅ 已通过 putMetaCode 复制
};
```

**字段分类**:

1. **需要生成新值的字段**:
   - `uuid`: 使用 `uuidv4()` 生成
   - `title`: 使用用户输入的新标题

2. **需要复制的字段**:
   - `image_id`: 图片引用
   - `data`: 实体核心数据
   - `info`: 实体描述信息
   - `events`: 事件配置（inputs/outputs）
   - `prefab`: 预制体标记
   - `metaCode`: 通过单独的 API 调用复制

3. **自动生成/设置的字段**（不需要在 postMeta 中提供）:
   - `id`: 后端自动生成
   - `author_id`: 后端根据当前用户设置
   - `created_at`: 后端自动设置
   - `editable`, `viewable`: 后端根据权限设置

4. **关联数据字段**（不需要复制）:
   - `image`, `resources`, `cyber`, `author`, `verseMetas`: 这些是通过关联查询获取的，不需要在创建时提供

## Data Models

### Events Type

```typescript
export type Events = {
  inputs: any[];    // 输入事件数组
  outputs: any[];   // 输出事件数组
};
```

事件配置定义了实体的输入输出接口。复制时需要保持这些配置，以确保复制后的实体具有相同的事件处理能力。

### MetaCode Type

```typescript
export type MetaCode = {
  blockly: string;  // Blockly 可视化代码
  lua?: string;     // Lua 脚本代码
  js?: string;      // JavaScript 代码（可选）
};
```

代码配置通过单独的 API 端点（`putMetaCode`）更新，因为它可能包含大量文本数据。

### Null Value Handling

所有可为 null 的字段（`info`, `data`, `events`, `image_id`）都需要正确处理：

```typescript
// ✅ 正确：直接复制，即使是 null
const newMeta = {
  data: meta.data,        // 可能是 null
  info: meta.info,        // 可能是 null
  events: meta.events,    // 可能是 null
  image_id: meta.image_id // 可能是 null
};

// ❌ 错误：不要使用默认值替换 null
const newMeta = {
  data: meta.data || {},  // 错误：改变了数据语义
  info: meta.info || "",  // 错误：null 和空字符串不同
};
```

## Correctness Properties

*属性（Property）是一个特征或行为，它应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*


### Property 1: 字段完整复制

*对于任意*实体，当执行复制操作时，新实体应该包含原实体的所有数据字段（data、info、events、prefab、image_id），且这些字段的值应该与原实体相同（包括 null 值）。

**Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6**

### Property 2: MetaCode 完整复制

*对于任意*包含 metaCode 的实体，当执行复制操作时，新实体的 metaCode（lua 和 blockly）应该与原实体相同。

**Validates: Requirements 1.7**

### Property 3: UUID 唯一性

*对于任意*实体，当执行复制操作时，新实体的 uuid 应该与原实体不同，且应该是有效的 UUID v4 格式。

**Validates: Requirements 2.1**

### Property 4: 标题更新

*对于任意*新标题字符串，当执行复制操作时，新实体的 title 应该等于用户提供的新标题，而不是原实体的标题。

**Validates: Requirements 2.2**

### Property 5: ID 自动生成

*对于任意*实体，当复制操作成功完成时，新实体应该有一个新的 id 值，且该 id 应该与原实体的 id 不同。

**Validates: Requirements 2.3**

### Property 6: 加载状态管理

*对于任意*复制操作，在操作进行中时应该设置加载状态为 true，在操作完成（无论成功或失败）后应该清除加载状态为 false。

**Validates: Requirements 4.3, 4.4**

## Error Handling

### Error Scenarios

1. **API 调用失败**:
   - `getMeta()` 失败：无法获取原实体数据
   - `postMeta()` 失败：无法创建新实体
   - `putMetaCode()` 失败：实体已创建但代码未更新

2. **数据验证失败**:
   - 新标题为空或无效
   - 原实体数据不完整

### Error Handling Strategy

```typescript
const copy = async (id: number, newTitle: string) => {
  // 1. 设置加载状态
  copyLoadingMap.value.set(id, true);

  try {
    // 2. 获取原实体（可能失败）
    const response = await getMeta(id);
    const meta = response.data;

    // 3. 创建新实体（可能失败）
    const newMeta = { /* ... */ };
    const createResponse = await postMeta(newMeta);
    const newMetaId = createResponse.data.id;

    // 4. 更新代码（可能失败，但不应阻止整体成功）
    if (meta.metaCode) {
      await putMetaCode(newMetaId, {
        lua: meta.metaCode.lua,
        blockly: meta.metaCode.blockly || "",
      });
    }

    // 5. 刷新列表
    refreshList();

  } catch (error) {
    // 6. 统一错误处理
    console.error(error);
    ElMessage.error(t("meta.copy.error"));
  } finally {
    // 7. 始终清除加载状态
    copyLoadingMap.value.set(id, false);
  }
};
```

**错误处理原则**:

1. **原子性**: 如果 `postMeta()` 失败，不会创建部分实体
2. **用户反馈**: 所有错误都通过 `ElMessage.error()` 显示给用户
3. **状态清理**: `finally` 块确保加载状态始终被清除
4. **日志记录**: 错误被记录到控制台以便调试
5. **代码更新容错**: 如果 `metaCode` 不存在，跳过代码更新而不报错

### Edge Cases

1. **Null 值处理**:
   - `data: null` → 复制为 `null`（不是 `{}`）
   - `info: null` → 复制为 `null`（不是 `""`）
   - `events: null` → 复制为 `null`（不是 `{inputs: [], outputs: []}`）
   - `image_id: null` → 复制为 `null`

2. **MetaCode 缺失**:
   - 如果 `meta.metaCode` 为 `undefined`，跳过 `putMetaCode()` 调用
   - 不要尝试用空值调用 API

3. **空字符串 vs Null**:
   - 保持原始类型，不要转换 `null` 为 `""`
   - 保持原始类型，不要转换 `""` 为 `null`

## Testing Strategy

本功能的测试采用**双重测试方法**：单元测试验证具体场景和边界情况，属性测试验证通用正确性规则。

### Unit Tests

单元测试专注于具体场景、集成点和错误条件：

1. **API 调用顺序测试**:
   - 验证 `getMeta()` → `postMeta()` → `putMetaCode()` 的调用顺序
   - 使用 mock 验证每个 API 被正确调用
   - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

2. **成功场景测试**:
   - 模拟完整的复制流程
   - 验证成功消息显示和列表刷新
   - **Validates: Requirements 4.1**

3. **错误场景测试**:
   - 模拟 `getMeta()` 失败
   - 模拟 `postMeta()` 失败
   - 验证错误消息显示
   - **Validates: Requirements 4.2**

4. **边界情况测试**:
   - 测试 `metaCode` 为 `undefined` 的情况
   - 测试所有可 null 字段为 `null` 的情况
   - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

5. **完整数据获取测试**:
   - 验证 `getMeta()` 被调用以获取完整数据
   - **Validates: Requirements 1.1**

### Property-Based Tests

属性测试验证跨所有输入的通用正确性属性。每个测试应配置为运行至少 100 次迭代。

**测试框架**: 使用 [fast-check](https://github.com/dubzzz/fast-check) 进行 TypeScript 的属性测试。

**配置示例**:
```typescript
import fc from 'fast-check';

// 每个属性测试运行 100 次
fc.assert(
  fc.property(/* generators */, (/* inputs */) => {
    // test logic
  }),
  { numRuns: 100 }
);
```

**属性测试列表**:

1. **Property 1: 字段完整复制**
   - 生成随机实体数据（包括 null 值）
   - 执行复制操作
   - 验证所有数据字段相同
   - **Tag**: `Feature: entity-copy-fix, Property 1: 字段完整复制`
   - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6**

2. **Property 2: MetaCode 完整复制**
   - 生成随机 metaCode（lua 和 blockly）
   - 执行复制操作
   - 验证代码字段相同
   - **Tag**: `Feature: entity-copy-fix, Property 2: MetaCode 完整复制`
   - **Validates: Requirements 1.7**

3. **Property 3: UUID 唯一性**
   - 生成随机实体
   - 执行复制操作
   - 验证新 UUID 不同且格式有效
   - **Tag**: `Feature: entity-copy-fix, Property 3: UUID 唯一性`
   - **Validates: Requirements 2.1**

4. **Property 4: 标题更新**
   - 生成随机实体和随机新标题
   - 执行复制操作
   - 验证新实体使用新标题
   - **Tag**: `Feature: entity-copy-fix, Property 4: 标题更新`
   - **Validates: Requirements 2.2**

5. **Property 5: ID 自动生成**
   - 生成随机实体
   - 执行复制操作
   - 验证新 ID 不同
   - **Tag**: `Feature: entity-copy-fix, Property 5: ID 自动生成`
   - **Validates: Requirements 2.3**

6. **Property 6: 加载状态管理**
   - 生成随机实体
   - 执行复制操作（成功或失败）
   - 验证加载状态正确设置和清除
   - **Tag**: `Feature: entity-copy-fix, Property 6: 加载状态管理`
   - **Validates: Requirements 4.3, 4.4**

### Test Data Generators

为属性测试创建数据生成器：

```typescript
// 生成随机实体数据
const arbitraryMetaInfo = fc.record({
  id: fc.integer({ min: 1 }),
  title: fc.string({ minLength: 1 }),
  uuid: fc.uuid(),
  data: fc.oneof(fc.constant(null), fc.object()),
  info: fc.oneof(fc.constant(null), fc.string()),
  events: fc.oneof(
    fc.constant(null),
    fc.record({
      inputs: fc.array(fc.anything()),
      outputs: fc.array(fc.anything()),
    })
  ),
  prefab: fc.integer(),
  image_id: fc.oneof(fc.constant(null), fc.integer({ min: 1 })),
  metaCode: fc.option(
    fc.record({
      lua: fc.option(fc.string()),
      blockly: fc.string(),
    })
  ),
});

// 生成随机新标题
const arbitraryNewTitle = fc.string({ minLength: 1, maxLength: 100 });
```

### Testing Workflow

1. **开发阶段**: 编写单元测试验证具体场景
2. **实现阶段**: 运行单元测试确保基本功能正确
3. **验证阶段**: 运行属性测试验证通用正确性
4. **回归测试**: 两种测试都应该在 CI/CD 中运行

### Manual Testing Checklist

在部署前进行手动测试：

- [ ] 复制包含所有字段的完整实体
- [ ] 复制字段为 null 的实体
- [ ] 复制没有 metaCode 的实体
- [ ] 验证复制后的实体可以正常编辑
- [ ] 验证复制后的实体可以再次复制
- [ ] 验证错误情况下的用户反馈
