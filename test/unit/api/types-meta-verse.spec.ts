/**
 * Unit tests for:
 *   src/api/v1/types/meta.ts
 *   src/api/v1/types/verse.ts
 *
 * Pattern: construct valid objects for each interface and assert field types/values.
 */
import { describe, it, expect } from "vitest";
import type {
  MetaCode,
  Events,
  EventInput,
  EventOutput,
  MetaInfo,
  VerseMetaRelation,
  CreateMetaRequest,
  UpdateMetaRequest,
  MetaListParams,
  MetaListResponse,
} from "@/api/v1/types/meta";

import type {
  ImageDetails,
  VerseRelease,
  VerseShare,
  VerseLanguage,
  VerseCode,
  Script,
  VerseTag,
  VerseData,
  PostVerseData,
  PutVerseData,
  VerseListParams,
  VerseListResponse,
  VerseDetailResponse,
  VerseCreateResponse,
  VerseDeleteResponse,
} from "@/api/v1/types/verse";

// ============================================================
// meta.ts
// ============================================================

describe("MetaCode 接口", () => {
  it("必填字段 blockly", () => {
    const mc: MetaCode = { blockly: "<xml/>" };
    expect(mc.blockly).toBe("<xml/>");
  });

  it("可选字段 lua 和 js", () => {
    const mc: MetaCode = { blockly: "<xml/>", lua: "print(1)", js: "console.log(1)" };
    expect(mc.lua).toBe("print(1)");
    expect(mc.js).toBe("console.log(1)");
  });
});

describe("Events 和 EventInput/EventOutput 接口", () => {
  it("构造 Events 对象", () => {
    const input: EventInput = { name: "onClick", type: "click" };
    const output: EventOutput = { name: "result", type: "string" };
    const events: Events = { inputs: [input], outputs: [output] };
    expect(events.inputs).toHaveLength(1);
    expect(events.outputs).toHaveLength(1);
  });

  it("EventInput 支持额外字段", () => {
    const input: EventInput = { name: "onHover", type: "hover", required: true };
    expect(input["required"]).toBe(true);
  });

  it("Events 可以有空数组", () => {
    const events: Events = { inputs: [], outputs: [] };
    expect(events.inputs).toEqual([]);
    expect(events.outputs).toEqual([]);
  });
});

describe("MetaInfo 接口", () => {
  it("构造完整 MetaInfo 对象", () => {
    const info: MetaInfo = {
      id: 1,
      author_id: 2,
      info: "描述",
      data: null,
      image_id: 3,
      uuid: "uuid-1",
      events: null,
      title: "场景标题",
      prefab: 0,
      image: { id: 3, md5: "abc", type: "image/png", url: "//img", filename: "img.png", size: 1000, key: "k1" },
      resources: [],
      editable: true,
      viewable: true,
      cyber: { id: 1, data: "", script: "" },
      verseMetas: [],
    };
    expect(info.id).toBe(1);
    expect(info.title).toBe("场景标题");
    expect(info.editable).toBe(true);
  });

  it("可选字段可以省略", () => {
    const info: MetaInfo = {
      id: 2,
      author_id: 3,
      info: null,
      data: null,
      image_id: null,
      uuid: "uuid-2",
      events: null,
      title: "T",
      prefab: 0,
      image: { id: 0, md5: "", type: "", url: "", filename: "", size: 0, key: "" },
      resources: [],
      editable: false,
      viewable: false,
      cyber: { id: 0, data: "", script: "" },
      verseMetas: [],
    };
    expect(info.metaCode).toBeUndefined();
    expect(info.author).toBeUndefined();
  });
});

describe("VerseMetaRelation 接口", () => {
  it("必填字段赋值", () => {
    const rel: VerseMetaRelation = { id: 1, verse_id: 2, meta_id: 3 };
    expect(rel.id).toBe(1);
    expect(rel.verse_id).toBe(2);
    expect(rel.meta_id).toBe(3);
  });
});

describe("CreateMetaRequest 接口", () => {
  it("必填字段 title", () => {
    const r: CreateMetaRequest = { title: "新场景" };
    expect(r.title).toBe("新场景");
  });

  it("可选字段赋值", () => {
    const r: CreateMetaRequest = {
      title: "场景",
      image_id: 1,
      prefab: 2,
      data: { key: "val" },
      events: { inputs: [], outputs: [] },
      info: "说明",
      uuid: "uuid-xyz",
      custom: true,
    };
    expect(r.uuid).toBe("uuid-xyz");
    expect(r.custom).toBe(true);
  });

  it("支持额外字段", () => {
    const r: CreateMetaRequest = { title: "T", extra_field: 42 };
    expect(r["extra_field"]).toBe(42);
  });
});

describe("UpdateMetaRequest 接口", () => {
  it("所有字段均为可选", () => {
    const r: UpdateMetaRequest = {};
    expect(r).toBeDefined();
  });

  it("部分字段更新", () => {
    const r: UpdateMetaRequest = { title: "更新标题", id: 5 };
    expect(r.title).toBe("更新标题");
    expect(r.id).toBe(5);
  });
});

describe("MetaListParams 接口", () => {
  it("所有字段均为可选", () => {
    const p: MetaListParams = {};
    expect(p).toBeDefined();
  });

  it("完整字段赋值", () => {
    const p: MetaListParams = { page: 1, pageSize: 20, keyword: "test", prefab: 0, author_id: 1 };
    expect(p.keyword).toBe("test");
    expect(p.pageSize).toBe(20);
  });
});

describe("MetaListResponse 接口", () => {
  it("构造正确", () => {
    const r: MetaListResponse = { data: [], total: 0, page: 1, pageSize: 20 };
    expect(r.data).toEqual([]);
    expect(r.total).toBe(0);
  });
});

// ============================================================
// verse.ts
// ============================================================

describe("ImageDetails 接口", () => {
  it("必填字段赋值", () => {
    const img: ImageDetails = { id: 1, md5: "abc", type: "image/png", url: "//img.png", filename: "img.png", size: 2048, key: "k1" };
    expect(img.id).toBe(1);
    expect(img.size).toBe(2048);
  });
});

describe("VerseRelease 接口", () => {
  it("字段赋值", () => {
    const r: VerseRelease = { id: 1, code: "ABCD1234" };
    expect(r.code).toBe("ABCD1234");
  });
});

describe("VerseShare 接口", () => {
  it("构造 VerseShare", () => {
    const s: VerseShare = {
      id: 1,
      verse_id: 2,
      info: "share-info",
      editable: 1,
      user: { id: 3, nickname: "Alice", email: "a@b.com", username: "alice" },
    };
    expect(s.editable).toBe(1);
    expect(s.user.username).toBe("alice");
  });
});

describe("VerseLanguage 接口", () => {
  it("字段赋值", () => {
    const lang: VerseLanguage = { id: 1, verse_id: 2, language: "zh-CN", name: "中文", description: "中文版" };
    expect(lang.language).toBe("zh-CN");
  });
});

describe("VerseCode 接口", () => {
  it("必填 blockly", () => {
    const vc: VerseCode = { blockly: "<xml/>" };
    expect(vc.blockly).toBe("<xml/>");
  });

  it("可选 lua/js", () => {
    const vc: VerseCode = { blockly: "", lua: "-- lua", js: "// js" };
    expect(vc.lua).toBe("-- lua");
  });
});

describe("Script 接口", () => {
  it("字段赋值", () => {
    const s: Script = { id: 1, created_at: "2024-01-01", verse_id: 2, script: "code", title: "MyScript", uuid: "uuid-s", workspace: "{}" };
    expect(s.title).toBe("MyScript");
  });
});

describe("VerseTag 接口", () => {
  it("必填字段 id 和 name", () => {
    const t: VerseTag = { id: 1, name: "3D" };
    expect(t.name).toBe("3D");
  });

  it("可选字段 type", () => {
    const t: VerseTag = { id: 2, name: "VR", type: "category" };
    expect(t.type).toBe("category");
  });
});

describe("VerseData 接口", () => {
  it("构造最小有效 VerseData", () => {
    const vd: VerseData = {
      id: 1,
      author_id: 2,
      name: "我的场景",
      info: null,
      description: null,
      data: {},
      version: 1,
      uuid: "uuid-v",
      editable: true,
      viewable: true,
      verseRelease: null,
      image: { id: 0, md5: "", type: "", url: "", filename: "", size: 0, key: "" },
    };
    expect(vd.name).toBe("我的场景");
    expect(vd.verseRelease).toBeNull();
  });

  it("可选字段赋值", () => {
    const vd: VerseData = {
      id: 2,
      author_id: 1,
      name: "场景2",
      info: "info",
      description: "desc",
      data: { key: "val" },
      version: 2,
      uuid: "uuid-2",
      editable: false,
      viewable: false,
      verseRelease: { id: 1, code: "CODE" },
      image: { id: 1, md5: "m", type: "t", url: "u", filename: "f", size: 0, key: "k" },
      public: true,
      languages: [],
      metas: [],
      verseTags: [],
      tags: [],
    };
    expect(vd.public).toBe(true);
    expect(vd.languages).toEqual([]);
  });
});

describe("PostVerseData 接口", () => {
  it("必填字段赋值", () => {
    const pv: PostVerseData = { description: "desc", name: "场景名", uuid: "uuid-p" };
    expect(pv.name).toBe("场景名");
  });

  it("可选字段赋值", () => {
    const pv: PostVerseData = { description: "d", name: "n", uuid: "u", image_id: 1, version: 2 };
    expect(pv.image_id).toBe(1);
  });
});

describe("PutVerseData 接口", () => {
  it("所有字段均可选", () => {
    const pv: PutVerseData = {};
    expect(pv).toBeDefined();
  });

  it("部分字段更新", () => {
    const pv: PutVerseData = { name: "新名称", data: { scene: "updated" } };
    expect(pv.name).toBe("新名称");
  });
});

describe("VerseListParams 接口", () => {
  it("所有字段均可选", () => {
    const p: VerseListParams = {};
    expect(p).toBeDefined();
  });

  it("完整字段赋值", () => {
    const p: VerseListParams = { page: 1, pageSize: 10, keyword: "k", public: true, author_id: 5 };
    expect(p.keyword).toBe("k");
  });
});

describe("VerseListResponse 接口", () => {
  it("构造正确", () => {
    const r: VerseListResponse = { data: [], total: 0, page: 1, pageSize: 10 };
    expect(r.total).toBe(0);
  });
});

describe("VerseDetailResponse 接口", () => {
  it("包含 VerseData", () => {
    const vd: VerseData = {
      id: 1, author_id: 1, name: "V", info: null, description: null,
      data: {}, version: 1, uuid: "u", editable: true, viewable: true,
      verseRelease: null,
      image: { id: 0, md5: "", type: "", url: "", filename: "", size: 0, key: "" },
    };
    const r: VerseDetailResponse = { data: vd };
    expect(r.data.name).toBe("V");
  });
});

describe("VerseCreateResponse 接口", () => {
  it("包含 message 可选字段", () => {
    const vd: VerseData = {
      id: 1, author_id: 1, name: "N", info: null, description: null,
      data: {}, version: 1, uuid: "u", editable: true, viewable: true,
      verseRelease: null,
      image: { id: 0, md5: "", type: "", url: "", filename: "", size: 0, key: "" },
    };
    const r: VerseCreateResponse = { data: vd, message: "created" };
    expect(r.message).toBe("created");
  });
});

describe("VerseDeleteResponse 接口", () => {
  it("包含 message 字段", () => {
    const r: VerseDeleteResponse = { message: "deleted" };
    expect(r.message).toBe("deleted");
  });
});
