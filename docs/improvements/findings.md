# WordPress API 升级 - 调研发现

## 调用方分析

### 1. `src/views/web/components/News/index.vue`
- 使用 `Posts`, `Article`, `getCategory`
- 直接访问 `response.data` 和 `response.headers["x-wp-totalpages"]`
- 使用字段: `id`, `title.rendered`, `excerpt.rendered`, `jetpack_featured_media_url`, `date`
- Article 详情使用: `content.rendered`, `_embedded['wp:term']`

### 2. `src/components/Home/DocumentList.vue`
- 使用 `Posts`, `getCategory`
- 直接访问 `response.data` 和 `response.headers`
- 使用字段: `id`, `title.rendered`, `excerpt.rendered`, `jetpack_featured_media_url`, `date`

### 3. `src/components/Home/Document.vue`
- 使用 `Article`
- 直接访问 `response.data`
- 使用字段: `title.rendered`, `content.rendered`, `date`, `_embedded['wp:term']`

## 关键发现
- 所有调用方都直接使用 `response.data`（原始 WP 响应）
- 分页信息从 `response.headers` 获取
- `jetpack_featured_media_url` 是 Jetpack 插件提供的字段
- `wp.ts` 的 baseURL 来自 `VITE_APP_DOC_API` 或 `domainStore.blog` + `/wp-json/wp/v2/`
- 当前只支持 pretty permalinks 格式

## 升级策略
- 保持旧 API 函数签名兼容（返回 AxiosResponse），避免破坏调用方
- 新增 wordpressApi 服务对象作为底层实现
- 旧函数改为调用 wordpressApi
- 新增 transformPost 转换层（可选使用）
- 新增 rest_route 兼容
- 新增分类缓存
