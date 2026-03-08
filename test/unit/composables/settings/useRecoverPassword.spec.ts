import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp, defineComponent } from "vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const mockRequestPasswordReset = vi.fn();
const mockVerifyResetCode = vi.fn();
const mockResetPasswordByCode = vi.fn();

vi.mock("@/api/v1/password", () => ({
  requestPasswordReset: mockRequestPasswordReset,
  verifyResetCode: mockVerifyResetCode,
  resetPasswordByCode: mockResetPasswordByCode,
}));

const mockCreatePasswordFormRules = vi.fn().mockReturnValue([]);
vi.mock("@/utils/password-validator", () => ({
  createPasswordFormRules: mockCreatePasswordFormRules,
}));

const mockElMessage = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
vi.mock("element-plus", () => ({
  ElMessage: mockElMessage,
}));

const mockPush = vi.fn();
const mockRouter = { push: mockPush };

describe("useRecoverPassword", () => {
  const mockGetCurrentBoundEmail = vi.fn();
  const mockGetApiErrorMessage = vi
    .fn()
    .mockImplementation((_result: unknown, fallback: string) => fallback);
  const mockOpenEmailDialog = vi.fn();

  const makeDeps = () => ({
    getCurrentBoundEmail: mockGetCurrentBoundEmail,
    getApiErrorMessage: mockGetApiErrorMessage,
    openEmailDialog: mockOpenEmailDialog,
    router: mockRouter as never,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** Track the mounted app so afterEach can unmount it */
  let _cleanup: (() => void) | null = null;

  afterEach(() => {
    _cleanup?.();
    _cleanup = null;
  });

  const importComposable = async () => {
    const { useRecoverPassword } = await import(
      "@/views/settings/composables/useRecoverPassword"
    );
    return useRecoverPassword;
  };

  /**
   * Mount the composable inside a real Vue component instance so that
   * lifecycle hooks (onUnmounted, watch) are properly associated.
   * The mounted app is cleaned up in the afterEach above.
   */
  const mountComposable = async (deps: ReturnType<typeof makeDeps>) => {
    const useRecoverPassword = await importComposable();
    let result!: ReturnType<typeof useRecoverPassword>;
    const app = createApp(
      defineComponent({
        setup() {
          result = useRecoverPassword(deps);
          return {};
        },
        render: () => null as unknown as ReturnType<typeof defineComponent>,
      })
    );
    app.mount(document.createElement("div"));
    _cleanup = () => app.unmount();
    return result;
  };

  describe("initial state", () => {
    it("starts with dialogRecoverVisible = false", async () => {
      const { dialogRecoverVisible } = await mountComposable(makeDeps());
      expect(dialogRecoverVisible.value).toBe(false);
    });

    it("starts with recoverCodeVerified = false", async () => {
      const { recoverCodeVerified } = await mountComposable(makeDeps());
      expect(recoverCodeVerified.value).toBe(false);
    });

    it("starts with zero cooldown", async () => {
      const { recoverCooldownSeconds } = await mountComposable(makeDeps());
      expect(recoverCooldownSeconds.value).toBe(0);
    });
  });

  describe("openRecoverDialog", () => {
    it("opens dialog with bound email", async () => {
      mockGetCurrentBoundEmail.mockResolvedValue("user@example.com");
      const { openRecoverDialog, dialogRecoverVisible, recoverForm } =
        await mountComposable(makeDeps());

      await openRecoverDialog();

      expect(dialogRecoverVisible.value).toBe(true);
      expect(recoverForm.value.email).toBe("user@example.com");
    });

    it("opens email bind dialog when no email bound", async () => {
      mockGetCurrentBoundEmail.mockResolvedValue("");
      const { openRecoverDialog, dialogRecoverVisible } =
        await mountComposable(makeDeps());

      await openRecoverDialog();

      expect(dialogRecoverVisible.value).toBe(false);
      expect(mockOpenEmailDialog).toHaveBeenCalledWith("bind");
      expect(mockElMessage.warning).toHaveBeenCalled();
    });
  });

  describe("handleRecoverSendEmail", () => {
    it("sends reset email and starts cooldown on success", async () => {
      vi.useFakeTimers();
      mockRequestPasswordReset.mockResolvedValue({
        success: true,
        message: "Sent",
      });
      const { handleRecoverSendEmail, recoverForm, recoverCooldownSeconds } =
        await mountComposable(makeDeps());

      recoverForm.value.email = "user@example.com";
      await handleRecoverSendEmail();

      expect(mockRequestPasswordReset).toHaveBeenCalledWith("user@example.com");
      expect(mockElMessage.success).toHaveBeenCalledWith("Sent");
      expect(recoverCooldownSeconds.value).toBe(60);
      vi.useRealTimers();
    });

    it("shows warning when email is missing", async () => {
      const { handleRecoverSendEmail } = await mountComposable(makeDeps());

      await handleRecoverSendEmail();
      expect(mockElMessage.warning).toHaveBeenCalled();
      expect(mockRequestPasswordReset).not.toHaveBeenCalled();
    });

    it("shows error when API fails", async () => {
      mockRequestPasswordReset.mockResolvedValue({ success: false });
      const { handleRecoverSendEmail, recoverForm } =
        await mountComposable(makeDeps());

      recoverForm.value.email = "user@example.com";
      await handleRecoverSendEmail();

      expect(mockElMessage.error).toHaveBeenCalled();
    });

    it("shows error on network failure", async () => {
      mockRequestPasswordReset.mockRejectedValue(new Error("network"));
      const { handleRecoverSendEmail, recoverForm } =
        await mountComposable(makeDeps());

      recoverForm.value.email = "user@example.com";
      await handleRecoverSendEmail();

      expect(mockElMessage.error).toHaveBeenCalled();
    });
  });

  describe("handleRecoverVerifyCode", () => {
    it("sets recoverCodeVerified on success", async () => {
      mockVerifyResetCode.mockResolvedValue({
        success: true,
        message: "Verified",
      });
      const {
        handleRecoverVerifyCode,
        recoverForm,
        recoverFormRef,
        recoverCodeVerified,
      } = await mountComposable(makeDeps());

      recoverForm.value.email = "user@example.com";
      recoverForm.value.code = "123456";
      recoverFormRef.value = {
        validateField: vi.fn().mockResolvedValue(true),
        clearValidate: vi.fn(),
      } as never;

      await handleRecoverVerifyCode();

      expect(recoverCodeVerified.value).toBe(true);
      expect(mockElMessage.success).toHaveBeenCalledWith("Verified");
    });

    it("keeps recoverCodeVerified=false on verification failure", async () => {
      mockVerifyResetCode.mockResolvedValue({ success: false });
      const {
        handleRecoverVerifyCode,
        recoverForm,
        recoverFormRef,
        recoverCodeVerified,
      } = await mountComposable(makeDeps());

      recoverForm.value.email = "user@example.com";
      recoverForm.value.code = "000000";
      recoverFormRef.value = {
        validateField: vi.fn().mockResolvedValue(true),
        clearValidate: vi.fn(),
      } as never;

      await handleRecoverVerifyCode();

      expect(recoverCodeVerified.value).toBe(false);
      expect(mockElMessage.error).toHaveBeenCalled();
    });

    it("shows warning when email is missing", async () => {
      const { handleRecoverVerifyCode } = await mountComposable(makeDeps());

      await handleRecoverVerifyCode();
      expect(mockElMessage.warning).toHaveBeenCalled();
    });
  });

  describe("handleRecoverResetPassword", () => {
    it("navigates to logout on success", async () => {
      mockResetPasswordByCode.mockResolvedValue({
        success: true,
        message: "Reset",
      });
      const {
        handleRecoverResetPassword,
        recoverForm,
        recoverFormRef,
        recoverCodeVerified,
        dialogRecoverVisible,
      } = await mountComposable(makeDeps());

      recoverForm.value.email = "user@example.com";
      recoverForm.value.code = "123456";
      recoverForm.value.password = "newPass123";
      recoverCodeVerified.value = true;

      recoverFormRef.value = {
        validateField: vi.fn().mockResolvedValue(true),
        clearValidate: vi.fn(),
      } as never;

      await handleRecoverResetPassword();

      expect(mockResetPasswordByCode).toHaveBeenCalledWith(
        "user@example.com",
        "123456",
        "newPass123"
      );
      expect(mockElMessage.success).toHaveBeenCalledWith("Reset");
      expect(dialogRecoverVisible.value).toBe(false);
      expect(mockPush).toHaveBeenCalledWith("/site/logout");
    });

    it("shows warning when code not verified", async () => {
      const { handleRecoverResetPassword, recoverForm } =
        await mountComposable(makeDeps());

      recoverForm.value.email = "user@example.com";
      // recoverCodeVerified is false by default

      await handleRecoverResetPassword();
      expect(mockElMessage.warning).toHaveBeenCalled();
      expect(mockResetPasswordByCode).not.toHaveBeenCalled();
    });
  });

  describe("resetRecoverForm", () => {
    it("clears form fields and resets verification", async () => {
      const {
        resetRecoverForm,
        recoverForm,
        recoverCodeVerified,
        recoverFormRef,
      } = await mountComposable(makeDeps());

      recoverForm.value.code = "123456";
      recoverForm.value.password = "pass";
      recoverForm.value.checkPassword = "pass";
      recoverCodeVerified.value = true;
      recoverFormRef.value = { clearValidate: vi.fn() } as never;

      resetRecoverForm();

      expect(recoverForm.value.code).toBe("");
      expect(recoverForm.value.password).toBe("");
      expect(recoverForm.value.checkPassword).toBe("");
      expect(recoverCodeVerified.value).toBe(false);
    });
  });

  describe("canSendRecoverCode", () => {
    it("is true when not sending and no cooldown", async () => {
      const { canSendRecoverCode } = await mountComposable(makeDeps());
      expect(canSendRecoverCode.value).toBe(true);
    });
  });

  describe("cooldown timer", () => {
    it("decrements cooldown each second", async () => {
      vi.useFakeTimers();
      mockRequestPasswordReset.mockResolvedValue({
        success: true,
        message: "",
      });
      const { handleRecoverSendEmail, recoverForm, recoverCooldownSeconds } =
        await mountComposable(makeDeps());

      recoverForm.value.email = "test@test.com";
      await handleRecoverSendEmail();
      expect(recoverCooldownSeconds.value).toBe(60);

      vi.advanceTimersByTime(1000);
      expect(recoverCooldownSeconds.value).toBe(59);

      vi.advanceTimersByTime(59000);
      expect(recoverCooldownSeconds.value).toBe(0);
      vi.useRealTimers();
    });
  });
});
