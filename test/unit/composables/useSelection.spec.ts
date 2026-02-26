/**
 * Unit tests for src/composables/useSelection.ts
 * All logic is pure reactive state – no DOM or network required.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useSelection, type SelectableItem } from "@/composables/useSelection";

type Item = SelectableItem & { label: string };

const makeItems = (...ids: number[]): Item[] =>
  ids.map((id) => ({ id, label: `item-${id}` }));

describe("useSelection()", () => {
  // -----------------------------------------------------------------------
  // Initial state
  // -----------------------------------------------------------------------
  describe("initial state", () => {
    it("selectedCount is 0", () => {
      const { selectedCount } = useSelection<Item>();
      expect(selectedCount.value).toBe(0);
    });

    it("hasSelection is false", () => {
      const { hasSelection } = useSelection<Item>();
      expect(hasSelection.value).toBe(false);
    });

    it("isSelected returns false for any id", () => {
      const { isSelected } = useSelection<Item>();
      expect(isSelected(1)).toBe(false);
      expect(isSelected("abc")).toBe(false);
    });

    it("getSelectedItems returns empty array", () => {
      const { getSelectedItems } = useSelection<Item>();
      const items = makeItems(1, 2, 3);
      expect(getSelectedItems(items)).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // toggleSelection
  // -----------------------------------------------------------------------
  describe("toggleSelection()", () => {
    it("selects an item", () => {
      const { toggleSelection, isSelected } = useSelection<Item>();
      toggleSelection(1);
      expect(isSelected(1)).toBe(true);
    });

    it("deselects an already-selected item", () => {
      const { toggleSelection, isSelected } = useSelection<Item>();
      toggleSelection(1);
      toggleSelection(1);
      expect(isSelected(1)).toBe(false);
    });

    it("increments selectedCount when selecting", () => {
      const { toggleSelection, selectedCount } = useSelection<Item>();
      toggleSelection(1);
      expect(selectedCount.value).toBe(1);
      toggleSelection(2);
      expect(selectedCount.value).toBe(2);
    });

    it("decrements selectedCount when deselecting", () => {
      const { toggleSelection, selectedCount } = useSelection<Item>();
      toggleSelection(1);
      toggleSelection(2);
      toggleSelection(1);
      expect(selectedCount.value).toBe(1);
    });

    it("supports string ids", () => {
      const { toggleSelection, isSelected } = useSelection<SelectableItem>();
      toggleSelection("abc");
      expect(isSelected("abc")).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // selectAll
  // -----------------------------------------------------------------------
  describe("selectAll()", () => {
    it("selects all provided items", () => {
      const { selectAll, isSelected } = useSelection<Item>();
      const items = makeItems(1, 2, 3);
      selectAll(items);
      expect(isSelected(1)).toBe(true);
      expect(isSelected(2)).toBe(true);
      expect(isSelected(3)).toBe(true);
    });

    it("updates selectedCount to items length", () => {
      const { selectAll, selectedCount } = useSelection<Item>();
      selectAll(makeItems(10, 20, 30));
      expect(selectedCount.value).toBe(3);
    });

    it("replaces previous selection", () => {
      const { selectAll, isSelected } = useSelection<Item>();
      selectAll(makeItems(1, 2));
      selectAll(makeItems(3, 4));
      expect(isSelected(1)).toBe(false);
      expect(isSelected(3)).toBe(true);
    });

    it("selectAll with empty array clears selection", () => {
      const { selectAll, toggleSelection, hasSelection } = useSelection<Item>();
      toggleSelection(1);
      selectAll([]);
      expect(hasSelection.value).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // selectItems
  // -----------------------------------------------------------------------
  describe("selectItems()", () => {
    it("adds items to existing selection", () => {
      const { toggleSelection, selectItems, isSelected } = useSelection<Item>();
      toggleSelection(1);
      selectItems(makeItems(2, 3));
      expect(isSelected(1)).toBe(true);
      expect(isSelected(2)).toBe(true);
      expect(isSelected(3)).toBe(true);
    });

    it("does not duplicate already-selected ids", () => {
      const { toggleSelection, selectItems, selectedCount } =
        useSelection<Item>();
      toggleSelection(1);
      selectItems(makeItems(1, 2));
      expect(selectedCount.value).toBe(2);
    });
  });

  // -----------------------------------------------------------------------
  // deselectItems
  // -----------------------------------------------------------------------
  describe("deselectItems()", () => {
    it("removes specified items from selection", () => {
      const { selectAll, deselectItems, isSelected } = useSelection<Item>();
      selectAll(makeItems(1, 2, 3));
      deselectItems(makeItems(2));
      expect(isSelected(1)).toBe(true);
      expect(isSelected(2)).toBe(false);
      expect(isSelected(3)).toBe(true);
    });

    it("handles deselecting items not in selection without throwing", () => {
      const { deselectItems, selectedCount } = useSelection<Item>();
      expect(() => deselectItems(makeItems(99))).not.toThrow();
      expect(selectedCount.value).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // clearSelection
  // -----------------------------------------------------------------------
  describe("clearSelection()", () => {
    it("sets selectedCount to 0", () => {
      const { selectAll, clearSelection, selectedCount } = useSelection<Item>();
      selectAll(makeItems(1, 2, 3));
      clearSelection();
      expect(selectedCount.value).toBe(0);
    });

    it("sets hasSelection to false", () => {
      const { toggleSelection, clearSelection, hasSelection } =
        useSelection<Item>();
      toggleSelection(5);
      clearSelection();
      expect(hasSelection.value).toBe(false);
    });

    it("all previously selected ids become false", () => {
      const { selectAll, clearSelection, isSelected } = useSelection<Item>();
      selectAll(makeItems(1, 2));
      clearSelection();
      expect(isSelected(1)).toBe(false);
      expect(isSelected(2)).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // getSelectedItems
  // -----------------------------------------------------------------------
  describe("getSelectedItems()", () => {
    it("returns only selected items from the provided list", () => {
      const { selectAll, getSelectedItems } = useSelection<Item>();
      const items = makeItems(1, 2, 3, 4);
      selectAll(makeItems(2, 4));
      const result = getSelectedItems(items);
      expect(result).toHaveLength(2);
      expect(result.map((i) => i.id).sort()).toEqual([2, 4]);
    });

    it("returns empty array when nothing selected", () => {
      const { getSelectedItems } = useSelection<Item>();
      expect(getSelectedItems(makeItems(1, 2))).toEqual([]);
    });

    it("returns all items when all are selected", () => {
      const { selectAll, getSelectedItems } = useSelection<Item>();
      const items = makeItems(1, 2, 3);
      selectAll(items);
      expect(getSelectedItems(items)).toHaveLength(3);
    });
  });

  // -----------------------------------------------------------------------
  // hasSelection computed
  // -----------------------------------------------------------------------
  describe("hasSelection computed", () => {
    it("becomes true after first selection", () => {
      const { toggleSelection, hasSelection } = useSelection<Item>();
      expect(hasSelection.value).toBe(false);
      toggleSelection(1);
      expect(hasSelection.value).toBe(true);
    });

    it("goes back to false after clearing", () => {
      const { toggleSelection, clearSelection, hasSelection } =
        useSelection<Item>();
      toggleSelection(1);
      clearSelection();
      expect(hasSelection.value).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Multiple independent instances
  // -----------------------------------------------------------------------
  describe("multiple instances are independent", () => {
    it("selections in different instances do not interfere", () => {
      const a = useSelection<Item>();
      const b = useSelection<Item>();
      a.toggleSelection(1);
      expect(b.isSelected(1)).toBe(false);
    });
  });
});
