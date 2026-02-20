# 实施计划：首页动态内容

## 概述

将首页从硬编码 WordPress 资源 ID 的静态模式重构为动态获取分类列表并自动构建标签页的模式。按照数据模型 → API 层 → 组合式函数 → 组件改造 → 测试的顺序逐步实施，确保每一步都可增量验证。

## 任务

- [x] 1. 新增数据类型与 API 缓存增强
  - [x] 1.1 在 `src/types/news.ts` 中新增 `TabItem` 接口
    - 新增 `TabItem` 接口，包含 `label: string`、`type: 'document' | 'category'`、`id: number` 三个字段
    - 导出该接口供 composable 和组件使用
    - _需求：3.1, 3.2, 3.3_

  - [x] 1.2 在 `src/api/home/wordpress.ts` 中新增 `CacheEntry` 接口和 `getCategoriesWithCache` 方法
    - 新增模块内部 `CacheEntry<T>` 接口，包含 `data: T` 和 `timestamp: number`
    - 新增模块级变量 `categoriesFullCache: CacheEntry<NewsCategory[]> | null` 和 `CACHE_MAX_AGE = 5 * 60 * 1000`
    - 在 `wordpressApi` 对象上新增 `getCategoriesWithCache()` 方法，返回 `Promise<{ data: NewsCategory[]; isStale: boolean }>`
    - 实现 stale-while-revalidate 逻辑：缓存存在且未过期返回 `{ data, isStale: false }`；缓存存在但已过期返回 `{ data, isStale: true }`；无缓存则调用 `getCategories()` 并写入缓存
    - _需求：8.1, 8.2, 8.3_

- [ ] 2. 实现 `useCategories` 组合式函数
  - [x] 2.1 创建 `src/composables/useCategories.ts`
    - 实现 `UseCategoriesOptions` 接口（`includeCategories`、`excludeCategories`、`pinnedItems`）
    - 实现 `UseCategoriesReturn` 接口（`items`、`loading`、`error`、`retry`）
    - 实现 `mapCategoryToTabItem` 纯函数：将 `NewsCategory` 映射为 `TabItem`
    - 实现 `filterCategories` 纯函数：按 `count > 0` 过滤空分类，应用白名单/黑名单逻辑（白名单优先），支持按 id 或 slug 匹配
    - 实现 `useCategories(options?)` 组合式函数主体：
      - 调用 `wordpressApi.getCategoriesWithCache()` 获取分类数据
      - 若 `isStale` 为 true，后台静默调用 `wordpressApi.getCategories()` 刷新缓存并更新 items
      - 对分类数据执行 `filterCategories` → `mapCategoryToTabItem` → 前置 `pinnedItems`
      - 管理 `loading`、`error` 响应式状态
      - 提供 `retry()` 方法重置状态并重新加载
    - 导出 `mapCategoryToTabItem` 和 `filterCategories` 以便单元测试
    - _需求：1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.2, 8.3, 8.4_

  - [ ]* 2.2 编写属性测试：分类到 TabItem 的映射正确性
    - **属性 1：分类到 TabItem 的映射正确性**
    - **验证需求：1.2, 3.1, 3.2, 3.3**
    - 测试文件：`test/unit/composables/useCategories.spec.ts`
    - 使用 fast-check 生成随机 `NewsCategory` 列表，验证映射后 `type === 'category'`、`label === name`、`id === id`，列表长度不变

  - [ ]* 2.3 编写属性测试：空分类过滤与默认全量展示
    - **属性 2：空分类过滤与默认全量展示**
    - **验证需求：3.4, 7.6**
    - 使用 fast-check 生成 count 在 0-100 之间随机的分类列表，验证过滤结果恰好等于 `count > 0` 的子集

  - [ ]* 2.4 编写属性测试：白名单过滤
    - **属性 3：白名单过滤**
    - **验证需求：7.3**
    - 使用 fast-check 生成随机分类列表和随机白名单子集，验证结果中每个分类的 id 或 slug 都在白名单中

  - [ ]* 2.5 编写属性测试：黑名单过滤
    - **属性 4：黑名单过滤**
    - **验证需求：7.4**
    - 使用 fast-check 生成随机分类列表和随机黑名单子集（不配置白名单），验证结果中不包含黑名单中的分类

  - [ ]* 2.6 编写属性测试：白名单优先于黑名单
    - **属性 5：白名单优先于黑名单**
    - **验证需求：7.5**
    - 使用 fast-check 同时生成白名单和黑名单，验证结果与仅配置白名单时完全相同

  - [ ]* 2.7 编写属性测试：pinnedItems 置顶
    - **属性 6：pinnedItems 置顶**
    - **验证需求：7.7**
    - 使用 fast-check 生成随机 pinnedItems 和随机分类列表，验证最终列表前 N 项严格等于 pinnedItems

  - [ ]* 2.8 编写单元测试：useCategories 核心场景
    - 测试文件：`test/unit/composables/useCategories.spec.ts`（与属性测试同文件）
    - 测试空分类列表返回空 items（需求 1.3）
    - 测试 API 失败后调用 retry 重新发起请求（需求 1.4）
    - 测试缓存命中直接返回数据（需求 8.1, 8.2）
    - 测试 stale-while-revalidate：返回缓存后后台刷新，数据变化时更新 items（需求 8.3, 8.4）

- [x] 3. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有疑问请询问用户。

- [x] 4. 改造首页组件
  - [x] 4.1 改造 `src/views/home/index.vue`
    - 移除硬编码的 `list` 数组（包含固定文档 ID 和分类 ID 的 TabItem 列表）
    - 引入 `useCategories` composable，使用其返回的 `items`、`loading`、`error`、`retry`
    - 新增可选 props：`includeCategories`、`excludeCategories`、`pinnedItems`，透传给 `useCategories`
    - 模板中新增三种状态渲染：loading 时显示骨架屏/加载指示器；error 时显示错误提示和重试按钮；items 为空时显示空状态提示
    - 正常状态下将 `items` 传递给 `<Book>` 组件
    - _需求：1.1, 1.2, 1.3, 1.4, 2.1, 4.1, 4.2_

  - [x] 4.2 改造 `src/components/Home/Book.vue`
    - 移除 `items` prop 的硬编码默认值
    - 当 `items` 为空数组时显示空状态提示而非渲染空标签页
    - _需求：2.2, 2.3_

- [x] 5. 改造文档组件错误处理
  - [x] 5.1 改造 `src/components/Home/DocumentList.vue`
    - 新增 `LoadState` 类型：`'loading' | 'success' | 'not-found' | 'error'`
    - 新增 `categoryState`、`postsState`、`errorMessage` 响应式变量
    - 在 `getCategory` 调用中捕获错误：404 设置 `categoryState = 'not-found'`，其他设置 `categoryState = 'error'`
    - 在 `Posts` 调用中捕获错误：404 设置 `postsState = 'not-found'`，其他设置 `postsState = 'error'`
    - 新增 `isNotFoundError` 辅助函数判断 404
    - 模板中根据状态显示对应提示：分类不存在、暂无文章、通用错误+重试按钮
    - _需求：5.1, 5.2, 5.3_

  - [x] 5.2 改造 `src/components/Home/Document.vue`
    - 新增 `LoadState` 类型和 `state`、`errorMessage` 响应式变量
    - 在 `Article` 调用中捕获错误：404 设置 `state = 'not-found'`，其他设置 `state = 'error'`
    - 模板中根据状态显示对应提示：文章不存在、通用错误+重试按钮
    - _需求：6.1, 6.2_

  - [ ]* 5.3 编写属性测试：非 404 错误的通用处理
    - **属性 7：非 404 错误的通用处理**
    - **验证需求：5.3, 6.2**
    - 测试文件：`test/unit/components/Home/DocumentList.spec.ts` 和 `test/unit/components/Home/Document.spec.ts`
    - 使用 fast-check 生成随机非 404 HTTP 状态码（400-599，排除 404），验证组件状态为 `'error'` 而非 `'not-found'`

  - [ ]* 5.4 编写组件单元测试：DocumentList 和 Document 错误处理
    - 测试文件：`test/unit/components/Home/DocumentList.spec.ts`
    - 测试 getCategory 返回 404 时显示"分类不存在"（需求 5.1）
    - 测试 Posts 返回 404 时显示"暂无文章"（需求 5.2）
    - 测试文件：`test/unit/components/Home/Document.spec.ts`
    - 测试 Article 返回 404 时显示"文章不存在"（需求 6.1）

- [x] 6. 集成与联调
  - [x] 6.1 联调所有组件
    - 确保 Homepage → useCategories → wordpressApi → Book → DocumentList/Document 整条数据链路正常工作
    - 验证 `includeCategories`、`excludeCategories`、`pinnedItems` 配置从 Homepage props 正确透传
    - 确认骨架屏 → 内容渲染 → 错误降级各状态切换正常
    - _需求：1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 4.1, 4.2, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.4_

- [x] 7. 最终检查点 - 确保所有测试通过
  - 确保所有测试通过，如有疑问请询问用户。

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加速 MVP 交付
- 每个任务均引用了对应的需求编号，确保可追溯性
- 属性测试使用 fast-check 库验证正确性属性的普遍性
- 单元测试验证具体场景和边界条件
- 检查点确保增量验证，及时发现问题
