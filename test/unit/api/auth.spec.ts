/**
 * Unit tests for src/api/v1/auth.ts
 * Verifies that each function calls request with the correct config.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("Auth API", () => {
  let request: ReturnType<typeof vi.fn>;
  let authApi: typeof import("@/api/v1/auth");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    authApi = await import("@/api/v1/auth");
  });

  // -----------------------------------------------------------------------
  // login
  // -----------------------------------------------------------------------
  describe("login()", () => {
    it("calls POST /v1/auth/login", async () => {
      request.mockResolvedValue({ data: { accessToken: "tok" } });
      await authApi.login({ username: "user", password: "pass" });
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/auth/login",
          method: "post",
          data: { username: "user", password: "pass" },
        })
      );
    });

    it("forwards the data payload unchanged", async () => {
      request.mockResolvedValue({ data: {} });
      const payload = { username: "alice", password: "s3cr3t" };
      await authApi.login(payload);
      const callData = request.mock.calls[0][0].data;
      expect(callData).toEqual(payload);
    });
  });

  // -----------------------------------------------------------------------
  // refresh
  // -----------------------------------------------------------------------
  describe("refresh()", () => {
    it("calls POST /v1/auth/refresh with refreshToken in body", async () => {
      request.mockResolvedValue({ data: { accessToken: "new-tok" } });
      await authApi.refresh("my-refresh-token");
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/auth/refresh",
          method: "post",
          data: { refreshToken: "my-refresh-token" },
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // register
  // -----------------------------------------------------------------------
  describe("register()", () => {
    it("calls POST /v1/auth/register", async () => {
      request.mockResolvedValue({ data: {} });
      await authApi.register({ username: "bob", password: "p@ss", email: "b@b.com" });
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/auth/register",
          method: "post",
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // link
  // -----------------------------------------------------------------------
  describe("link()", () => {
    it("calls POST /v1/auth/link", async () => {
      request.mockResolvedValue({ data: { success: true } });
      const payload = { provider: "github", code: "abc" };
      await authApi.link(payload as Parameters<typeof authApi.link>[0]);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/v1/auth/link",
          method: "post",
          data: payload,
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // logout
  // -----------------------------------------------------------------------
  describe("logout()", () => {
    it("resolves without calling request", async () => {
      const result = await authApi.logout();
      expect(result).toBe(true);
      expect(request).not.toHaveBeenCalled();
    });
  });
});
