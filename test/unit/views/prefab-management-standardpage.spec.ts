import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

/**
 * Bug Condition Exploration Test (Property 1)
 *
 * Verifies that prefab management pages use StandardPage components.
 * On UNFIXED code, these tests should FAIL — confirming the bug exists.
 * After fix, these tests should PASS — confirming the fix is correct.
 */

const readSource = (relativePath: string): string =>
  readFileSync(`${process.cwd()}/src/${relativePath}`, "utf-8");

describe("Bug Condition: prefab pages should use StandardPage components", () => {
  describe("phototype/list.vue", () => {
    const source = readSource("views/phototype/list.vue");

    it("should import StandardPage components", () => {
      expect(source).toContain("PageActionBar");
      expect(source).toContain("ViewContainer");
      expect(source).toContain("StandardCard");
      expect(source).toContain("PagePagination");
      expect(source).toContain("EmptyState");
      expect(source).toContain("@/components/StandardPage");
    });

    it("should NOT import old CardListPage or MrPPCard", () => {
      expect(source).not.toMatch(/import\s+.*CardListPage/);
      expect(source).not.toMatch(/import\s+.*MrPPCard/);
    });

    it("should use usePageData composable", () => {
      expect(source).toContain("usePageData");
    });

    it("should use useSelection composable", () => {
      expect(source).toContain("useSelection");
    });
  });

  describe("meta/prefabs.vue", () => {
    const source = readSource("views/meta/prefabs.vue");

    it("should import StandardPage components", () => {
      expect(source).toContain("PageActionBar");
      expect(source).toContain("ViewContainer");
      expect(source).toContain("StandardCard");
      expect(source).toContain("PagePagination");
      expect(source).toContain("EmptyState");
      expect(source).toContain("@/components/StandardPage");
    });

    it("should NOT import old CardListPage or Id2Image", () => {
      expect(source).not.toMatch(/import\s+.*CardListPage/);
      expect(source).not.toMatch(/import\s+.*Id2Image/);
    });

    it("should NOT use el-card with fixed 320px width", () => {
      expect(source).not.toContain('style="width: 320px"');
    });

    it("should use usePageData composable", () => {
      expect(source).toContain("usePageData");
    });

    it("should use useSelection composable", () => {
      expect(source).toContain("useSelection");
    });
  });
});
