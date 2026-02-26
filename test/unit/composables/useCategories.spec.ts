/**
 * Unit tests for src/composables/useCategories.ts
 * Only tests the pure utility functions:
 *   - mapCategoryToTabItem
 *   - filterCategories
 * (useCategories itself makes network calls and is excluded from unit scope.)
 */
import { describe, it, expect, vi } from "vitest";

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
} from "@/composables/useCategories";
import type { NewsCategory } from "@/types/news";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeCategory = (
  overrides: Partial<NewsCategory> = {}
): NewsCategory => ({
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
    const cats = [makeCategory({ id: 1, count: 1 }), makeCategory({ id: 2, count: 10 })];
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
