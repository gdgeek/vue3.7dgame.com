/**
 * Unit tests for src/composables/useEmailVerification.ts (part 3)
 *
 * Covers the following previously-uncovered lines:
 *   - Lines 33-34: parseApiError with non-object/falsy input → returns fallback
 *   - Lines 48-49: parseApiError with raw.data.error → returns that error
 *   - Lines 56-61: parseApiError with raw.data.code/message
 *   - Lines 172-177: token timer expiry when step="change_verify"
 *   - Lines 204-207: isCurrentEmailVerified from userStore.userInfo
 *   - Lines 257-259: loadStatus failure (response.success=false)
 *   - Lines 279-280: loadStatus catch block
 *   - Lines 290-291: refreshSendCooldown early return when !success
 *   - Lines 306-307: sendCodeForNewEmail failure (response.success=false)
 *   - Lines 315-317: sendCodeForNewEmail success path (refreshSendCooldown + default cooldown)
 *   - Lines 326-330: sendCodeForNewEmail catch block with RATE_LIMIT_EXCEEDED
 *   - Line 352: verifyCodeForNewEmail with change_token spread
 *   - Lines 397-398: sendOldEmailConfirmationCode guard
 *   - Line 464: startUnbindFlow when email not verified
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sendVerificationCode,
  verifyEmailCode,
  getEmailStatus,
  getEmailCooldown,
  sendChangeConfirmation,
  verifyChangeConfirmation,
  unbindEmail,
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

const mockUserStore3 = {
  userInfo: null as null | { id?: number; userData?: Record<string, unknown> },
  getUserInfo: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/store/modules/user", () => ({
  useUserStore: () => mockUserStore3,
}));

const mockedGetEmailStatus = vi.mocked(getEmailStatus);
const mockedSendVerificationCode = vi.mocked(sendVerificationCode);
const mockedGetEmailCooldown = vi.mocked(getEmailCooldown);
const mockedVerifyEmailCode = vi.mocked(verifyEmailCode);
const mockedSendChangeConfirmation = vi.mocked(sendChangeConfirmation);
const mockedVerifyChangeConfirmation = vi.mocked(verifyChangeConfirmation);

import { useEmailVerification } from "@/composables/useEmailVerification";

// ── Shared email status responses ────────────────────────────────────────────

const boundEmailStatus = {
  success: true as const,
  data: {
    user_id: 1,
    username: "test",
    email: "old@example.com",
    email_verified: true,
    email_verified_at: "2025-01-01",
    email_verified_at_formatted: "2025-01-01",
  },
};

const unboundEmailStatus = {
  success: true as const,
  data: {
    user_id: 1,
    username: "test",
    email: null,
    email_verified: false,
    email_verified_at: null,
    email_verified_at_formatted: null,
  },
};

describe("useEmailVerification (part 3) — uncovered paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockUserStore3.userInfo = null;
    mockUserStore3.getUserInfo = vi.fn().mockResolvedValue(undefined);
    mockedGetEmailStatus.mockResolvedValue(unboundEmailStatus);
    mockedGetEmailCooldown.mockResolvedValue({ success: true, data: { can_send: true, retry_after: 0 } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── parseApiError branches (via normalizeAndRecordError in catch blocks) ──

  describe("parseApiError — non-object input (lines 33-34)", () => {
    it("loadStatus catch with null → error = fallback message '请求失败'", async () => {
      mockedGetEmailStatus.mockRejectedValue(null);
      const { loadStatus, error } = useEmailVerification();

      await loadStatus();

      expect(error.value).toBe("请求失败");
    });

    it("loadStatus catch with string → error = fallback message '请求失败'", async () => {
      mockedGetEmailStatus.mockRejectedValue("just a string");
      const { loadStatus, error } = useEmailVerification();

      await loadStatus();

      expect(error.value).toBe("请求失败");
    });

    it("loadStatus catch with number → error = fallback message", async () => {
      mockedGetEmailStatus.mockRejectedValue(42);
      const { loadStatus, error } = useEmailVerification();

      await loadStatus();

      expect(error.value).toBe("请求失败");
    });

    it("loadStatus catch with undefined → error = fallback message", async () => {
      mockedGetEmailStatus.mockRejectedValue(undefined);
      const { loadStatus, error } = useEmailVerification();

      await loadStatus();

      expect(error.value).toBe("请求失败");
    });
  });

  describe("parseApiError — raw.data.error path (lines 48-49)", () => {
    it("sendCodeForNewEmail catch with { data: { error: { code, message } } } → uses error", async () => {
      mockedSendVerificationCode.mockRejectedValue({
        data: { error: { code: "AUTH_ERROR", message: "Unauthorized" } },
      });

      const { sendCodeForNewEmail, newEmailForm, error } = useEmailVerification();
      newEmailForm.email = "test@example.com";

      await sendCodeForNewEmail();

      expect(error.value).toBe("Unauthorized");
    });

    it("verifyOldEmail catch with { data: { error: { code, message } } } → uses error message", async () => {
      mockedVerifyChangeConfirmation.mockRejectedValue({
        data: { error: { code: "INVALID_CODE", message: "Code is wrong" } },
      });

      const { verifyOldEmailForChange, oldEmailForm, error } = useEmailVerification();
      oldEmailForm.code = "123456";

      await verifyOldEmailForChange();

      expect(error.value).toBe("Code is wrong");
    });
  });

  describe("parseApiError — raw.data.code/message path (lines 56-61)", () => {
    it("loadStatus catch with { data: { code, message } } → uses those values", async () => {
      mockedGetEmailStatus.mockRejectedValue({
        data: { code: "RATE_LIMIT", message: "Too many requests" },
      });

      const { loadStatus, error } = useEmailVerification();
      await loadStatus();

      expect(error.value).toBe("Too many requests");
    });

    it("loadStatus catch with { data: { code, message, retry_after } } → sets retry_after in lock timer for ACCOUNT_LOCKED", async () => {
      mockedGetEmailStatus.mockRejectedValue({
        data: { code: "ACCOUNT_LOCKED", message: "Account locked", retry_after: 60 },
      });

      const { loadStatus, isLocked, lockTime } = useEmailVerification();
      await loadStatus();

      // ACCOUNT_LOCKED + retry_after → startCountdown(lockTime, 60, "lock")
      expect(isLocked.value).toBe(true);
      expect(lockTime.value).toBe(60);
    });

    it("loadStatus catch with { data: { code } } only (no message) → uses fallback", async () => {
      mockedGetEmailStatus.mockRejectedValue({
        data: { code: "UNKNOWN_CODE" },
      });

      const { loadStatus, error } = useEmailVerification();
      await loadStatus();

      // message is undefined → uses fallback
      expect(error.value).toBeTruthy();
    });

    it("loadStatus catch with { data: { message } } only (no code) → uses UNKNOWN code", async () => {
      mockedGetEmailStatus.mockRejectedValue({
        data: { message: "Something went wrong" },
      });

      const { loadStatus, error } = useEmailVerification();
      await loadStatus();

      expect(error.value).toBe("Something went wrong");
    });
  });

  // ── Token timer expiry when step="change_verify" (lines 172-177) ────────

  describe("token timer expiry with step=change_verify (lines 172-177)", () => {
    it("token countdown expires when step=change_verify → step becomes manage", async () => {
      // Set up verified email so startChangeFlow → change_confirm
      mockedGetEmailStatus.mockResolvedValue(boundEmailStatus);
      mockedVerifyChangeConfirmation.mockResolvedValue({
        success: true,
        data: { change_token: "tok123", expires_in: 1 }, // 1 second
      });

      const { loadStatus, verifyOldEmailForChange, oldEmailForm, step, changeToken } = useEmailVerification();

      await loadStatus();
      expect(step.value).toBe("manage");

      // Simulate verifyOldEmailForChange → sets changeToken + step=change_verify
      oldEmailForm.code = "123456";
      await verifyOldEmailForChange();
      expect(step.value).toBe("change_verify");
      expect(changeToken.value).toBe("tok123");

      // Advance 1 second → token timer fires → token expired
      await vi.advanceTimersByTimeAsync(1000);

      // step should revert to manage
      expect(step.value).toBe("manage");
      // error should be set
      expect(changeToken.value).toBeNull();
    });

    it("token countdown expires when step!=change_verify → step unchanged", async () => {
      mockedGetEmailStatus.mockResolvedValue(boundEmailStatus);
      mockedVerifyChangeConfirmation.mockResolvedValue({
        success: true,
        data: { change_token: "tok456", expires_in: 1 },
      });

      const { loadStatus, verifyOldEmailForChange, oldEmailForm, step, cancelCurrentAction } =
        useEmailVerification();

      await loadStatus();

      oldEmailForm.code = "654321";
      await verifyOldEmailForChange();
      expect(step.value).toBe("change_verify");

      // Navigate away from change_verify
      cancelCurrentAction();
      expect(step.value).toBe("manage");

      // Token timer fires (step != change_verify)
      await vi.advanceTimersByTimeAsync(1000);

      // step stays manage
      expect(step.value).toBe("manage");
    });
  });

  // ── isCurrentEmailVerified from userStore (lines 204-207) ────────────────

  describe("isCurrentEmailVerified from userStore.userInfo (lines 204-207)", () => {
    it("email_verified is not boolean → falls back to userData.emailVerified", async () => {
      // email_verified is not boolean in the status response (null/undefined)
      mockedGetEmailStatus.mockResolvedValue({
        success: true,
        data: {
          user_id: 1,
          username: "test",
          email: "test@example.com",
          email_verified: null as unknown as boolean, // not boolean
          email_verified_at: null,
          email_verified_at_formatted: null,
        },
      });

      mockUserStore3.userInfo = { id: 1, userData: { emailVerified: true } };

      const { loadStatus, isCurrentEmailVerified } = useEmailVerification();
      await loadStatus();

      // typeof null !== "boolean" → goes to fallback
      expect(isCurrentEmailVerified.value).toBe(true);
    });

    it("email_verified is not boolean → falls back to userData.emailBind", async () => {
      mockedGetEmailStatus.mockResolvedValue({
        success: true,
        data: {
          user_id: 1,
          username: "test",
          email: "test@example.com",
          email_verified: undefined as unknown as boolean,
          email_verified_at: null,
          email_verified_at_formatted: null,
        },
      });

      mockUserStore3.userInfo = { id: 1, userData: { emailBind: true } };

      const { loadStatus, isCurrentEmailVerified } = useEmailVerification();
      await loadStatus();

      expect(isCurrentEmailVerified.value).toBe(true);
    });

    it("email_verified not boolean and userData undefined → isCurrentEmailVerified=false", async () => {
      mockedGetEmailStatus.mockResolvedValue({
        success: true,
        data: {
          user_id: 1,
          username: "test",
          email: "test@example.com",
          email_verified: null as unknown as boolean,
          email_verified_at: null,
          email_verified_at_formatted: null,
        },
      });

      mockUserStore3.userInfo = { id: 1, userData: {} };

      const { loadStatus, isCurrentEmailVerified } = useEmailVerification();
      await loadStatus();

      expect(isCurrentEmailVerified.value).toBe(false);
    });
  });

  // ── loadStatus failure paths (lines 257-259, 279-280) ────────────────────

  describe("loadStatus failure (lines 257-259)", () => {
    it("response.success=false → error set and returns false", async () => {
      mockedGetEmailStatus.mockResolvedValue({
        success: false,
        data: null as unknown as ReturnType<typeof unboundEmailStatus.data>,
        message: "Server error",
      });

      const { loadStatus, error } = useEmailVerification();
      const result = await loadStatus();

      expect(result).toBe(false);
      expect(error.value).toBe("Server error");
    });

    it("response.data=null → error set with fallback message", async () => {
      mockedGetEmailStatus.mockResolvedValue({
        success: true,
        data: null as unknown as ReturnType<typeof unboundEmailStatus.data>,
      });

      const { loadStatus, error } = useEmailVerification();
      const result = await loadStatus();

      expect(result).toBe(false);
      expect(error.value).toBeTruthy();
    });

    it("loading is reset to false after failure", async () => {
      mockedGetEmailStatus.mockResolvedValue({
        success: false,
        data: null as unknown as ReturnType<typeof unboundEmailStatus.data>,
      });

      const { loadStatus, loading } = useEmailVerification();
      await loadStatus();

      expect(loading.value).toBe(false);
    });
  });

  describe("loadStatus catch block (lines 279-280)", () => {
    it("getEmailStatus throws Error → returns false", async () => {
      mockedGetEmailStatus.mockRejectedValue(new Error("network error"));
      const { loadStatus } = useEmailVerification();

      const result = await loadStatus();

      expect(result).toBe(false);
    });

    it("getEmailStatus throws → loading reset to false", async () => {
      mockedGetEmailStatus.mockRejectedValue(new Error("timeout"));
      const { loadStatus, loading } = useEmailVerification();

      await loadStatus();

      expect(loading.value).toBe(false);
    });
  });

  // ── refreshSendCooldown early return (lines 290-291) ─────────────────────

  describe("refreshSendCooldown early return (lines 290-291)", () => {
    it("getEmailCooldown returns success=false → no countdown started", async () => {
      mockedGetEmailCooldown.mockResolvedValue({
        success: false,
        data: null as unknown as { can_send: boolean; retry_after: number },
      });

      const { refreshSendCooldown, sendCooldown } = useEmailVerification();
      await refreshSendCooldown("test@example.com");

      // No countdown started since response.success=false
      expect(sendCooldown.value).toBe(0);
    });

    it("getEmailCooldown returns success=true but data=null → returns early", async () => {
      mockedGetEmailCooldown.mockResolvedValue({
        success: true,
        data: null as unknown as { can_send: boolean; retry_after: number },
      });

      const { refreshSendCooldown, sendCooldown } = useEmailVerification();
      await refreshSendCooldown("test@example.com");

      expect(sendCooldown.value).toBe(0);
    });
  });

  // ── sendCodeForNewEmail failure (lines 306-307) ───────────────────────────

  describe("sendCodeForNewEmail response.success=false (lines 306-307)", () => {
    it("returns false and sets error when response.success=false", async () => {
      mockedSendVerificationCode.mockResolvedValue({
        success: false,
        message: "Email already bound",
      });

      const { sendCodeForNewEmail, newEmailForm, error } = useEmailVerification();
      newEmailForm.email = "test@example.com";

      const result = await sendCodeForNewEmail();

      expect(result).toBe(false);
      expect(error.value).toBe("Email already bound");
    });

    it("error uses fallback message when response.message is missing", async () => {
      mockedSendVerificationCode.mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof sendVerificationCode>>);

      const { sendCodeForNewEmail, newEmailForm, error } = useEmailVerification();
      newEmailForm.email = "test@example.com";

      await sendCodeForNewEmail();

      expect(error.value).toBeTruthy();
    });

    it("loading reset to false after failure response", async () => {
      mockedSendVerificationCode.mockResolvedValue({ success: false });

      const { sendCodeForNewEmail, newEmailForm, loading } = useEmailVerification();
      newEmailForm.email = "test@example.com";

      await sendCodeForNewEmail();

      expect(loading.value).toBe(false);
    });
  });

  // ── sendCodeForNewEmail success (lines 315-317 — after refreshSendCooldown) ──

  describe("sendCodeForNewEmail success → refreshSendCooldown + default countdown (lines 319-322)", () => {
    it("sendCooldown stays at DEFAULT_SEND_COOLDOWN_SECONDS when can_send=true", async () => {
      mockedSendVerificationCode.mockResolvedValue({ success: true });
      // refreshSendCooldown: can_send=true → starts countdown with 0
      mockedGetEmailCooldown.mockResolvedValue({
        success: true,
        data: { can_send: true, retry_after: 0 },
      });

      const { sendCodeForNewEmail, newEmailForm, sendCooldown } = useEmailVerification();
      newEmailForm.email = "test@example.com";

      await sendCodeForNewEmail();

      // can_send=true → startCountdown(0) → sendCooldown.value=0
      // then: if (sendCooldown.value === 0) → startCountdown(60, "send")
      expect(sendCooldown.value).toBe(60);
    });

    it("sendCooldown uses server retry_after when can_send=false", async () => {
      mockedSendVerificationCode.mockResolvedValue({ success: true });
      mockedGetEmailCooldown.mockResolvedValue({
        success: true,
        data: { can_send: false, retry_after: 45 },
      });

      const { sendCodeForNewEmail, newEmailForm, sendCooldown } = useEmailVerification();
      newEmailForm.email = "test@example.com";

      await sendCodeForNewEmail();

      // can_send=false → startCountdown(45, "send") → sendCooldown=45
      // since sendCooldown != 0, no default countdown
      expect(sendCooldown.value).toBe(45);
    });

    it("send returns true on success", async () => {
      mockedSendVerificationCode.mockResolvedValue({ success: true });
      mockedGetEmailCooldown.mockResolvedValue({ success: true, data: { can_send: true, retry_after: 0 } });

      const { sendCodeForNewEmail, newEmailForm } = useEmailVerification();
      newEmailForm.email = "test@example.com";

      const result = await sendCodeForNewEmail();

      expect(result).toBe(true);
    });
  });

  // ── sendCodeForNewEmail catch block (lines 326-330) ──────────────────────

  describe("sendCodeForNewEmail catch block (lines 326-330)", () => {
    it("RATE_LIMIT_EXCEEDED with retry_after → startCountdown(retry_after)", async () => {
      mockedSendVerificationCode.mockRejectedValue({
        data: { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too fast", retry_after: 30 } },
      });

      const { sendCodeForNewEmail, newEmailForm, sendCooldown } = useEmailVerification();
      newEmailForm.email = "test@example.com";

      await sendCodeForNewEmail();

      expect(sendCooldown.value).toBe(30);
    });

    it("RATE_LIMIT_EXCEEDED without retry_after → no countdown", async () => {
      mockedSendVerificationCode.mockRejectedValue({
        data: { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too fast" } },
      });

      const { sendCodeForNewEmail, newEmailForm, sendCooldown } = useEmailVerification();
      newEmailForm.email = "test@example.com";

      await sendCodeForNewEmail();

      expect(sendCooldown.value).toBe(0);
    });

    it("other error → returns false", async () => {
      mockedSendVerificationCode.mockRejectedValue(new Error("network"));

      const { sendCodeForNewEmail, newEmailForm } = useEmailVerification();
      newEmailForm.email = "test@example.com";

      const result = await sendCodeForNewEmail();

      expect(result).toBe(false);
    });

    it("loading is false after catch", async () => {
      mockedSendVerificationCode.mockRejectedValue(new Error("timeout"));

      const { sendCodeForNewEmail, newEmailForm, loading } = useEmailVerification();
      newEmailForm.email = "test@example.com";

      await sendCodeForNewEmail();

      expect(loading.value).toBe(false);
    });
  });

  // ── verifyCodeForNewEmail with change_token spread (line 352) ────────────

  describe("verifyCodeForNewEmail with change_token (line 352)", () => {
    it("step=change_verify + changeToken set → payload includes change_token", async () => {
      mockedVerifyEmailCode.mockResolvedValue({
        success: true,
        data: { message: "ok" } as unknown as any,
      });
      mockedGetEmailStatus.mockResolvedValue(unboundEmailStatus);

      const { verifyCodeForNewEmail, newEmailForm, step, changeToken } =
        useEmailVerification();

      // Manually set step and changeToken (simulating verifyOldEmailForChange success)
      step.value = "change_verify";
      changeToken.value = "myChangeToken";
      newEmailForm.email = "new@example.com";
      newEmailForm.code = "123456";

      await verifyCodeForNewEmail();

      expect(mockedVerifyEmailCode).toHaveBeenCalledWith(
        expect.objectContaining({ change_token: "myChangeToken" })
      );
    });

    it("step!=change_verify → no change_token in payload", async () => {
      mockedVerifyEmailCode.mockResolvedValue({
        success: true,
        data: {} as any,
      });
      mockedGetEmailStatus.mockResolvedValue(unboundEmailStatus);

      const { verifyCodeForNewEmail, newEmailForm, step } = useEmailVerification();

      step.value = "bind"; // not change_verify
      newEmailForm.email = "new@example.com";
      newEmailForm.code = "654321";

      await verifyCodeForNewEmail();

      const callArg = mockedVerifyEmailCode.mock.calls[0]?.[0];
      expect(callArg).not.toHaveProperty("change_token");
    });
  });

  // ── sendOldEmailConfirmationCode guard (lines 397-398) ───────────────────

  describe("sendOldEmailConfirmationCode guard (lines 397-398)", () => {
    it("returns false when loading=true (canSendOldConfirmCode=false)", async () => {
      const { sendOldEmailConfirmationCode, loading } = useEmailVerification();

      // Set loading to true to disable send
      loading.value = true;

      const result = await sendOldEmailConfirmationCode();

      expect(result).toBe(false);
      expect(mockedSendChangeConfirmation).not.toHaveBeenCalled();
    });

    it("returns false when oldConfirmCooldown > 0", async () => {
      const { sendOldEmailConfirmationCode, oldConfirmCooldown } =
        useEmailVerification();

      // Set cooldown to non-zero
      oldConfirmCooldown.value = 30;

      const result = await sendOldEmailConfirmationCode();

      expect(result).toBe(false);
      expect(mockedSendChangeConfirmation).not.toHaveBeenCalled();
    });
  });

  // ── startUnbindFlow with unverified email (line 464) ─────────────────────

  describe("startUnbindFlow - unbind_direct path (line 464)", () => {
    it("email bound but NOT verified → step becomes unbind_direct", async () => {
      // email bound but email_verified=false
      mockedGetEmailStatus.mockResolvedValue({
        success: true,
        data: {
          user_id: 1,
          username: "test",
          email: "test@example.com",
          email_verified: false,
          email_verified_at: null,
          email_verified_at_formatted: null,
        },
      });

      const { loadStatus, startUnbindFlow, step } = useEmailVerification();
      await loadStatus();

      expect(step.value).toBe("manage");

      startUnbindFlow();

      expect(step.value).toBe("unbind_direct");
    });

    it("email bound and verified → step becomes unbind_confirm", async () => {
      mockedGetEmailStatus.mockResolvedValue(boundEmailStatus);

      const { loadStatus, startUnbindFlow, step } = useEmailVerification();
      await loadStatus();

      startUnbindFlow();

      expect(step.value).toBe("unbind_confirm");
    });
  });
});
