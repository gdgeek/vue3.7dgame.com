/**
 * 类型模块单元测试 - src/api/v1/types/common.ts
 * 验证通用接口：Author、Pagination、ApiResponse、FileInfo、Json/Query 类型
 */
import { describe, it, expect } from "vitest";
import type {
  Author,
  PaginationParams,
  PaginationResponse,
  ApiResponse,
  DeleteResponse,
  FileInfo,
  JsonPrimitive,
  JsonValue,
  JsonObject,
  QueryValue,
  QueryParams,
} from "@/api/v1/types/common";

describe("Author 接口", () => {
  it("必填字段赋值", () => {
    const a: Author = {
      id: 1,
      nickname: "Test",
      email: null,
      username: "user1",
    };
    expect(a.id).toBe(1);
    expect(a.email).toBeNull();
  });

  it("avatar 可选", () => {
    const a: Author = {
      id: 2,
      nickname: "N",
      email: "a@b.com",
      username: "u2",
      avatar: "https://img",
    };
    expect(a.avatar).toBeTruthy();
  });
});

describe("PaginationParams 接口", () => {
  it("所有字段可选", () => {
    const p: PaginationParams = {};
    expect(p).toBeDefined();
  });

  it("page 和 pageSize 赋值", () => {
    const p: PaginationParams = { page: 2, pageSize: 20 };
    expect(p.page).toBe(2);
    expect(p.pageSize).toBe(20);
  });
});

describe("PaginationResponse 接口", () => {
  it("泛型数据正确封装", () => {
    const r: PaginationResponse<string> = {
      data: ["a", "b"],
      total: 2,
      page: 1,
      pageSize: 10,
    };
    expect(r.data).toHaveLength(2);
    expect(r.total).toBe(2);
  });

  it("空数据页", () => {
    const r: PaginationResponse<number> = {
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
    };
    expect(r.data).toEqual([]);
  });
});

describe("ApiResponse 接口", () => {
  it("data 必填，message/code 可选", () => {
    const r: ApiResponse<number> = { data: 42 };
    expect(r.data).toBe(42);
    expect(r.message).toBeUndefined();
  });

  it("所有字段赋值", () => {
    const r: ApiResponse<string> = {
      data: "ok",
      message: "success",
      code: 200,
    };
    expect(r.code).toBe(200);
    expect(r.message).toBe("success");
  });
});

describe("DeleteResponse 接口", () => {
  it("message 字段赋值", () => {
    const r: DeleteResponse = { message: "Deleted successfully" };
    expect(r.message).toBe("Deleted successfully");
  });
});

describe("FileInfo 接口", () => {
  it("所有必填字段赋值", () => {
    const f: FileInfo = {
      id: 1,
      md5: "abc",
      type: "image",
      url: "https://x",
      filename: "a.jpg",
      size: 1024,
      key: "k1",
    };
    expect(f.id).toBe(1);
    expect(f.size).toBe(1024);
    expect(f.type).toBe("image");
  });
});

describe("Json 类型", () => {
  it("JsonPrimitive 支持 string/number/boolean/null", () => {
    const vals: JsonPrimitive[] = ["hello", 42, true, null];
    expect(vals).toHaveLength(4);
  });

  it("JsonValue 支持基础类型和嵌套对象", () => {
    const v: JsonValue = { key: "value", num: 1, arr: [1, "two"] };
    expect(v).toBeDefined();
  });

  it("JsonObject 支持键值映射", () => {
    const o: JsonObject = { a: "x", b: 1, c: true, d: null };
    expect(o["a"]).toBe("x");
    expect(o["d"]).toBeNull();
  });
});

describe("QueryValue / QueryParams 类型", () => {
  it("QueryValue 可以是各种原始类型", () => {
    const vals: QueryValue[] = ["str", 1, true, null, undefined, ["a", "b"]];
    expect(vals).toHaveLength(6);
  });

  it("QueryParams 是 QueryValue 的 Record", () => {
    const q: QueryParams = {
      page: 1,
      search: "test",
      active: true,
      ids: [1, 2],
    };
    expect(q["page"]).toBe(1);
    expect(q["ids"]).toEqual([1, 2]);
  });
});
