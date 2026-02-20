# WordPress 新闻集成

前端通过 WordPress REST API 获取新闻/博客内容的完整实现模式。支持文章列表、分类筛选、特色图片、分类缓存，兼容未开启 pretty permalinks 的 WordPress。

## 适用场景

- 前端需要展示新闻/博客/公告
- 后端使用 WordPress 作为 CMS
- 需要分类筛选、分页、特色图片
- Docker 部署，WordPress API 地址通过环境变量注入

## 架构概览

```
docker-compose.yml
  └─ environment:
       WORDPRESS_API_URL=https://your-wp-site.com

docker-entrypoint.sh
  └─ 注入 window.__WORDPRESS_API_URL__ 到 index.html

前端代码
  ├─ types/news.ts          (类型定义)
  ├─ services/wordpressApi.ts (API 服务层)
  └─ composables/useNews.ts   (Vue composable / React hook)
```

## 实现步骤

### 1. 类型定义

```typescript
// types/news.ts

/** 新闻分类 */
export interface NewsCategory {
  id: number
  name: string
  slug: string
}

/** 新闻条目 */
export interface NewsItem {
  id: number
  title: string
  excerpt: string
  content: string
  date: string
  link: string
  category: NewsCategory
  featuredImage?: string
}

/** 查询参数 */
export interface NewsQueryParams {
  page?: number
  perPage?: number
  categories?: number[]
}
```

### 2. WordPress API 服务

```typescript
// services/wordpressApi.ts

import axios from 'axios'
import type { NewsItem, NewsCategory, NewsQueryParams } from '@/types/news'

// ---- WordPress 原始响应类型 ----

interface WPPost {
  id: number
  date: string
  link: string
  title: { rendered: string }
  excerpt: { rendered: string }
  content: { rendered: string }
  categories: number[]
  featured_media: number
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url: string }>
    'wp:term'?: Array<Array<{ id: number; name: string; slug: string }>>
  }
}

interface WPCategory {
  id: number
  name: string
  slug: string
  count: number
}

// ---- 工具函数 ----

/** 清理 HTML 标签 */
const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim()

/** WPPost → NewsItem */
const transformPost = (
  post: WPPost,
  categoriesMap: Map<number, NewsCategory>,
): NewsItem => {
  let featuredImage: string | undefined
  if (post._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
    featuredImage = post._embedded['wp:featuredmedia'][0].source_url
  }

  let category: NewsCategory = { id: 0, name: '未分类', slug: 'uncategorized' }
  if (post._embedded?.['wp:term']?.[0]?.[0]) {
    const c = post._embedded['wp:term'][0][0]
    category = { id: c.id, name: c.name, slug: c.slug }
  } else if (post.categories.length > 0) {
    const mapped = categoriesMap.get(post.categories[0])
    if (mapped) category = mapped
  }

  return {
    id: post.id,
    title: stripHtml(post.title.rendered),
    excerpt: stripHtml(post.excerpt.rendered),
    content: post.content.rendered,
    date: post.date,
    link: post.link,
    category,
    featuredImage,
  }
}

// ---- 分类缓存 ----

let categoriesCache: Map<number, NewsCategory> | null = null

const getCategoriesMap = async (baseURL: string): Promise<Map<number, NewsCategory>> => {
  if (categoriesCache) return categoriesCache

  try {
    const categories = await wordpressApi.getCategories()
    categoriesCache = new Map(categories.map((c) => [c.id, c]))
    return categoriesCache
  } catch {
    return new Map()
  }
}

// ---- 获取 WordPress API 地址 ----

/**
 * 优先级：
 * 1. Docker 注入的 window.__WORDPRESS_API_URL__
 * 2. Vite 环境变量 VITE_WORDPRESS_API_URL
 */
function getWordPressBaseURL(): string {
  if (typeof window !== 'undefined' && (window as any).__WORDPRESS_API_URL__) {
    return (window as any).__WORDPRESS_API_URL__
  }
  return import.meta.env.VITE_WORDPRESS_API_URL || ''
}

// ---- API 服务 ----

export const wordpressApi = {
  /**
   * 获取新闻列表
   *
   * 兼容两种 WordPress 配置：
   * - Pretty permalinks: baseURL = https://site.com/wp-json/wp/v2
   * - 默认 permalinks:   baseURL = https://site.com，使用 ?rest_route=
   */
  async getNews(params?: NewsQueryParams): Promise<NewsItem[]> {
    const baseURL = getWordPressBaseURL()
    if (!baseURL) {
      console.warn('WordPress API URL 未配置')
      return []
    }

    const queryParams: Record<string, string> = {
      _embed: 'wp:featuredmedia,wp:term',
      per_page: String(params?.perPage ?? 10),
      page: String(params?.page ?? 1),
    }

    if (params?.categories?.length) {
      queryParams.categories = params.categories.join(',')
    }

    // 判断是否使用 rest_route 格式
    const useRestRoute = baseURL.includes('index.php') || !baseURL.includes('wp-json')
    let url: string

    if (useRestRoute) {
      // 默认 permalinks: /index.php?rest_route=/wp/v2/posts
      url = baseURL.includes('index.php') ? baseURL : `${baseURL}/index.php`
      queryParams.rest_route = '/wp/v2/posts'
    } else {
      // Pretty permalinks: /wp-json/wp/v2/posts
      url = `${baseURL}/posts`
    }

    const categoriesMap = await getCategoriesMap(baseURL)
    const response = await axios.get<WPPost[]>(url, { params: queryParams })
    return response.data.map((post) => transformPost(post, categoriesMap))
  },

  /** 获取分类列表 */
  async getCategories(): Promise<NewsCategory[]> {
    const baseURL = getWordPressBaseURL()
    if (!baseURL) return []

    const useRestRoute = baseURL.includes('index.php') || !baseURL.includes('wp-json')
    let url: string
    const queryParams: Record<string, string> = {
      per_page: '100',
      hide_empty: 'false',
    }

    if (useRestRoute) {
      url = baseURL.includes('index.php') ? baseURL : `${baseURL}/index.php`
      queryParams.rest_route = '/wp/v2/categories'
    } else {
      url = `${baseURL}/categories`
    }

    const response = await axios.get<WPCategory[]>(url, { params: queryParams })
    return response.data.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))
  },
}

/** 清除分类缓存 */
export const clearCategoriesCache = () => { categoriesCache = null }
```

### 3. Vue Composable

```typescript
// composables/useNews.ts

import { ref, onMounted } from 'vue'
import axios from 'axios'
import { wordpressApi } from '@/services/wordpressApi'
import type { NewsItem, NewsQueryParams } from '@/types/news'

export function useNews(autoFetch = true) {
  const news = ref<NewsItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  let lastParams: NewsQueryParams | undefined

  const fetchNews = async (params?: NewsQueryParams) => {
    lastParams = params
    loading.value = true
    error.value = null

    try {
      news.value = await wordpressApi.getNews(params)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response) {
          error.value = `服务器错误 (${err.response.status})`
        } else if (err.request) {
          error.value = '网络连接失败，请检查网络后重试'
        } else {
          error.value = err.message
        }
      } else {
        error.value = '新闻加载失败，请稍后重试'
      }
    } finally {
      loading.value = false
    }
  }

  const retry = () => fetchNews(lastParams)

  onMounted(() => { if (autoFetch) fetchNews() })

  return { news, loading, error, fetchNews, retry }
}
```

### 4. React Hook（可选）

```typescript
// hooks/useNews.ts

import { useState, useEffect, useCallback } from 'react'
import { wordpressApi } from '@/services/wordpressApi'
import type { NewsItem, NewsQueryParams } from '@/types/news'

export function useNews(autoFetch = true) {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastParams, setLastParams] = useState<NewsQueryParams>()

  const fetchNews = useCallback(async (params?: NewsQueryParams) => {
    setLastParams(params)
    setLoading(true)
    setError(null)
    try {
      const result = await wordpressApi.getNews(params)
      setNews(result)
    } catch (err: any) {
      setError(err?.message || '新闻加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const retry = useCallback(() => fetchNews(lastParams), [fetchNews, lastParams])

  useEffect(() => { if (autoFetch) fetchNews() }, [autoFetch, fetchNews])

  return { news, loading, error, fetchNews, retry }
}
```

### 5. Docker 环境变量注入

在 `docker-entrypoint.sh` 中加入：

```bash
WORDPRESS_API_URL="${WORDPRESS_API_URL:-}"
[ -n "$WORDPRESS_API_URL" ] && INJECT="${INJECT}window.__WORDPRESS_API_URL__='${WORDPRESS_API_URL}';"
```

### 6. docker-compose 配置

```yaml
services:
  frontend:
    image: your-app:latest
    environment:
      - WORDPRESS_API_URL=https://your-wp-site.com

  wordpress:
    image: wordpress:latest
    ports:
      - "8080:80"
    environment:
      WORDPRESS_DB_HOST: db:3306
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: your_password
      WORDPRESS_DB_NAME: wordpress
    volumes:
      - blog-data:/var/www/html

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wordpress
      MYSQL_PASSWORD: your_password
    volumes:
      - sql-data:/var/lib/mysql

volumes:
  sql-data:
  blog-data:
```

### 7. 本地开发（.env）

```env
# Pretty permalinks 格式
VITE_WORDPRESS_API_URL=http://localhost:8080/wp-json/wp/v2

# 或默认 permalinks 格式（未开启伪静态）
# VITE_WORDPRESS_API_URL=http://localhost:8080
```

## WordPress Permalinks 兼容说明

| WordPress 配置 | API URL 格式 | 示例 |
|---|---|---|
| Pretty permalinks 已开启 | `https://site.com/wp-json/wp/v2` | 直接拼接 `/posts` |
| 默认 permalinks | `https://site.com` | 使用 `?rest_route=/wp/v2/posts` |
| 默认 + index.php | `https://site.com/index.php?rest_route=` | 使用 `rest_route` 参数 |

服务层自动检测 URL 格式并选择正确的请求方式。

## 依赖

- `axios` — HTTP 请求
- WordPress REST API — 后端需启用（默认已启用）

## 注意事项

- 特色图片需要在请求中加 `_embed=wp:featuredmedia` 参数
- 分类数据会缓存，避免重复请求，可调用 `clearCategoriesCache()` 强制刷新
- 跨域问题：WordPress 需要配置 CORS，或通过 nginx 反向代理
- 生产环境建议通过 nginx 代理 WordPress API，避免暴露 WordPress 地址
- **baseURL 运行时覆盖**：本项目 `wp.ts` 拦截器会从 `domainStore.blog` 动态覆盖 `config.baseURL`，因此 `buildEndpoint` 做 rest_route 判断时不能只看 `request.defaults.baseURL`（静态值），还需检查 `domainStore.blog` 的运行时值
- **Jetpack 特色图片**：本项目 WordPress 安装了 Jetpack 插件，文章列表使用 `jetpack_featured_media_url` 字段获取特色图片（比标准 `_embed` 的 `wp:featuredmedia` 更轻量），`transformPost` 会优先使用此字段

## 已知问题：rest_route 兼容逻辑失效

`wp.ts` 请求拦截器在 `domainStore.blog` 存在时，强制将 `config.baseURL` 设为 `${blogUrl}/wp-json/wp/v2/`。这导致 `buildEndpoint` 中 `effectiveBaseURL.includes("wp-json")` 始终为 true，rest_route 分支永远不会执行。

当 WordPress 站点未启用 pretty permalinks 时（如 `blog.hxgxonline.com`），所有 `/wp-json/wp/v2/` 路径的请求都会 404。

修复方向：
1. WordPress 后台启用 pretty permalinks（设置 → 固定链接 → 选择非"朴素"格式），需要服务器支持 URL 重写
2. 或修改 `wp.ts` 拦截器，不强制拼接 `/wp-json/wp/v2/`，改为 `config.baseURL = blogUrl + '/'`，让 `buildEndpoint` 的 rest_route 检测逻辑正常工作

## 实际文件对应

| Skill 描述 | 实际文件 |
|---|---|
| types/news.ts | `src/types/news.ts` |
| services/wordpressApi.ts | `src/api/home/wordpress.ts`（含 wordpressApi 服务对象 + 向后兼容旧函数） |
| axios 实例 | `src/utils/wp.ts`（含 domainStore.blog 动态 baseURL） |
| composables/useNews.ts | 未独立抽取，逻辑在各组件内 |
