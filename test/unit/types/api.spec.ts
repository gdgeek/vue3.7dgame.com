/**
 * 类型模块单元测试 - src/types/api.ts
 * 验证 FetchParams、FetchResponse、Pagination 等接口结构
 */
import { describe, it, expect } from "vitest";
import type {
  PaginationHeaderValue,
  FetchParams,
  FetchResponse,
  Pagination,
} from "@/types/api";

describe("PaginationHeaderValue 类型", () => {
  it("可以是 string", () => {
    const v: PaginationHeaderValue = "100";
    expect(typeof v).toBe("string");
  });

  it("可以是 number", () => {
    const v: PaginationHeaderValue = 42;
    expect(typeof v).toBe("number");
  });

  it("可以是 undefined", () => {
    const v: PaginationHeaderValue = undefined;
    expect(v).toBeUndefined();
  });
});

describe("FetchParams 接口", () => {
  it("可以创建完整对象", () => {
    const p: FetchParams = {
      sort: "created_at",
      search: "test",
      page: 1,
    };
    expect(p.sort).toBe("created_at");
    expect(p.search).toBe("test");
    expect(p.page).toBe(1);
  });

  it("tags 字段为可选数字数组", () => {
    const p: FetchParams = { sort: "", search: "", page: 1, tags: [1, 2, 3] };
    expect(p.tags).toEqual([1, 2, 3]);
  });

  it("支持额外的索引字段", () => {
    const p: FetchParams = {
      sort: "name",
      search: "",
      page: 2,
      customField: "custom",
    };
    expect(p["customField"]).toBe("custom");
  });
});

describe("FetchResponse 接口", () => {
  it("data 是数组，headers 是对象", () => {
    const r: FetchResponse<string> = {
      data: ["a", "b"],
      headers: { "x-total": 2 },
    };
    expect(r.data).toHaveLength(2);
    expect(r.headers["x-total"]).toBe(2);
  });

  it("data 支持泛型类型", () => {
    interface Item { id: number; name: string }
    const r: FetchResponse<Item> = {
      data: [{ id: 1, name: "test" }],
      headers: {},
    };
    expect(r.data[0].id).toBe(1);
  });

  it("默认泛型为 unknown", () => {
    const r: FetchResponse = { data: [1, "two", null], headers: {} };
    expect(r.data).toHaveLength(3);
  });
});

describe("Pagination 接口", () => {
  it("可以创建完整分页对象", () => {
    const p: Pagination = {
      current: 1,
      count: 5,
      size: 20,
      total: 100,
    };
    expect(p.current).toBe(1);
    expect(p.count).toBe(5);
    expect(p.size).toBe(20);
    expect(p.total).toBe(100);
  });

  it("total 可以为 0", () => {
    const p: Pagination = { current: 1, count: 0, size: 20, total: 0 };
    expect(p.total).toBe(0);
  });
});
