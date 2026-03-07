/**
 * 类型模块单元测试 - src/api/v1/types/group.ts + phototype.ts + prefab.ts
 */
import { describe, it, expect } from "vitest";
import type {
  Group,
  GroupCreateData,
  GroupUpdateData,
} from "@/api/v1/types/group";
import type {
  PhototypeType,
  CreatePhototypeRequest,
  UpdatePhototypeRequest,
} from "@/api/v1/types/phototype";
import type {
  PrefabData,
  CreatePrefabRequest,
  UpdatePrefabRequest,
} from "@/api/v1/types/prefab";

// ============================================================
// group.ts
// ============================================================
describe("Group 接口", () => {
  it("必填字段 id/name 赋值", () => {
    const g: Group = { id: 1, name: "Developers" };
    expect(g.id).toBe(1);
    expect(g.name).toBe("Developers");
  });

  it("可选字段赋值", () => {
    const g: Group = {
      id: 2,
      name: "Designers",
      description: "Design team",
      image_id: 3,
      user_id: 10,
      joined: true,
      created_at: "2024-01-01",
      updated_at: "2024-01-02",
    };
    expect(g.description).toBe("Design team");
    expect(g.joined).toBe(true);
  });

  it("image 和 user 嵌套对象", () => {
    const g: Group = {
      id: 3,
      name: "G",
      image: { id: 5, url: "https://img.png" },
      user: { id: 1, username: "admin", nickname: "Admin" },
    };
    expect(g.image?.url).toContain("img.png");
    expect(g.user?.nickname).toBe("Admin");
  });
});

describe("GroupCreateData 接口", () => {
  it("name 为必填", () => {
    const r: GroupCreateData = { name: "New Group" };
    expect(r.name).toBe("New Group");
  });

  it("可选字段赋值", () => {
    const r: GroupCreateData = { name: "G", description: "Desc", image_id: 5 };
    expect(r.image_id).toBe(5);
  });
});

describe("GroupUpdateData 接口", () => {
  it("所有字段均为可选", () => {
    const r: GroupUpdateData = {};
    expect(r).toBeDefined();
  });

  it("部分字段更新", () => {
    const r: GroupUpdateData = { description: "Updated" };
    expect(r.description).toBe("Updated");
    expect(r.name).toBeUndefined();
  });
});

// ============================================================
// phototype.ts
// ============================================================
describe("PhototypeType 接口", () => {
  it("所有字段均为可选", () => {
    const p: PhototypeType = {};
    expect(p).toBeDefined();
  });

  it("基本字段赋值", () => {
    const p: PhototypeType = {
      id: 1,
      title: "Robot",
      name: "robot-v1",
      uuid: "uuid-abc",
      type: "model",
    };
    expect(p.id).toBe(1);
    expect(p.title).toBe("Robot");
    expect(p.uuid).toBe("uuid-abc");
  });

  it("data 和 schema 支持 JsonValue", () => {
    const p: PhototypeType = {
      data: { key: "value", count: 1 },
      schema: [{ type: "string", name: "title" }],
    };
    expect(p.data).toBeDefined();
    expect(Array.isArray(p.schema)).toBe(true);
  });

  it("nullable 字段可设置为 null", () => {
    const p: PhototypeType = {
      uuid: null,
      data: null,
      schema: null,
      resource_id: null,
      image_id: null,
      type: null,
    };
    expect(p.uuid).toBeNull();
    expect(p.data).toBeNull();
  });
});

describe("CreatePhototypeRequest 类型", () => {
  it("与 PhototypeType 结构相同（所有字段可选）", () => {
    const r: CreatePhototypeRequest = { title: "New Phototype" };
    expect(r.title).toBe("New Phototype");
  });
});

describe("UpdatePhototypeRequest 类型", () => {
  it("所有字段均为可选", () => {
    const r: UpdatePhototypeRequest = {};
    expect(r).toBeDefined();
  });

  it("部分字段更新", () => {
    const r: UpdatePhototypeRequest = { title: "Updated Title" };
    expect(r.title).toBe("Updated Title");
  });
});

// ============================================================
// prefab.ts
// ============================================================
describe("PrefabData 接口", () => {
  it("必填字段赋值", () => {
    const p: PrefabData = {
      id: 1,
      author_id: 2,
      info: null,
      data: null,
      image_id: null,
      uuid: "prefab-uuid",
      events: null,
      title: "My Prefab",
      prefab: 0,
      image: {
        id: 1,
        md5: "",
        type: "image",
        url: "https://img.png",
        filename: "img.png",
        size: 0,
        key: "k1",
      },
      resources: [],
      editable: true,
      viewable: true,
    };
    expect(p.uuid).toBe("prefab-uuid");
    expect(p.title).toBe("My Prefab");
    expect(p.editable).toBe(true);
  });

  it("可选字段 custome/author/cyber", () => {
    const p: PrefabData = {
      id: 2,
      author_id: 1,
      info: {},
      data: "{}",
      image_id: 5,
      uuid: "u2",
      events: null,
      title: "T",
      prefab: 1,
      image: {
        id: 1,
        md5: "",
        type: "image",
        url: "",
        filename: "",
        size: 0,
        key: "",
      },
      resources: [],
      editable: false,
      viewable: false,
      custome: true,
      author: { id: 1, nickname: "Author", email: null, username: "auth1" },
    };
    expect(p.custome).toBe(true);
    expect(p.author?.username).toBe("auth1");
  });
});

describe("CreatePrefabRequest 接口", () => {
  it("title 为必填", () => {
    const r: CreatePrefabRequest = { title: "New Prefab" };
    expect(r.title).toBe("New Prefab");
  });

  it("可选字段赋值", () => {
    const r: CreatePrefabRequest = {
      title: "Prefab X",
      image_id: 1,
      data: "{}",
      events: "{}",
      prefab: 2,
      info: { visible: true },
    };
    expect(r.info?.["visible"]).toBe(true);
  });

  it("支持额外索引字段", () => {
    const r: CreatePrefabRequest = { title: "T", customKey: "customValue" };
    expect(r["customKey"]).toBe("customValue");
  });
});

describe("UpdatePrefabRequest 接口", () => {
  it("id 为必填，其他字段可选", () => {
    const r: UpdatePrefabRequest = { id: 5 };
    expect(r.id).toBe(5);
    expect(r.title).toBeUndefined();
  });

  it("全字段赋值", () => {
    const r: UpdatePrefabRequest = {
      id: 1,
      title: "Updated",
      data: "{}",
      image_id: 2,
    };
    expect(r.title).toBe("Updated");
  });
});
