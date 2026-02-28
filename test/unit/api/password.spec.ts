/**
 * Unit tests for src/api/v1/password.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import env from "@/environment";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("Password API", () => {
  let request: ReturnType<typeof vi.fn>;
  let passwordApi: typeof import("@/api/v1/password");
  const base = env.email_api;

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    passwordApi = await import("@/api/v1/password");
  });

  // -----------------------------------------------------------------------
  // requestPasswordReset
  // -----------------------------------------------------------------------
  describe("requestPasswordReset()", () => {
    it("calls POST /v1/password/request-reset with email", async () => {
      request.mockResolvedValue({ data: { success: true } });
      await passwordApi.requestPasswordReset("user@example.com");
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: base,
          url: "/v1/password/request-reset",
          method: "post",
          data: { email: "user@example.com" },
        })
      );
    });

    it("returns the response data", async () => {
      const mockData = { success: true, message: "sent" };
      request.mockResolvedValue({ data: mockData });
      const result = await passwordApi.requestPasswordReset("x@y.com");
      expect(result).toEqual(mockData);
    });
  });

  // -----------------------------------------------------------------------
  // verifyResetCode
  // -----------------------------------------------------------------------
  describe("verifyResetCode()", () => {
    it("calls POST /v1/password/verify-code with email and code", async () => {
      request.mockResolvedValue({ data: { valid: true } });
      await passwordApi.verifyResetCode("user@example.com", "123456");
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: base,
          url: "/v1/password/verify-code",
          method: "post",
          data: { email: "user@example.com", code: "123456" },
        })
      );
    });

    it("returns response data", async () => {
      const mockData = { valid: true };
      request.mockResolvedValue({ data: mockData });
      const result = await passwordApi.verifyResetCode("a@b.com", "000000");
      expect(result).toEqual(mockData);
    });
  });

  // -----------------------------------------------------------------------
  // resetPasswordByCode
  // -----------------------------------------------------------------------
  describe("resetPasswordByCode()", () => {
    it("calls POST /v1/password/reset with email, code, password", async () => {
      request.mockResolvedValue({ data: { success: true } });
      await passwordApi.resetPasswordByCode("u@e.com", "654321", "newP@ss");
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: base,
          url: "/v1/password/reset",
          method: "post",
          data: { email: "u@e.com", code: "654321", password: "newP@ss" },
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // changePassword
  // -----------------------------------------------------------------------
  describe("changePassword()", () => {
    it("calls POST /v1/password/change with old/new/confirm passwords", async () => {
      request.mockResolvedValue({ data: { success: true } });
      await passwordApi.changePassword("OldPass1!", "NewPass2!", "NewPass2!");
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: base,
          url: "/v1/password/change",
          method: "post",
          data: {
            old_password: "OldPass1!",
            new_password: "NewPass2!",
            confirm_password: "NewPass2!",
          },
        })
      );
    });

    it("returns response data", async () => {
      const mockData = { success: true, message: "changed" };
      request.mockResolvedValue({ data: mockData });
      const result = await passwordApi.changePassword("a", "b", "b");
      expect(result).toEqual(mockData);
    });
  });
});
