<template>
  <div
    class="register-form"
    :class="{ 'dark-theme': isDark }"
    v-loading="loading"
  >
    <el-form
      ref="registerFormRef"
      class="login-form"
      :rules="registerRules"
      :model="registerForm"
      label-position="top"
    >
      <el-form-item
        :label="$t('login.username')"
        prop="username"
        class="form-item"
      >
        <el-input
          v-model="registerForm.username"
          placeholder="请输入邮箱"
          class="custom-input"
        >
          <template #prefix>
            <el-icon class="input-icon">
              <UserFilled></UserFilled>
            </el-icon>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item
        :label="$t('login.password')"
        prop="password"
        class="form-item"
      >
        <el-input
          v-model="registerForm.password"
          type="password"
          placeholder="请输入密码"
          class="custom-input"
          show-password
        >
          <template #prefix>
            <el-icon class="input-icon">
              <Lock></Lock>
            </el-icon>
          </template>
        </el-input>
        <PasswordStrength :password="registerForm.password"></PasswordStrength>
      </el-form-item>

      <el-form-item
        :label="$t('login.repassword')"
        prop="repassword"
        class="form-item"
      >
        <el-input
          v-model="registerForm.repassword"
          type="password"
          placeholder="请再次输入密码"
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

      <el-form-item class="register-button-item">
        <el-button
          class="register-button"
          type="primary"
          @click="register"
          :loading="loading"
        >
          {{ $t("login.create") }}
        </el-button>
      </el-form-item>

      <!-- 返回登录 -->
      <div class="login-link">
        <span>已有账号?</span>
        <a href="#" @click.prevent="backToLogin">返回登录</a>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import "@/assets/font/font.css";
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
// import { ElMessage } from "element-plus";
import { Message } from "@/components/Dialog";
import { FormInstance, FormItemRule } from "element-plus";
import { useRouter, LocationQuery, useRoute } from "vue-router";
import { useSettingsStore } from "@/store/modules/settings";
import { ThemeEnum } from "@/enums/ThemeEnum";
import WechatApi from "@/api/v1/wechat";
import Token from "@/store/modules/token";
import { createPasswordFormRules } from "@/utils/password-validator";
import PasswordStrength from "@/components/PasswordStrength/index.vue";

const registerFormRef = ref<FormInstance>();
const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === ThemeEnum.DARK);
const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const loading = ref<boolean>(false);
const token = computed(() => (route.query.token as string) || "");

const emit = defineEmits(["register-success", "back-to-login"]);

const registerForm = ref({
  username: "",
  password: "",
  repassword: "",
});

const validatePass2 = (rule: any, value: any, callback: any) => {
  if (value === "") {
    callback(new Error(t("login.rules.repassword.message1")));
  } else if (value !== registerForm.value.password) {
    callback(new Error(t("login.rules.repassword.message2")));
  } else {
    callback();
  }
};

type Arrayable<T> = T | T[];
const registerRules = computed<Record<string, Arrayable<FormItemRule>>>(() => {
  return {
    username: [
      {
        required: true,
        message: t("login.rules.username.message1"),
        trigger: "blur",
      },
      {
        type: "email",
        message: t("login.rules.username.email"),
        trigger: "blur",
      },
    ],
    password: createPasswordFormRules(t),
    repassword: [
      {
        required: true,
        message: t("login.rules.repassword.message1"),
        trigger: "blur",
      },
      { validator: validatePass2, trigger: "blur" },
    ],
  };
});

function parseRedirect(): {
  path: string;
  queryParams: Record<string, string>;
} {
  const query: LocationQuery = route.query;
  const redirect = (query.redirect as string) ?? "/";

  const url = new URL(redirect, window.location.origin);
  const path = url.pathname;
  const queryParams: Record<string, string> = {};

  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  return { path, queryParams };
}

const register = async () => {
  registerFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      loading.value = true;
      try {
        const response = await WechatApi.register({
          username: registerForm.value.username,
          password: registerForm.value.password,
          token: token.value,
        });
        const data = response?.data;
        if (data?.success) {
          Message.success(t("login.success"));
          Token.setToken(data.token);
          emit("register-success");
          const { path, queryParams } = parseRedirect();
          router.push({ path: path, query: queryParams });
        } else {
          Message.error(t("login.error"));
        }
      } catch (error: unknown) {
        const axiosError = error as {
          response?: { data?: { password?: string[]; message?: string } };
        };
        const passwordErrors = axiosError?.response?.data?.password;
        if (Array.isArray(passwordErrors)) {
          passwordErrors.forEach((msg: string) => Message.error(msg));
        } else {
          Message.error(
            axiosError?.response?.data?.message || t("login.error")
          );
        }
      } finally {
        loading.value = false;
      }
    } else {
      Message.warning(t("login.error"));
    }
  });
};

const backToLogin = () => {
  emit("back-to-login");
};
</script>

<style scoped lang="scss">
.register-form {
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
      color: var(--text-muted, #999);
    }
  }

  .input-icon {
    margin-right: 8px;
    font-size: 16px;
    color: var(--text-muted, #999);
  }
}

.register-button-item {
  margin-top: 24px;
}

.register-button {
  width: 100%;
  height: 42px;
  font-size: 15px;
  border-radius: 8px;
  background: var(--primary-color, #00a8ab);
  border: none;
  transition: all 0.3s;
  color: #fff;

  &:hover {
    transform: translateY(-2px);
    background: var(--primary-hover, #00dbde);
    box-shadow: var(--shadow-lg, 0 6px 16px rgba(0, 171, 173, 0.15));
  }

  &:active {
    transform: translateY(0);
  }
}

.login-link {
  margin-top: 16px;
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary, #666);

  a {
    margin-left: 4px;
    color: var(--primary-color, #00a8ab);
    font-weight: 500;
    text-decoration: none;
    transition: color 0.3s;

    &:hover {
      color: var(--primary-hover, #00dbde);
      text-decoration: underline;
    }
  }
}
</style>
