/**
 * 类型模块单元测试 - src/types/verse.ts
 * 验证 Vector3、Transform、Resource、Entity、Verse 等接口结构
 * Three.js 相关类型通过 mock 隔离
 */
import { describe, it, expect, vi } from "vitest";

// Mock three.js，避免 WebGL 依赖
vi.mock("three", () => ({
  Box3: vi.fn(),
  Vector2: vi.fn(),
  Vector3: vi.fn(),
  Object3D: vi.fn(),
}));

import type {
  Vector3,
  Transform,
  ResourceType,
  ResourceFile,
  Resource,
  EntityParameters,
  Entity,
  VerseData,
  Verse,
} from "@/types/verse";

describe("Vector3 接口", () => {
  it("xyz 字段赋值", () => {
    const v: Vector3 = { x: 1, y: 2, z: 3 };
    expect(v.x).toBe(1);
    expect(v.y).toBe(2);
    expect(v.z).toBe(3);
  });

  it("支持负值", () => {
    const v: Vector3 = { x: -1, y: -2.5, z: 0 };
    expect(v.x).toBe(-1);
    expect(v.y).toBe(-2.5);
  });
});

describe("Transform 接口", () => {
  const zero: Vector3 = { x: 0, y: 0, z: 0 };

  it("包含 position/rotate/scale", () => {
    const t: Transform = {
      position: { x: 1, y: 2, z: 3 },
      rotate: zero,
      scale: { x: 1, y: 1, z: 1 },
    };
    expect(t.position.x).toBe(1);
    expect(t.scale.y).toBe(1);
  });
});

describe("ResourceType 类型", () => {
  it("支持内置类型字符串", () => {
    const types: ResourceType[] = [
      "model",
      "video",
      "picture",
      "audio",
      "text",
      "voxel",
    ];
    expect(types).toHaveLength(6);
  });

  it("支持自定义字符串类型", () => {
    const t: ResourceType = "custom-type";
    expect(t).toBe("custom-type");
  });
});

describe("ResourceFile 接口", () => {
  it("url 为必填", () => {
    const f: ResourceFile = { url: "https://example.com/model.glb" };
    expect(f.url).toContain("model.glb");
  });

  it("可选字段赋值", () => {
    const f: ResourceFile = {
      url: "https://x.com/a.mp4",
      id: 1,
      name: "video",
      filename: "a.mp4",
      key: "k1",
      size: 2048,
      md5: "abc123",
      type: "video",
    };
    expect(f.size).toBe(2048);
    expect(f.type).toBe("video");
  });
});

describe("Resource 接口", () => {
  it("type 为必填", () => {
    const r: Resource = { type: "model" };
    expect(r.type).toBe("model");
  });

  it("可选字段 file/content/data/name/uuid", () => {
    const r: Resource = {
      type: "text",
      content: "Hello World",
      id: "res-1",
      name: "Text Resource",
      uuid: "uuid-1234",
    };
    expect(r.content).toBe("Hello World");
    expect(r.uuid).toBe("uuid-1234");
  });

  it("author 可选字段", () => {
    const r: Resource = {
      type: "audio",
      author: { id: 1, username: "user1", nickname: "Nick" },
    };
    expect(r.author?.nickname).toBe("Nick");
  });
});

describe("EntityParameters 接口", () => {
  it("uuid 为必填", () => {
    const p: EntityParameters = { uuid: "ent-uuid-1" };
    expect(p.uuid).toBe("ent-uuid-1");
  });

  it("active 默认可选", () => {
    const p: EntityParameters = { uuid: "u", active: false };
    expect(p.active).toBe(false);
  });

  it("视频相关可选字段", () => {
    const p: EntityParameters = {
      uuid: "u",
      play: true,
      loop: true,
      muted: false,
      volume: 0.8,
      width: 1920,
      height: 1080,
    };
    expect(p.volume).toBe(0.8);
    expect(p.width).toBe(1920);
  });

  it("文字相关可选字段", () => {
    const p: EntityParameters = {
      uuid: "u",
      text: "Hello",
      fontSize: 24,
      color: "#ffffff",
      spacing: 1.5,
    };
    expect(p.text).toBe("Hello");
    expect(p.color).toBe("#ffffff");
  });

  it("transform 可选字段", () => {
    const p: EntityParameters = {
      uuid: "u",
      transform: {
        position: { x: 0, y: 1, z: 0 },
        rotate: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
    };
    expect(p.transform?.position.y).toBe(1);
  });
});

describe("Entity 接口", () => {
  it("type 和 parameters 为必填", () => {
    const e: Entity = { type: "Model", parameters: { uuid: "e-1" } };
    expect(e.type).toBe("Model");
    expect(e.parameters.uuid).toBe("e-1");
  });

  it("children 可选嵌套", () => {
    const e: Entity = {
      type: "Group",
      parameters: { uuid: "g-1" },
      children: {
        entities: [{ type: "Video", parameters: { uuid: "v-1" } }],
      },
    };
    expect(e.children?.entities).toHaveLength(1);
  });
});

describe("VerseData 接口", () => {
  it("children 为可选", () => {
    const v: VerseData = {};
    expect(v).toBeDefined();
  });

  it("children.modules 为 Entity 数组", () => {
    const v: VerseData = {
      children: {
        modules: [{ type: "Model", parameters: { uuid: "m-1" } }],
      },
    };
    expect(v.children?.modules).toHaveLength(1);
  });
});

describe("Verse 接口", () => {
  it("data 和 metas/resources 为必填", () => {
    const v: Verse = {
      data: { children: {} },
      metas: [],
      resources: [],
    };
    expect(v.metas).toEqual([]);
    expect(v.resources).toEqual([]);
  });

  it("data 可以是 JSON 字符串", () => {
    const v: Verse = {
      data: '{"children":{}}',
      metas: [],
      resources: [],
    };
    expect(typeof v.data).toBe("string");
  });

  it("可选字段 id/name/uuid/code", () => {
    const v: Verse = {
      id: 1,
      name: "My Scene",
      uuid: "scene-uuid",
      code: "// script",
      data: {},
      metas: [],
      resources: [{ type: "model" }],
    };
    expect(v.name).toBe("My Scene");
    expect(v.code).toBe("// script");
  });
});
