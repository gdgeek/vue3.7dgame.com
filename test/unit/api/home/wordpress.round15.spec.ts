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

  describe("refreshInFlight 并发去重", () => {
    it("无缓存时并发多次调用只发起一个网络请求", async () => {
      let resolveRequest!: (v: { data: unknown[] }) => void;
      wpRequest.mockImplementationOnce(
        () => new Promise((r) => (resolveRequest = r))
      );

      // 同时发起 3 次（均无缓存）
      const [p1, p2, p3] = [
        wordpressApi.getCategoriesWithCache(),
        wordpressApi.getCategoriesWithCache(),
        wordpressApi.getCategoriesWithCache(),
      ];

      resolveRequest({ data: [{ id: 10, name: "C", slug: "c", count: 0 }] });
      const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

      // 只应发起 1 次请求
      expect(wpRequest).toHaveBeenCalledTimes(1);
      // 三次调用拿到相同数据
      expect(r1.data).toEqual(r2.data);
      expect(r2.data).toEqual(r3.data);
      expect(r1.isStale).toBe(false);
    });

    it("缓存过期时并发调用只触发一次后台刷新", async () => {
      // 先写入一个已过期的缓存
      const CACHE_MAX_AGE = 5 * 60 * 1000;
      vi.useFakeTimers();

      wpRequest.mockResolvedValue({
        data: [{ id: 20, name: "D", slug: "d", count: 0 }],
      });

      // 第一次请求，建立缓存
      await wordpressApi.getCategoriesWithCache();
      expect(wpRequest).toHaveBeenCalledTimes(1);

      // 推进时间让缓存过期
      vi.advanceTimersByTime(CACHE_MAX_AGE + 1000);

      // 此时缓存 stale，并发 3 次调用
      const [s1, s2, s3] = await Promise.all([
        wordpressApi.getCategoriesWithCache(),
        wordpressApi.getCategoriesWithCache(),
        wordpressApi.getCategoriesWithCache(),
      ]);

      // 均返回 stale 标记
      expect(s1.isStale).toBe(true);
      expect(s2.isStale).toBe(true);
      expect(s3.isStale).toBe(true);

      // 等待后台刷新完成
      await Promise.resolve();
      await Promise.resolve();

      // 后台刷新只发起了 1 次（共 2 次：1 次初始 + 1 次刷新）
      expect(wpRequest).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it("clearCategoriesCache 同时清除 refreshInFlight，下次请求重新发起", async () => {
      wpRequest.mockResolvedValue({
        data: [{ id: 30, name: "E", slug: "e", count: 0 }],
      });

      await wordpressApi.getCategoriesWithCache();
      clearCategoriesCache();

      // 清除后再请求，应重新发起
      await wordpressApi.getCategoriesWithCache();
      expect(wpRequest).toHaveBeenCalledTimes(2);
    });
  });
});
