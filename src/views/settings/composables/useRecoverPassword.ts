import { ref, computed, watch, onUnmounted } from "vue";
import { ElMessage } from "element-plus";
import type { FormInstance } from "element-plus";
import { useI18n } from "vue-i18n";
import type { Router } from "vue-router";
import {
  requestPasswordReset,
  verifyResetCode,
  resetPasswordByCode,
  type PasswordApiResponse,
} from "@/api/v1/password";
import { createPasswordFormRules } from "@/utils/password-validator";
import type { EmailDialogAction } from "./useEmailStatus";

/** Cooldown duration in seconds after sending a recovery email */
const RECOVER_SEND_COOLDOWN_SECONDS = 60;

interface UseRecoverPasswordDeps {
  /** Returns the currently bound email address, or empty string if none */
  getCurrentBoundEmail: () => Promise<string>;
  /** Extracts a human-readable error message from a password API response */
  getApiErrorMessage: (result: PasswordApiResponse, fallback: string) => string;
  /** Opens the email management dialog with the given action */
  openEmailDialog: (action: EmailDialogAction) => void;
  /** Vue Router instance for post-reset navigation */
  router: Router;
}

/**
 * Composable that encapsulates the password recovery flow:
 * send reset email → verify code → reset password.
 */
export const useRecoverPassword = (deps: UseRecoverPasswordDeps) => {
  const { t } = useI18n();

  // --- Form refs & state ---
  const recoverFormRef = ref<FormInstance>();
  const dialogRecoverVisible = ref(false);

  const recoverForm = ref({
    email: "",
    code: "",
    password: "",
    checkPassword: "",
  });

  // --- Loading / status flags ---
  const recoverSending = ref(false);
  const recoverVerifying = ref(false);
  const recoverResetting = ref(false);
  const recoverCodeVerified = ref(false);

  // --- Cooldown timer ---
  const recoverCooldownSeconds = ref(0);
  let recoverCooldownTimer: ReturnType<typeof setInterval> | null = null;

  // --- Computed properties ---
  const canSendRecoverCode = computed(
    () => !recoverSending.value && recoverCooldownSeconds.value === 0
  );

  const canRecoverResetPassword = computed(
    () => recoverCodeVerified.value && !recoverVerifying.value
  );

  const recoverSendButtonText = computed(() => {
    if (recoverCooldownSeconds.value > 0) {
      return `${t("login.sendResetEmail")} (${recoverCooldownSeconds.value}s)`;
    }
    return t("login.sendResetEmail");
  });

  // --- Validation rules ---
  const recoverRules = computed(() => ({
    code: [
      {
        required: true,
        message: t("login.forgotTokenRequired"),
        trigger: "blur",
      },
      {
        pattern: /^\d{6}$/,
        message: t("homepage.edit.rules.code.invalid"),
        trigger: "blur",
      },
    ],
    password: [...createPasswordFormRules(t)],
    checkPassword: [
      {
        required: true,
        message: t("homepage.account.rules2.check.message1"),
        trigger: "blur",
      },
      {
        validator: (
          _rule: unknown,
          value: string,
          callback: (error?: Error) => void
        ) => {
          if (!value) {
            callback(new Error(t("homepage.account.rules2.check.error1")));
            return;
          }
          if (value !== recoverForm.value.password) {
            callback(new Error(t("homepage.account.rules2.check.error2")));
            return;
          }
          callback();
        },
        trigger: "blur",
      },
    ],
  }));

  // --- Cooldown helpers ---
  const stopRecoverCooldown = (): void => {
    if (recoverCooldownTimer) {
      clearInterval(recoverCooldownTimer);
      recoverCooldownTimer = null;
    }
  };

  const startRecoverCooldown = (
    seconds = RECOVER_SEND_COOLDOWN_SECONDS
  ): void => {
    stopRecoverCooldown();
    recoverCooldownSeconds.value = seconds;
    recoverCooldownTimer = setInterval(() => {
      if (recoverCooldownSeconds.value <= 1) {
        recoverCooldownSeconds.value = 0;
        stopRecoverCooldown();
        return;
      }
      recoverCooldownSeconds.value -= 1;
    }, 1000);
  };

  // --- Form actions ---
  const resetRecoverForm = (): void => {
    recoverCodeVerified.value = false;
    recoverForm.value.code = "";
    recoverForm.value.password = "";
    recoverForm.value.checkPassword = "";
    recoverFormRef.value?.clearValidate();
  };

  const openRecoverDialog = async (): Promise<void> => {
    const boundEmail = await deps.getCurrentBoundEmail();
    if (!boundEmail) {
      ElMessage.warning(t("homepage.account.noEmailBound"));
      deps.openEmailDialog("bind");
      return;
    }
    recoverForm.value.email = boundEmail;
    dialogRecoverVisible.value = true;
  };

  // --- API handlers ---
  const handleRecoverSendEmail = async (): Promise<void> => {
    const email = recoverForm.value.email;
    if (!email) {
      ElMessage.warning(t("homepage.account.emailBoundNotFound"));
      return;
    }

    recoverCodeVerified.value = false;
    recoverSending.value = true;
    try {
      const result = await requestPasswordReset(email);
      if (!result.success) {
        ElMessage.error(
          deps.getApiErrorMessage(result, t("login.requestResetFailedFallback"))
        );
        return;
      }
      ElMessage.success(result.message || t("login.requestResetSuccess"));
      startRecoverCooldown();
    } catch {
      ElMessage.error(t("login.requestResetFailedFallback"));
    } finally {
      recoverSending.value = false;
    }
  };

  const handleRecoverVerifyCode = async (): Promise<void> => {
    const email = recoverForm.value.email;
    if (!email) {
      ElMessage.warning(t("homepage.account.emailBoundNotFound"));
      return;
    }

    const valid = await recoverFormRef.value
      ?.validateField("code")
      .then(() => true)
      .catch(() => false);
    if (!valid) return;

    recoverVerifying.value = true;
    try {
      const result = await verifyResetCode(email, recoverForm.value.code);
      if (!result.success || result.valid === false) {
        recoverCodeVerified.value = false;
        ElMessage.error(
          deps.getApiErrorMessage(result, t("login.verifyTokenFailed"))
        );
        return;
      }
      recoverCodeVerified.value = true;
      ElMessage.success(result.message || t("login.verifyTokenSuccess"));
    } catch {
      recoverCodeVerified.value = false;
      ElMessage.error(t("login.verifyTokenFailed"));
    } finally {
      recoverVerifying.value = false;
    }
  };

  const handleRecoverResetPassword = async (): Promise<void> => {
    const email = recoverForm.value.email;
    if (!email) {
      ElMessage.warning(t("homepage.account.emailBoundNotFound"));
      return;
    }

    if (!recoverCodeVerified.value) {
      ElMessage.warning(t("login.verifyTokenFirst"));
      return;
    }

    const valid = await recoverFormRef.value
      ?.validateField(["password", "checkPassword"])
      .then(() => true)
      .catch(() => false);
    if (!valid) return;

    recoverResetting.value = true;
    try {
      const result = await resetPasswordByCode(
        email,
        recoverForm.value.code,
        recoverForm.value.password
      );
      if (!result.success) {
        ElMessage.error(
          deps.getApiErrorMessage(
            result,
            t("login.resetPasswordFailedFallback")
          )
        );
        return;
      }
      ElMessage.success(result.message || t("login.resetPasswordSuccess"));
      dialogRecoverVisible.value = false;
      deps.router.push("/site/logout");
    } catch {
      ElMessage.error(t("login.resetPasswordFailedFallback"));
    } finally {
      recoverResetting.value = false;
    }
  };

  // Reset code-verified flag whenever the user changes the code input
  watch(
    () => recoverForm.value.code,
    () => {
      recoverCodeVerified.value = false;
    }
  );

  // Clean up the cooldown timer when the component is unmounted
  onUnmounted(() => {
    stopRecoverCooldown();
  });

  return {
    recoverFormRef,
    recoverForm,
    recoverRules,
    dialogRecoverVisible,
    recoverSending,
    recoverVerifying,
    recoverResetting,
    recoverCodeVerified,
    recoverCooldownSeconds,
    canSendRecoverCode,
    canRecoverResetPassword,
    recoverSendButtonText,
    stopRecoverCooldown,
    openRecoverDialog,
    resetRecoverForm,
    handleRecoverSendEmail,
    handleRecoverVerifyCode,
    handleRecoverResetPassword,
  };
};
