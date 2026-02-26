import { describe, it, expect, vi, beforeEach } from "vitest";
import env from "@/environment";

// Mock request module before importing the email API
vi.mock("@/utils/request", () => ({
  default: vi.fn(),
}));

describe("Email API", () => {
  let sendVerificationCode: any;
  let verifyEmailCode: any;
  let request: any;
  let emailApiBase: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    emailApiBase = env.email_api;

    // Import after mocking
    request = (await import("@/utils/request")).default;
    const emailApi = await import("@/api/v1/email");
    sendVerificationCode = emailApi.sendVerificationCode;
    verifyEmailCode = emailApi.verifyEmailCode;
  });

  describe("sendVerificationCode", () => {
    it("should call correct endpoint for sending verification code", async () => {
      const mockResponse = {
        data: {
          success: true,
          message: "验证码已发送到您的邮箱",
        },
      };

      request.mockResolvedValue(mockResponse);

      const result = await sendVerificationCode("test@example.com");

      expect(request).toHaveBeenCalledWith({
        baseURL: emailApiBase,
        url: "/v1/email/send-verification",
        method: "post",
        data: { email: "test@example.com" },
      });

      expect(result).toEqual(mockResponse.data);
    });

    it("should handle request with correct data format", async () => {
      const mockResponse = {
        data: {
          success: true,
          message: "验证码已发送到您的邮箱",
        },
      };

      request.mockResolvedValue(mockResponse);

      await sendVerificationCode("user@domain.com");

      const callArgs = request.mock.calls[0][0];
      expect(callArgs.data).toHaveProperty("email");
      expect(callArgs.data.email).toBe("user@domain.com");
    });

    it("should return response data correctly", async () => {
      const mockResponse = {
        data: {
          success: true,
          message: "验证码已发送到您的邮箱",
        },
      };

      request.mockResolvedValue(mockResponse);

      const result = await sendVerificationCode("test@example.com");

      expect(result.success).toBe(true);
      expect(result.message).toBe("验证码已发送到您的邮箱");
    });
  });

  describe("verifyEmailCode", () => {
    it("should call correct endpoint for verifying email code", async () => {
      const mockResponse = {
        data: {
          success: true,
          message: "邮箱验证成功",
        },
      };

      request.mockResolvedValue(mockResponse);

      const result = await verifyEmailCode({
        email: "test@example.com",
        code: "123456",
      });

      expect(request).toHaveBeenCalledWith({
        baseURL: emailApiBase,
        url: "/v1/email/verify",
        method: "post",
        data: { email: "test@example.com", code: "123456" },
      });

      expect(result).toEqual(mockResponse.data);
    });

    it("should handle request with correct parameters", async () => {
      const mockResponse = {
        data: {
          success: true,
          message: "邮箱验证成功",
        },
      };

      request.mockResolvedValue(mockResponse);

      await verifyEmailCode({
        email: "user@domain.com",
        code: "654321",
      });

      const callArgs = request.mock.calls[0][0];
      expect(callArgs.data).toHaveProperty("email");
      expect(callArgs.data).toHaveProperty("code");
      expect(callArgs.data.email).toBe("user@domain.com");
      expect(callArgs.data.code).toBe("654321");
    });

    it("should return response data correctly", async () => {
      const mockResponse = {
        data: {
          success: true,
          message: "邮箱验证成功",
        },
      };

      request.mockResolvedValue(mockResponse);

      const result = await verifyEmailCode({
        email: "test@example.com",
        code: "123456",
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("邮箱验证成功");
    });
  });

  describe("getEmailStatus", () => {
    it("calls GET /v1/email/status with emailApiBase", async () => {
      const emailApi = await import("@/api/v1/email");
      request.mockResolvedValue({ data: { success: true, data: {} } });
      await emailApi.getEmailStatus();
      expect(request).toHaveBeenCalledWith({
        baseURL: emailApiBase,
        url: "/v1/email/status",
        method: "get",
      });
    });

    it("returns response.data", async () => {
      const emailApi = await import("@/api/v1/email");
      const payload = { success: true, data: { email: "x@y.com", email_verified: true } };
      request.mockResolvedValue({ data: payload });
      const result = await emailApi.getEmailStatus();
      expect(result).toEqual(payload);
    });
  });

  describe("sendChangeConfirmation", () => {
    it("calls POST /v1/email/send-change-confirmation with no body", async () => {
      const emailApi = await import("@/api/v1/email");
      request.mockResolvedValue({ data: { success: true } });
      await emailApi.sendChangeConfirmation();
      const arg = request.mock.calls[0][0];
      expect(arg.url).toBe("/v1/email/send-change-confirmation");
      expect(arg.method).toBe("post");
      expect(arg.baseURL).toBe(emailApiBase);
    });
  });

  describe("verifyChangeConfirmation", () => {
    it("calls POST /v1/email/verify-change-confirmation with code", async () => {
      const emailApi = await import("@/api/v1/email");
      request.mockResolvedValue({ data: { success: true } });
      await emailApi.verifyChangeConfirmation("ABC123");
      const arg = request.mock.calls[0][0];
      expect(arg.url).toBe("/v1/email/verify-change-confirmation");
      expect(arg.data).toEqual({ code: "ABC123" });
    });
  });

  describe("unbindEmail", () => {
    it("calls POST /v1/email/unbind with empty body when no code", async () => {
      const emailApi = await import("@/api/v1/email");
      request.mockResolvedValue({ data: { success: true } });
      await emailApi.unbindEmail();
      const arg = request.mock.calls[0][0];
      expect(arg.url).toBe("/v1/email/unbind");
      expect(arg.data).toEqual({});
    });

    it("calls POST /v1/email/unbind with code when provided", async () => {
      const emailApi = await import("@/api/v1/email");
      request.mockResolvedValue({ data: { success: true } });
      await emailApi.unbindEmail("XYZ");
      const arg = request.mock.calls[0][0];
      expect(arg.data).toEqual({ code: "XYZ" });
    });
  });

  describe("getEmailCooldown", () => {
    it("calls GET /v1/email/cooldown with no params when email omitted", async () => {
      const emailApi = await import("@/api/v1/email");
      request.mockResolvedValue({ data: { success: true } });
      await emailApi.getEmailCooldown();
      const arg = request.mock.calls[0][0];
      expect(arg.url).toBe("/v1/email/cooldown");
      expect(arg.params).toEqual({});
    });

    it("calls GET /v1/email/cooldown with email param when provided", async () => {
      const emailApi = await import("@/api/v1/email");
      request.mockResolvedValue({ data: { success: true } });
      await emailApi.getEmailCooldown("a@b.com");
      const arg = request.mock.calls[0][0];
      expect(arg.params).toEqual({ email: "a@b.com" });
    });
  });

  describe("testEmailService", () => {
    it("calls GET /v1/email/test", async () => {
      const emailApi = await import("@/api/v1/email");
      request.mockResolvedValue({ data: { success: true } });
      await emailApi.testEmailService();
      const arg = request.mock.calls[0][0];
      expect(arg.url).toBe("/v1/email/test");
      expect(arg.method).toBe("get");
    });
  });
});
