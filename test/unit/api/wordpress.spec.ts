/**
 * Unit tests for src/api/home/wordpress.ts
 * Covers: transformPost (pure), clearCategoriesCache, getCategoriesWithCache caching behaviour.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/wp", () => {
  const mockRequest = vi.fn();
  (mockRequest as never as Record<string, unknown>).defaults = { baseURL: "" };
  (mockRequest as never as Record<string, unknown>).interceptors = {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  };
  return { default: mockRequest };
});
vi.mock("@/store/modules/domain", () => ({
  useDomainStoreHook: vi.fn(() => ({ blog: "" })),
}));

// -----------------------------------------------------------------------
// transformPost — pure function tests
// -----------------------------------------------------------------------
describe("transformPost()", () => {
  let transformPost: typeof import("@/api/home/wordpress").transformPost;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ transformPost } = await import("@/api/home/wordpress"));
  });

  const basePost = {
    id: 1,
    title: { rendered: "Hello World" },
    excerpt: { rendered: "Short excerpt" },
    content: { rendered: "<p>Full content</p>" },
    date: "2024-01-15T10:00:00",
    link: "https://blog.example.com/hello",
    categories: [],
    jetpack_featured_media_url: "",
    _embedded: undefined as unknown,
  };

  it("maps id, date, link directly", () => {
    const result = transformPost(basePost as never, new Map());
    expect(result.id).toBe(1);
    expect(result.date).toBe("2024-01-15T10:00:00");
    expect(result.link).toBe("https://blog.example.com/hello");
  });

  it("strips HTML tags from title.rendered", () => {
    const post = {
      ...basePost,
      title: { rendered: "<strong>Hello</strong> World" },
    };
    const result = transformPost(post as never, new Map());
    expect(result.title).toBe("Hello World");
  });

  it("strips HTML tags from excerpt.rendered", () => {
    const post = {
      ...basePost,
      excerpt: { rendered: "<p>Short <em>excerpt</em></p>" },
    };
    const result = transformPost(post as never, new Map());
    expect(result.excerpt).toBe("Short excerpt");
  });

  it("decodes HTML entities in title (&amp; &lt; &gt;)", () => {
    const post = {
      ...basePost,
      title: { rendered: "A &amp; B &lt;test&gt;" },
    };
    const result = transformPost(post as never, new Map());
    expect(result.title).toBe("A & B <test>");
  });

  it("decodes &nbsp; to space in excerpt", () => {
    const post = {
      ...basePost,
      excerpt: { rendered: "Word1&nbsp;Word2" },
    };
    const result = transformPost(post as never, new Map());
    expect(result.excerpt).toBe("Word1 Word2");
  });

  it("content.rendered is kept as raw HTML (no stripping)", () => {
    const post = {
      ...basePost,
      content: { rendered: "<p>Full <strong>content</strong></p>" },
    };
    const result = transformPost(post as never, new Map());
    expect(result.content).toBe("<p>Full <strong>content</strong></p>");
  });

  it("uses jetpack_featured_media_url as featuredImage when present", () => {
    const post = {
      ...basePost,
      jetpack_featured_media_url: "https://cdn.example.com/img.jpg",
    };
    const result = transformPost(post as never, new Map());
    expect(result.featuredImage).toBe("https://cdn.example.com/img.jpg");
  });

  it("falls back to _embedded wp:featuredmedia when jetpack URL is empty", () => {
    const post = {
      ...basePost,
      jetpack_featured_media_url: "",
      _embedded: {
        "wp:featuredmedia": [{ source_url: "https://cdn.example.com/embed.jpg" }],
      },
    };
    const result = transformPost(post as never, new Map());
    expect(result.featuredImage).toBe("https://cdn.example.com/embed.jpg");
  });

  it("featuredImage is undefined when no jetpack URL and no embedded media", () => {
    const post = {
      ...basePost,
      jetpack_featured_media_url: "",
      _embedded: undefined,
    };
    const result = transformPost(post as never, new Map());
    expect(result.featuredImage).toBeUndefined();
  });

  it("uses embedded wp:term category when available", () => {
    const post = {
      ...basePost,
      _embedded: {
        "wp:term": [[{ id: 5, name: "Tech", slug: "tech" }]],
      },
    };
    const result = transformPost(post as never, new Map());
    expect(result.category).toEqual({ id: 5, name: "Tech", slug: "tech" });
  });

  it("falls back to categoriesMap lookup when no embedded term", () => {
    const post = {
      ...basePost,
      categories: [10],
      _embedded: undefined,
    };
    const catMap = new Map([[10, { id: 10, name: "Science", slug: "science" }]]);
    const result = transformPost(post as never, catMap as never);
    expect(result.category).toEqual({ id: 10, name: "Science", slug: "science" });
  });

  it("uses default '未分类' category when no term or map match", () => {
    const post = {
      ...basePost,
      categories: [99],
      _embedded: undefined,
    };
    const result = transformPost(post as never, new Map());
    expect(result.category).toEqual({
      id: 0,
      name: "未分类",
      slug: "uncategorized",
    });
  });

  it("prefers embedded term over categoriesMap", () => {
    const post = {
      ...basePost,
      categories: [10],
      _embedded: {
        "wp:term": [[{ id: 20, name: "FromEmbed", slug: "from-embed" }]],
      },
    };
    const catMap = new Map([
      [10, { id: 10, name: "FromMap", slug: "from-map" }],
    ]);
    const result = transformPost(post as never, catMap as never);
    expect(result.category.name).toBe("FromEmbed");
  });
});

// -----------------------------------------------------------------------
// clearCategoriesCache + getCategoriesWithCache
// -----------------------------------------------------------------------
describe("clearCategoriesCache()", () => {
  let clearCategoriesCache: typeof import("@/api/home/wordpress").clearCategoriesCache;
  let wordpressApi: typeof import("@/api/home/wordpress").wordpressApi;
  let wpRequest: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const wp = await import("@/utils/wp");
    wpRequest = wp.default as ReturnType<typeof vi.fn>;
    ({ clearCategoriesCache, wordpressApi } = await import(
      "@/api/home/wordpress"
    ));
    // Reset module-level cache state before each test
    clearCategoriesCache();
  });

  it("after clearCategoriesCache, getCategoriesWithCache re-fetches data", async () => {
    const cats = [{ id: 1, name: "News", slug: "news", count: 5 }];
    wpRequest.mockResolvedValue({ data: cats });

    // First call — populates cache
    await wordpressApi.getCategoriesWithCache();
    expect(wpRequest).toHaveBeenCalledTimes(1);

    // Clear cache, second call should re-fetch
    clearCategoriesCache();
    await wordpressApi.getCategoriesWithCache();
    expect(wpRequest).toHaveBeenCalledTimes(2);
  });

  it("without clearing, getCategoriesWithCache uses cached data", async () => {
    const cats = [{ id: 2, name: "Sport", slug: "sport", count: 3 }];
    wpRequest.mockResolvedValue({ data: cats });

    await wordpressApi.getCategoriesWithCache();
    await wordpressApi.getCategoriesWithCache();
    // Only one actual request due to cache
    expect(wpRequest).toHaveBeenCalledTimes(1);
  });

  it("getCategoriesWithCache returns isStale:true when cache is older than max age", async () => {
    const cats = [{ id: 3, name: "Tech", slug: "tech", count: 10 }];
    wpRequest.mockResolvedValue({ data: cats });

    // Populate the cache
    await wordpressApi.getCategoriesWithCache();

    // Simulate cache expiry (> 5 minutes)
    const origNow = Date.now;
    Date.now = () => origNow() + 6 * 60 * 1000;

    const result = await wordpressApi.getCategoriesWithCache();
    Date.now = origNow;

    expect(result.isStale).toBe(true);
    expect(result.data).toEqual(cats);
  });
});

// -----------------------------------------------------------------------
// wordpressApi method tests
// -----------------------------------------------------------------------
describe("wordpressApi.getCategories()", () => {
  let wordpressApi: typeof import("@/api/home/wordpress").wordpressApi;
  let wpRequest: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const wp = await import("@/utils/wp");
    wpRequest = wp.default as ReturnType<typeof vi.fn>;
    const mod = await import("@/api/home/wordpress");
    wordpressApi = mod.wordpressApi;
    mod.clearCategoriesCache();
  });

  it("calls the /categories endpoint and maps response", async () => {
    const rawCats = [{ id: 5, name: "Sports", slug: "sports", count: 7 }];
    wpRequest.mockResolvedValue({ data: rawCats });
    const result = await wordpressApi.getCategories();
    expect(result).toEqual([{ id: 5, name: "Sports", slug: "sports", count: 7 }]);
  });
});

describe("wordpressApi.getNews()", () => {
  let wordpressApi: typeof import("@/api/home/wordpress").wordpressApi;
  let wpRequest: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const wp = await import("@/utils/wp");
    wpRequest = wp.default as ReturnType<typeof vi.fn>;
    const mod = await import("@/api/home/wordpress");
    wordpressApi = mod.wordpressApi;
    mod.clearCategoriesCache();
  });

  it("fetches posts and transforms them", async () => {
    wpRequest
      .mockResolvedValueOnce({ data: [] }) // getCategories call
      .mockResolvedValueOnce({
        data: [
          {
            id: 1,
            title: { rendered: "News Title" },
            excerpt: { rendered: "Excerpt" },
            content: { rendered: "<p>Content</p>" },
            date: "2024-01-01T00:00:00",
            link: "https://blog.com/1",
            categories: [],
            jetpack_featured_media_url: "",
            _embedded: undefined,
          },
        ],
      });
    const result = await wordpressApi.getNews();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].title).toBe("News Title");
  });

  it("includes categories filter when params.categories provided", async () => {
    wpRequest.mockResolvedValue({ data: [] });
    await wordpressApi.getNews({ categories: [1, 2], perPage: 5, page: 2 });
    const callArgs = wpRequest.mock.calls.find(
      (c) => c[0]?.params?.categories !== undefined
    );
    expect(callArgs).toBeDefined();
    expect(callArgs![0].params.categories).toBe("1,2");
  });
});

describe("wordpressApi.getArticle()", () => {
  let wordpressApi: typeof import("@/api/home/wordpress").wordpressApi;
  let wpRequest: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const wp = await import("@/utils/wp");
    wpRequest = wp.default as ReturnType<typeof vi.fn>;
    const mod = await import("@/api/home/wordpress");
    wordpressApi = mod.wordpressApi;
    mod.clearCategoriesCache();
  });

  it("fetches single article and transforms it", async () => {
    const rawPost = {
      id: 42,
      title: { rendered: "Article Title" },
      excerpt: { rendered: "Excerpt text" },
      content: { rendered: "<p>Body</p>" },
      date: "2024-06-01T00:00:00",
      link: "https://blog.com/42",
      categories: [],
      jetpack_featured_media_url: "",
      _embedded: undefined,
    };
    wpRequest
      .mockResolvedValueOnce({ data: [] }) // getCategories
      .mockResolvedValueOnce({ data: rawPost }); // article
    const result = await wordpressApi.getArticle(42);
    expect(result.title).toBe("Article Title");
    expect(result.id).toBe(42);
  });
});

// -----------------------------------------------------------------------
// Standalone legacy API functions
// -----------------------------------------------------------------------
describe("legacy standalone API functions", () => {
  let getCategory: typeof import("@/api/home/wordpress").getCategory;
  let Article: typeof import("@/api/home/wordpress").Article;
  let Post: typeof import("@/api/home/wordpress").Post;
  let Posts: typeof import("@/api/home/wordpress").Posts;
  let wpRequest: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const wp = await import("@/utils/wp");
    wpRequest = wp.default as ReturnType<typeof vi.fn>;
    wpRequest.mockResolvedValue({ data: {} });
    ({ getCategory, Article, Post, Posts } = await import("@/api/home/wordpress"));
  });

  it("getCategory() calls /categories/{id} endpoint", async () => {
    await getCategory(5);
    const arg = wpRequest.mock.calls[0][0];
    // buildEndpoint uses rest_route format when baseURL lacks 'wp-json'
    const path = arg.url || arg.params?.rest_route || "";
    expect(path).toContain("/categories/5");
    expect(arg.method).toBe("get");
  });

  it("Article() calls /posts/{id}", async () => {
    await Article(10);
    const arg = wpRequest.mock.calls[0][0];
    const path = arg.url || arg.params?.rest_route || "";
    expect(path).toContain("/posts/10");
  });

  it("Post() calls /posts/{id}", async () => {
    await Post(20);
    const arg = wpRequest.mock.calls[0][0];
    const path = arg.url || arg.params?.rest_route || "";
    expect(path).toContain("/posts/20");
  });

  it("Posts() calls /posts with category, per_page, page params", async () => {
    await Posts(3, 5, 2);
    const arg = wpRequest.mock.calls[0][0];
    expect(arg.params.categories).toBe("3");
    expect(arg.params.per_page).toBe("5");
    expect(arg.params.page).toBe("2");
  });

  it("Article() with different ID produces different path", async () => {
    await Article(10);
    const path1 = wpRequest.mock.calls[0][0].url || wpRequest.mock.calls[0][0].params?.rest_route || "";
    vi.clearAllMocks();
    wpRequest.mockResolvedValue({ data: {} });
    await Article(20);
    const path2 = wpRequest.mock.calls[0][0].url || wpRequest.mock.calls[0][0].params?.rest_route || "";
    expect(path1).not.toBe(path2);
  });

  it("Post() returns the request result", async () => {
    const mockResp = { data: { id: 20, title: "Test" } };
    wpRequest.mockResolvedValue(mockResp);
    const result = await Post(20);
    expect(result).toEqual(mockResp);
  });
});
