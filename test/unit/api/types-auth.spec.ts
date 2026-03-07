/**
 * 类型模块单元测试 - src/api/v1/types/auth.ts
 * 验证 LoginRequest、RegisterRequest、LinkAccountRequest、TokenInfo、LoginResponse 等接口
 */
import { describe, it, expect } from "vitest";
import type {
  LoginRequest,
  RegisterRequest,
  LinkAccountRequest,
  TokenInfo,
  LoginResponse,
  RefreshTokenResponse,
  RegisterResponse,
} from "@/api/v1/types/auth";

describe("LoginRequest 接口", () => {
  it("必填字段 username/password", () => {
    const r: LoginRequest = { username: "user1", password: "pass123" };
    expect(r.username).toBe("user1");
    expect(r.password).toBe("pass123");
  });

  it("captcha 和 captchaKey 可选", () => {
    const r: LoginRequest = {
      username: "u",
      password: "p",
      captcha: "abc",
      captchaKey: "key1",
    };
    expect(r.captcha).toBe("abc");
    expect(r.captchaKey).toBe("key1");
  });
});

describe("RegisterRequest 接口", () => {
  it("必填字段 username/password", () => {
    const r: RegisterRequest = { username: "newuser", password: "newpass" };
    expect(r.username).toBe("newuser");
  });

  it("可选字段赋值", () => {
    const r: RegisterRequest = {
      username: "u",
      password: "p",
      email: "a@b.com",
      phone: "1234567890",
      captcha: "x",
      captchaKey: "k",
    };
    expect(r.email).toBe("a@b.com");
    expect(r.phone).toBe("1234567890");
  });
});

describe("LinkAccountRequest 接口", () => {
  it("provider 为 wechat", () => {
    const r: LinkAccountRequest = { provider: "wechat", code: "wx_code" };
    expect(r.provider).toBe("wechat");
    expect(r.code).toBe("wx_code");
  });

  it("provider 为 apple", () => {
    const r: LinkAccountRequest = { provider: "apple", code: "apple_code" };
    expect(r.provider).toBe("apple");
  });

  it("provider 为 google，state 可选", () => {
    const r: LinkAccountRequest = {
      provider: "google",
      code: "g_code",
      state: "state123",
    };
    expect(r.state).toBe("state123");
  });
});

describe("TokenInfo 接口", () => {
  it("必填字段赋值", () => {
    const t: TokenInfo = {
      token: "token_val",
      accessToken: "access_val",
      refreshToken: "refresh_val",
      expires: "2025-12-31T00:00:00Z",
    };
    expect(t.token).toBe("token_val");
    expect(t.accessToken).toBe("access_val");
    expect(t.expires).toContain("2025");
  });

  it("tokenType 可选", () => {
    const t: TokenInfo = {
      token: "t",
      accessToken: "at",
      refreshToken: "rt",
      expires: "2025-01-01",
      tokenType: "Bearer",
    };
    expect(t.tokenType).toBe("Bearer");
  });
});

describe("LoginResponse 接口", () => {
  it("token 为必填", () => {
    const r: LoginResponse = {
      token: {
        token: "t",
        accessToken: "at",
        refreshToken: "rt",
        expires: "2025",
      },
    };
    expect(r.token.accessToken).toBe("at");
  });

  it("success/user 可选", () => {
    const r: LoginResponse = {
      success: true,
      token: {
        token: "t",
        accessToken: "at",
        refreshToken: "rt",
        expires: "2025",
      },
      user: {
        id: 1,
        username: "user1",
        email: "a@b.com",
        avatar: "https://avatar",
      },
    };
    expect(r.success).toBe(true);
    expect(r.user?.email).toBe("a@b.com");
  });
});

describe("RefreshTokenResponse 接口", () => {
  it("token 必填", () => {
    const r: RefreshTokenResponse = {
      token: {
        token: "t",
        accessToken: "new_at",
        refreshToken: "new_rt",
        expires: "2026",
      },
    };
    expect(r.token.accessToken).toBe("new_at");
  });
});

describe("RegisterResponse 接口", () => {
  it("token 和 user 均必填", () => {
    const r: RegisterResponse = {
      token: {
        token: "t",
        accessToken: "at",
        refreshToken: "rt",
        expires: "2025",
      },
      user: { id: 1, username: "newuser" },
    };
    expect(r.user.id).toBe(1);
    expect(r.user.username).toBe("newuser");
  });
});
