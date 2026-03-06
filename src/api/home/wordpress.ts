import request from "@/utils/wp";
import { useDomainStoreHook } from "@/store/modules/domain";
import { logger } from "@/utils/logger";
import type {
  NewsItem,
  NewsCategory,
  NewsQueryParams,
  WPPost,
  WPCategory,
} from "@/types/news";

// ---- HTML 清理工具 ----

const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();

// ---- 转换层 ----

/**
 * 将 WordPress 原始文章转换为统一的 NewsItem
 */
export const transformPost = (
  post: WPPost,
  categoriesMap: Map<number, NewsCategory>
): NewsItem => {
  // 特色图片：优先 Jetpack 字段，其次 _embed
  let featuredImage: string | undefined;
  if (post.jetpack_featured_media_url) {
    featuredImage = post.jetpack_featured_media_url;
  } else if (post._embedded?.["wp:featuredmedia"]?.[0]?.source_url) {
    featuredImage = post._embedded["wp:featuredmedia"][0].source_url;
  }

  // 分类：优先 _embed 内嵌，其次缓存 map
  let category: NewsCategory = { id: 0, name: "未分类", slug: "uncategorized" };
  if (post._embedded?.["wp:term"]?.[0]?.[0]) {
    const c = post._embedded["wp:term"][0][0];
    category = { id: c.id, name: c.name, slug: c.slug };
  } else if (post.categories.length > 0) {
    const mapped = categoriesMap.get(post.categories[0]);
    if (mapped) category = mapped;
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
  };
};

// ---- 分类缓存 ----

let categoriesCache: Map<number, NewsCategory> | null = null;

const fetchAndCacheCategories = async (): Promise<
  Map<number, NewsCategory>
> => {
  if (categoriesCache) return categoriesCache;

  try {
    const categories = await wordpressApi.getCategories();
    categoriesCache = new Map(categories.map((c) => [c.id, c]));
    return categoriesCache;
  } catch (error) {
    logger.warn("[wordpress] Failed to fetch categories:", error);
    return new Map();
  }
};

/** 清除分类缓存（切换域名/语言时调用） */
export const clearCategoriesCache = (): void => {
  categoriesCache = null;
  categoriesFullCache = null;
};

// ---- stale-while-revalidate 缓存 ----

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

let categoriesFullCache: CacheEntry<NewsCategory[]> | null = null;
const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 分钟

// ---- rest_route 兼容工具 ----

/**
 * 根据 baseURL 判断是否需要使用 rest_route 格式
 *
 * Pretty permalinks:  baseURL 包含 wp-json → 直接拼接路径
 * 默认 permalinks:    baseURL 不含 wp-json → 使用 ?rest_route= 参数
 */
const buildEndpoint = (
  endpoint: string,
  extraParams?: Record<string, string>
): { url: string; params: Record<string, string> } => {
  const params: Record<string, string> = { ...extraParams };

  // 判断实际生效的 baseURL 是否包含 wp-json
  // 优先级：domainStore.blog（运行时动态覆盖） > defaults.baseURL（静态配置）
  let effectiveBaseURL = (request.defaults.baseURL || "") as string;
  try {
    const domainStore = useDomainStoreHook();
    if (domainStore.blog) {
      effectiveBaseURL = `${domainStore.blog.replace(/\/+$/, "")}/wp-json/wp/v2/`;
    }
  } catch {
    // store 未初始化时忽略
  }

  const useRestRoute = !effectiveBaseURL.includes("wp-json");

  if (useRestRoute) {
    // 默认 permalinks: 使用 rest_route 参数
    params.rest_route = `/wp/v2${endpoint}`;
    return { url: "", params };
  }

  // Pretty permalinks: 直接拼接
  return { url: endpoint, params };
};

// ---- WordPress API 服务对象 ----

export const wordpressApi = {
  /**
   * 获取新闻列表（返回转换后的 NewsItem[]）
   */
  async getNews(params?: NewsQueryParams): Promise<NewsItem[]> {
    const queryParams: Record<string, string> = {
      _embed: "wp:featuredmedia,wp:term",
      per_page: String(params?.perPage ?? 10),
      page: String(params?.page ?? 1),
    };

    if (params?.categories?.length) {
      queryParams.categories = params.categories.join(",");
    }

    const { url, params: finalParams } = buildEndpoint("/posts", queryParams);
    const categoriesMap = await fetchAndCacheCategories();
    const response = await request<WPPost[]>({
      url,
      method: "get",
      params: finalParams,
    });
    return response.data.map((post: WPPost) =>
      transformPost(post, categoriesMap)
    );
  },

  /**
   * 获取分类列表
   */
  async getCategories(): Promise<NewsCategory[]> {
    const queryParams: Record<string, string> = {
      per_page: "100",
      hide_empty: "false",
    };

    const { url, params: finalParams } = buildEndpoint(
      "/categories",
      queryParams
    );
    const response = await request<WPCategory[]>({
      url,
      method: "get",
      params: finalParams,
    });
    return response.data.map((c: WPCategory) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      count: c.count,
    }));
  },

  /**
   * 获取分类列表（支持 stale-while-revalidate 缓存）
   */
  async getCategoriesWithCache(): Promise<{
    data: NewsCategory[];
    isStale: boolean;
  }> {
    const now = Date.now();

    if (categoriesFullCache) {
      const age = now - categoriesFullCache.timestamp;
      if (age < CACHE_MAX_AGE) {
        return { data: categoriesFullCache.data, isStale: false };
      }
      // 缓存已过期，返回旧数据并标记为 stale
      return { data: categoriesFullCache.data, isStale: true };
    }

    // 无缓存，直接请求并写入缓存
    const data = await this.getCategories();
    categoriesFullCache = { data, timestamp: Date.now() };
    return { data, isStale: false };
  },

  /**
   * 获取单篇文章详情（返回转换后的 NewsItem）
   */
  async getArticle(id: number): Promise<NewsItem> {
    const { url, params } = buildEndpoint(`/posts/${id}`, {
      _embed: "wp:featuredmedia,wp:term",
    });
    const categoriesMap = await fetchAndCacheCategories();
    const response = await request<WPPost>({ url, method: "get", params });
    return transformPost(response.data, categoriesMap);
  },
};

// ---- 向后兼容的旧 API 函数 ----
// 保持原有签名，调用方无需修改

export const getCategory = (id: number) => {
  const { url, params } = buildEndpoint(`/categories/${id}`);
  return request({ url, method: "get", params });
};

export const Article = (id: number) => {
  const { url, params } = buildEndpoint(`/posts/${id}`, { _embed: "" });
  return request({ url, method: "get", params });
};

export const Post = (id: number) => {
  const { url, params } = buildEndpoint(`/posts/${id}`, {
    _fields: "id,title",
  });
  return request({ url, method: "get", params });
};

export const Posts = (category: number, size: number, page: number) => {
  const { url, params } = buildEndpoint("/posts", {
    categories: String(category),
    per_page: String(size),
    page: String(page),
    _fields: "id,title,sort,excerpt,jetpack_featured_media_url,date",
  });
  return request({ url, method: "get", params });
};
