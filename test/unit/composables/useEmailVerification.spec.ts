import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useEmailVerification } from "@/composables/useEmailVerification";
import { sendVerificationCode, verifyEmailCode } from "@/api/v1/email";

// Mock API module
vi.mock("@/api/v1/email", () => ({
  sendVerificationCode: vi.fn(),
  verifyEmailCode: vi.fn(),
}));

// Get mocked functions
const mockedSendVerificationCode = vi.mocked(sendVerificationCode);
const mockedVerifyEmailCode = vi.mocked(verifyEmailCode);

describe("useEmailVerification Composable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Property 2: 速率限制机制", () => {
    it("Feature: email-verification, Property 2: 速率限制机制 - 测试60秒倒计时", async () => {
      const { sendCode, countdown, canSendCode, cleanup } =
        useEmailVerification();

      // Mock successful API response
      mockedSendVerificationCode.mockResolvedValue({
        success: true,
        message: "验证码已发送到您的邮箱",
      });

      // 发送验证码
      await sendCode("test@example.com");

      // 验证倒计时从60开始
      expect(countdown.value).toBe(60);
      expect(canSendCode.value).toBe(false);

      // 前进30秒
      vi.advanceTimersByTime(30000);
      expect(countdown.value).toBe(30);
      expect(canSendCode.value).toBe(false);

      // 前进到59秒
      vi.advanceTimersByTime(29000);
      expect(countdown.value).toBe(1);
      expect(canSendCode.value).toBe(false);

      // 前进到60秒
      vi.advanceTimersByTime(1000);
      expect(countdown.value).toBe(0);
      expect(canSendCode.value).toBe(true);

      cleanup();
    });

    it("should disable send button during countdown", async () => {
      const { sendCode, canSendCode, cleanup } = useEmailVerification();

      mockedSendVerificationCode.mockResolvedValue({
        success: true,
        message: "验证码已发送到您的邮箱",
      });

      // 发送前可以发送
      expect(canSendCode.value).toBe(true);

      await sendCode("test@example.com");

      // 发送后不能发送
      expect(canSendCode.value).toBe(false);

      cleanup();
    });
  });

  describe("Property 8: 账户锁定机制", () => {
    it("Feature: email-verification, Property 8: 账户锁定机制 - 测试5次失败后锁定", async () => {
      const { verifyCode, isLocked, lockTime, cleanup } =
        useEmailVerification();

      // Mock账户锁定错误
      mockedVerifyEmailCode.mockRejectedValue({
        error: {
          code: "ACCOUNT_LOCKED",
          message: "验证失败次数过多，账户已被锁定，请 900 秒后再试",
          retry_after: 900,
        },
      });

      // 尝试验证
      await verifyCode("test@example.com", "123456");

      // 验证锁定状态
      expect(isLocked.value).toBe(true);
      expect(lockTime.value).toBe(900);

      // 前进450秒
      vi.advanceTimersByTime(450000);
      expect(lockTime.value).toBe(450);
      expect(isLocked.value).toBe(true);

      // 前进到900秒
      vi.advanceTimersByTime(450000);
      expect(lockTime.value).toBe(0);
      expect(isLocked.value).toBe(false);

      cleanup();
    });

    it("should set isLocked to true when ACCOUNT_LOCKED error occurs", async () => {
      const { verifyCode, isLocked, cleanup } = useEmailVerification();

      mockedVerifyEmailCode.mockRejectedValue({
        error: {
          code: "ACCOUNT_LOCKED",
          message: "账户已被锁定",
          retry_after: 900,
        },
      });

      await verifyCode("test@example.com", "123456");

      expect(isLocked.value).toBe(true);

      cleanup();
    });
  });

  describe("Property 9: 锁定状态下禁用验证", () => {
    it("Feature: email-verification, Property 9: 锁定状态下禁用验证 - 测试锁定期间的行为", async () => {
      const { verifyCode, isLocked, canVerify, cleanup } =
        useEmailVerification();

      // Mock账户锁定错误
      mockedVerifyEmailCode.mockRejectedValue({
        error: {
          code: "ACCOUNT_LOCKED",
          message: "账户已被锁定",
          retry_after: 900,
        },
      });

      // 验证前可以验证
      expect(canVerify.value).toBe(true);

      // 触发锁定
      await verifyCode("test@example.com", "123456");

      // 锁定后不能验证
      expect(isLocked.value).toBe(true);
      expect(canVerify.value).toBe(false);

      // 尝试再次验证应该返回false
      const result = await verifyCode("test@example.com", "654321");
      expect(result).toBe(false);

      cleanup();
    });

    it("should prevent verification when locked", async () => {
      const { verifyCode, canVerify, cleanup } = useEmailVerification();

      // 先触发锁定
      mockedVerifyEmailCode.mockRejectedValueOnce({
        error: {
          code: "ACCOUNT_LOCKED",
          message: "账户已被锁定",
          retry_after: 900,
        },
      });

      await verifyCode("test@example.com", "123456");

      // 锁定后不能验证
      expect(canVerify.value).toBe(false);

      // 尝试验证应该返回false
      const result = await verifyCode("test@example.com", "654321");
      expect(result).toBe(false);

      cleanup();
    });
  });

  describe("Additional Unit Tests", () => {
    it("should handle successful code sending", async () => {
      const { sendCode, error, cleanup } = useEmailVerification();

      mockedSendVerificationCode.mockResolvedValue({
        success: true,
        message: "验证码已发送到您的邮箱",
      });

      const result = await sendCode("test@example.com");

      expect(result).toBe(true);
      expect(error.value).toBe(null);

      cleanup();
    });

    it("should handle failed code sending", async () => {
      const { sendCode, error, cleanup } = useEmailVerification();

      mockedSendVerificationCode.mockRejectedValue({
        error: {
          code: "VALIDATION_ERROR",
          message: "邮箱格式不正确",
        },
      });

      const result = await sendCode("invalid-email");

      expect(result).toBe(false);
      expect(error.value).toBe("邮箱格式不正确");

      cleanup();
    });

    it("should handle successful code verification", async () => {
      const { verifyCode, error, cleanup } = useEmailVerification();

      mockedVerifyEmailCode.mockResolvedValue({
        success: true,
        message: "邮箱验证成功",
      });

      const result = await verifyCode("test@example.com", "123456");

      expect(result).toBe(true);
      expect(error.value).toBe(null);

      cleanup();
    });

    it("should handle failed code verification", async () => {
      const { verifyCode, error, cleanup } = useEmailVerification();

      mockedVerifyEmailCode.mockRejectedValue({
        error: {
          code: "INVALID_CODE",
          message: "验证码不正确",
        },
      });

      const result = await verifyCode("test@example.com", "123456");

      expect(result).toBe(false);
      expect(error.value).toBe("验证码不正确");

      cleanup();
    });

    it("should handle rate limit error", async () => {
      const { sendCode, countdown, cleanup } = useEmailVerification();

      mockedSendVerificationCode.mockRejectedValue({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "请求过于频繁，请 60 秒后再试",
          retry_after: 60,
        },
      });

      await sendCode("test@example.com");

      expect(countdown.value).toBe(60);

      cleanup();
    });

    it("should clear countdown on successful verification", async () => {
      const { sendCode, verifyCode, countdown, cleanup } =
        useEmailVerification();

      mockedSendVerificationCode.mockResolvedValue({
        success: true,
        message: "验证码已发送到您的邮箱",
      });

      mockedVerifyEmailCode.mockResolvedValue({
        success: true,
        message: "邮箱验证成功",
      });

      // 发送验证码
      await sendCode("test@example.com");
      expect(countdown.value).toBe(60);

      // 验证成功
      await verifyCode("test@example.com", "123456");
      expect(countdown.value).toBe(0);

      cleanup();
    });

    it("should cleanup timers properly", async () => {
      const { sendCode, countdown, cleanup } = useEmailVerification();

      mockedSendVerificationCode.mockResolvedValue({
        success: true,
        message: "验证码已发送到您的邮箱",
      });

      await sendCode("test@example.com");
      expect(countdown.value).toBe(60);

      // 清理
      cleanup();

      // 前进时间，倒计时不应该继续
      vi.advanceTimersByTime(10000);
      expect(countdown.value).toBe(60); // 应该保持不变
    });
  });
});
