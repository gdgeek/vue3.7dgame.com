# 实施计划

- [x] 1. 编写缺陷条件探索性测试
  - **Property 1: Bug Condition** — 预制体页面使用旧版 CardListPage 组件
  - **CRITICAL**: 此测试必须在未修复代码上失败 — 失败即确认缺陷存在
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: 此测试编码了期望行为 — 修复后测试通过即验证修复正确
  - **GOAL**: 生成反例证明缺陷存在
  - **Scoped PBT Approach**: 针对确定性缺陷，将属性范围限定为具体失败用例以确保可复现性
  - 编写属性基测试验证：对于 `phototype/list.vue` 和 `meta/prefabs.vue`，页面组件应使用 `PageActionBar`、`ViewContainer`、`StandardCard`、`PagePagination` 渲染
  - 测试文件：`test/unit/views/prefab-management-standardpage.spec.ts`
  - 检查 `phototype/list.vue` 的组件导入：应包含 `PageActionBar`、`ViewContainer`、`StandardCard`、`PagePagination`、`EmptyState`，不应包含 `CardListPage`、`MrPPCard`
  - 检查 `meta/prefabs.vue` 的组件导入：应包含 `PageActionBar`、`ViewContainer`、`StandardCard`、`PagePagination`、`EmptyState`，不应包含 `CardListPage`、`Id2Image`、`el-card`
  - 检查两个页面应导入 `usePageData` 和 `useSelection` 组合式函数
  - 在未修复代码上运行测试
  - **EXPECTED OUTCOME**: 测试失败（这是正确的 — 证明缺陷存在）
  - 记录发现的反例以理解根因
  - 任务完成条件：测试已编写、已运行、失败已记录
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. 编写不变行为保留性属性测试（在实施修复前）
  - **Property 2: Preservation** — 业务逻辑和导航行为不变
  - **IMPORTANT**: 遵循观察优先方法论
  - 测试文件：`test/unit/views/prefab-management-preservation.spec.ts`
  - 观察：在未修复代码上，`phototype/list.vue` 的 `addPrefab` 函数调用 `router.push('/phototype/edit')`
  - 观察：在未修复代码上，`addPrefabFromPolygen` 函数调用 `router.push('/phototype/fromModel')`
  - 观察：在未修复代码上，`edit(id)` 函数调用 `router.push({ path: '/phototype/edit', query: { id } })`
  - 观察：在未修复代码上，`deletedWindow` 函数调用 `MessageBox.confirm` 后执行 `deletePhototype`
  - 观察：在未修复代码上，`meta/prefabs.vue` 的 `addPrefab` 函数调用 `router.push('/meta-verse/prefab')`
  - 观察：在未修复代码上，`editor(id)` 函数调用 `router.push({ path: '/meta-verse/prefab', query: { id } })`
  - 观察：在未修复代码上，`del(id)` 函数调用 `ElMessageBox.confirm` 后执行 `deletePrefab`
  - 观察：在未修复代码上，`isRoot` 计算属性控制创建/编辑/删除按钮的可见性
  - 编写属性基测试：对于所有非缺陷条件的业务操作（导航、编辑、删除、权限控制），修复后行为应与原始代码一致
  - 测试导航函数：生成随机 id 值，验证 `addPrefab`、`addPrefabFromPolygen`、`edit`、`editor`、`url` 函数产生正确的路由路径
  - 测试编辑对话框：验证 `namedWindow` 正确填充 `editForm`，`saveEdit` 正确调用 `putPhototype`
  - 测试权限控制：验证 `isRoot` 为 false 时操作按钮不渲染
  - 在未修复代码上运行测试
  - **EXPECTED OUTCOME**: 测试通过（确认基线行为已捕获）
  - 任务完成条件：测试已编写、已运行、在未修复代码上通过
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_

- [x] 3. 重构 phototype/list.vue 使用 StandardPage 组件体系

  - [x] 3.1 替换组件导入和接入组合式函数
    - 移除 `CardListPage`、`MrPPCard` 导入
    - 从 `@/components/StandardPage` 导入 `PageActionBar`、`ViewContainer`、`StandardCard`、`PagePagination`、`EmptyState`
    - 使用 `usePageData<PhototypeType>` 替代 `CardListPage` 的数据管理，`fetchFn` 适配 `getPhototypes` API（返回 `AxiosResponse`，已包含 `data` 和 `headers`，可直接传入）
    - 引入 `useSelection` 组合式函数，支持多选和批量删除
    - _Bug_Condition: isBugCondition(input) where input.path = '/phototype/list' AND pageUsesComponent('CardListPage')_
    - _Expected_Behavior: 页面使用 StandardPage 组件体系渲染，提供搜索、排序、视图切换、批量操作_
    - _Preservation: 保留 addPrefab、addPrefabFromPolygen、edit、saveEdit、deletedWindow、namedWindow 等所有业务函数_
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.2 重构模板结构
    - 顶部使用 `PageActionBar`，`#actions` 插槽放置"创建预制体"和"从模型创建"按钮
    - 中部使用 `ViewContainer`，`#grid-card` 插槽使用 `StandardCard` 渲染卡片
    - StandardCard 字段映射：`:image="item.image?.url"` `:title="item.title"` `:meta="{ date: formatItemDate(item.updated_at || item.created_at) }"` `:type-icon="['fas', 'cubes']"` `:placeholder-icon="['fas', 'cubes']"`
    - 卡片操作菜单（el-dropdown）包含"进入"、"编辑"、"删除"选项
    - `#list-item` 插槽提供列表视图行（复选框、缩略图+名称、日期、操作菜单）
    - `#empty` 插槽使用 `EmptyState`
    - 底部使用 `PagePagination`
    - 保留编辑对话框（`el-dialog` + `ImageSelector`）不变
    - _Bug_Condition: 模板使用 CardListPage + MrPPCard 渲染_
    - _Expected_Behavior: 模板使用 PageActionBar + ViewContainer + StandardCard + PagePagination 渲染_
    - _Preservation: 编辑对话框（含 ImageSelector）保持不变_
    - _Requirements: 2.1, 2.7, 3.3_

  - [x] 3.3 添加批量删除功能
    - 新增 `handleBatchDelete` 函数，遍历选中项调用 `deletePhototype`
    - 参考 `polygen/index.vue` 的 `handleBatchDelete` 实现模式
    - 添加 `handleCancelSelection`、`handleSelectAllPage`、`handleCancelSelectAllPage` 函数
    - _Requirements: 2.6_

  - [x] 3.4 验证缺陷条件探索性测试现在通过
    - **Property 1: Expected Behavior** — 预制体页面使用 StandardPage 组件体系渲染
    - **IMPORTANT**: 重新运行任务 1 中的同一测试 — 不要编写新测试
    - 任务 1 的测试编码了期望行为
    - 当此测试通过时，确认期望行为已满足
    - 运行任务 1 的缺陷条件探索性测试
    - **EXPECTED OUTCOME**: `phototype/list.vue` 相关断言通过（确认该页面缺陷已修复）
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.5 验证保留性测试仍然通过
    - **Property 2: Preservation** — 业务逻辑和导航行为不变
    - **IMPORTANT**: 重新运行任务 2 中的同一测试 — 不要编写新测试
    - 运行任务 2 的保留性属性测试
    - **EXPECTED OUTCOME**: 测试通过（确认无回归）
    - 确认所有 phototype 相关保留性测试在修复后仍通过
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. 重构 meta/prefabs.vue 使用 StandardPage 组件体系

  - [x] 4.1 替换组件导入和接入组合式函数
    - 移除 `CardListPage`、`Id2Image` 导入
    - 从 `@/components/StandardPage` 导入 `PageActionBar`、`ViewContainer`、`StandardCard`、`PagePagination`、`EmptyState`
    - 使用 `usePageData<PrefabData>` 替代 `CardListPage` 的数据管理，`fetchFn` 适配 `getPrefabs` API
    - 引入 `useSelection` 组合式函数，支持多选和批量删除（仅 Root 角色可见）
    - _Bug_Condition: isBugCondition(input) where input.path = '/meta-verse/prefabs' AND pageUsesComponent('CardListPage')_
    - _Expected_Behavior: 页面使用 StandardPage 组件体系渲染，提供搜索、排序、视图切换、批量操作_
    - _Preservation: 保留 isRoot 计算属性、addPrefab、editor、del、url 等所有业务函数_
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 4.2 重构模板结构
    - 顶部使用 `PageActionBar`，`#actions` 插槽放置"创建预制体"按钮（`v-if="isRoot"`）
    - 中部使用 `ViewContainer`，`#grid-card` 插槽使用 `StandardCard` 渲染卡片
    - StandardCard 字段映射：`:image="item.image?.url"` `:title="item.title"` `:type-icon="['fas', 'cubes']"` `:placeholder-icon="['fas', 'cubes']"`（PrefabData 无时间字段，meta.date 可省略或显示 `—`）
    - 卡片点击导航至 `/meta-verse/prefab?id=xxx`
    - 卡片操作菜单：Root 角色显示"编辑"和"删除"选项
    - `#list-item` 插槽提供列表视图行
    - `#empty` 插槽使用 `EmptyState`
    - 底部使用 `PagePagination`
    - _Bug_Condition: 模板使用 CardListPage + el-card（固定 320px 宽度）渲染_
    - _Expected_Behavior: 模板使用 PageActionBar + ViewContainer + StandardCard + PagePagination 渲染_
    - _Preservation: 权限控制（isRoot）保持不变_
    - _Requirements: 2.2, 2.7, 3.10_

  - [x] 4.3 添加批量删除功能
    - 新增 `handleBatchDelete` 函数（仅 Root 角色可用），遍历选中项调用 `deletePrefab`
    - 参考 `polygen/index.vue` 的 `handleBatchDelete` 实现模式
    - 添加 `handleCancelSelection`、`handleSelectAllPage`、`handleCancelSelectAllPage` 函数
    - _Requirements: 2.6_

  - [x] 4.4 验证缺陷条件探索性测试现在通过
    - **Property 1: Expected Behavior** — 预制体页面使用 StandardPage 组件体系渲染
    - **IMPORTANT**: 重新运行任务 1 中的同一测试 — 不要编写新测试
    - 运行任务 1 的缺陷条件探索性测试
    - **EXPECTED OUTCOME**: 所有断言通过（确认两个页面缺陷均已修复）
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 4.5 验证保留性测试仍然通过
    - **Property 2: Preservation** — 业务逻辑和导航行为不变
    - **IMPORTANT**: 重新运行任务 2 中的同一测试 — 不要编写新测试
    - 运行任务 2 的保留性属性测试
    - **EXPECTED OUTCOME**: 测试通过（确认无回归）
    - 确认所有 prefabs 相关保留性测试在修复后仍通过
    - _Requirements: 3.6, 3.7, 3.8, 3.9, 3.10_

- [x] 5. 检查点 — 确保所有测试通过
  - 运行完整测试套件：`pnpm test:run`
  - 确认缺陷条件探索性测试（任务 1）全部通过
  - 确认保留性属性测试（任务 2）全部通过
  - 确认其他已有测试无回归
  - 如有问题，询问用户
