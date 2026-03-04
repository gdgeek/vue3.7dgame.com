import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TokenInfo } from "@/api/v1/types/auth";

// Mock logger to avoid side effects
vi.mock("@/utils/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

const TOKEN_KEY = "access_token";

const makeToken = (overrides: Partial<TokenInfo> = {}): TokenInfo => ({
  token: "test-token",
  accessToken: "access-abc123",
  refreshToken: "refresh-xyz789",
  expires: new Date(Date.now() + 3600 * 1000).toISOString(), // 1小时后过期
  tokenType: "Bearer",
  ...overrides,
});

describe("Token store module", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("setToken()", () => {
    it("应将 token 序列化后存入 localStorage", async () => {
      const Token = (await import("@/store/modules/token")).default;
      const token = makeToken();

      Token.setToken(token);

      const stored = localStorage.getItem(TOKEN_KEY);
      expect(stored).not.toBeNull();
      // stored is AES-encrypted, not plaintext JSON
      expect(stored).not.toContain(token.accessToken);
      // but round-trip via getToken() returns original value
      expect(Token.getToken()).toEqual(token);
    });

    it("覆盖已有的 token", async () => {
      const Token = (await import("@/store/modules/token")).default;
      const token1 = makeToken({ accessToken: "first" });
      const token2 = makeToken({ accessToken: "second" });

      Token.setToken(token1);
      Token.setToken(token2);

      expect(Token.getToken()?.accessToken).toBe("second");
    });
  });

  describe("getToken()", () => {
    it("localStorage 为空时返回 null", async () => {
      const Token = (await import("@/store/modules/token")).default;
      expect(Token.getToken()).toBeNull();
    });

    it("成功反序列化并返回 TokenInfo 对象", async () => {
      const Token = (await import("@/store/modules/token")).default;
      const token = makeToken();

      // Use setToken so the data is properly AES-encrypted before storing
      Token.setToken(token);

      const result = Token.getToken();
      expect(result).toEqual(token);
      expect(result?.accessToken).toBe(token.accessToken);
      expect(result?.refreshToken).toBe(token.refreshToken);
      expect(result?.expires).toBe(token.expires);
    });

    it("localStorage 存储了非法 JSON 时返回 null 并记录错误", async () => {
      const { AES } = await import("crypto-js");
      const { logger } = await import("@/utils/logger");
      const Token = (await import("@/store/modules/token")).default;

      // Encrypt a non-JSON string using the same default SECRET_KEY so that
      // decryption succeeds but JSON.parse throws, triggering logger.error
      const SECRET_KEY = "mrpp-default-token-secret-2024";
      const encryptedNonJson = AES.encrypt(
        "not-valid-json-content",
        SECRET_KEY
      ).toString();
      localStorage.setItem(TOKEN_KEY, encryptedNonJson);

      const result = Token.getToken();

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });

    it("保留所有 TokenInfo 字段", async () => {
      const Token = (await import("@/store/modules/token")).default;
      const token = makeToken({ tokenType: "Bearer" });
      Token.setToken(token);

      const result = Token.getToken();
      expect(result?.token).toBe(token.token);
      expect(result?.tokenType).toBe("Bearer");
    });
  });

  describe("hasToken()", () => {
    it("无 token 时返回 false", async () => {
      const Token = (await import("@/store/modules/token")).default;
      expect(Token.hasToken()).toBe(false);
    });

    it("有效 token 存在时返回 true", async () => {
      const Token = (await import("@/store/modules/token")).default;
      Token.setToken(makeToken());
      expect(Token.hasToken()).toBe(true);
    });

    it("token 被移除后返回 false", async () => {
      const Token = (await import("@/store/modules/token")).default;
      Token.setToken(makeToken());
      Token.removeToken();
      expect(Token.hasToken()).toBe(false);
    });
  });

  describe("removeToken()", () => {
    it("从 localStorage 中删除 token", async () => {
      const Token = (await import("@/store/modules/token")).default;
      Token.setToken(makeToken());

      Token.removeToken();

      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(Token.getToken()).toBeNull();
    });

    it("无 token 时调用 removeToken 不抛出异常", async () => {
      const Token = (await import("@/store/modules/token")).default;
      expect(() => Token.removeToken()).not.toThrow();
    });
  });

  describe("完整生命周期", () => {
    it("set → get → has → remove 完整流程", async () => {
      const Token = (await import("@/store/modules/token")).default;
      const token = makeToken();

      // 初始无 token
      expect(Token.hasToken()).toBe(false);
      expect(Token.getToken()).toBeNull();

      // 设置 token
      Token.setToken(token);
      expect(Token.hasToken()).toBe(true);
      expect(Token.getToken()).toEqual(token);

      // 删除 token
      Token.removeToken();
      expect(Token.hasToken()).toBe(false);
      expect(Token.getToken()).toBeNull();
    });

    it("set → set（覆盖）→ get 返回最新 token", async () => {
      const Token = (await import("@/store/modules/token")).default;

      const oldToken = makeToken({ accessToken: "old-access" });
      const newToken = makeToken({
        accessToken: "new-access",
        refreshToken: "new-refresh",
      });

      Token.setToken(oldToken);
      Token.setToken(newToken);

      const result = Token.getToken();
      expect(result?.accessToken).toBe("new-access");
      expect(result?.refreshToken).toBe("new-refresh");
    });
  });

  describe("边界情况", () => {
    it("hasToken 在初始状态下返回 false (重复断言)", async () => {
      const Token = (await import("@/store/modules/token")).default;
      expect(Token.hasToken()).toBe(false);
      expect(Token.hasToken()).toBe(false); // 幂等
    });

    it("getToken 解析包含 null expires 的 token", async () => {
      const Token = (await import("@/store/modules/token")).default;
      const token = makeToken({ expires: null as unknown as string });
      Token.setToken(token);
      const result = Token.getToken();
      expect(result).not.toBeNull();
      expect(result?.accessToken).toBe(token.accessToken);
    });

    it("setToken 后 localStorage 中包含正确的 token 字符串", async () => {
      const Token = (await import("@/store/modules/token")).default;
      const token = makeToken({ accessToken: "abc-xyz" });
      Token.setToken(token);
      const raw = localStorage.getItem("access_token");
      // raw is AES-encrypted, so it must not contain the plaintext token
      expect(raw).not.toBeNull();
      expect(raw).not.toContain("abc-xyz");
      // but getToken() correctly decrypts and returns the original value
      expect(Token.getToken()?.accessToken).toBe("abc-xyz");
    });
  });
});
