/**
 * Unit tests for src/store/modules/tagsView.ts
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const secureLsStore = vi.hoisted(() => {
  const data: Record<string, unknown> = {};
  return {
    data,
    clear: () => {
      for (const key of Object.keys(data)) {
        delete data[key];
      }
    },
  };
});

vi.mock("secure-ls", () => ({
  default: vi.fn().mockImplementation(() => ({
    get: (key: string) => secureLsStore.data[key] ?? null,
    set: (key: string, value: unknown) => {
      secureLsStore.data[key] = value;
    },
    remove: (key: string) => {
      delete secureLsStore.data[key];
    },
  })),
}));

import { useTagsViewStore } from "@/store/modules/tagsView";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
let idCounter = 0;
const makeView = (overrides: Partial<TagView> = {}): TagView => ({
  name: `View${++idCounter}`,
  title: `Title ${idCounter}`,
  path: `/path/${idCounter}`,
  fullPath: `/path/${idCounter}`,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  secureLsStore.clear();
  setActivePinia(createPinia());
  localStorage.clear();
  idCounter = 0;
});

// ---------------------------------------------------------------------------
// addVisitedView
// ---------------------------------------------------------------------------
describe("addVisitedView()", () => {
  it("adds a view to visitedViews", () => {
    const store = useTagsViewStore();
    const v = makeView();
    store.addVisitedView(v);
    expect(store.visitedViews).toHaveLength(1);
    expect(store.visitedViews[0].path).toBe(v.path);
  });

  it("does not add duplicate paths", () => {
    const store = useTagsViewStore();
    const v = makeView();
    store.addVisitedView(v);
    store.addVisitedView(v);
    expect(store.visitedViews).toHaveLength(1);
  });

  it("affix views are prepended", () => {
    const store = useTagsViewStore();
    const regular = makeView();
    const affix = makeView({ affix: true, path: "/affix" });
    store.addVisitedView(regular);
    store.addVisitedView(affix);
    expect(store.visitedViews[0].path).toBe("/affix");
  });

  it("non-affix views are appended", () => {
    const store = useTagsViewStore();
    const v1 = makeView();
    const v2 = makeView();
    store.addVisitedView(v1);
    store.addVisitedView(v2);
    expect(store.visitedViews[1].path).toBe(v2.path);
  });
});

// ---------------------------------------------------------------------------
// addCachedView
// ---------------------------------------------------------------------------
describe("addCachedView()", () => {
  it("adds a keepAlive view to cachedViews", () => {
    const store = useTagsViewStore();
    const v = makeView({ keepAlive: true });
    store.addCachedView(v);
    expect(store.cachedViews).toContain(v.name);
  });

  it("does not add a non-keepAlive view to cachedViews", () => {
    const store = useTagsViewStore();
    const v = makeView({ keepAlive: false });
    store.addCachedView(v);
    expect(store.cachedViews).not.toContain(v.name);
  });

  it("does not add duplicate names to cachedViews", () => {
    const store = useTagsViewStore();
    const v = makeView({ keepAlive: true, name: "UniqueCache" });
    store.addCachedView(v);
    store.addCachedView(v);
    expect(store.cachedViews.filter((n) => n === v.name)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// addView (composite)
// ---------------------------------------------------------------------------
describe("addView()", () => {
  it("adds to both visitedViews and cachedViews (if keepAlive)", () => {
    const store = useTagsViewStore();
    const v = makeView({ keepAlive: true });
    store.addView(v);
    expect(store.visitedViews.some((x) => x.path === v.path)).toBe(true);
    expect(store.cachedViews).toContain(v.name);
  });
});

// ---------------------------------------------------------------------------
// delVisitedView
// ---------------------------------------------------------------------------
describe("delVisitedView()", () => {
  it("removes the view from visitedViews", async () => {
    const store = useTagsViewStore();
    const v = makeView();
    store.addVisitedView(v);
    await store.delVisitedView(v);
    expect(store.visitedViews.some((x) => x.path === v.path)).toBe(false);
  });

  it("returns updated visitedViews", async () => {
    const store = useTagsViewStore();
    const v = makeView();
    store.addVisitedView(v);
    const result = await store.delVisitedView(v);
    expect(Array.isArray(result)).toBe(true);
  });

  it("does not throw when view is not present", async () => {
    const store = useTagsViewStore();
    const v = makeView();
    await expect(store.delVisitedView(v)).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// delCachedView
// ---------------------------------------------------------------------------
describe("delCachedView()", () => {
  it("removes the view name from cachedViews", async () => {
    const store = useTagsViewStore();
    const v = makeView({ keepAlive: true });
    store.addCachedView(v);
    await store.delCachedView(v);
    expect(store.cachedViews).not.toContain(v.name);
  });
});

// ---------------------------------------------------------------------------
// delOtherVisitedViews
// ---------------------------------------------------------------------------
describe("delOtherVisitedViews()", () => {
  it("keeps only the specified view (and affix views)", async () => {
    const store = useTagsViewStore();
    const keep = makeView();
    const other = makeView();
    const affix = makeView({ affix: true, path: "/affix" });
    store.addVisitedView(keep);
    store.addVisitedView(other);
    store.addVisitedView(affix);
    await store.delOtherVisitedViews(keep);
    const paths = store.visitedViews.map((v) => v.path);
    expect(paths).toContain(keep.path);
    expect(paths).toContain("/affix");
    expect(paths).not.toContain(other.path);
  });
});

// ---------------------------------------------------------------------------
// delAllViews / delView
// ---------------------------------------------------------------------------
describe("delView()", () => {
  it("removes view from both visited and cached", async () => {
    const store = useTagsViewStore();
    const v = makeView({ keepAlive: true });
    store.addView(v);
    await store.delView(v);
    expect(store.visitedViews.some((x) => x.path === v.path)).toBe(false);
    expect(store.cachedViews).not.toContain(v.name);
  });
});

// ---------------------------------------------------------------------------
// updateVisitedView
// ---------------------------------------------------------------------------
describe("updateVisitedView()", () => {
  it("updates the properties of an existing view", () => {
    const store = useTagsViewStore();
    const v = makeView({ title: "Old Title" });
    store.addVisitedView(v);
    store.updateVisitedView({ ...v, title: "New Title" });
    const found = store.visitedViews.find((x) => x.path === v.path);
    expect(found?.title).toBe("New Title");
  });
});

// ---------------------------------------------------------------------------
// delLeftViews / delRightViews
// ---------------------------------------------------------------------------
describe("delLeftViews()", () => {
  it("removes views to the left of the target", async () => {
    const store = useTagsViewStore();
    const [v1, v2, v3] = [makeView(), makeView(), makeView()];
    store.addVisitedView(v1);
    store.addVisitedView(v2);
    store.addVisitedView(v3);
    await store.delLeftViews(v3);
    expect(store.visitedViews.some((x) => x.path === v1.path)).toBe(false);
    expect(store.visitedViews.some((x) => x.path === v2.path)).toBe(false);
    expect(store.visitedViews.some((x) => x.path === v3.path)).toBe(true);
  });
});

describe("delRightViews()", () => {
  it("removes views to the right of the target", async () => {
    const store = useTagsViewStore();
    const [v1, v2, v3] = [makeView(), makeView(), makeView()];
    store.addVisitedView(v1);
    store.addVisitedView(v2);
    store.addVisitedView(v3);
    await store.delRightViews(v1);
    expect(store.visitedViews.some((x) => x.path === v1.path)).toBe(true);
    expect(store.visitedViews.some((x) => x.path === v2.path)).toBe(false);
    expect(store.visitedViews.some((x) => x.path === v3.path)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// delOtherCachedViews
// ---------------------------------------------------------------------------
describe("delOtherCachedViews()", () => {
  it("keeps only the cached view matching the target name", async () => {
    const store = useTagsViewStore();
    const v1 = makeView({ keepAlive: true, name: "ViewA" });
    const v2 = makeView({ keepAlive: true, name: "ViewB" });
    const v3 = makeView({ keepAlive: true, name: "ViewC" });
    store.addCachedView(v1);
    store.addCachedView(v2);
    store.addCachedView(v3);
    await store.delOtherCachedViews(v2);
    expect(store.cachedViews).toContain("ViewB");
    expect(store.cachedViews).not.toContain("ViewA");
    expect(store.cachedViews).not.toContain("ViewC");
  });

  it("clears all cached views when target name is not in cache", async () => {
    const store = useTagsViewStore();
    const v1 = makeView({ keepAlive: true, name: "ViewX" });
    const v2 = makeView({ keepAlive: true, name: "ViewY" });
    store.addCachedView(v1);
    store.addCachedView(v2);
    const notCached = makeView({ name: "NotCached" });
    await store.delOtherCachedViews(notCached);
    expect(store.cachedViews).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// delAllVisitedViews
// ---------------------------------------------------------------------------
describe("delAllVisitedViews()", () => {
  it("removes all non-affix visited views", async () => {
    const store = useTagsViewStore();
    const regular = makeView();
    const affix = makeView({ affix: true, path: "/affix" });
    store.addVisitedView(regular);
    store.addVisitedView(affix);
    await store.delAllVisitedViews();
    expect(store.visitedViews.some((v) => v.path === regular.path)).toBe(false);
    expect(store.visitedViews.some((v) => v.path === "/affix")).toBe(true);
  });

  it("returns array of remaining views", async () => {
    const store = useTagsViewStore();
    const result = await store.delAllVisitedViews();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// delAllCachedViews
// ---------------------------------------------------------------------------
describe("delAllCachedViews()", () => {
  it("clears all cached views", async () => {
    const store = useTagsViewStore();
    const v = makeView({ keepAlive: true });
    store.addCachedView(v);
    await store.delAllCachedViews();
    expect(store.cachedViews).toHaveLength(0);
  });

  it("returns empty array", async () => {
    const store = useTagsViewStore();
    const result = await store.delAllCachedViews();
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// delOtherViews (composite)
// ---------------------------------------------------------------------------
describe("delOtherViews()", () => {
  it("resolves with visitedViews and cachedViews", async () => {
    const store = useTagsViewStore();
    const v = makeView({ keepAlive: true });
    store.addView(v);
    const result = (await store.delOtherViews(v)) as {
      visitedViews: TagView[];
      cachedViews: string[];
    };
    expect(Array.isArray(result.visitedViews)).toBe(true);
    expect(Array.isArray(result.cachedViews)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// delAllViews (composite)
// ---------------------------------------------------------------------------
describe("delAllViews()", () => {
  it("clears all non-affix views and all cached views", async () => {
    const store = useTagsViewStore();
    const v = makeView({ keepAlive: true });
    const affix = makeView({ affix: true, path: "/home" });
    store.addView(v);
    store.addVisitedView(affix);
    await store.delAllViews();
    expect(store.cachedViews).toHaveLength(0);
    expect(store.visitedViews.some((x) => x.path === v.path)).toBe(false);
    expect(store.visitedViews.some((x) => x.path === "/home")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// delLeftViews — 覆盖第 155-157 行：同步清除 cachedViews 中左侧视图的缓存
// ---------------------------------------------------------------------------
describe("delLeftViews() — cachedViews 同步清除（lines 155-157）", () => {
  it("删除左侧视图时同步从 cachedViews 移除对应缓存名称", async () => {
    const store = useTagsViewStore();
    const v1 = makeView({ keepAlive: true, name: "CacheLeft1" });
    const v2 = makeView({ keepAlive: true, name: "CacheLeft2" });
    const v3 = makeView({ keepAlive: true, name: "CacheTarget" });
    store.addView(v1);
    store.addView(v2);
    store.addView(v3);

    await store.delLeftViews(v3);

    expect(store.cachedViews).not.toContain("CacheLeft1");
    expect(store.cachedViews).not.toContain("CacheLeft2");
    expect(store.cachedViews).toContain("CacheTarget");
  });

  it("左侧视图无 keepAlive 时 cachedViews 不受影响", async () => {
    const store = useTagsViewStore();
    const v1 = makeView({ keepAlive: false, name: "NoCache1" });
    const v2 = makeView({ keepAlive: true, name: "CacheKeep" });
    store.addView(v1);
    store.addView(v2);

    await store.delLeftViews(v2);

    // v1 本来就不在 cachedViews（无 keepAlive），v2 的缓存不受影响
    expect(store.cachedViews).toContain("CacheKeep");
  });

  it("目标 view 不在 visitedViews 中时提前返回，visitedViews 不变", () => {
    const store = useTagsViewStore();
    const v1 = makeView();
    const v2 = makeView();
    store.addVisitedView(v1);
    store.addVisitedView(v2);
    const originalLength = store.visitedViews.length;

    // 不 await：currIndex=-1 时 Promise 不 resolve
    const notExisting = makeView({ path: "/does-not-exist" });
    store.delLeftViews(notExisting);

    expect(store.visitedViews).toHaveLength(originalLength);
  });

  it("混合 affix 视图：affix 保留，非 affix 左侧视图被删除且缓存清除", async () => {
    const store = useTagsViewStore();
    const affixView = makeView({ affix: true, path: "/affix-left" });
    const leftView = makeView({ keepAlive: true, name: "LeftNonAffix" });
    const targetView = makeView({ name: "Target" });
    store.addVisitedView(affixView);
    store.addVisitedView(leftView);
    store.addCachedView(leftView);
    store.addVisitedView(targetView);

    await store.delLeftViews(targetView);

    expect(store.visitedViews.some((v) => v.path === affixView.path)).toBe(
      true
    );
    expect(store.visitedViews.some((v) => v.path === leftView.path)).toBe(
      false
    );
    expect(store.cachedViews).not.toContain("LeftNonAffix");
  });
});

// ---------------------------------------------------------------------------
// delRightViews — 覆盖第 171-172 行：currIndex=-1 时提前返回
// ---------------------------------------------------------------------------
describe("delRightViews() — 目标不存在时提前返回（lines 171-172）", () => {
  it("目标 view 不在 visitedViews 中时 visitedViews 不变", () => {
    const store = useTagsViewStore();
    const v1 = makeView();
    const v2 = makeView();
    store.addVisitedView(v1);
    store.addVisitedView(v2);
    const originalLength = store.visitedViews.length;

    // 不 await：currIndex=-1 时 Promise 不 resolve
    const notExisting = makeView({ path: "/not-in-store" });
    store.delRightViews(notExisting);

    expect(store.visitedViews).toHaveLength(originalLength);
  });

  it("目标 view 不存在时 cachedViews 不变", () => {
    const store = useTagsViewStore();
    const v = makeView({ keepAlive: true, name: "ShouldStay" });
    store.addView(v);
    const originalCacheLength = store.cachedViews.length;

    const notExisting = makeView({ path: "/ghost" });
    store.delRightViews(notExisting);

    expect(store.cachedViews).toHaveLength(originalCacheLength);
    expect(store.cachedViews).toContain("ShouldStay");
  });

  it("最后一个元素为目标时 visitedViews 只保留到该位置", async () => {
    const store = useTagsViewStore();
    const [v1, v2] = [makeView(), makeView()];
    store.addVisitedView(v1);
    store.addVisitedView(v2);

    await store.delRightViews(v2);

    expect(store.visitedViews).toHaveLength(2);
    expect(store.visitedViews.some((v) => v.path === v1.path)).toBe(true);
    expect(store.visitedViews.some((v) => v.path === v2.path)).toBe(true);
  });
});
