/**
 * Unit tests for:
 *   src/components/StandardPage/types.ts   – type contracts
 *   src/components/StandardPage/index.ts   – re-exports
 *   src/components/ThemeSwitcher/index.ts  – re-export
 */
import { describe, it, expect, vi } from "vitest";

// ── Mock Vue SFCs so they don't need a full build pipeline ──────────────
vi.mock("@/components/StandardPage/PageActionBar.vue",  () => ({ default: { name: "PageActionBar"  } }));
vi.mock("@/components/StandardPage/ViewContainer.vue",  () => ({ default: { name: "ViewContainer"  } }));
vi.mock("@/components/StandardPage/PagePagination.vue", () => ({ default: { name: "PagePagination" } }));
vi.mock("@/components/StandardPage/PageFilter.vue",     () => ({ default: { name: "PageFilter"     } }));
vi.mock("@/components/StandardPage/EmptyState.vue",     () => ({ default: { name: "EmptyState"     } }));
vi.mock("@/components/StandardPage/StandardCard.vue",   () => ({ default: { name: "StandardCard"   } }));
vi.mock("@/components/StandardPage/DetailPanel.vue",    () => ({ default: { name: "DetailPanel"    } }));
vi.mock("@/components/ThemeSwitcher/ThemeSwitcher.vue", () => ({ default: { name: "ThemeSwitcher"  } }));

// ============================================================================
// StandardPage/types.ts – runtime shape checks
// ============================================================================
describe("src/components/StandardPage/types.ts – type contracts", () => {
  it("PageActionBarProps accepts minimal required fields", () => {
    const props: import("@/components/StandardPage/types").PageActionBarProps = {
      title: "My Page",
    };
    expect(props.title).toBe("My Page");
  });

  it("PageActionBarProps optional fields default to undefined", () => {
    const props: import("@/components/StandardPage/types").PageActionBarProps = {
      title: "Test",
    };
    expect(props.subtitle).toBeUndefined();
    expect(props.showSearch).toBeUndefined();
    expect(props.showSort).toBeUndefined();
  });

  it("PageActionBarProps accepts all optional fields", () => {
    const props: import("@/components/StandardPage/types").PageActionBarProps = {
      title: "Full",
      subtitle: "sub",
      searchPlaceholder: "search…",
      showSearch: true,
      showSort: false,
      showViewToggle: true,
      defaultView: "grid",
      defaultSort: "-created_at",
      sortByName: "name",
      sortByTime: "created_at",
    };
    expect(props.defaultView).toBe("grid");
    expect(props.showSearch).toBe(true);
  });

  it("ViewMode type accepts 'grid' and 'list'", () => {
    const grid: import("@/components/StandardPage/types").ViewMode = "grid";
    const list: import("@/components/StandardPage/types").ViewMode = "list";
    expect(grid).toBe("grid");
    expect(list).toBe("list");
  });

  it("PagePaginationProps holds currentPage and totalPages", () => {
    const p: import("@/components/StandardPage/types").PagePaginationProps = {
      currentPage: 2,
      totalPages: 10,
    };
    expect(p.currentPage).toBe(2);
    expect(p.totalPages).toBe(10);
  });

  it("ViewContainerProps accepts items array and viewMode", () => {
    const p: import("@/components/StandardPage/types").ViewContainerProps<{ id: number }> = {
      items: [{ id: 1 }],
      viewMode: "list",
    };
    expect(p.items).toHaveLength(1);
    expect(p.viewMode).toBe("list");
  });
});

// ============================================================================
// StandardPage/index.ts – re-exports
// ============================================================================
describe("src/components/StandardPage/index.ts – re-exports", () => {
  it("exports PageActionBar", async () => {
    const mod = await import("@/components/StandardPage/index");
    expect(mod.PageActionBar).toBeDefined();
  });

  it("exports ViewContainer", async () => {
    const mod = await import("@/components/StandardPage/index");
    expect(mod.ViewContainer).toBeDefined();
  });

  it("exports PagePagination", async () => {
    const mod = await import("@/components/StandardPage/index");
    expect(mod.PagePagination).toBeDefined();
  });

  it("exports PageFilter", async () => {
    const mod = await import("@/components/StandardPage/index");
    expect(mod.PageFilter).toBeDefined();
  });

  it("exports EmptyState", async () => {
    const mod = await import("@/components/StandardPage/index");
    expect(mod.EmptyState).toBeDefined();
  });

  it("exports StandardCard", async () => {
    const mod = await import("@/components/StandardPage/index");
    expect(mod.StandardCard).toBeDefined();
  });

  it("exports DetailPanel", async () => {
    const mod = await import("@/components/StandardPage/index");
    expect(mod.DetailPanel).toBeDefined();
  });
});

// ============================================================================
// ThemeSwitcher/index.ts – re-export
// ============================================================================
describe("src/components/ThemeSwitcher/index.ts – re-export", () => {
  it("exports ThemeSwitcher", async () => {
    const mod = await import("@/components/ThemeSwitcher/index");
    expect(mod.ThemeSwitcher).toBeDefined();
  });

  it("ThemeSwitcher is an object (Vue component)", async () => {
    const { ThemeSwitcher } = await import("@/components/ThemeSwitcher/index");
    expect(typeof ThemeSwitcher).toBe("object");
  });
});
