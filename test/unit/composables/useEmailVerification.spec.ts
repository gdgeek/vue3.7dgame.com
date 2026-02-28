import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useEmailVerification } from "@/composables/useEmailVerification";
import {
  sendVerificationCode,
  verifyEmailCode,
  getEmailStatus,
} from "@/api/v1/email";

vi.mock("@/api/v1/email", () => ({
  sendVerificationCode: vi.fn(),
  verifyEmailCode: vi.fn(),
  getEmailStatus: vi.fn(),
  getEmailCooldown: vi.fn(),
  sendChangeConfirmation: vi.fn(),
  verifyChangeConfirmation: vi.fn(),
  unbindEmail: vi.fn(),
}));

vi.mock("@/store/modules/user", () => ({
  useUserStore: () => ({
    userInfo: { userData: { emailVerified: false, emailBind: false } },
    getUserInfo: vi.fn().mockResolvedValue(undefined),
  }),
}));

const mockedSendVerificationCode = vi.mocked(sendVerificationCode);
const mockedVerifyEmailCode = vi.mocked(verifyEmailCode);
const mockedGetEmailStatus = vi.mocked(getEmailStatus);

describe("useEmailVerification Composable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockedGetEmailStatus.mockResolvedValue({
      success: true,
      data: {
        user_id: 1,
        username: "test",
        email: null,
        email_verified: false,
        email_verified_at: null,
        email_verified_at_formatted: null,
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Property 2: 速率限制机制", () => {
    it("Feature: email-verification, Property 2: 速率限制机制 - 测试60秒倒计时", async () => {
      const { sendCodeForNewEmail, sendCooldown, canSendNewCode, newEmailForm, cleanup } =
        useEmailVerification();

      mockedSendVerificationCode.mockResolvedValue({
        success: true,
        message: "验证码已发送到您的邮箱",
      });

      newEmailForm.email = "test@example.com";
      await sendCodeForNewEmail();

      expect(sendCooldown.value).toBe(60);
      expect(canSendNewCode.value).toBe(false);

      vi.advanceTimersByTime(30000);
      expect(sendCooldown.value).toBe(30);
      expect(canSendNewCode.value).toBe(false);

      vi.advanceTimersByTime(29000);
      expect(sendCooldown.value).toBe(1);
      expect(canSendNewCode.value).toBe(false);

      vi.advanceTimersByTime(1000);
      expect(sendCooldown.value).toBe(0);
      expect(canSendNewCode.value).toBe(true);

      cleanup();
    });

    it("should disable send button during countdown", async () => {
      const { sendCodeForNewEmail, canSendNewCode, newEmailForm, cleanup } =
        useEmailVerification();

      mockedSendVerificationCode.mockResolvedValue({
        success: true,
        message: "验证码已发送到您的邮箱",
      });

      newEmailForm.email = "test@example.com";
      expect(canSendNewCode.value).toBe(true);

      await sendCodeForNewEmail();
      expect(canSendNewCode.value).toBe(false);

      cleanup();
    });
  });

  describe("Property 8: 账户锁定机制", () => {
    it("Feature: email-verification, Property 8: 账户锁定机制 - 测试5次失败后锁定", async () => {
      const { verifyCodeForNewEmail, isLocked, lockTime, newEmailForm, cleanup } =
        useEmailVerification();

      mockedVerifyEmailCode.mockRejectedValue({
        error: {
          code: "ACCOUNT_LOCKED",
          message: "验证失败次数过多，账户已被锁定，请 900 秒后再试",
          retry_after: 900,
        },
      });

      newEmailForm.email = "test@example.com";
      newEmailForm.code = "123456";
      await verifyCodeForNewEmail();

      expect(isLocked.value).toBe(true);
      expect(lockTime.value).toBe(900);

      vi.advanceTimersByTime(450000);
      expect(lockTime.value).toBe(450);
      expect(isLocked.value).toBe(true);

      vi.advanceTimersByTime(450000);
      expect(lockTime.value).toBe(0);
      expect(isLocked.value).toBe(false);

      cleanup();
    });
  });

  describe("Additional Unit Tests", () => {
    it("should handle successful code sending", async () => {
      const { sendCodeForNewEmail, error, newEmailForm, cleanup } =
        useEmailVerification();

      mockedSendVerificationCode.mockResolvedValue({
        success: true,
        message: "验证码已发送到您的邮箱",
      });

      newEmailForm.email = "test@example.com";
      const result = await sendCodeForNewEmail();

      expect(result).toBe(true);
      expect(error.value).toBe(null);

      cleanup();
    });

    it("should handle failed code verification", async () => {
      const { verifyCodeForNewEmail, error, newEmailForm, cleanup } =
        useEmailVerification();

      mockedVerifyEmailCode.mockRejectedValue({
        error: {
          code: "INVALID_CODE",
          message: "验证码不正确",
        },
      });

      newEmailForm.email = "test@example.com";
      newEmailForm.code = "123456";
      const result = await verifyCodeForNewEmail();

      expect(result).toBe(false);
      expect(error.value).toBe("验证码不正确");

      cleanup();
    });

    it("should clear send cooldown on successful verification", async () => {
      const { sendCodeForNewEmail, verifyCodeForNewEmail, sendCooldown, newEmailForm, cleanup } =
        useEmailVerification();

      mockedSendVerificationCode.mockResolvedValue({
        success: true,
      });
      mockedVerifyEmailCode.mockResolvedValue({
        success: true,
      });

      newEmailForm.email = "test@example.com";
      await sendCodeForNewEmail();
      expect(sendCooldown.value).toBe(60);

      newEmailForm.code = "123456";
      await verifyCodeForNewEmail();
      expect(sendCooldown.value).toBe(0);

      cleanup();
    });

    it("should cleanup timers properly", async () => {
      const { sendCodeForNewEmail, sendCooldown, newEmailForm, cleanup } =
        useEmailVerification();

      mockedSendVerificationCode.mockResolvedValue({
        success: true,
      });

      newEmailForm.email = "test@example.com";
      await sendCodeForNewEmail();
      expect(sendCooldown.value).toBe(60);

      cleanup();
      expect(sendCooldown.value).toBe(0);
    });
  });

  describe("unbindCurrentEmail()", () => {
    it("returns false immediately when email is verified but no code provided", async () => {
      const { unbindCurrentEmail, loadStatus, cleanup } = useEmailVerification();

      // Load status with email_verified = true
      mockedGetEmailStatus.mockResolvedValue({
        success: true,
        data: {
          user_id: 1,
          username: "test",
          email: "x@y.com",
          email_verified: true,
          email_verified_at: null,
          email_verified_at_formatted: null,
        },
      });
      await loadStatus();

      const result = await unbindCurrentEmail(); // no code
      expect(result).toBe(false);
      cleanup();
    });

    it("calls unbindEmail and returns true on success when email is not verified", async () => {
      const { unbindCurrentEmail, loadStatus, cleanup } = useEmailVerification();
      const { unbindEmail } = await import("@/api/v1/email");
      vi.mocked(unbindEmail).mockResolvedValue({ success: true });

      // Status: email bound but not verified → unbind_direct path
      mockedGetEmailStatus.mockResolvedValue({
        success: true,
        data: {
          user_id: 1,
          username: "test",
          email: "x@y.com",
          email_verified: false,
          email_verified_at: null,
          email_verified_at_formatted: null,
        },
      });
      await loadStatus();

      const result = await unbindCurrentEmail();
      expect(result).toBe(true);
      cleanup();
    });

    it("returns false and sets error on API failure", async () => {
      const { unbindCurrentEmail, loadStatus, error, cleanup } =
        useEmailVerification();
      const { unbindEmail } = await import("@/api/v1/email");
      vi.mocked(unbindEmail).mockResolvedValue({
        success: false,
        message: "unbind failed",
      });

      mockedGetEmailStatus.mockResolvedValue({
        success: true,
        data: {
          user_id: 1,
          username: "test",
          email: "x@y.com",
          email_verified: false,
          email_verified_at: null,
          email_verified_at_formatted: null,
        },
      });
      await loadStatus();

      const result = await unbindCurrentEmail();
      expect(result).toBe(false);
      expect(error.value).toBe("unbind failed");
      cleanup();
    });
  });

  describe("cancelCurrentAction()", () => {
    it("sets step to 'manage' when email is bound", async () => {
      const { cancelCurrentAction, loadStatus, step, cleanup } =
        useEmailVerification();

      mockedGetEmailStatus.mockResolvedValue({
        success: true,
        data: {
          user_id: 1,
          username: "test",
          email: "x@y.com",
          email_verified: false,
          email_verified_at: null,
          email_verified_at_formatted: null,
        },
      });
      await loadStatus();

      cancelCurrentAction();
      expect(step.value).toBe("manage");
      cleanup();
    });

    it("sets step to 'bind' when no email is bound", async () => {
      const { cancelCurrentAction, loadStatus, step, cleanup } =
        useEmailVerification();

      mockedGetEmailStatus.mockResolvedValue({
        success: true,
        data: {
          user_id: 1,
          username: "test",
          email: null,
          email_verified: false,
          email_verified_at: null,
          email_verified_at_formatted: null,
        },
      });
      await loadStatus();

      cancelCurrentAction();
      expect(step.value).toBe("bind");
      cleanup();
    });

    it("clears form fields and changeToken", async () => {
      const { cancelCurrentAction, loadStatus, newEmailForm, unbindForm, oldEmailForm, changeToken, cleanup } =
        useEmailVerification();

      mockedGetEmailStatus.mockResolvedValue({
        success: true,
        data: {
          user_id: 1,
          username: "test",
          email: null,
          email_verified: false,
          email_verified_at: null,
          email_verified_at_formatted: null,
        },
      });
      await loadStatus();

      newEmailForm.code = "abc";
      unbindForm.code = "def";
      oldEmailForm.code = "ghi";

      cancelCurrentAction();
      expect(newEmailForm.code).toBe("");
      expect(unbindForm.code).toBe("");
      expect(oldEmailForm.code).toBe("");
      expect(changeToken.value).toBeNull();
      cleanup();
    });
  });
});

// -----------------------------------------------------------------------
// Computed properties and additional coverage
// -----------------------------------------------------------------------
describe("useEmailVerification — computed properties", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("currentEmail returns empty string when no email is bound", async () => {
    mockedGetEmailStatus.mockResolvedValue({
      success: true,
      data: {
        user_id: 1, username: "test", email: null,
        email_verified: false, email_verified_at: null, email_verified_at_formatted: null,
      },
    });
    const { currentEmail, loadStatus, cleanup } = useEmailVerification();
    await loadStatus();
    expect(currentEmail.value).toBe("");
    cleanup();
  });

  it("currentEmail returns bound email when present", async () => {
    mockedGetEmailStatus.mockResolvedValue({
      success: true,
      data: {
        user_id: 1, username: "test", email: "user@example.com",
        email_verified: true, email_verified_at: 1000, email_verified_at_formatted: "2024",
      },
    });
    const { currentEmail, loadStatus, cleanup } = useEmailVerification();
    await loadStatus();
    expect(currentEmail.value).toBe("user@example.com");
    cleanup();
  });

  it("hasBoundEmail returns false when no email", async () => {
    mockedGetEmailStatus.mockResolvedValue({
      success: true,
      data: {
        user_id: 1, username: "test", email: null,
        email_verified: false, email_verified_at: null, email_verified_at_formatted: null,
      },
    });
    const { hasBoundEmail, loadStatus, cleanup } = useEmailVerification();
    await loadStatus();
    expect(hasBoundEmail.value).toBe(false);
    cleanup();
  });

  it("hasBoundEmail returns true when email is bound", async () => {
    mockedGetEmailStatus.mockResolvedValue({
      success: true,
      data: {
        user_id: 1, username: "test", email: "user@example.com",
        email_verified: true, email_verified_at: 1000, email_verified_at_formatted: "2024",
      },
    });
    const { hasBoundEmail, loadStatus, cleanup } = useEmailVerification();
    await loadStatus();
    expect(hasBoundEmail.value).toBe(true);
    cleanup();
  });

  it("canVerifyNewCode is false when code is empty", () => {
    const { canVerifyNewCode, newEmailForm, cleanup } = useEmailVerification();
    newEmailForm.code = "";
    expect(canVerifyNewCode.value).toBe(false);
    cleanup();
  });

  it("canVerifyNewCode is true when code is filled", () => {
    const { canVerifyNewCode, newEmailForm, cleanup } = useEmailVerification();
    newEmailForm.code = "123456";
    expect(canVerifyNewCode.value).toBe(true);
    cleanup();
  });
});

// -----------------------------------------------------------------------
// verifyCodeForNewEmail
// -----------------------------------------------------------------------
describe("useEmailVerification — verifyCodeForNewEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockedGetEmailStatus.mockResolvedValue({
      success: true,
      data: {
        user_id: 1, username: "test", email: null,
        email_verified: false, email_verified_at: null, email_verified_at_formatted: null,
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false when email or code is empty", async () => {
    const { verifyCodeForNewEmail, newEmailForm, cleanup } = useEmailVerification();
    newEmailForm.email = "";
    newEmailForm.code = "";
    const result = await verifyCodeForNewEmail();
    expect(result).toBe(false);
    cleanup();
  });

  it("calls verifyEmailCode with email and code", async () => {
    const { verifyCodeForNewEmail, newEmailForm, cleanup } = useEmailVerification();
    newEmailForm.email = "test@example.com";
    newEmailForm.code = "123456";
    vi.mocked(verifyEmailCode).mockResolvedValue({ success: true });
    await verifyCodeForNewEmail();
    expect(vi.mocked(verifyEmailCode)).toHaveBeenCalledWith(
      expect.objectContaining({ email: "test@example.com", code: "123456" })
    );
    cleanup();
  });

  it("returns false when API returns success=false", async () => {
    const { verifyCodeForNewEmail, newEmailForm, cleanup } = useEmailVerification();
    newEmailForm.email = "test@example.com";
    newEmailForm.code = "123456";
    vi.mocked(verifyEmailCode).mockResolvedValue({ success: false, message: "Wrong code" });
    const result = await verifyCodeForNewEmail();
    expect(result).toBe(false);
    cleanup();
  });

  it("returns true and clears code on success", async () => {
    const { verifyCodeForNewEmail, newEmailForm, cleanup } = useEmailVerification();
    newEmailForm.email = "test@example.com";
    newEmailForm.code = "123456";
    vi.mocked(verifyEmailCode).mockResolvedValue({ success: true });
    const result = await verifyCodeForNewEmail();
    expect(result).toBe(true);
    expect(newEmailForm.code).toBe("");
    cleanup();
  });
});
