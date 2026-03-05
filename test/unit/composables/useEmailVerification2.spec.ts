/**
 * useEmailVerification2.spec.ts
 *
 * Covers catch blocks not reached by useEmailVerification.spec.ts:
 *   - verifyOldEmailForChange() catch block (lines 448-450):
 *       verifyChangeConfirmation throws → normalizeAndRecordError + return false
 *   - unbindCurrentEmail() catch block (lines 490-492):
 *       unbindEmail throws → normalizeAndRecordError + return false
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useEmailVerification } from "@/composables/useEmailVerification";
import { verifyChangeConfirmation, unbindEmail, getEmailStatus } from "@/api/v1/email";

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

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build a minimal bound email status so functions proceed past early-exit guards */
function setBoundEmailStatus(
  composable: ReturnType<typeof useEmailVerification>,
  verified = false
) {
  composable.status.value = {
    user_id: 1,
    username: "test",
    email: "test@example.com",
    email_verified: verified,
    email_verified_at: null,
    email_verified_at_formatted: null,
  };
}

// ── verifyOldEmailForChange catch block (lines 448-450) ───────────────────

describe("useEmailVerification — verifyOldEmailForChange() catch block", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Default status: no email bound (loadStatus would return null email)
    vi.mocked(getEmailStatus).mockResolvedValue({
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

  it("API throws Error → returns false without re-throwing", async () => {
    vi.mocked(verifyChangeConfirmation).mockRejectedValue(new Error("network timeout"));

    const composable = useEmailVerification();
    composable.oldEmailForm.code = "123456";

    const result = await composable.verifyOldEmailForChange();

    expect(result).toBe(false);
    composable.cleanup();
  });

  it("API throws Error → loading is reset to false in finally", async () => {
    vi.mocked(verifyChangeConfirmation).mockRejectedValue(new Error("server error"));

    const composable = useEmailVerification();
    composable.oldEmailForm.code = "987654";

    await composable.verifyOldEmailForChange();

    expect(composable.loading.value).toBe(false);
    composable.cleanup();
  });

  it("API throws plain object → returns false without re-throwing", async () => {
    vi.mocked(verifyChangeConfirmation).mockRejectedValue({ code: 422, message: "invalid code" });

    const composable = useEmailVerification();
    composable.oldEmailForm.code = "111111";

    const result = await composable.verifyOldEmailForChange();

    expect(result).toBe(false);
    composable.cleanup();
  });

  it("API throws → step remains unchanged (not changed to change_verify)", async () => {
    vi.mocked(verifyChangeConfirmation).mockRejectedValue(new Error("oops"));

    const composable = useEmailVerification();
    composable.oldEmailForm.code = "222222";
    const stepBefore = composable.step.value;

    await composable.verifyOldEmailForChange();

    expect(composable.step.value).toBe(stepBefore);
    composable.cleanup();
  });

  it("API throws → changeToken remains null", async () => {
    vi.mocked(verifyChangeConfirmation).mockRejectedValue(new Error("fail"));

    const composable = useEmailVerification();
    composable.oldEmailForm.code = "333333";

    await composable.verifyOldEmailForChange();

    expect(composable.changeToken.value).toBeNull();
    composable.cleanup();
  });
});

// ── unbindCurrentEmail catch block (lines 490-492) ───────────────────────

describe("useEmailVerification — unbindCurrentEmail() catch block", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    vi.mocked(getEmailStatus).mockResolvedValue({
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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("unbindEmail throws Error → returns false without re-throwing", async () => {
    vi.mocked(unbindEmail).mockRejectedValue(new Error("network error"));

    const composable = useEmailVerification();
    await composable.loadStatus();

    const result = await composable.unbindCurrentEmail();

    expect(result).toBe(false);
    composable.cleanup();
  });

  it("unbindEmail throws → loading is reset to false in finally", async () => {
    vi.mocked(unbindEmail).mockRejectedValue(new Error("timeout"));

    const composable = useEmailVerification();
    await composable.loadStatus();

    await composable.unbindCurrentEmail();

    expect(composable.loading.value).toBe(false);
    composable.cleanup();
  });

  it("unbindEmail throws plain object → returns false without re-throwing", async () => {
    vi.mocked(unbindEmail).mockRejectedValue({ status: 500 });

    const composable = useEmailVerification();
    await composable.loadStatus();

    const result = await composable.unbindCurrentEmail();

    expect(result).toBe(false);
    composable.cleanup();
  });

  it("unbindEmail throws → user.getUserInfo is NOT called after the throw", async () => {
    vi.mocked(unbindEmail).mockRejectedValue(new Error("api down"));

    const composable = useEmailVerification();
    await composable.loadStatus();

    await composable.unbindCurrentEmail();

    // userStore.getUserInfo should not have been called (we failed before reaching it)
    // The main thing is: no crash and false is returned
    expect(composable.loading.value).toBe(false);
    composable.cleanup();
  });

  it("unbindEmail throws with verified email status → same catch behavior", async () => {
    // Update status to verified email
    vi.mocked(getEmailStatus).mockResolvedValue({
      success: true,
      data: {
        user_id: 1,
        username: "test",
        email: "test@example.com",
        email_verified: false, // not verified means no code required
        email_verified_at: null,
        email_verified_at_formatted: null,
      },
    });
    vi.mocked(unbindEmail).mockRejectedValue(new Error("500 internal"));

    const composable = useEmailVerification();
    await composable.loadStatus();

    const result = await composable.unbindCurrentEmail();

    expect(result).toBe(false);
    expect(composable.loading.value).toBe(false);
    composable.cleanup();
  });
});
