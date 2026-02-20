/** WordPress 新闻相关类型定义 */

/** 新闻分类 */
export interface NewsCategory {
  id: number;
  name: string;
  slug: string;
  count?: number;
}

/** 标签页配置项 */
export interface TabItem {
  label: string;
  type: "document" | "category";
  id: number;
}

/** 新闻条目（转换后） */
export interface NewsItem {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  link: string;
  category: NewsCategory;
  featuredImage?: string;
}

/** 查询参数 */
export interface NewsQueryParams {
  page?: number;
  perPage?: number;
  categories?: number[];
}

/** WordPress 原始文章响应 */
export interface WPPost {
  id: number;
  date: string;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  categories: number[];
  featured_media: number;
  jetpack_featured_media_url?: string;
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url: string }>;
    "wp:term"?: Array<Array<{ id: number; name: string; slug: string }>>;
  };
}

/** WordPress 原始分类响应 */
export interface WPCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
  description: string;
}
