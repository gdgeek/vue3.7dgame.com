import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock request module before importing the email API
vi.mock("@/utils/request", () => ({
  default: vi.fn(),
}));

describe("Email API", () => {
  let sendVerificationCode: any;
  let verifyEmailCode: any;
  let request: any;

  beforeEach(async () => {
    vi.clearAllMocks();

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

      const result = await verifyEmailCode("test@example.com", "123456");

      expect(request).toHaveBeenCalledWith({
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

      await verifyEmailCode("user@domain.com", "654321");

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

      const result = await verifyEmailCode("test@example.com", "123456");

      expect(result.success).toBe(true);
      expect(result.message).toBe("邮箱验证成功");
    });
  });
});
