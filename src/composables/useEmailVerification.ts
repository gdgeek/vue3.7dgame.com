import { computed, reactive, ref } from "vue";
import {
  ApiError,
  EmailStatus,
  getEmailCooldown,
  getEmailStatus,
  sendChangeConfirmation,
  sendVerificationCode,
  unbindEmail,
  verifyChangeConfirmation,
  verifyEmailCode,
} from "@/api/v1/email";
import { useUserStore } from "@/store/modules/user";

export type EmailFlowStep =
  | "idle"
  | "bind"
  | "manage"
  | "change_confirm"
  | "change_verify"
  | "unbind_confirm"
  | "unbind_direct";

const DEFAULT_SEND_COOLDOWN_SECONDS = 60;

const parseApiError = (err: unknown): ApiError => {
  const fallback: ApiError = {
    code: "UNKNOWN",
    message: "请求失败",
  };

  if (!err || typeof err !== "object") {
    return fallback;
  }

  const raw = err as {
    data?: {
      error?: ApiError;
      code?: string;
      message?: string;
      retry_after?: number;
    };
    error?: ApiError;
    message?: string;
  };

  if (raw.data?.error) {
    return raw.data.error;
  }

  if (raw.error) {
    return raw.error;
  }

  if (raw.data?.code || raw.data?.message) {
    return {
      code: raw.data.code || "UNKNOWN",
      message: raw.data.message || fallback.message,
      retry_after: raw.data.retry_after,
    };
  }

  if (raw.message) {
    return {
      code: "UNKNOWN",
      message: raw.message,
    };
  }

  return fallback;
};

export function useEmailVerification() {
  const userStore = useUserStore();

  const loading = ref(false);
  const error = ref<string | null>(null);

  const status = ref<EmailStatus | null>(null);
  const step = ref<EmailFlowStep>("idle");

  const newEmailForm = reactive({
    email: "",
    code: "",
  });

  const oldEmailForm = reactive({
    code: "",
  });

  const unbindForm = reactive({
    code: "",
  });

  const changeToken = ref<string | null>(null);
  const changeTokenLeft = ref(0);

  const sendCooldown = ref(0);
  const oldConfirmCooldown = ref(0);

  const isLocked = ref(false);
  const lockTime = ref(0);

  let sendCooldownTimer: ReturnType<typeof setInterval> | null = null;
  let oldConfirmCooldownTimer: ReturnType<typeof setInterval> | null = null;
  let lockTimer: ReturnType<typeof setInterval> | null = null;
  let tokenTimer: ReturnType<typeof setInterval> | null = null;

  const startCountdown = (
    target: { value: number },
    seconds: number,
    timerKey: "send" | "oldConfirm" | "lock" | "token"
  ) => {
    target.value = Math.max(0, seconds);

    const clearTargetTimer = () => {
      switch (timerKey) {
        case "send":
          if (sendCooldownTimer) {
            clearInterval(sendCooldownTimer);
            sendCooldownTimer = null;
          }
          break;
        case "oldConfirm":
          if (oldConfirmCooldownTimer) {
            clearInterval(oldConfirmCooldownTimer);
            oldConfirmCooldownTimer = null;
          }
          break;
        case "lock":
          if (lockTimer) {
            clearInterval(lockTimer);
            lockTimer = null;
          }
          break;
        case "token":
          if (tokenTimer) {
            clearInterval(tokenTimer);
            tokenTimer = null;
          }
          break;
      }
    };

    clearTargetTimer();

    if (target.value <= 0) {
      if (timerKey === "lock") {
        isLocked.value = false;
      }
      if (timerKey === "token") {
        changeToken.value = null;
      }
      return;
    }

    if (timerKey === "lock") {
      isLocked.value = true;
    }

    const timer = setInterval(() => {
      target.value -= 1;
      if (target.value <= 0) {
        clearTargetTimer();
        target.value = 0;

        if (timerKey === "lock") {
          isLocked.value = false;
        }

        if (timerKey === "token") {
          changeToken.value = null;
          if (step.value === "change_verify") {
            step.value = "manage";
            error.value = "改绑令牌已过期，请重新验证旧邮箱";
          }
        }
      }
    }, 1000);

    switch (timerKey) {
      case "send":
        sendCooldownTimer = timer;
        break;
      case "oldConfirm":
        oldConfirmCooldownTimer = timer;
        break;
      case "lock":
        lockTimer = timer;
        break;
      case "token":
        tokenTimer = timer;
        break;
    }
  };

  const currentEmail = computed(() => status.value?.email || "");
  const hasBoundEmail = computed(() => Boolean(status.value?.email));
  const isCurrentEmailVerified = computed(() => {
    if (typeof status.value?.email_verified === "boolean") {
      return status.value.email_verified;
    }

    return Boolean(
      userStore.userInfo?.userData?.emailVerified ??
        userStore.userInfo?.userData?.emailBind
    );
  });

  const canSendNewCode = computed(() => {
    return (
      !loading.value &&
      !isLocked.value &&
      sendCooldown.value === 0 &&
      Boolean(newEmailForm.email.trim())
    );
  });

  const canVerifyNewCode = computed(() => {
    return (
      !loading.value && !isLocked.value && Boolean(newEmailForm.code.trim())
    );
  });

  const canSendOldConfirmCode = computed(() => {
    return !loading.value && oldConfirmCooldown.value === 0;
  });

  const canVerifyOldConfirmCode = computed(() => {
    return (
      !loading.value && !isLocked.value && Boolean(oldEmailForm.code.trim())
    );
  });

  const canUnbind = computed(() => {
    return !loading.value && !isLocked.value && Boolean(unbindForm.code.trim());
  });

  const normalizeAndRecordError = (err: unknown) => {
    const apiError = parseApiError(err);
    error.value = apiError.message;

    if (apiError.code === "ACCOUNT_LOCKED" && apiError.retry_after) {
      startCountdown(lockTime, apiError.retry_after, "lock");
    }

    return apiError;
  };

  const loadStatus = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await getEmailStatus();
      if (!response.success || !response.data) {
        error.value = response.message || "获取邮箱状态失败";
        return false;
      }

      status.value = response.data;

      if (response.data.email) {
        if (step.value === "idle" || step.value === "bind") {
          step.value = "manage";
        }
      } else {
        step.value = "bind";
        changeToken.value = null;
        startCountdown(changeTokenLeft, 0, "token");
      }

      if (step.value === "bind") {
        newEmailForm.email = "";
      }

      return true;
    } catch (err) {
      normalizeAndRecordError(err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  const refreshSendCooldown = async (email?: string) => {
    try {
      const response = await getEmailCooldown(email);
      if (!response.success || !response.data) {
        return;
      }

      if (response.data.can_send) {
        startCountdown(sendCooldown, 0, "send");
      } else {
        startCountdown(sendCooldown, response.data.retry_after || 0, "send");
      }
    } catch {
      // 冷却状态查询失败不阻断主流程
    }
  };

  const sendCodeForNewEmail = async () => {
    const email = newEmailForm.email.trim();
    if (!email || !canSendNewCode.value) {
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await sendVerificationCode(email);
      if (!response.success) {
        error.value = response.message || "发送验证码失败";
        return false;
      }

      await refreshSendCooldown(email);
      if (sendCooldown.value === 0) {
        startCountdown(sendCooldown, DEFAULT_SEND_COOLDOWN_SECONDS, "send");
      }

      return true;
    } catch (err) {
      const apiError = normalizeAndRecordError(err);
      if (apiError.code === "RATE_LIMIT_EXCEEDED" && apiError.retry_after) {
        startCountdown(sendCooldown, apiError.retry_after, "send");
      }
      return false;
    } finally {
      loading.value = false;
    }
  };

  const verifyCodeForNewEmail = async () => {
    const email = newEmailForm.email.trim();
    const code = newEmailForm.code.trim();

    if (!email || !code || !canVerifyNewCode.value) {
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      const payload = {
        email,
        code,
        ...(step.value === "change_verify" && changeToken.value
          ? { change_token: changeToken.value }
          : {}),
      };

      const response = await verifyEmailCode(payload);

      if (!response.success) {
        error.value = response.message || "邮箱验证失败";
        return false;
      }

      newEmailForm.code = "";
      changeToken.value = null;
      startCountdown(changeTokenLeft, 0, "token");
      startCountdown(sendCooldown, 0, "send");

      await userStore.getUserInfo();
      await loadStatus();
      return true;
    } catch (err) {
      normalizeAndRecordError(err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  const startChangeFlow = () => {
    if (!hasBoundEmail.value) {
      return;
    }

    error.value = null;
    oldEmailForm.code = "";
    newEmailForm.code = "";
    newEmailForm.email = "";
    changeToken.value = null;
    startCountdown(changeTokenLeft, 0, "token");
    step.value = isCurrentEmailVerified.value
      ? "change_confirm"
      : "change_verify";
  };

  const sendOldEmailConfirmationCode = async () => {
    if (!canSendOldConfirmCode.value) {
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await sendChangeConfirmation();
      if (!response.success) {
        error.value = response.message || "发送旧邮箱确认验证码失败";
        return false;
      }

      startCountdown(
        oldConfirmCooldown,
        DEFAULT_SEND_COOLDOWN_SECONDS,
        "oldConfirm"
      );
      return true;
    } catch (err) {
      const apiError = normalizeAndRecordError(err);
      if (apiError.code === "RATE_LIMIT_EXCEEDED" && apiError.retry_after) {
        startCountdown(oldConfirmCooldown, apiError.retry_after, "oldConfirm");
      }
      return false;
    } finally {
      loading.value = false;
    }
  };

  const verifyOldEmailForChange = async () => {
    const code = oldEmailForm.code.trim();
    if (!code || !canVerifyOldConfirmCode.value) {
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await verifyChangeConfirmation(code);
      if (!response.success || !response.data) {
        error.value = response.message || "旧邮箱验证失败";
        return false;
      }

      changeToken.value = response.data.change_token;
      startCountdown(changeTokenLeft, response.data.expires_in || 0, "token");
      newEmailForm.code = "";
      step.value = "change_verify";
      return true;
    } catch (err) {
      normalizeAndRecordError(err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  const startUnbindFlow = () => {
    if (!hasBoundEmail.value) {
      return;
    }

    error.value = null;
    unbindForm.code = "";
    step.value = isCurrentEmailVerified.value
      ? "unbind_confirm"
      : "unbind_direct";
  };

  const unbindCurrentEmail = async (code?: string) => {
    const normalizedCode = code?.trim();
    if (isCurrentEmailVerified.value && (!normalizedCode || !canUnbind.value)) {
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await unbindEmail(normalizedCode);
      if (!response.success) {
        error.value = response.message || "解绑邮箱失败";
        return false;
      }

      unbindForm.code = "";
      changeToken.value = null;
      startCountdown(changeTokenLeft, 0, "token");
      await userStore.getUserInfo();
      await loadStatus();
      return true;
    } catch (err) {
      normalizeAndRecordError(err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  const cancelCurrentAction = () => {
    error.value = null;

    if (hasBoundEmail.value) {
      step.value = "manage";
    } else {
      step.value = "bind";
    }

    oldEmailForm.code = "";
    unbindForm.code = "";
    newEmailForm.code = "";
    changeToken.value = null;
    startCountdown(changeTokenLeft, 0, "token");
  };

  const cleanup = () => {
    startCountdown(sendCooldown, 0, "send");
    startCountdown(oldConfirmCooldown, 0, "oldConfirm");
    startCountdown(lockTime, 0, "lock");
    startCountdown(changeTokenLeft, 0, "token");
  };

  return {
    loading,
    error,
    status,
    step,
    currentEmail,
    hasBoundEmail,
    isCurrentEmailVerified,
    isLocked,
    lockTime,
    sendCooldown,
    oldConfirmCooldown,
    changeTokenLeft,
    changeToken,
    newEmailForm,
    oldEmailForm,
    unbindForm,
    canSendNewCode,
    canVerifyNewCode,
    canSendOldConfirmCode,
    canVerifyOldConfirmCode,
    canUnbind,
    loadStatus,
    refreshSendCooldown,
    sendCodeForNewEmail,
    verifyCodeForNewEmail,
    startChangeFlow,
    sendOldEmailConfirmationCode,
    verifyOldEmailForChange,
    startUnbindFlow,
    unbindCurrentEmail,
    cancelCurrentAction,
    cleanup,
  };
}
