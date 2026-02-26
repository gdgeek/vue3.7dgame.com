/**
 * Unit tests for src/store/modules/tagsView.ts
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";
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
