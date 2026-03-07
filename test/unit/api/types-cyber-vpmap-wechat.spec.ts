/**
 * 类型模块单元测试 - src/api/v1/types/cyber.ts + vp-map.ts + wechat.ts
 */
import { describe, it, expect } from "vitest";
import type {
  CyberType,
  CreateCyberRequest,
  UpdateCyberRequest,
} from "@/api/v1/types/cyber";
import type {
  VpMapGuide,
  VpMap,
  CreateVpMapRequest,
} from "@/api/v1/types/vp-map";
import type {
  WechatLoginRequest,
  WechatLoginResponse,
  WechatLinkRequest,
  WechatLinkResponse,
  WechatRegisterRequest,
  WechatRegisterResponse,
} from "@/api/v1/types/wechat";

// ============================================================
// cyber.ts
// ============================================================
describe("CyberType 接口", () => {
  it("必填字段赋值", () => {
    const c: CyberType = { id: 1, data: "{}", script: "console.log()" };
    expect(c.id).toBe(1);
    expect(c.data).toBe("{}");
  });
});

describe("CreateCyberRequest 类型", () => {
  it("不含 id 的必填字段", () => {
    const r: CreateCyberRequest = { data: "{}", script: "return 1" };
    expect(r.data).toBe("{}");
    expect(r.id).toBeUndefined();
  });

  it("id 可选时赋值", () => {
    const r: CreateCyberRequest = { data: "{}", script: "x", id: 5 };
    expect(r.id).toBe(5);
  });
});

describe("UpdateCyberRequest 类型", () => {
  it("所有字段均为可选", () => {
    const r: UpdateCyberRequest = {};
    expect(r).toBeDefined();
  });

  it("部分字段赋值", () => {
    const r: UpdateCyberRequest = { script: "new script" };
    expect(r.script).toBe("new script");
    expect(r.data).toBeUndefined();
  });
});

// ============================================================
// vp-map.ts
// ============================================================
describe("VpMapGuide 接口", () => {
  it("必填字段赋值", () => {
    const g: VpMapGuide = { id: 1, order: 0, level_id: 10 };
    expect(g.id).toBe(1);
    expect(g.level_id).toBe(10);
  });

  it("level 可选嵌套对象", () => {
    const g: VpMapGuide = {
      id: 2,
      order: 1,
      level_id: 3,
      level: { id: 3, name: "Level 1" },
    };
    expect(g.level?.name).toBe("Level 1");
  });

  it("支持索引字段", () => {
    const g: VpMapGuide = { id: 3, order: 2, level_id: 5, extra: "data" };
    expect(g["extra"]).toBe("data");
  });
});

describe("VpMap 接口", () => {
  it("必填字段赋值", () => {
    const m: VpMap = { id: 1, page: 2, guides: [] };
    expect(m.id).toBe(1);
    expect(m.guides).toEqual([]);
  });

  it("guides 可包含多个 VpMapGuide", () => {
    const m: VpMap = {
      id: 1,
      page: 1,
      guides: [
        { id: 1, order: 0, level_id: 1 },
        { id: 2, order: 1, level_id: 2 },
      ],
    };
    expect(m.guides).toHaveLength(2);
  });
});

describe("CreateVpMapRequest 接口", () => {
  it("page 字段赋值", () => {
    const r: CreateVpMapRequest = { page: 3 };
    expect(r.page).toBe(3);
  });
});

// ============================================================
// wechat.ts
// ============================================================
describe("WechatLoginRequest 接口", () => {
  it("token 字段赋值", () => {
    const r: WechatLoginRequest = { token: "wx_token_123" };
    expect(r.token).toBe("wx_token_123");
  });
});

describe("WechatLoginResponse 接口", () => {
  it("必填 token 字段", () => {
    const r: WechatLoginResponse = {
      token: {
        accessToken: "at",
        refreshToken: "rt",
        tokenType: "Bearer",
        expiresIn: 3600,
      },
    };
    expect(r.token.accessToken).toBe("at");
  });

  it("可选 success/message/user 字段", () => {
    const r: WechatLoginResponse = {
      success: true,
      message: "ok",
      token: {
        accessToken: "at",
        refreshToken: "rt",
        tokenType: "Bearer",
        expiresIn: 3600,
      },
      user: { id: 1, username: "u1", nickname: "Nick" },
    };
    expect(r.success).toBe(true);
    expect(r.user?.nickname).toBe("Nick");
  });
});

describe("WechatLinkRequest / WechatLinkResponse", () => {
  it("WechatLinkRequest token 赋值", () => {
    const r: WechatLinkRequest = { token: "link_token" };
    expect(r.token).toBe("link_token");
  });

  it("WechatLinkResponse 必填字段", () => {
    const r: WechatLinkResponse = { message: "Linked", success: true };
    expect(r.success).toBe(true);
  });
});

describe("WechatRegisterRequest / WechatRegisterResponse", () => {
  it("WechatRegisterRequest 必填字段", () => {
    const r: WechatRegisterRequest = {
      token: "t",
      username: "u",
      password: "p",
    };
    expect(r.username).toBe("u");
  });

  it("WechatRegisterRequest nickname 可选", () => {
    const r: WechatRegisterRequest = {
      token: "t",
      username: "u",
      password: "p",
      nickname: "Nick",
    };
    expect(r.nickname).toBe("Nick");
  });

  it("WechatRegisterResponse token 必填", () => {
    const r: WechatRegisterResponse = {
      token: {
        accessToken: "at",
        refreshToken: "rt",
        tokenType: "Bearer",
        expiresIn: 3600,
      },
    };
    expect(r.token.tokenType).toBe("Bearer");
  });
});
