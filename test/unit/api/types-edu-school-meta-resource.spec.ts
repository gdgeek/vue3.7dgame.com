/**
 * 类型模块单元测试 - src/api/v1/types/edu-class.ts + edu-school.ts + meta-resource.ts
 */
import { describe, it, expect } from "vitest";
import type { EduClass } from "@/api/v1/types/edu-class";
import type { EduSchool, CreateSchoolRequest, UpdateSchoolRequest } from "@/api/v1/types/edu-school";
import type {
  MetaResourceItem,
  CreateMetaResourceRequest,
  UpdateMetaResourceRequest,
} from "@/api/v1/types/meta-resource";

// ============================================================
// edu-class.ts
// ============================================================
describe("EduClass 接口", () => {
  it("必填字段赋值", () => {
    const c: EduClass = {
      id: 1,
      name: "Class A",
      created_at: "2024-01-01",
      updated_at: "2024-01-02",
      info: {},
    };
    expect(c.id).toBe(1);
    expect(c.name).toBe("Class A");
    expect(c.info).toEqual({});
  });

  it("可选 image/school/eduStudents/eduTeachers 字段", () => {
    const c: EduClass = {
      id: 2,
      name: "Class B",
      created_at: "2024-01-01",
      updated_at: "2024-01-02",
      info: { key: "value" },
      school: { id: 1, name: "School A" },
      eduStudents: [{ id: 1, user: { id: 10, username: "stu1" } as any }],
      eduTeachers: [],
    };
    expect(c.school?.name).toBe("School A");
    expect(c.eduStudents).toHaveLength(1);
    expect(c.eduTeachers).toEqual([]);
  });

  it("info 字段支持任意 key-value", () => {
    const c: EduClass = {
      id: 3,
      name: "C",
      created_at: "",
      updated_at: "",
      info: { grade: 3, desc: "desc" },
    };
    expect(c.info["grade"]).toBe(3);
  });
});

// ============================================================
// edu-school.ts
// ============================================================
describe("EduSchool 接口", () => {
  it("必填字段赋值", () => {
    const s: EduSchool = {
      id: 1,
      name: "School A",
      created_at: "2024-01-01",
      updated_at: "2024-01-02",
      info: {},
    };
    expect(s.id).toBe(1);
    expect(s.name).toBe("School A");
  });

  it("可选字段赋值", () => {
    const s: EduSchool = {
      id: 2,
      name: "School B",
      created_at: "2024-01-01",
      updated_at: "2024-01-02",
      info: {},
      image_id: 5,
      principal_id: 10,
      address: "123 Main St",
      principal: null,
    };
    expect(s.address).toBe("123 Main St");
    expect(s.principal).toBeNull();
  });
});

describe("CreateSchoolRequest 接口", () => {
  it("name 为必填", () => {
    const r: CreateSchoolRequest = { name: "New School" };
    expect(r.name).toBe("New School");
  });

  it("可选字段赋值", () => {
    const r: CreateSchoolRequest = {
      name: "School X",
      image_id: 1,
      principal_id: 2,
      address: "Addr",
      info: { type: "public" },
    };
    expect(r.info?.["type"]).toBe("public");
  });
});

describe("UpdateSchoolRequest 类型", () => {
  it("所有字段均为可选", () => {
    const r: UpdateSchoolRequest = {};
    expect(r).toBeDefined();
  });

  it("部分字段更新", () => {
    const r: UpdateSchoolRequest = { address: "New Address" };
    expect(r.address).toBe("New Address");
    expect(r.name).toBeUndefined();
  });
});

// ============================================================
// meta-resource.ts
// ============================================================
describe("MetaResourceItem 接口", () => {
  it("必填字段赋值", () => {
    const item: MetaResourceItem = { id: 1, meta_id: 2, resource_id: 3, type: "model" };
    expect(item.id).toBe(1);
    expect(item.type).toBe("model");
  });

  it("可选字段 created_at/resource", () => {
    const item: MetaResourceItem = {
      id: 2,
      meta_id: 1,
      resource_id: 5,
      type: "video",
      created_at: "2024-01-01",
    };
    expect(item.created_at).toBe("2024-01-01");
  });

  it("支持索引额外字段", () => {
    const item: MetaResourceItem = { id: 3, meta_id: 1, resource_id: 1, type: "audio", extra: "data" };
    expect(item["extra"]).toBe("data");
  });
});

describe("CreateMetaResourceRequest 接口", () => {
  it("必填字段 meta_id 和 type", () => {
    const r: CreateMetaResourceRequest = { meta_id: 1, type: "model" };
    expect(r.meta_id).toBe(1);
    expect(r.type).toBe("model");
  });

  it("meta_id 支持 string", () => {
    const r: CreateMetaResourceRequest = { meta_id: "uuid-123", type: "picture" };
    expect(r.meta_id).toBe("uuid-123");
  });

  it("可选字段赋值", () => {
    const r: CreateMetaResourceRequest = { meta_id: 1, type: "audio", resource_id: 10, info: "note" };
    expect(r.resource_id).toBe(10);
    expect(r.info).toBe("note");
  });
});

describe("UpdateMetaResourceRequest 类型", () => {
  it("所有字段均为可选", () => {
    const r: UpdateMetaResourceRequest = {};
    expect(r).toBeDefined();
  });

  it("部分字段更新", () => {
    const r: UpdateMetaResourceRequest = { type: "video" };
    expect(r.type).toBe("video");
  });
});
