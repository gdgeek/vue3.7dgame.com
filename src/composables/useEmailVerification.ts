import { ref, computed } from "vue";
import { sendVerificationCode, verifyEmailCode } from "@/api/v1/email";

/**
 * 邮箱验证Composable函数
 * 封装邮箱验证的所有业务逻辑和状态管理
 */
export function useEmailVerification() {
  // 状态变量
  const loading = ref(false);
  const error = ref<string | null>(null);
  const countdown = ref(0);
  const isLocked = ref(false);
  const lockTime = ref(0);

  // 计算属性
  const canSendCode = computed(() => {
    return !loading.value && countdown.value === 0;
  });

  const canVerify = computed(() => {
    return !loading.value && !isLocked.value;
  });

  // 倒计时定时器
  let countdownTimer: NodeJS.Timeout | null = null;
  let lockTimer: NodeJS.Timeout | null = null;

  /**
   * 开始倒计时
   * @param seconds - 倒计时秒数
   */
  const startCountdown = (seconds: number) => {
    countdown.value = seconds;

    if (countdownTimer) {
      clearInterval(countdownTimer);
    }

    countdownTimer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        if (countdownTimer) {
          clearInterval(countdownTimer);
        }
        countdownTimer = null;
      }
    }, 1000);
  };

  /**
   * 开始锁定倒计时
   * @param seconds - 锁定秒数
   */
  const startLockCountdown = (seconds: number) => {
    isLocked.value = true;
    lockTime.value = seconds;

    if (lockTimer) {
      clearInterval(lockTimer);
    }

    lockTimer = setInterval(() => {
      lockTime.value--;
      if (lockTime.value <= 0) {
        if (lockTimer) {
          clearInterval(lockTimer);
        }
        lockTimer = null;
        isLocked.value = false;
      }
    }, 1000);
  };

  /**
   * 发送验证码
   * @param email - 邮箱地址
   * @returns Promise<boolean> - 是否成功
   */
  const sendCode = async (email: string): Promise<boolean> => {
    if (!canSendCode.value) {
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      const result = await sendVerificationCode(email);

      if (result.success) {
        // 开始 60 秒倒计时
        startCountdown(60);
        return true;
      }

      return false;
    } catch (err: any) {
      error.value = err.error?.message || "发送验证码失败";

      // 处理速率限制
      if (err.error?.code === "RATE_LIMIT_EXCEEDED" && err.error?.retry_after) {
        startCountdown(err.error.retry_after);
      }

      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 验证验证码
   * @param email - 邮箱地址
   * @param code - 验证码
   * @returns Promise<boolean> - 是否成功
   */
  const verifyCode = async (email: string, code: string): Promise<boolean> => {
    if (!canVerify.value) {
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      const result = await verifyEmailCode(email, code);

      if (result.success) {
        // 验证成功，清除倒计时
        if (countdownTimer) {
          clearInterval(countdownTimer);
          countdownTimer = null;
        }
        countdown.value = 0;
        return true;
      }

      return false;
    } catch (err: any) {
      error.value = err.error?.message || "验证失败";

      // 处理账户锁定
      if (err.error?.code === "ACCOUNT_LOCKED" && err.error?.retry_after) {
        startLockCountdown(err.error.retry_after);
      }

      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 清理定时器
   */
  const cleanup = () => {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (lockTimer) {
      clearInterval(lockTimer);
      lockTimer = null;
    }
  };

  return {
    // 状态
    loading,
    error,
    countdown,
    isLocked,
    lockTime,

    // 计算属性
    canSendCode,
    canVerify,

    // 方法
    sendCode,
    verifyCode,
    cleanup,
  };
}
