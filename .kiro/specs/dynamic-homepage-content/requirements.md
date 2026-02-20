# 需求文档：首页动态内容

## 简介

当前首页（`home/index.vue`）和 Book 组件中硬编码了 WordPress 文档 ID（如 1455、999）和分类 ID（如 74、77、79、84）。当 WordPress 站点上不存在这些资源时，页面会出错。本功能将硬编码列表替换为动态方案：从 WordPress API 获取可用分类，自动构建首页标签页内容，并在数据不可用时优雅降级。

## 术语表

- **Homepage**：应用首页视图（`src/views/home/index.vue`），展示公告和文档内容
- **Book_Component**：标签页组件（`src/components/Home/Book.vue`），根据 items 列表渲染 Document 或 DocumentList
- **DocumentList_Component**：文档列表组件（`src/components/Home/DocumentList.vue`），根据分类 ID 获取并展示文章列表
- **Document_Component**：单篇文档组件（`src/components/Home/Document.vue`），根据文章 ID 获取并展示文章详情
- **WordPress_API**：WordPress REST API 服务层（`src/api/home/wordpress.ts`），提供分类查询、文章查询等接口
- **Domain_Store**：域名信息存储（`src/store/modules/domain.ts`），包含 WordPress 博客地址等配置
- **Tab_Item**：标签页配置项，包含 label（显示名称）、type（`document` 或 `category`）、id（WordPress 资源 ID）

## 需求

### 需求 1：动态获取 WordPress 分类列表

**用户故事：** 作为前端开发者，我希望首页能从 WordPress API 动态获取可用分类列表，以便不再依赖硬编码的分类 ID。

#### 验收标准

1. WHEN Homepage 加载时，THE WordPress_API SHALL 调用分类列表接口获取所有可用分类
2. WHEN 分类列表接口返回成功，THE Homepage SHALL 根据返回的分类数据动态构建 Tab_Item 列表
3. WHEN 分类列表接口返回空数据，THE Homepage SHALL 显示空状态提示，不渲染任何标签页
4. IF 分类列表接口请求失败，THEN THE Homepage SHALL 显示错误提示信息，并提供重试按钮

### 需求 2：移除硬编码的资源 ID

**用户故事：** 作为前端开发者，我希望移除所有硬编码的 WordPress 文档 ID 和分类 ID，以便应用能适配任意 WordPress 站点。

#### 验收标准

1. THE Homepage SHALL 不包含任何硬编码的 WordPress 文档 ID 或分类 ID
2. THE Book_Component SHALL 不包含任何硬编码的默认 Tab_Item 列表
3. WHEN Book_Component 未接收到 items 属性时，THE Book_Component SHALL 显示空状态提示而非使用硬编码默认值

### 需求 3：分类数据到标签页的映射

**用户故事：** 作为用户，我希望首页标签页能自动反映 WordPress 上实际存在的分类，以便我能浏览所有可用内容。

#### 验收标准

1. WHEN WordPress 分类数据加载完成，THE Homepage SHALL 将每个分类映射为一个 type 为 `category` 的 Tab_Item
2. THE Homepage SHALL 使用分类的 name 字段作为 Tab_Item 的 label
3. THE Homepage SHALL 使用分类的 id 字段作为 Tab_Item 的 id
4. WHEN 分类的 count 字段为 0 时，THE Homepage SHALL 过滤掉该分类，不生成对应的 Tab_Item

### 需求 4：加载状态展示

**用户故事：** 作为用户，我希望在首页内容加载过程中看到加载指示器，以便了解页面正在获取数据。

#### 验收标准

1. WHILE 分类列表数据正在加载，THE Homepage SHALL 显示骨架屏或加载指示器
2. WHEN 数据加载完成，THE Homepage SHALL 替换加载指示器为实际的标签页内容

### 需求 5：DocumentList 组件容错处理

**用户故事：** 作为前端开发者，我希望 DocumentList_Component 在分类 ID 无效时能优雅处理，以便不会导致页面崩溃。

#### 验收标准

1. IF getCategory 接口返回 404 错误，THEN THE DocumentList_Component SHALL 显示"分类不存在"的提示信息
2. IF Posts 接口返回 404 错误，THEN THE DocumentList_Component SHALL 显示"暂无文章"的提示信息
3. IF getCategory 或 Posts 接口返回非 404 的错误，THEN THE DocumentList_Component SHALL 显示通用错误提示并提供重试按钮

### 需求 6：Document 组件容错处理

**用户故事：** 作为前端开发者，我希望 Document_Component 在文章 ID 无效时能优雅处理，以便不会导致页面崩溃。

#### 验收标准

1. IF Article 接口返回 404 错误，THEN THE Document_Component SHALL 显示"文章不存在"的提示信息
2. IF Article 接口返回非 404 的错误，THEN THE Document_Component SHALL 显示通用错误提示并提供重试按钮

### 需求 7：可选的分类与文章过滤

**用户故事：** 作为前端开发者，我希望能可选地指定只显示某些分类/文章，或排除某些分类/文章，以便在不同部署环境中灵活控制首页内容。

#### 验收标准

1. THE Homepage SHALL 支持可选的 `includeCategories`（白名单）配置，值为分类 ID 数组或分类 slug 数组
2. THE Homepage SHALL 支持可选的 `excludeCategories`（黑名单）配置，值为分类 ID 数组或分类 slug 数组
3. IF `includeCategories` 已配置，THEN THE Homepage SHALL 仅显示在白名单中的分类
4. IF `excludeCategories` 已配置，THEN THE Homepage SHALL 排除黑名单中的分类
5. IF `includeCategories` 和 `excludeCategories` 同时配置，THEN `includeCategories` SHALL 优先生效，`excludeCategories` 被忽略
6. IF 未配置任何过滤条件，THEN THE Homepage SHALL 显示所有可用分类（默认行为）
7. THE Homepage SHALL 支持可选的 `pinnedItems` 配置，允许指定额外的 Tab_Item（如特定文章），这些项将插入到动态分类列表之前

### 需求 8：分类缓存与刷新

**用户故事：** 作为用户，我希望首页分类数据能被缓存以提升加载速度，同时在需要时能刷新。

#### 验收标准

1. WHEN 分类列表首次加载成功，THE WordPress_API SHALL 缓存分类数据
2. WHEN 用户再次访问 Homepage 时，THE Homepage SHALL 优先使用缓存的分类数据渲染标签页
3. WHEN 缓存数据存在时，THE Homepage SHALL 在后台静默刷新分类数据（stale-while-revalidate 策略）
4. IF 后台刷新返回的数据与缓存不同，THEN THE Homepage SHALL 更新标签页列表
