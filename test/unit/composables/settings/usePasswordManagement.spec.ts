import { describe, it, expect, vi, beforeEach } from "vitest";

/** Flush all pending microtasks / Promise chains */
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const mockChangePassword = vi.fn();
vi.mock("@/api/v1/password", () => ({
  changePassword: mockChangePassword,
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

describe("usePasswordManagement", () => {
  const mockCheckCurrentEmailVerified = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const importComposable = async () => {
    const { usePasswordManagement } = await import(
      "@/views/settings/composables/usePasswordManagement"
    );
    return usePasswordManagement;
  };

  it("initializes with dialogPasswordVisible = false", async () => {
    const usePasswordManagement = await importComposable();
    const { dialogPasswordVisible } = usePasswordManagement({
      checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
      router: mockRouter as never,
    });
    expect(dialogPasswordVisible.value).toBe(false);
  });

  it("initializes with empty password form", async () => {
    const usePasswordManagement = await importComposable();
    const { passwordForm } = usePasswordManagement({
      checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
      router: mockRouter as never,
    });
    expect(passwordForm.value.oldPassword).toBeNull();
    expect(passwordForm.value.password).toBeNull();
    expect(passwordForm.value.checkPassword).toBeNull();
  });

  describe("openPasswordDialog", () => {
    it("opens dialog when email is verified", async () => {
      mockCheckCurrentEmailVerified.mockResolvedValue(true);
      const usePasswordManagement = await importComposable();
      const { dialogPasswordVisible, openPasswordDialog } =
        usePasswordManagement({
          checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
          router: mockRouter as never,
        });

      openPasswordDialog();
      await flushPromises();
      expect(dialogPasswordVisible.value).toBe(true);
    });

    it("shows warning when email not verified", async () => {
      mockCheckCurrentEmailVerified.mockResolvedValue(false);
      const usePasswordManagement = await importComposable();
      const { dialogPasswordVisible, openPasswordDialog } =
        usePasswordManagement({
          checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
          router: mockRouter as never,
        });

      openPasswordDialog();
      await flushPromises();
      expect(dialogPasswordVisible.value).toBe(false);
      expect(mockElMessage.warning).toHaveBeenCalled();
    });
  });

  describe("resetPasswordForm", () => {
    it("clears all password fields", async () => {
      const usePasswordManagement = await importComposable();
      const { passwordForm, passwordFormRef, resetPasswordForm } =
        usePasswordManagement({
          checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
          router: mockRouter as never,
        });

      passwordForm.value.oldPassword = "old";
      passwordForm.value.password = "new";
      passwordForm.value.checkPassword = "new";
      passwordFormRef.value = { clearValidate: vi.fn() } as never;

      resetPasswordForm();

      expect(passwordForm.value.oldPassword).toBeNull();
      expect(passwordForm.value.password).toBeNull();
      expect(passwordForm.value.checkPassword).toBeNull();
    });
  });

  describe("submitPasswordChange", () => {
    it("calls changePassword API on valid form with verified email", async () => {
      mockCheckCurrentEmailVerified.mockResolvedValue(true);
      mockChangePassword.mockResolvedValue({ success: true, message: "ok" });

      const usePasswordManagement = await importComposable();
      const { passwordForm, passwordFormRef, submitPasswordChange } =
        usePasswordManagement({
          checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
          router: mockRouter as never,
        });

      passwordForm.value.oldPassword = "oldPass";
      passwordForm.value.password = "newPass123";
      passwordForm.value.checkPassword = "newPass123";

      passwordFormRef.value = {
        validate: vi
          .fn()
          .mockImplementation((cb: (valid: boolean) => void) => cb(true)),
      } as never;

      submitPasswordChange();
      await flushPromises();

      expect(mockChangePassword).toHaveBeenCalledWith(
        "oldPass",
        "newPass123",
        "newPass123"
      );
      expect(mockElMessage.success).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/site/logout");
    });

    it("shows error when form is invalid", async () => {
      const usePasswordManagement = await importComposable();
      const { passwordFormRef, submitPasswordChange } = usePasswordManagement({
        checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
        router: mockRouter as never,
      });

      passwordFormRef.value = {
        validate: vi
          .fn()
          .mockImplementation((cb: (valid: boolean) => void) => cb(false)),
      } as never;

      submitPasswordChange();
      expect(mockElMessage.error).toHaveBeenCalled();
    });

    it("shows error when API returns failure", async () => {
      mockCheckCurrentEmailVerified.mockResolvedValue(true);
      mockChangePassword.mockResolvedValue({
        success: false,
        error: { message: "Wrong password" },
      });

      const usePasswordManagement = await importComposable();
      const { passwordFormRef, submitPasswordChange } = usePasswordManagement({
        checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
        router: mockRouter as never,
      });

      passwordFormRef.value = {
        validate: vi
          .fn()
          .mockImplementation((cb: (valid: boolean) => void) => cb(true)),
      } as never;

      submitPasswordChange();
      await flushPromises();
      expect(mockElMessage.error).toHaveBeenCalledWith("Wrong password");
    });

    it("shows error when API returns failure with no error.message (uses fallback i18n key)", async () => {
      mockCheckCurrentEmailVerified.mockResolvedValue(true);
      mockChangePassword.mockResolvedValue({ success: false });

      const usePasswordManagement = await importComposable();
      const { passwordFormRef, submitPasswordChange } = usePasswordManagement({
        checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
        router: mockRouter as never,
      });

      passwordFormRef.value = {
        validate: vi.fn().mockImplementation((cb: (v: boolean) => void) => cb(true)),
      } as never;

      submitPasswordChange();
      await flushPromises();
      expect(mockElMessage.error).toHaveBeenCalled();
    });

    it("shows error when email not verified inside submit (line 131-133)", async () => {
      mockCheckCurrentEmailVerified.mockResolvedValue(false);

      const usePasswordManagement = await importComposable();
      const { passwordFormRef, submitPasswordChange } = usePasswordManagement({
        checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
        router: mockRouter as never,
      });

      passwordFormRef.value = {
        validate: vi.fn().mockImplementation((cb: (v: boolean) => void) => cb(true)),
      } as never;

      submitPasswordChange();
      await flushPromises();
      expect(mockElMessage.error).toHaveBeenCalled();
      expect(mockChangePassword).not.toHaveBeenCalled();
    });

    it("shows error and resets passwordSubmitting when API throws (catch branch line 151)", async () => {
      mockCheckCurrentEmailVerified.mockResolvedValue(true);
      mockChangePassword.mockRejectedValue(new Error("network error"));

      const usePasswordManagement = await importComposable();
      const { passwordFormRef, passwordSubmitting, submitPasswordChange } =
        usePasswordManagement({
          checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
          router: mockRouter as never,
        });

      passwordFormRef.value = {
        validate: vi.fn().mockImplementation((cb: (v: boolean) => void) => cb(true)),
      } as never;

      submitPasswordChange();
      await flushPromises();
      expect(mockElMessage.error).toHaveBeenCalled();
      expect(passwordSubmitting.value).toBe(false);
    });

    it("passwordSubmitting is true during submission, false after", async () => {
      mockCheckCurrentEmailVerified.mockResolvedValue(true);
      let resolveChange!: (v: unknown) => void;
      mockChangePassword.mockImplementation(
        () => new Promise((r) => (resolveChange = r))
      );

      const usePasswordManagement = await importComposable();
      const { passwordFormRef, passwordSubmitting, submitPasswordChange } =
        usePasswordManagement({
          checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
          router: mockRouter as never,
        });

      passwordFormRef.value = {
        validate: vi.fn().mockImplementation((cb: (v: boolean) => void) => cb(true)),
      } as never;

      submitPasswordChange();
      await flushPromises(); // wait until inside the async validate callback

      // passwordSubmitting set true before API call
      expect(passwordSubmitting.value).toBe(true);

      resolveChange({ success: true });
      await flushPromises();
      expect(passwordSubmitting.value).toBe(false);
    });
  });

  describe("passwordRules", () => {
    it("old password validator errors on empty value", async () => {
      const usePasswordManagement = await importComposable();
      const { passwordRules } = usePasswordManagement({
        checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
        router: mockRouter as never,
      });

      const rules = passwordRules.value.oldPassword as Array<{
        validator?: (r: unknown, v: string, cb: (e?: Error) => void) => void;
      }>;
      const validator = rules.find((r) => r.validator)!.validator!;
      const callback = vi.fn();
      validator({}, "", callback);
      expect(callback).toHaveBeenCalledWith(expect.any(Error));
    });

    it("old password validator errors when same as new password", async () => {
      const usePasswordManagement = await importComposable();
      const { passwordRules, passwordForm } = usePasswordManagement({
        checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
        router: mockRouter as never,
      });

      passwordForm.value.password = "samepass";
      const rules = passwordRules.value.oldPassword as Array<{
        validator?: (r: unknown, v: string, cb: (e?: Error) => void) => void;
      }>;
      const validator = rules.find((r) => r.validator)!.validator!;
      const callback = vi.fn();
      validator({}, "samepass", callback);
      expect(callback).toHaveBeenCalledWith(expect.any(Error));
    });

    it("old password validator passes when different from new password", async () => {
      const usePasswordManagement = await importComposable();
      const { passwordRules, passwordForm } = usePasswordManagement({
        checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
        router: mockRouter as never,
      });

      passwordForm.value.password = "newpassword";
      const rules = passwordRules.value.oldPassword as Array<{
        validator?: (r: unknown, v: string, cb: (e?: Error) => void) => void;
      }>;
      const validator = rules.find((r) => r.validator)!.validator!;
      const callback = vi.fn();
      validator({}, "oldpassword", callback);
      expect(callback).toHaveBeenCalledWith(); // no error
    });

    it("new password validator errors when same as old password", async () => {
      const usePasswordManagement = await importComposable();
      const { passwordRules, passwordForm } = usePasswordManagement({
        checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
        router: mockRouter as never,
      });

      passwordForm.value.oldPassword = "oldpass";
      const rules = passwordRules.value.password as Array<{
        validator?: (r: unknown, v: string, cb: (e?: Error) => void) => void;
      }>;
      const validator = rules.find((r) => r.validator)!.validator!;
      const callback = vi.fn();
      validator({}, "oldpass", callback);
      expect(callback).toHaveBeenCalledWith(expect.any(Error));
    });

    it("new password validator passes when different from old", async () => {
      const usePasswordManagement = await importComposable();
      const { passwordRules, passwordForm } = usePasswordManagement({
        checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
        router: mockRouter as never,
      });

      passwordForm.value.oldPassword = "oldpass";
      passwordForm.value.checkPassword = "";
      const rules = passwordRules.value.password as Array<{
        validator?: (r: unknown, v: string, cb: (e?: Error) => void) => void;
      }>;
      const validator = rules.find((r) => r.validator)!.validator!;
      const callback = vi.fn();
      validator({}, "newpass123", callback);
      expect(callback).toHaveBeenCalledWith(); // no error
    });

    it("new password validator passes on empty value (no cross-check needed)", async () => {
      const usePasswordManagement = await importComposable();
      const { passwordRules } = usePasswordManagement({
        checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
        router: mockRouter as never,
      });

      const rules = passwordRules.value.password as Array<{
        validator?: (r: unknown, v: string, cb: (e?: Error) => void) => void;
      }>;
      const validator = rules.find((r) => r.validator)!.validator!;
      const callback = vi.fn();
      validator({}, "", callback);
      expect(callback).toHaveBeenCalledWith(); // empty → early return, no error
    });

    it("checkPassword validator errors on empty value", async () => {
      const usePasswordManagement = await importComposable();
      const { passwordRules } = usePasswordManagement({
        checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
        router: mockRouter as never,
      });

      const rules = passwordRules.value.checkPassword as Array<{
        validator?: (r: unknown, v: string, cb: (e?: Error) => void) => void;
      }>;
      const validator = rules.find((r) => r.validator)!.validator!;
      const callback = vi.fn();
      validator({}, "", callback);
      expect(callback).toHaveBeenCalledWith(expect.any(Error));
    });

    it("checkPassword validator errors when not matching new password", async () => {
      const usePasswordManagement = await importComposable();
      const { passwordRules, passwordForm } = usePasswordManagement({
        checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
        router: mockRouter as never,
      });

      passwordForm.value.password = "correctpass";
      const rules = passwordRules.value.checkPassword as Array<{
        validator?: (r: unknown, v: string, cb: (e?: Error) => void) => void;
      }>;
      const validator = rules.find((r) => r.validator)!.validator!;
      const callback = vi.fn();
      validator({}, "wrongpass", callback);
      expect(callback).toHaveBeenCalledWith(expect.any(Error));
    });

    it("checkPassword validator passes when matching new password", async () => {
      const usePasswordManagement = await importComposable();
      const { passwordRules, passwordForm } = usePasswordManagement({
        checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
        router: mockRouter as never,
      });

      passwordForm.value.password = "mypassword";
      const rules = passwordRules.value.checkPassword as Array<{
        validator?: (r: unknown, v: string, cb: (e?: Error) => void) => void;
      }>;
      const validator = rules.find((r) => r.validator)!.validator!;
      const callback = vi.fn();
      validator({}, "mypassword", callback);
      expect(callback).toHaveBeenCalledWith(); // no error
    });
  });
});
