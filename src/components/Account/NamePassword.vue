<template>
  <div
    class="name-password-form"
    :class="{ 'dark-theme': isDark }"
    v-loading="loading"
  >
    <el-card class="login-card" :body-style="{ padding: '20px' }">
      <el-form
        ref="formRef"
        class="login-form"
        :rules="rules"
        :model="form"
        label-position="top"
      >
        <el-form-item :label="''" prop="username" class="form-item">
          <el-input
            v-model="form.username"
            :placeholder="t('login.username')"
            class="custom-input"
          >
            <template #prefix>
              <el-icon class="input-icon">
                <UserFilled></UserFilled>
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item :label="''" prop="password" class="form-item">
          <el-input
            v-model="form.password"
            type="password"
            :placeholder="t('login.password')"
            class="custom-input"
            show-password
          >
            <template #prefix>
              <el-icon class="input-icon">
                <Lock></Lock>
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <div class="login-options">
          <a
            class="forgot-password"
            href="#"
            @click.prevent="handleForgotPassword"
          >
            {{ t("login.forgotPassword") }}
          </a>
        </div>

        <el-form-item class="login-button-item">
          <el-button
            class="login-button"
            type="primary"
            @click="submit"
            :loading="loading"
          >
            {{ $t("login.login") }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-dialog
      v-model="forgotDialogVisible"
      :title="t('login.forgotDialogTitle')"
      width="560px"
      :close-on-click-modal="false"
      @closed="resetForgotPasswordState"
    >
      <p class="forgot-tip">{{ t("login.forgotTipBoundEmail") }}</p>
      <el-form
        ref="forgotFormRef"
        :model="forgotForm"
        :rules="forgotRules"
        label-position="top"
      >
        <el-form-item :label="t('login.username')" prop="email">
          <el-input
            v-model="forgotForm.email"
            :placeholder="t('login.username')"
            type="email"
          >
            <template #append>
              <el-button
                :loading="sendingResetEmail"
                @click="handleSendResetEmail"
              >
                {{ t("login.sendResetEmail") }}
              </el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item :label="t('login.forgotTokenLabel')" prop="code">
          <el-input
            v-model="forgotForm.code"
            :placeholder="t('login.forgotTokenPlaceholder')"
          >
            <template #append>
              <el-button :loading="verifyingCode" @click="handleVerifyCode">
                {{ t("login.verifyResetToken") }}
              </el-button>
            </template>
          </el-input>
        </el-form-item>

        <template v-if="codeVerified">
          <el-form-item
            :label="t('login.forgotNewPasswordLabel')"
            prop="password"
          >
            <el-input
              v-model="forgotForm.password"
              type="password"
              show-password
              :placeholder="t('login.password')"
            ></el-input>
            <PasswordStrength
              :password="forgotForm.password"
            ></PasswordStrength>
          </el-form-item>

          <el-form-item
            :label="t('login.forgotConfirmPasswordLabel')"
            prop="confirmPassword"
          >
            <el-input
              v-model="forgotForm.confirmPassword"
              type="password"
              show-password
              :placeholder="t('login.repassword')"
            ></el-input>
          </el-form-item>
        </template>
      </el-form>

      <template #footer>
        <el-button @click="forgotDialogVisible = false">
          {{ t("login.cancel") }}
        </el-button>
        <el-button
          type="primary"
          :disabled="!codeVerified"
          :loading="resettingPassword"
          @click="handleResetPassword"
        >
          {{ t("login.resetPassword") }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import "@/assets/font/font.css";
import { FormInstance, type FormItemRule } from "element-plus";
import { useRouter, LocationQuery, useRoute } from "vue-router";
import { useUserStore } from "@/store";
import { useSettingsStore } from "@/store/modules/settings";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { Message } from "@/components/Dialog";
import PasswordStrength from "@/components/PasswordStrength/index.vue";
import {
  requestPasswordReset,
  verifyResetCode,
  resetPasswordByCode,
  type PasswordApiResponse,
} from "@/api/v1/password";
import { createPasswordFormRules } from "@/utils/password-validator";

const formRef = ref<FormInstance>();
const userStore = useUserStore();
const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === ThemeEnum.DARK);

const { t } = useI18n();

const router = useRouter();
const route = useRoute();
const { form } = storeToRefs(userStore);

const parseRedirect = (): {
  path: string;
  queryParams: Record<string, string>;
} => {
  const query: LocationQuery = route.query;
  const redirect = (query.redirect as string) ?? "/home/index";
  const url = new URL(redirect, window.location.origin);
  const path = url.pathname;
  const queryParams: Record<string, string> = {};

  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  return { path, queryParams };
};

const rules = computed<Record<string, FormItemRule[]>>(() => {
  return {
    username: [
      {
        required: true,
        message: t("login.rules.username.message1"),
        trigger: "blur",
      },
    ],
    password: [
      {
        required: true,
        message: t("login.rules.password.message1"),
        trigger: "blur",
      },
      {
        min: 6,
        max: 32,
        message: t("login.rules.password.message2"),
        trigger: "blur",
      },
    ],
  };
});

const loading = ref<boolean>(false);
const forgotDialogVisible = ref<boolean>(false);
const sendingResetEmail = ref<boolean>(false);
const verifyingCode = ref<boolean>(false);
const resettingPassword = ref<boolean>(false);
const codeVerified = ref<boolean>(false);
const forgotFormRef = ref<FormInstance>();

const forgotForm = reactive({
  email: "",
  code: "",
  password: "",
  confirmPassword: "",
});

const forgotRules = computed<Record<string, FormItemRule[]>>(() => {
  return {
    email: [
      {
        required: true,
        message: t("login.rules.username.message1"),
        trigger: "blur",
      },
      {
        type: "email",
        message: t("login.rules.username.email"),
        trigger: ["blur", "change"],
      },
    ],
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
    confirmPassword: [
      {
        required: true,
        message: t("login.rules.repassword.message1"),
        trigger: "blur",
      },
      {
        validator: (_rule, value: string, callback) => {
          if (!value) {
            callback(new Error(t("login.rules.repassword.message1")));
            return;
          }
          if (value !== forgotForm.password) {
            callback(new Error(t("login.rules.repassword.message2")));
            return;
          }
          callback();
        },
        trigger: "blur",
      },
    ],
  };
});

const emit = defineEmits(["login-success", "switch-to-register"]);

const submit = () => {
  formRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      loading.value = true;
      try {
        await userStore.login(form.value);
        await userStore.getUserInfo();
        const { path, queryParams } = parseRedirect();
        emit("login-success");
        router.push({ path: path, query: queryParams });
      } catch (e) {
        loading.value = false;
        Message.error(t("login.error"));
      }
    } else {
      Message.warning(t("login.error"));
    }
  });
};

const getApiErrorMessage = (result: PasswordApiResponse, fallback: string) => {
  return result.error?.message || result.message || fallback;
};

const handleForgotPassword = () => {
  forgotDialogVisible.value = true;
};

const resetForgotPasswordState = () => {
  codeVerified.value = false;
  forgotForm.email = "";
  forgotForm.code = "";
  forgotForm.password = "";
  forgotForm.confirmPassword = "";
  forgotFormRef.value?.clearValidate();
};

const handleSendResetEmail = async () => {
  const valid = await forgotFormRef.value
    ?.validateField("email")
    .then(() => true)
    .catch(() => false);
  if (!valid) return;

  sendingResetEmail.value = true;
  try {
    const result = await requestPasswordReset(forgotForm.email);
    if (!result.success) {
      Message.error(
        getApiErrorMessage(result, t("login.requestResetFailedFallback"))
      );
      return;
    }
    Message.success(result.message || t("login.requestResetSuccess"));
  } catch (_error) {
    Message.error(t("login.requestResetFailedFallback"));
  } finally {
    sendingResetEmail.value = false;
  }
};

const handleVerifyCode = async () => {
  const valid = await forgotFormRef.value
    ?.validateField(["email", "code"])
    .then(() => true)
    .catch(() => false);
  if (!valid) return;

  verifyingCode.value = true;
  try {
    const result = await verifyResetCode(forgotForm.email, forgotForm.code);
    if (!result.success || result.valid === false) {
      codeVerified.value = false;
      Message.error(getApiErrorMessage(result, t("login.verifyTokenFailed")));
      return;
    }
    codeVerified.value = true;
    Message.success(result.message || t("login.verifyTokenSuccess"));
  } catch (_error) {
    codeVerified.value = false;
    Message.error(t("login.verifyTokenFailed"));
  } finally {
    verifyingCode.value = false;
  }
};

const handleResetPassword = async () => {
  if (!codeVerified.value) {
    Message.warning(t("login.verifyTokenFirst"));
    return;
  }

  const valid = await forgotFormRef.value
    ?.validateField(["password", "confirmPassword"])
    .then(() => true)
    .catch(() => false);
  if (!valid) return;

  resettingPassword.value = true;
  try {
    const result = await resetPasswordByCode(
      forgotForm.email,
      forgotForm.code,
      forgotForm.password
    );
    if (!result.success) {
      Message.error(
        getApiErrorMessage(result, t("login.resetPasswordFailedFallback"))
      );
      return;
    }
    Message.success(result.message || t("login.resetPasswordSuccess"));
    forgotDialogVisible.value = false;
  } catch (_error) {
    Message.error(t("login.resetPasswordFailedFallback"));
  } finally {
    resettingPassword.value = false;
  }
};
</script>

<style scoped lang="scss">
.name-password-form {
  width: 100%;
}

.login-form {
  width: 100%;
}

.form-item {
  margin-bottom: 16px;

  :deep(.el-form-item__label) {
    padding-bottom: 6px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary, #333);
    line-height: 1;
  }
}

.custom-input {
  height: 42px;
  border-radius: 8px;

  :deep(.el-input__wrapper) {
    padding: 0 12px;
    border-radius: 8px;
    background-color: var(--bg-hover, #f8f8f8);
    box-shadow: 0 0 0 1px var(--border-color, #e0e0e0) inset;
    transition: all 0.3s;

    &.is-focus {
      box-shadow: 0 0 0 1px var(--primary-color, #00a8ab) inset;
      background-color: var(--bg-card, #fff);
    }
  }

  :deep(.el-input__inner) {
    color: var(--text-primary, #333);
    font-size: 14px;

    &::placeholder {
      color: var(--text-muted, #94a3b8);
    }
  }

  .input-icon {
    font-size: 16px;
    color: var(--text-muted, #999);
    margin-right: 8px;
  }
}

.login-options {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 16px;

  .forgot-password {
    font-size: 14px;
    color: var(--primary-color, #00a8ab);
    text-decoration: none;
    transition: color 0.2s;

    &:hover {
      color: var(--primary-hover, #008385);
      text-decoration: underline;
    }
  }
}

.forgot-tip {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.login-button-item {
  margin-bottom: 16px;
}

.login-button {
  width: 100%;
  height: 42px;
  font-size: 16px;
  border-radius: 8px;
  background: var(--primary-color, #00a8ab);
  border: none;
  font-weight: 500;
  color: #fff;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
    background: var(--primary-hover, #008385);
    box-shadow: var(--shadow-lg, 0 8px 15px rgba(0, 0, 0, 0.1));
  }

  &:active {
    transform: translateY(0);
  }
}

.register-link {
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary, #666);

  a {
    margin-left: 4px;
    color: var(--primary-color, #00a8ab);
    text-decoration: none;
    transition: color 0.2s;

    &:hover {
      color: var(--primary-hover, #008385);
      text-decoration: underline;
    }
  }
}
</style>
