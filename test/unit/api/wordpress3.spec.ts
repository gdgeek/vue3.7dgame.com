/**
 * Unit tests for src/api/home/wordpress.ts — supplemental (round 14)
 *
 * Covers uncovered branches:
 *   - fetchAndCacheCategories(): catch block when getCategories throws (lines 76-78)
 *     → returns empty Map instead of propagating the error
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockRequest = vi.hoisted(() =>
  Object.assign(vi.fn(), {
    defaults: { baseURL: "https://blog.example.com/wp-json/wp/v2/" },
  })
);

vi.mock("@/utils/wp", () => ({
  default: mockRequest,
}));

vi.mock("@/store/modules/domain", () => ({
  useDomainStoreHook: vi.fn(() => ({ blog: null })),
}));

vi.mock("@/utils/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lang", () => ({
  default: {
    global: { locale: { value: "zh-CN" }, t: (k: string) => k },
  },
}));

// ── Tests ──────────────────────────────────────────────────────────────────

describe("wordpress.ts — fetchAndCacheCategories() catch block (lines 76-78)", () => {
  let mod: typeof import("@/api/home/wordpress");

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    // Re-assign defaults after clearAllMocks resets the mock function
    Object.assign(mockRequest, {
      defaults: { baseURL: "https://blog.example.com/wp-json/wp/v2/" },
    });
    mod = await import("@/api/home/wordpress");
    // Clear cache between tests
    mod.clearCategoriesCache();
  });

  // ── catch block: getCategories() throws → returns empty Map ────────────

  it("getNews() resolves when getCategories throws (catch block returns empty Map)", async () => {
    // First call: getCategories() → fetchAndCacheCategories → catch → returns empty Map
    mockRequest
      .mockRejectedValueOnce(new Error("Categories fetch failed"))
      // Second call: getNews request succeeds
      .mockResolvedValueOnce({
        data: [
          {
            id: 1,
            title: { rendered: "Post Title" },
            content: { rendered: "<p>Content</p>" },
            excerpt: { rendered: "<p>Excerpt</p>" },
            date: "2024-01-01",
            categories: [1],
            tags: [],
            slug: "post-title",
            link: "https://example.com/post",
            featured_media: 0,
            _embedded: {},
          },
        ],
      });

    await expect(mod.wordpressApi.getNews()).resolves.toBeDefined();
  });

  it("getNews() returns news items with empty categories when getCategories failed", async () => {
    mockRequest
      .mockRejectedValueOnce(new Error("Categories failed"))
      .mockResolvedValueOnce({
        data: [
          {
            id: 2,
            title: { rendered: "Another Post" },
            content: { rendered: "" },
            excerpt: { rendered: "" },
            date: "2024-01-02",
            categories: [5, 10],
            tags: [],
            slug: "another-post",
            link: "https://example.com/another",
            featured_media: 0,
            _embedded: {},
          },
        ],
      });

    const result = await mod.wordpressApi.getNews();
    expect(result).toHaveLength(1);
    // When categoriesMap is empty, transformPost uses default category object
    expect(result[0].category).toBeDefined();
  });

  it("fetchAndCacheCategories catch block: getCategories rejects → getNews still works", async () => {
    const categoryError = new Error("API unavailable");
    mockRequest
      .mockRejectedValueOnce(categoryError)
      .mockResolvedValueOnce({ data: [] });

    await expect(mod.wordpressApi.getNews()).resolves.toEqual([]);
  });

  it("after error, clearCategoriesCache + new call re-attempts fetching categories", async () => {
    // First getNews call: categories fail
    mockRequest
      .mockRejectedValueOnce(new Error("First fail"))
      .mockResolvedValueOnce({ data: [] });
    await mod.wordpressApi.getNews();

    // Clear cache so next call retries
    mod.clearCategoriesCache();

    // Second getNews call: categories succeed (request returns { data: [...] })
    mockRequest
      .mockResolvedValueOnce({ data: [{ id: 1, name: "Tech", count: 5, slug: "tech" }] })
      .mockResolvedValueOnce({ data: [] });

    await expect(mod.wordpressApi.getNews()).resolves.toEqual([]);
  });

  it("getArticle() also resolves when getCategories throws (catch block)", async () => {
    mockRequest
      .mockRejectedValueOnce(new Error("Categories unavailable"))
      .mockResolvedValueOnce({
        data: {
          id: 99,
          title: { rendered: "Article" },
          content: { rendered: "" },
          excerpt: { rendered: "" },
          date: "2024-01-05",
          categories: [],
          tags: [],
          slug: "article",
          link: "https://example.com/article",
          featured_media: 0,
          _embedded: {},
        },
      });

    const result = await mod.wordpressApi.getArticle(99);
    expect(result).toBeDefined();
    expect(result.id).toBe(99);
  });

  it("getNews() with successful categories maps them correctly", async () => {
    // getCategories() calls request() which returns { data: [...] }
    mockRequest
      .mockResolvedValueOnce({ data: [{ id: 3, name: "Science", count: 10, slug: "science" }] })
      .mockResolvedValueOnce({
        data: [
          {
            id: 10,
            title: { rendered: "Science Post" },
            content: { rendered: "" },
            excerpt: { rendered: "" },
            date: "2024-01-05",
            categories: [3],
            tags: [],
            slug: "science-post",
            link: "https://example.com/science",
            featured_media: 0,
            _embedded: {},
          },
        ],
      });

    const result = await mod.wordpressApi.getNews();
    expect(result).toHaveLength(1);
    expect(result[0].category.name).toBe("Science");
  });

  it("getCategories() returns empty array when request returns empty data array", async () => {
    // getCategories wraps in { data: [] }
    mockRequest.mockResolvedValueOnce({ data: [] });
    const result = await mod.wordpressApi.getCategories();
    expect(result).toEqual([]);
  });

  it("catch block: getNews resolves with empty array when categories fail", async () => {
    mockRequest
      .mockRejectedValueOnce(new Error("cat fail"))
      .mockResolvedValueOnce({ data: [] });

    const result = await mod.wordpressApi.getNews();
    expect(Array.isArray(result)).toBe(true);
  });
});
