<template>
  <div>
    <el-dialog
      v-model="dialogVisible"
      width="420px"
      align-center
      class="qrcode-dialog"
      :show-close="true"
    >
      <template #header>
        <div class="dialog-header-custom">
          <font-awesome-icon
            :icon="['fas', 'qrcode']"
            class="header-icon"
          ></font-awesome-icon>
          <span class="header-title">{{ t("login.loginCode") }}</span>
        </div>
      </template>
      <div class="qrcode-container">
        <div class="qrcode-wrapper">
          <div
            v-loading="isLoadingCode"
            class="qrcode-box"
            :class="{ 'qrcode-box--disabled': isLoginCodeInactive }"
          >
            <qrcode-vue
              v-if="code !== ''"
              :value="code"
              :size="260"
              level="H"
              class="qrcode-img"
            ></qrcode-vue>
            <div
              v-if="isLoginCodeInactive"
              class="qrcode-blocker"
              aria-hidden="true"
            >
              <font-awesome-icon
                :icon="['fas', 'lock']"
                class="qrcode-blocker__icon"
              ></font-awesome-icon>
            </div>
          </div>
        </div>
        <p
          class="qrcode-tip"
          :class="{ 'qrcode-tip--inactive': isLoginCodeInactive }"
        >
          {{ loginCodeTip }}
        </p>
        <p
          v-if="!isLoginCodeInactive && remainingSeconds > 0"
          class="qrcode-subtip"
        >
          {{ t("login.loginCodeExpiresIn", { seconds: remainingSeconds }) }}
        </p>
        <el-button
          v-if="isLoginCodeInactive"
          type="primary"
          class="qrcode-refresh"
          :loading="isRefreshing"
          @click="refreshLoginCode"
        >
          {{ t("login.refreshLoginCode") }}
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { logger } from "@/utils/logger";
import { computed, ref, onUnmounted } from "vue";
import { getUserLinked } from "@/api/v1/tools";
import { useI18n } from "vue-i18n";
import QrcodeVue from "qrcode.vue";

const { t } = useI18n();
const LOGIN_CODE_TTL_SECONDS = 60;

type LoginCodeState = "active" | "used" | "expired";
type ExpiringResponse = {
  expires_at?: number | string | null;
  expiresAt?: number | string | null;
  expires_in?: number | string | null;
  expiresIn?: number | string | null;
};

const dialogVisible = ref(false);
const code = ref<string>("");
const loginCodeState = ref<LoginCodeState>("active");
const isLoadingCode = ref(false);
const isRefreshing = ref(false);
const expiresAtMs = ref<number | null>(null);
const remainingSeconds = ref(0);
let expiryTimer: ReturnType<typeof setTimeout> | null = null;
let countdownTimer: ReturnType<typeof setInterval> | null = null;

const isLoginCodeInactive = computed(() => loginCodeState.value !== "active");
const loginCodeTip = computed(() => {
  if (loginCodeState.value === "expired") {
    return t("login.loginCodeExpired");
  }

  if (loginCodeState.value === "used") {
    return t("login.loginCodeUsed");
  }

  return t("login.scanTip");
});

const openDialog = () => {
  dialogVisible.value = true;
  void refreshLoginCode();
};

const clearExpiryTimer = () => {
  if (expiryTimer !== null) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
};

const clearCountdownTimer = () => {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
};

const stopLoginCodeTimers = () => {
  clearExpiryTimer();
  clearCountdownTimer();
};

const markLoginCodeInactive = (state: Exclude<LoginCodeState, "active">) => {
  loginCodeState.value = state;
  remainingSeconds.value = 0;
  stopLoginCodeTimers();
};

const parseExpiresAtMs = (value: ExpiringResponse): number => {
  const rawExpiresAt = value.expires_at ?? value.expiresAt;
  if (typeof rawExpiresAt === "number" && Number.isFinite(rawExpiresAt)) {
    return rawExpiresAt > 1_000_000_000_000
      ? rawExpiresAt
      : rawExpiresAt * 1000;
  }

  if (typeof rawExpiresAt === "string" && rawExpiresAt.trim() !== "") {
    const numericExpiresAt = Number(rawExpiresAt);
    if (Number.isFinite(numericExpiresAt)) {
      return numericExpiresAt > 1_000_000_000_000
        ? numericExpiresAt
        : numericExpiresAt * 1000;
    }

    const dateExpiresAt = Date.parse(rawExpiresAt);
    if (Number.isFinite(dateExpiresAt)) {
      return dateExpiresAt;
    }
  }

  const rawExpiresIn = value.expires_in ?? value.expiresIn;
  const expiresIn = Number(rawExpiresIn);
  return (
    Date.now() + (expiresIn > 0 ? expiresIn : LOGIN_CODE_TTL_SECONDS) * 1000
  );
};

const updateRemainingSeconds = () => {
  if (expiresAtMs.value === null) {
    remainingSeconds.value = 0;
    return;
  }

  remainingSeconds.value = Math.max(
    0,
    Math.ceil((expiresAtMs.value - Date.now()) / 1000)
  );
};

const scheduleLoginCodeExpiry = (nextExpiresAtMs: number) => {
  clearExpiryTimer();
  clearCountdownTimer();
  expiresAtMs.value = nextExpiresAtMs;
  updateRemainingSeconds();

  const delay = nextExpiresAtMs - Date.now();
  if (delay <= 0) {
    markLoginCodeInactive("expired");
    return;
  }

  expiryTimer = setTimeout(() => {
    markLoginCodeInactive("expired");
  }, delay);

  countdownTimer = setInterval(updateRemainingSeconds, 1000);
};

const clearLoginCode = () => {
  code.value = "";
  expiresAtMs.value = null;
  remainingSeconds.value = 0;
  loginCodeState.value = "active";
};

const loadLoginCode = async () => {
  isLoadingCode.value = true;
  try {
    const userLinked = await getUserLinked();
    if (userLinked?.data.key) {
      code.value = "web_" + userLinked.data.key;
      loginCodeState.value = "active";
      scheduleLoginCodeExpiry(parseExpiresAtMs(userLinked.data));
    }
  } catch (error) {
    logger.error("Failed to initialize QR code:", error);
  } finally {
    isLoadingCode.value = false;
  }
};

const refreshLoginCode = async () => {
  if (isRefreshing.value) return;

  isRefreshing.value = true;
  stopLoginCodeTimers();
  clearLoginCode();
  await loadLoginCode();
  isRefreshing.value = false;
};

onUnmounted(() => {
  stopLoginCodeTimers();
});

defineExpose({
  openDialog,
});
</script>

<style lang="scss" scoped>
.qrcode-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 20px 48px;
}

.qrcode-box {
  position: relative;
  overflow: hidden;
  padding: 10px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-md, 8px);
}

.qrcode-box--disabled {
  border-color: var(--el-color-warning-light-5, #f3d19e);
}

.qrcode-blocker {
  position: absolute;
  inset: 10px;
  z-index: 2;
  display: grid;
  place-items: center;
  pointer-events: none;
  background:
    linear-gradient(
      135deg,
      var(--bg-card, #fff) 0%,
      var(--bg-card, #fff) 48%,
      var(--el-color-warning-light-7, #f8e3c5) 48%,
      var(--el-color-warning-light-7, #f8e3c5) 52%,
      var(--bg-card, #fff) 52%,
      var(--bg-card, #fff) 100%
    ),
    repeating-linear-gradient(
      45deg,
      var(--el-color-warning-light-9, #fdf6ec) 0,
      var(--el-color-warning-light-9, #fdf6ec) 8px,
      var(--bg-card, #fff) 8px,
      var(--bg-card, #fff) 16px
    );
  border-radius: 4px;
}

.qrcode-blocker__icon {
  width: 72px;
  height: 72px;
  padding: 24px;
  color: var(--el-color-warning, #e6a23c);
  background: var(--bg-card, #fff);
  border: 2px solid var(--el-color-warning, #e6a23c);
  border-radius: 50%;
  box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
}

.qrcode-tip {
  margin-top: 28px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #303133);
  text-align: center;
  letter-spacing: 0.5px;
}

.qrcode-tip--inactive {
  color: var(--el-color-warning, #e6a23c);
}

.qrcode-refresh {
  width: 180px;
  margin-top: 16px;
}

.qrcode-subtip {
  margin-top: 10px;
  font-size: 14px;
  color: var(--text-secondary, #909399);
  text-align: center;
}

.dialog-header-custom {
  display: flex;
  gap: 8px;
  align-items: center;
}

.header-icon {
  font-size: 24px;
  color: var(--primary-color, #03a9f4);
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #303133);
}
</style>

<style lang="scss">
.qrcode-dialog {
  overflow: hidden;
  background: var(--bg-card, #fff) !important;
  border-radius: var(--radius-xl, 24px) !important;
  box-shadow: 0 12px 32px var(--shadow-lg, rgb(0 0 0 / 20%)) !important;

  .el-dialog__header {
    padding: 20px 24px 0;
    margin: 0;
    border-bottom: none;
  }

  .el-dialog__headerbtn {
    top: 24px;
    right: 24px;
    font-size: 18px;

    .el-dialog__close {
      color: var(--text-secondary, #909399);

      &:hover {
        color: var(--text-primary, #303133);
      }
    }
  }

  .el-dialog__body {
    padding: 0;
  }
}
</style>
