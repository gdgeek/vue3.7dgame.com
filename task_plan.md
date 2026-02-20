# WordPress API 升级计划

## 目标
将实际代码对齐到 wordpress-news skill 描述的架构：
1. 独立的 `wordpressApi` 服务对象 + `transformPost` 转换层
2. `rest_route` 兼容逻辑（支持未开启 pretty permalinks）
3. 分类缓存机制

## 阶段

### Phase 1: 调研 `[complete]`
- 3 个调用方: News/index.vue, DocumentList.vue, Document.vue
- 都直接使用原始 WP 响应 (response.data)
- baseURL 来自 VITE_APP_DOC_API 或 domainStore.blog

### Phase 2: 创建类型定义 `[complete]`
- 创建 `src/types/news.ts`

### Phase 3: 重写 WordPress API 服务 `[complete]`
- 重写 `src/api/home/wordpress.ts`
- 包含 transformPost、rest_route 兼容、分类缓存
- 保留向后兼容的旧函数 (getCategory, Article, Post, Posts)
- buildEndpoint 同时检查 domainStore.blog 和 defaults.baseURL

### Phase 4: 验证 `[complete]`
- 所有文件 0 diagnostics

## 文件变更
- 新增: `src/types/news.ts`
- 重写: `src/api/home/wordpress.ts`
- 未修改调用方（向后兼容）
