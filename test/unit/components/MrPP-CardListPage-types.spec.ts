/**
 * Unit tests for src/components/MrPP/CardListPage/types.ts
 * Verifies that CardListPageProps and CardListPageEmits can be constructed.
 */
import { describe, it, expect } from "vitest";
import type {
  CardListPageProps,
  FetchParams,
  FetchResponse,
  Pagination,
} from "@/components/MrPP/CardListPage/types";

describe("CardListPage types", () => {
  describe("FetchParams (re-exported)", () => {
    it("can be constructed with required fields", () => {
      const p: FetchParams = { sort: "name", search: "test", page: 1 };
      expect(p.sort).toBe("name");
      expect(p.page).toBe(1);
    });

    it("supports optional tags field", () => {
      const p: FetchParams = { sort: "", search: "", page: 0, tags: [1, 2] };
      expect(p.tags).toEqual([1, 2]);
    });
  });

  describe("FetchResponse (re-exported)", () => {
    it("wraps data and pagination", () => {
      const pagination: Pagination = {
        currentPage: 1,
        pageSize: 20,
        totalPage: 5,
        total: 100,
      };
      const resp: FetchResponse<string> = {
        data: ["a", "b"],
        pagination,
      };
      expect(resp.data).toHaveLength(2);
      expect(resp.pagination.total).toBe(100);
    });
  });

  describe("CardListPageProps", () => {
    it("requires fetchData function", () => {
      const props: CardListPageProps<{ id: number }> = {
        fetchData: async () => ({
          data: [{ id: 1 }],
          pagination: {
            currentPage: 1,
            pageSize: 10,
            totalPage: 1,
            total: 1,
          },
        }),
      };
      expect(typeof props.fetchData).toBe("function");
    });

    it("supports all optional props", () => {
      const props: CardListPageProps = {
        fetchData: async () => ({
          data: [],
          pagination: {
            currentPage: 1,
            pageSize: 10,
            totalPage: 0,
            total: 0,
          },
        }),
        defaultSort: "-created_at",
        pageSize: 24,
        cardWidth: 300,
        cardGutter: 16,
        align: "center",
        autoFill: true,
        minCardWidth: 200,
        showSkeleton: true,
        showEmpty: true,
        showHeader: false,
        emptyText: "No data",
        wrapperClass: "my-wrapper",
      };
      expect(props.pageSize).toBe(24);
      expect(props.align).toBe("center");
      expect(props.autoFill).toBe(true);
      expect(props.emptyText).toBe("No data");
    });

    it("align only accepts left, center, right", () => {
      const left: CardListPageProps["align"] = "left";
      const center: CardListPageProps["align"] = "center";
      const right: CardListPageProps["align"] = "right";
      expect(left).toBe("left");
      expect(center).toBe("center");
      expect(right).toBe("right");
    });
  });
});
