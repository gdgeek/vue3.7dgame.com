/**
 * 类型模块单元测试 - src/types/news.ts
 * 验证 NewsCategory、TabItem、NewsItem、NewsQueryParams、WPPost、WPCategory 接口结构
 */
import { describe, it, expect } from "vitest";
import type {
  NewsCategory,
  TabItem,
  NewsItem,
  NewsQueryParams,
  WPPost,
  WPCategory,
} from "@/types/news";

describe("NewsCategory 接口", () => {
  it("必填字段赋值", () => {
    const c: NewsCategory = { id: 1, name: "Tech", slug: "tech" };
    expect(c.id).toBe(1);
    expect(c.name).toBe("Tech");
    expect(c.slug).toBe("tech");
  });

  it("count 字段可选", () => {
    const c: NewsCategory = { id: 2, name: "News", slug: "news", count: 42 };
    expect(c.count).toBe(42);
  });
});

describe("TabItem 接口", () => {
  it("type 为 document", () => {
    const t: TabItem = { label: "文档", type: "document", id: 1 };
    expect(t.type).toBe("document");
  });

  it("type 为 category", () => {
    const t: TabItem = { label: "分类", type: "category", id: 2 };
    expect(t.type).toBe("category");
  });
});

describe("NewsItem 接口", () => {
  it("必填字段赋值", () => {
    const item: NewsItem = {
      id: 1,
      title: "Hello",
      excerpt: "Short",
      content: "Full content",
      date: "2024-01-01",
      link: "https://example.com/1",
      category: { id: 1, name: "Tech", slug: "tech" },
    };
    expect(item.id).toBe(1);
    expect(item.title).toBe("Hello");
    expect(item.category.slug).toBe("tech");
  });

  it("featuredImage 可选", () => {
    const item: NewsItem = {
      id: 2,
      title: "World",
      excerpt: "",
      content: "",
      date: "2024-01-02",
      link: "",
      category: { id: 1, name: "News", slug: "news" },
      featuredImage: "https://example.com/img.jpg",
    };
    expect(item.featuredImage).toContain("img.jpg");
  });
});

describe("NewsQueryParams 接口", () => {
  it("所有字段可选", () => {
    const q: NewsQueryParams = {};
    expect(q).toBeDefined();
  });

  it("page 和 perPage 赋值", () => {
    const q: NewsQueryParams = { page: 2, perPage: 10 };
    expect(q.page).toBe(2);
    expect(q.perPage).toBe(10);
  });

  it("categories 赋值为数组", () => {
    const q: NewsQueryParams = { categories: [1, 3, 5] };
    expect(q.categories).toEqual([1, 3, 5]);
  });
});

describe("WPPost 接口", () => {
  it("必填字段赋值", () => {
    const post: WPPost = {
      id: 1,
      date: "2024-01-01T00:00:00",
      link: "https://example.com",
      title: { rendered: "Title" },
      excerpt: { rendered: "Excerpt" },
      content: { rendered: "<p>Content</p>" },
      categories: [1, 2],
      featured_media: 0,
    };
    expect(post.id).toBe(1);
    expect(post.title.rendered).toBe("Title");
    expect(post.categories).toContain(1);
  });

  it("jetpack_featured_media_url 可选", () => {
    const post: WPPost = {
      id: 2,
      date: "",
      link: "",
      title: { rendered: "" },
      excerpt: { rendered: "" },
      content: { rendered: "" },
      categories: [],
      featured_media: 5,
      jetpack_featured_media_url: "https://example.com/img.jpg",
    };
    expect(post.jetpack_featured_media_url).toBeDefined();
  });

  it("_embedded.wp:featuredmedia 可选嵌套结构", () => {
    const post: WPPost = {
      id: 3,
      date: "",
      link: "",
      title: { rendered: "" },
      excerpt: { rendered: "" },
      content: { rendered: "" },
      categories: [],
      featured_media: 0,
      _embedded: {
        "wp:featuredmedia": [{ source_url: "https://img.jpg" }],
        "wp:term": [[{ id: 1, name: "Cat", slug: "cat" }]],
      },
    };
    expect(post._embedded?.["wp:featuredmedia"]?.[0].source_url).toContain(
      "img"
    );
  });
});

describe("WPCategory 接口", () => {
  it("所有必填字段赋值", () => {
    const c: WPCategory = {
      id: 1,
      name: "Tech",
      slug: "tech",
      count: 10,
      description: "Technology news",
    };
    expect(c.id).toBe(1);
    expect(c.count).toBe(10);
    expect(c.description).toBe("Technology news");
  });
});
