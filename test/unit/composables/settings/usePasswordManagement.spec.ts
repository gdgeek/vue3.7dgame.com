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
      const { dialogPasswordVisible, openPasswordDialog } = usePasswordManagement({
        checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
        router: mockRouter as never,
      });

      await openPasswordDialog();
      expect(dialogPasswordVisible.value).toBe(true);
    });

    it("shows warning when email not verified", async () => {
      mockCheckCurrentEmailVerified.mockResolvedValue(false);
      const usePasswordManagement = await importComposable();
      const { dialogPasswordVisible, openPasswordDialog } = usePasswordManagement({
        checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
        router: mockRouter as never,
      });

      await openPasswordDialog();
      expect(dialogPasswordVisible.value).toBe(false);
      expect(mockElMessage.warning).toHaveBeenCalled();
    });
  });

  describe("resetPasswordForm", () => {
    it("clears all password fields", async () => {
      const usePasswordManagement = await importComposable();
      const { passwordForm, passwordFormRef, resetPasswordForm } = usePasswordManagement({
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
      const { passwordForm, passwordFormRef, submitPasswordChange } = usePasswordManagement({
        checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
        router: mockRouter as never,
      });

      passwordForm.value.oldPassword = "oldPass";
      passwordForm.value.password = "newPass123";
      passwordForm.value.checkPassword = "newPass123";

      passwordFormRef.value = {
        validate: vi.fn().mockImplementation((cb: (valid: boolean) => void) => cb(true)),
      } as never;

      submitPasswordChange();
      await flushPromises();

      expect(mockChangePassword).toHaveBeenCalledWith("oldPass", "newPass123", "newPass123");
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
        validate: vi.fn().mockImplementation((cb: (valid: boolean) => void) => cb(false)),
      } as never;

      submitPasswordChange();
      expect(mockElMessage.error).toHaveBeenCalled();
    });

    it("shows error when API returns failure", async () => {
      mockCheckCurrentEmailVerified.mockResolvedValue(true);
      mockChangePassword.mockResolvedValue({ success: false, error: { message: "Wrong password" } });

      const usePasswordManagement = await importComposable();
      const { passwordFormRef, submitPasswordChange } = usePasswordManagement({
        checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
        router: mockRouter as never,
      });

      passwordFormRef.value = {
        validate: vi.fn().mockImplementation((cb: (valid: boolean) => void) => cb(true)),
      } as never;

      submitPasswordChange();
      await flushPromises();
      expect(mockElMessage.error).toHaveBeenCalledWith("Wrong password");
    });
  });

  describe("passwordRules", () => {
    it("old password validator errors on empty value", async () => {
      const usePasswordManagement = await importComposable();
      const { passwordRules } = usePasswordManagement({
        checkCurrentEmailVerified: mockCheckCurrentEmailVerified,
        router: mockRouter as never,
      });

      const rules = passwordRules.value.oldPassword as Array<{ validator?: (r: unknown, v: string, cb: (e?: Error) => void) => void }>;
      const validator = rules.find((r) => r.validator)!.validator!;
      const callback = vi.fn();
      validator({}, "", callback);
      expect(callback).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
