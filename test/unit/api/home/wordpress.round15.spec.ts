import { describe, it, expect, vi, beforeEach } from "vitest";

const wpRequest = vi.hoisted(() => {
  const fn = vi.fn();
  Object.assign(fn, { defaults: { baseURL: "" } });
  return fn;
});

const domainStoreHook = vi.hoisted(() => vi.fn(() => ({ blog: "" })));

vi.mock("@/utils/wp", () => ({ default: wpRequest }));
vi.mock("@/store/modules/domain", () => ({
  useDomainStoreHook: domainStoreHook,
}));
vi.mock("@/utils/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

describe("src/api/home/wordpress.ts round15", () => {
  let transformPost: typeof import("@/api/home/wordpress").transformPost;
  let clearCategoriesCache: typeof import("@/api/home/wordpress").clearCategoriesCache;
  let wordpressApi: typeof import("@/api/home/wordpress").wordpressApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    Object.assign(wpRequest, { defaults: { baseURL: "" } });
    wpRequest.mockResolvedValue({ data: [] });

    const mod = await import("@/api/home/wordpress");
    transformPost = mod.transformPost;
    clearCategoriesCache = mod.clearCategoriesCache;
    wordpressApi = mod.wordpressApi;
    clearCategoriesCache();
  });

  it("transformPost strips html and entities in title/excerpt", () => {
    const post = {
      id: 1,
      title: { rendered: "<b>A&amp;B</b>" },
      excerpt: { rendered: "<p>x&nbsp;y</p>" },
      content: { rendered: "<p>body</p>" },
      date: "2026-01-01",
      link: "https://x/p/1",
      categories: [],
    };
    const item = transformPost(post as never, new Map());
    expect(item.title).toBe("A&B");
    expect(item.excerpt).toBe("x y");
  });

  it("transformPost prefers jetpack featured image", () => {
    const post = {
      id: 2,
      title: { rendered: "t" },
      excerpt: { rendered: "e" },
      content: { rendered: "c" },
      date: "2026-01-01",
      link: "https://x/p/2",
      categories: [],
      jetpack_featured_media_url: "https://img/j.jpg",
      _embedded: { "wp:featuredmedia": [{ source_url: "https://img/e.jpg" }] },
    };
    expect(transformPost(post as never, new Map()).featuredImage).toBe(
      "https://img/j.jpg"
    );
  });

  it("transformPost falls back to embedded featured image", () => {
    const post = {
      id: 3,
      title: { rendered: "t" },
      excerpt: { rendered: "e" },
      content: { rendered: "c" },
      date: "2026-01-01",
      link: "https://x/p/3",
      categories: [],
      jetpack_featured_media_url: "",
      _embedded: { "wp:featuredmedia": [{ source_url: "https://img/e.jpg" }] },
    };
    expect(transformPost(post as never, new Map()).featuredImage).toBe(
      "https://img/e.jpg"
    );
  });

  it("transformPost prefers embedded category over map", () => {
    const post = {
      id: 4,
      title: { rendered: "t" },
      excerpt: { rendered: "e" },
      content: { rendered: "c" },
      date: "2026-01-01",
      link: "https://x/p/4",
      categories: [9],
      _embedded: { "wp:term": [[{ id: 5, name: "Embed", slug: "embed" }]] },
    };
    const map = new Map([[9, { id: 9, name: "Map", slug: "map" }]]);
    expect(transformPost(post as never, map as never).category.name).toBe(
      "Embed"
    );
  });

  it("getCategories uses rest_route mode when baseURL has no wp-json", async () => {
    wpRequest.mockResolvedValue({
      data: [{ id: 1, name: "N", slug: "n", count: 1 }],
    });
    await wordpressApi.getCategories();
    const call = wpRequest.mock.calls[0][0];
    expect(call.url).toBe("");
    expect(call.params.rest_route).toBe("/wp/v2/categories");
  });

  it("getNews appends categories query and transforms posts", async () => {
    wpRequest
      .mockResolvedValueOnce({
        data: [{ id: 1, name: "News", slug: "news", count: 3 }],
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 8,
            title: { rendered: "<b>Title</b>" },
            excerpt: { rendered: "<p>Ex</p>" },
            content: { rendered: "C" },
            date: "2026-01-01",
            link: "https://x/p/8",
            categories: [1],
          },
        ],
      });

    const list = await wordpressApi.getNews({
      categories: [1, 2],
      page: 2,
      perPage: 5,
    });
    const postCall = wpRequest.mock.calls[1][0];
    expect(postCall.params.categories).toBe("1,2");
    expect(list[0].title).toBe("Title");
  });

  it("getCategoriesWithCache reuses fresh cache", async () => {
    wpRequest.mockResolvedValue({
      data: [{ id: 2, name: "A", slug: "a", count: 0 }],
    });
    const first = await wordpressApi.getCategoriesWithCache();
    const second = await wordpressApi.getCategoriesWithCache();
    expect(first.isStale).toBe(false);
    expect(second.isStale).toBe(false);
    expect(wpRequest).toHaveBeenCalledTimes(1);
  });

  it("clearCategoriesCache forces categories re-fetch", async () => {
    wpRequest.mockResolvedValue({
      data: [{ id: 3, name: "B", slug: "b", count: 1 }],
    });
    await wordpressApi.getCategoriesWithCache();
    clearCategoriesCache();
    await wordpressApi.getCategoriesWithCache();
    expect(wpRequest).toHaveBeenCalledTimes(2);
  });
});
