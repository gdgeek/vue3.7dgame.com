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
});
