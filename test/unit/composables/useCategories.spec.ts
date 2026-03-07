/**
 * Unit tests for src/composables/useCategories.ts
 *   - mapCategoryToTabItem
 *   - filterCategories
 *   - useCategories (composable with async load, stale-while-revalidate, retry)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Prevent import chain from reaching pinia / request / i18n
vi.mock("@/api/home/wordpress", () => ({
  wordpressApi: {
    getCategoriesWithCache: vi.fn(),
    getCategories: vi.fn(),
  },
}));
vi.mock("@/utils/request", () => ({ default: vi.fn() }));
vi.mock("@/lang", () => ({
  default: { global: { locale: { value: "zh-CN" }, t: (k: string) => k } },
}));

import {
  mapCategoryToTabItem,
  filterCategories,
  useCategories,
} from "@/composables/useCategories";
import type { NewsCategory, TabItem } from "@/types/news";
import { wordpressApi } from "@/api/home/wordpress";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeCategory = (overrides: Partial<NewsCategory> = {}): NewsCategory => ({
  id: 1,
  name: "Tech",
  slug: "tech",
  count: 5,
  ...overrides,
});

// ---------------------------------------------------------------------------
// mapCategoryToTabItem
// ---------------------------------------------------------------------------
describe("mapCategoryToTabItem()", () => {
  it("maps name → label", () => {
    const cat = makeCategory({ name: "Science" });
    expect(mapCategoryToTabItem(cat).label).toBe("Science");
  });

  it("sets type to 'category'", () => {
    expect(mapCategoryToTabItem(makeCategory()).type).toBe("category");
  });

  it("maps category id → TabItem id", () => {
    const cat = makeCategory({ id: 42 });
    expect(mapCategoryToTabItem(cat).id).toBe(42);
  });

  it("maps slug correctly (via id)", () => {
    const cat = makeCategory({ id: 7, name: "Art" });
    const item = mapCategoryToTabItem(cat);
    expect(item.id).toBe(7);
    expect(item.label).toBe("Art");
  });
});

// ---------------------------------------------------------------------------
// filterCategories — empty-count filtering
// ---------------------------------------------------------------------------
describe("filterCategories() — empty count removal", () => {
  it("removes categories with count === 0", () => {
    const cats = [
      makeCategory({ id: 1, count: 3 }),
      makeCategory({ id: 2, count: 0 }),
      makeCategory({ id: 3, count: 1 }),
    ];
    const result = filterCategories(cats);
    expect(result.map((c) => c.id)).toEqual([1, 3]);
  });

  it("keeps all categories when all have count > 0", () => {
    const cats = [
      makeCategory({ id: 1, count: 1 }),
      makeCategory({ id: 2, count: 10 }),
    ];
    expect(filterCategories(cats)).toHaveLength(2);
  });

  it("returns empty array when all categories have count 0", () => {
    const cats = [makeCategory({ count: 0 }), makeCategory({ count: 0 })];
    expect(filterCategories(cats)).toHaveLength(0);
  });

  it("keeps categories with undefined count (treated as > 0)", () => {
    const cat = makeCategory({ id: 99 });
    // delete the count to simulate undefined
    const { count: _count, ...withoutCount } = cat;
    const result = filterCategories([withoutCount as NewsCategory]);
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// filterCategories — whitelist (includeCategories)
// ---------------------------------------------------------------------------
describe("filterCategories() — includeCategories whitelist", () => {
  const cats = [
    makeCategory({ id: 1, slug: "news", count: 5 }),
    makeCategory({ id: 2, slug: "tech", count: 3 }),
    makeCategory({ id: 3, slug: "art", count: 2 }),
  ];

  it("keeps only categories matching included ids", () => {
    const result = filterCategories(cats, { includeCategories: [1, 3] });
    expect(result.map((c) => c.id)).toEqual([1, 3]);
  });

  it("keeps only categories matching included slugs", () => {
    const result = filterCategories(cats, { includeCategories: ["tech"] });
    expect(result.map((c) => c.slug)).toEqual(["tech"]);
  });

  it("whitelist takes priority over blacklist", () => {
    const result = filterCategories(cats, {
      includeCategories: [1],
      excludeCategories: [1], // would exclude id=1 if whitelist wasn't present
    });
    expect(result.map((c) => c.id)).toEqual([1]);
  });

  it("returns empty array when whitelist matches nothing", () => {
    const result = filterCategories(cats, { includeCategories: [999] });
    expect(result).toHaveLength(0);
  });

  it("excludes count=0 categories even with whitelist", () => {
    const catsWithEmpty = [
      ...cats,
      makeCategory({ id: 4, slug: "empty", count: 0 }),
    ];
    const result = filterCategories(catsWithEmpty, {
      includeCategories: [4],
    });
    // id=4 has count=0 so it's filtered before whitelist check
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// filterCategories — blacklist (excludeCategories)
// ---------------------------------------------------------------------------
describe("filterCategories() — excludeCategories blacklist", () => {
  const cats = [
    makeCategory({ id: 1, slug: "news", count: 5 }),
    makeCategory({ id: 2, slug: "tech", count: 3 }),
    makeCategory({ id: 3, slug: "art", count: 2 }),
  ];

  it("removes categories matching excluded ids", () => {
    const result = filterCategories(cats, { excludeCategories: [2] });
    expect(result.map((c) => c.id)).toEqual([1, 3]);
  });

  it("removes categories matching excluded slugs", () => {
    const result = filterCategories(cats, { excludeCategories: ["art"] });
    expect(result.map((c) => c.slug)).toEqual(["news", "tech"]);
  });

  it("can exclude multiple ids", () => {
    const result = filterCategories(cats, { excludeCategories: [1, 3] });
    expect(result.map((c) => c.id)).toEqual([2]);
  });

  it("returns all when blacklist is empty", () => {
    const result = filterCategories(cats, { excludeCategories: [] });
    expect(result).toHaveLength(3);
  });

  it("returns all when no options provided", () => {
    const result = filterCategories(cats);
    expect(result).toHaveLength(3);
  });

  it("returns all when options is undefined", () => {
    const result = filterCategories(cats, undefined);
    expect(result).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// useCategories() composable
// ---------------------------------------------------------------------------
/** Flush all pending microtasks and one macrotask (setTimeout 0). */
const flushAsync = () => new Promise<void>((r) => setTimeout(r, 0));

describe("useCategories() composable", () => {
  const mockGetWithCache = wordpressApi.getCategoriesWithCache as ReturnType<
    typeof vi.fn
  >;
  const mockGetCategories = wordpressApi.getCategories as ReturnType<
    typeof vi.fn
  >;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts loading=true immediately, then sets to false after resolution", async () => {
    mockGetWithCache.mockResolvedValue({ data: [], isStale: false });
    const { loading } = useCategories();
    expect(loading.value).toBe(true);
    await flushAsync();
    expect(loading.value).toBe(false);
  });

  it("loads and transforms categories into TabItems", async () => {
    mockGetWithCache.mockResolvedValue({
      data: [
        { id: 1, name: "Tech", slug: "tech", count: 5 },
        { id: 2, name: "Art", slug: "art", count: 3 },
      ],
      isStale: false,
    });
    const { items, error } = useCategories();
    await flushAsync();
    expect(error.value).toBeNull();
    expect(items.value).toHaveLength(2);
    expect(items.value[0].label).toBe("Tech");
    expect(items.value[1].label).toBe("Art");
  });

  it("sets error.value to the Error message on API failure", async () => {
    mockGetWithCache.mockRejectedValue(new Error("Network failure"));
    const { error, loading } = useCategories();
    await flushAsync();
    expect(error.value).toBe("Network failure");
    expect(loading.value).toBe(false);
  });

  it("sets generic error message for non-Error rejection", async () => {
    mockGetWithCache.mockRejectedValue("string error");
    const { error } = useCategories();
    await flushAsync();
    expect(error.value).toBe("加载分类失败");
  });

  it("triggers background refresh when isStale is true and updates items", async () => {
    const freshData = [{ id: 9, name: "Fresh", slug: "fresh", count: 2 }];
    mockGetWithCache.mockResolvedValue({
      data: [{ id: 1, name: "Stale", slug: "stale", count: 2 }],
      isStale: true,
    });
    mockGetCategories.mockResolvedValue(freshData);

    const { items } = useCategories();
    await flushAsync();

    expect(mockGetCategories).toHaveBeenCalled();
    expect(items.value[0].label).toBe("Fresh");
  });

  it("silently ignores background refresh failure and keeps stale data", async () => {
    mockGetWithCache.mockResolvedValue({
      data: [{ id: 5, name: "Cached", slug: "cached", count: 1 }],
      isStale: true,
    });
    mockGetCategories.mockRejectedValue(new Error("bg error"));

    const { items, error } = useCategories();
    await flushAsync();

    expect(items.value[0].label).toBe("Cached");
    expect(error.value).toBeNull();
  });

  it("retry() re-invokes load and returns updated data", async () => {
    mockGetWithCache.mockResolvedValue({ data: [], isStale: false });
    const { retry, items } = useCategories();
    await flushAsync();

    mockGetWithCache.mockResolvedValue({
      data: [{ id: 7, name: "Retried", slug: "retried", count: 1 }],
      isStale: false,
    });
    await retry();

    expect(mockGetWithCache).toHaveBeenCalledTimes(2);
    expect(items.value[0].label).toBe("Retried");
  });

  it("prepends pinnedItems to transformed category list", async () => {
    mockGetWithCache.mockResolvedValue({
      data: [{ id: 10, name: "Sports", slug: "sports", count: 3 }],
      isStale: false,
    });
    const pinned: TabItem[] = [{ label: "All", type: "category", id: 0 }];
    const { items } = useCategories({ pinnedItems: pinned });
    await flushAsync();

    expect(items.value[0].label).toBe("All");
    expect(items.value[1].label).toBe("Sports");
  });

  it("applies includeCategories filter during load", async () => {
    mockGetWithCache.mockResolvedValue({
      data: [
        { id: 1, name: "Tech", slug: "tech", count: 5 },
        { id: 2, name: "Art", slug: "art", count: 3 },
      ],
      isStale: false,
    });
    const { items } = useCategories({ includeCategories: [2] });
    await flushAsync();

    expect(items.value).toHaveLength(1);
    expect(items.value[0].label).toBe("Art");
  });
});
