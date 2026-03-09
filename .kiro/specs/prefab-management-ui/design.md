# 预制体管理界面统一化 — 缺陷修复设计

## 概述

预制体相关的两个管理页面（`phototype/list.vue` 和 `meta/prefabs.vue`）在全站 StandardPage 统一重构中被遗漏，仍使用旧版 `CardListPage` + `MrPPCard` / `el-card` 方案。本修复将这两个页面迁移至 `StandardPage` 组件体系（`PageActionBar`、`ViewContainer`、`StandardCard`、`PagePagination`、`EmptyState`）并接入 `usePageData` / `useSelection` 组合式函数，使其与图片、音频、视频、模型页面保持一致的 UI 风格和交互能力，同时保留各页面的特有业务逻辑。

## 术语表

- **Bug_Condition (C)**：缺陷触发条件 — 用户访问预制体管理页面时，页面使用旧版 `CardListPage` 组件渲染，缺少搜索、排序、视图切换、批量操作等标准功能
- **Property (P)**：期望行为 — 预制体页面应使用 `StandardPage` 组件体系渲染，提供与其他资源页面一致的交互能力
- **Preservation**：不变行为 — 原型列表的创建/编辑/进入/删除流程、元宇宙预制体的创建/编辑/删除/导航流程、权限控制逻辑均不受影响
- **`CardListPage`**：旧版卡片列表组件（`src/components/MrPP/CardListPage/index.vue`），提供基础的数据获取和分页，但缺少搜索、排序、视图切换、批量操作
- **`StandardPage` 组件体系**：新版标准页面组件集合（`src/components/StandardPage/`），包含 `PageActionBar`、`ViewContainer`、`StandardCard`、`PagePagination`、`DetailPanel`、`EmptyState`
- **`usePageData`**：组合式函数（`src/composables/usePageData.ts`），统一管理列表数据获取、分页、搜索、排序、视图模式
- **`useSelection`**：组合式函数（`src/composables/useSelection.ts`），统一管理多选状态和批量操作
- **`PhototypeType`**：原型数据类型（`src/api/v1/types/phototype.ts`），字段包含 `id`、`title`、`image`、`created_at` 等
- **`PrefabData`**：预制体数据类型（`src/api/v1/types/prefab.ts`），字段包含 `id`、`title`、`image`、`uuid` 等

## 缺陷详情

### 缺陷条件

当用户访问原型列表页（`phototype/list.vue`）或元宇宙预制体列表页（`meta/prefabs.vue`）时，页面使用旧版 `CardListPage` 组件渲染。该组件不提供搜索输入框、排序控件、视图模式切换、多选/批量操作等标准功能，且卡片样式与已重构页面不一致。

**形式化规约：**
```
FUNCTION isBugCondition(input)
  INPUT: input of type PageVisit { path: string }
  OUTPUT: boolean

  RETURN input.path IN ['/phototype/list', '/meta-verse/prefabs']
         AND pageUsesComponent(input.path, 'CardListPage')
         AND NOT pageUsesComponent(input.path, 'StandardPage')
END FUNCTION
```

### 示例

- 用户访问 `/phototype/list`，看到旧版 `MrPPCard` 卡片样式，无搜索框 → 期望看到 `StandardCard` 卡片，顶部有搜索/排序/视图切换工具栏
- 用户访问 `/meta-verse/prefabs`，看到固定 320px 宽度的 `el-card`，无法批量删除 → 期望看到响应式 `StandardCard` 网格，支持多选和批量删除
- 用户在原型列表页想按名称搜索预制体，找不到搜索输入框 → 期望在 `PageActionBar` 中有搜索输入框
- 用户在预制体列表页想切换到列表视图，找不到切换按钮 → 期望在 `PageActionBar` 中有网格/列表视图切换

## 期望行为

### 不变行为（Preservation Requirements）

**不变行为：**
- 原型列表页点击"创建预制体"按钮仍跳转至 `/phototype/edit`
- 原型列表页点击"从模型创建"按钮仍跳转至 `/phototype/fromModel`
- 原型列表页的编辑对话框（含 `ImageSelector`）仍正常工作，可修改名称和封面图
- 原型列表页点击"进入"按钮仍跳转至 `/phototype/edit?id=xxx`
- 原型列表页删除预制体仍弹出确认对话框并执行删除
- 元宇宙预制体列表页点击"创建预制体"仍跳转至 `/meta-verse/prefab`
- 元宇宙预制体列表页点击"编辑"仍跳转至 `/meta-verse/prefab?id=xxx`
- 元宇宙预制体列表页删除预制体仍弹出确认对话框并执行删除
- 元宇宙预制体列表页点击缩略图仍导航至 `/meta-verse/prefab?id=xxx`
- 非 Root 角色访问元宇宙预制体列表页时，创建/编辑/删除按钮仍隐藏
- 图片、音频、视频、模型等已重构页面不受任何影响

**范围：**
所有不涉及预制体页面组件替换的输入和交互应完全不受本次修复影响，包括：
- 其他资源管理页面的正常渲染和操作
- 路由导航和页面跳转逻辑
- API 调用参数和返回值处理
- 用户权限判断逻辑

## 假设根因

基于缺陷分析，根本原因是全站 StandardPage 统一重构时遗漏了这两个页面：

1. **组件层面遗漏**：`phototype/list.vue` 和 `meta/prefabs.vue` 仍然导入和使用 `CardListPage`、`MrPPCard`、`el-card` 等旧版组件，未替换为 `PageActionBar`、`ViewContainer`、`StandardCard`、`PagePagination`、`EmptyState`

2. **数据管理层面遗漏**：两个页面直接在组件内管理数据获取和分页逻辑（通过 `CardListPage` 的 `fetchData` prop），未接入 `usePageData` 组合式函数来统一管理搜索、排序、分页、视图模式

3. **选择管理层面遗漏**：两个页面没有多选功能，未接入 `useSelection` 组合式函数，因此无法支持批量操作

4. **API 适配差异**：`getPhototypes` 返回 `AxiosResponse<PhototypeType[]>`（包含 `data` 和 `headers`），`getPrefabs` 直接返回 `request<PrefabData[]>` 的结果。两者都需要适配为 `usePageData` 期望的 `FetchResponse<T>` 格式（`{ data: T[], headers: Record<string, unknown> }`）

## 正确性属性

Property 1: Bug Condition — 预制体页面使用 StandardPage 组件体系渲染

_For any_ 用户访问原型列表页或元宇宙预制体列表页时（isBugCondition 返回 true），修复后的页面 SHALL 使用 `PageActionBar`、`ViewContainer`、`StandardCard`、`PagePagination` 组件渲染，提供搜索、排序、视图切换、批量操作功能，且卡片样式与图片/音频/视频/模型页面一致。

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

Property 2: Preservation — 业务逻辑和导航行为不变

_For any_ 用户在预制体页面执行创建、编辑、删除、导航等业务操作时（isBugCondition 返回 false），修复后的页面 SHALL 产生与原始页面完全相同的行为，保留所有路由跳转、对话框交互、权限控制和 API 调用逻辑。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11**

## 修复实现

### 所需变更

假设根因分析正确：

**文件**：`src/views/phototype/list.vue`

**变更内容**：

1. **替换组件导入**：移除 `CardListPage`、`MrPPCard` 导入，改为从 `@/components/StandardPage` 导入 `PageActionBar`、`ViewContainer`、`StandardCard`、`PagePagination`、`EmptyState`
2. **接入 usePageData**：使用 `usePageData<PhototypeType>` 替代 `CardListPage` 的数据管理，`fetchFn` 适配 `getPhototypes` API（返回 `AxiosResponse`，已包含 `data` 和 `headers`，可直接传入）
3. **接入 useSelection**：引入 `useSelection` 组合式函数，支持多选和批量删除
4. **重构模板结构**：
   - 顶部使用 `PageActionBar`，`#actions` 插槽放置"创建预制体"和"从模型创建"按钮
   - 中部使用 `ViewContainer`，`#grid-card` 插槽使用 `StandardCard` 渲染卡片（图片用 `item.image?.url`，标题用 `item.title`），卡片操作菜单包含"进入"、"编辑"、"删除"
   - `#list-item` 插槽提供列表视图行（复选框、缩略图+名称、日期、操作菜单）
   - `#empty` 插槽使用 `EmptyState`
   - 底部使用 `PagePagination`
5. **保留编辑对话框**：`el-dialog` 编辑表单（含 `ImageSelector`）保持不变，仅将触发方式从 `MrPPCard` 的 `@named` 事件改为卡片操作菜单的"编辑"选项
6. **保留所有业务逻辑**：`addPrefab`、`addPrefabFromPolygen`、`edit`、`saveEdit`、`deletedWindow` 等函数保持不变
7. **添加批量删除**：新增 `handleBatchDelete` 函数，遍历选中项调用 `deletePhototype`

**文件**：`src/views/meta/prefabs.vue`

**变更内容**：

1. **替换组件导入**：移除 `CardListPage`、`Id2Image`、`el-card` 导入，改为从 `@/components/StandardPage` 导入 `PageActionBar`、`ViewContainer`、`StandardCard`、`PagePagination`、`EmptyState`
2. **接入 usePageData**：使用 `usePageData<PrefabData>` 替代 `CardListPage` 的数据管理，`fetchFn` 适配 `getPrefabs` API
3. **接入 useSelection**：引入 `useSelection` 组合式函数，支持多选和批量删除（仅 Root 角色可见）
4. **重构模板结构**：
   - 顶部使用 `PageActionBar`，`#actions` 插槽放置"创建预制体"按钮（`v-if="isRoot"`）
   - 中部使用 `ViewContainer`，`#grid-card` 插槽使用 `StandardCard` 渲染卡片（图片用 `item.image?.url`，标题用 `item.title`），卡片点击导航至 `/meta-verse/prefab?id=xxx`
   - 卡片操作菜单：Root 角色显示"编辑"和"删除"选项
   - `#list-item` 插槽提供列表视图行
   - `#empty` 插槽使用 `EmptyState`
   - 底部使用 `PagePagination`
5. **保留权限控制**：`isRoot` 计算属性保持不变，控制创建/编辑/删除按钮的可见性
6. **保留所有业务逻辑**：`addPrefab`、`editor`、`del`、`url` 等函数保持不变
7. **添加批量删除**：新增 `handleBatchDelete` 函数（仅 Root 角色可用），遍历选中项调用 `deletePrefab`

### API 适配说明

`getPhototypes` 返回 `Promise<AxiosResponse<PhototypeType[]>>`，其结构为 `{ data: PhototypeType[], headers: {...} }`，与 `FetchResponse<PhototypeType>` 兼容，可直接作为 `usePageData` 的 `fetchFn` 返回值。

`getPrefabs` 返回 `request<PrefabData[]>` 的结果（也是 `AxiosResponse` 格式），同样兼容 `FetchResponse<PrefabData>`。

### PhototypeType 字段映射

| StandardCard prop | PhototypeType 字段 | 说明 |
|---|---|---|
| `:image` | `item.image?.url` | 封面图 URL |
| `:title` | `item.title` | 预制体名称（注意：PhototypeType 用 `title`，ResourceInfo 用 `name`） |
| `:meta.date` | `item.updated_at \|\| item.created_at` | 日期 |
| `:type-icon` | `['fas', 'cubes']` | 预制体类型图标 |
| `:placeholder-icon` | `['fas', 'cubes']` | 占位图标 |

### PrefabData 字段映射

| StandardCard prop | PrefabData 字段 | 说明 |
|---|---|---|
| `:image` | `item.image?.url` | 封面图 URL |
| `:title` | `item.title` | 预制体名称 |
| `:meta.date` | 无 `created_at` 字段 | PrefabData 无时间字段，可省略或显示 `—` |
| `:type-icon` | `['fas', 'cubes']` | 预制体类型图标 |
| `:placeholder-icon` | `['fas', 'cubes']` | 占位图标 |

## 测试策略

### 验证方法

测试策略分两阶段：首先在未修复代码上验证缺陷存在（探索性测试），然后验证修复后功能正确且不变行为得到保留。

### 探索性缺陷条件检查

**目标**：在实施修复前，确认缺陷存在并验证根因分析。

**测试计划**：检查 `phototype/list.vue` 和 `meta/prefabs.vue` 的组件导入和模板结构，确认它们使用旧版组件。

**测试用例**：
1. **组件导入检查**：验证 `phototype/list.vue` 导入 `CardListPage` 和 `MrPPCard`（未修复代码中将通过）
2. **模板结构检查**：验证 `meta/prefabs.vue` 使用 `el-card` 和固定 320px 宽度（未修复代码中将通过）
3. **功能缺失检查**：验证两个页面均无搜索输入框、排序控件、视图切换按钮（未修复代码中将通过）
4. **批量操作缺失检查**：验证两个页面均无多选和批量删除功能（未修复代码中将通过）

**预期反例**：
- 页面模板中不包含 `PageActionBar`、`ViewContainer`、`StandardCard` 等组件
- 脚本中不导入 `usePageData`、`useSelection` 组合式函数

### 修复检查

**目标**：验证修复后，所有满足缺陷条件的页面均使用 StandardPage 组件体系渲染。

**伪代码：**
```
FOR ALL page WHERE isBugCondition(page) DO
  result := renderPage_fixed(page)
  ASSERT result.usesComponent('PageActionBar')
  ASSERT result.usesComponent('ViewContainer')
  ASSERT result.usesComponent('StandardCard')
  ASSERT result.usesComponent('PagePagination')
  ASSERT result.hasSearchInput()
  ASSERT result.hasSortControl()
  ASSERT result.hasViewModeToggle()
  ASSERT result.hasBatchOperations()
END FOR
```

### 不变行为检查

**目标**：验证修复后，所有不涉及组件替换的业务逻辑行为与原始代码一致。

**伪代码：**
```
FOR ALL interaction WHERE NOT isBugCondition(interaction) DO
  ASSERT originalPage(interaction) = fixedPage(interaction)
END FOR
```

**测试方法**：属性基测试（Property-Based Testing）适用于不变行为检查，因为：
- 可自动生成大量测试用例覆盖各种交互场景
- 能捕获手动单元测试可能遗漏的边界情况
- 对所有非缺陷输入提供强保证

**测试计划**：先在未修复代码上观察各业务操作的行为，然后编写属性基测试确保修复后行为一致。

**测试用例**：
1. **路由导航保留**：验证原型列表页的"创建"、"从模型创建"、"进入"按钮仍触发正确的路由跳转
2. **编辑对话框保留**：验证原型列表页的编辑对话框（含 ImageSelector）仍正常打开、修改、保存
3. **删除确认保留**：验证两个页面的删除操作仍弹出确认对话框并正确执行
4. **权限控制保留**：验证非 Root 角色访问元宇宙预制体列表页时，创建/编辑/删除按钮仍隐藏
5. **缩略图导航保留**：验证元宇宙预制体列表页点击缩略图仍导航至正确的预制体详情页

### 单元测试

- 测试 `usePageData` 与 `getPhototypes` API 的适配：验证 `fetchFn` 正确传递 `sort`、`search`、`page` 参数并解析分页 headers
- 测试 `usePageData` 与 `getPrefabs` API 的适配：验证 `fetchFn` 正确传递参数并解析分页 headers
- 测试 `useSelection` 在两个页面中的集成：验证多选、取消选择、批量删除流程
- 测试 `PhototypeType` 到 `StandardCard` 的字段映射：验证 `title`、`image?.url` 正确传递
- 测试 `PrefabData` 到 `StandardCard` 的字段映射：验证 `title`、`image?.url` 正确传递
- 测试权限控制：验证 `isRoot` 为 false 时批量操作和编辑/删除按钮不渲染

### 属性基测试

- 生成随机 `PhototypeType` 数据数组，验证 `StandardCard` 渲染的标题和图片与输入数据一致
- 生成随机 `PrefabData` 数据数组，验证 `StandardCard` 渲染的标题和图片与输入数据一致
- 生成随机选择操作序列（选中/取消/全选/清空），验证 `useSelection` 状态始终正确
- 生成随机搜索/排序/分页参数组合，验证 `usePageData` 正确传递给 API 并解析响应

### 集成测试

- 端到端测试原型列表页完整流程：加载 → 搜索 → 排序 → 切换视图 → 选择卡片 → 批量删除
- 端到端测试元宇宙预制体列表页完整流程：加载 → 搜索 → 排序 → 切换视图 → 点击卡片导航
- 端到端测试原型列表页编辑流程：点击编辑 → 修改名称 → 选择图片 → 保存 → 验证更新
- 端到端测试权限控制：以非 Root 角色登录 → 访问预制体列表 → 验证操作按钮隐藏
