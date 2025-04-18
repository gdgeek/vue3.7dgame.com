<template>
  <div class="register-form" :class="{ 'dark-theme': isDark }" v-loading="loading">
    <el-form ref="registerFormRef" class="login-form" :rules="registerRules" :model="registerForm" label-position="top">
      <el-form-item :label="$t('login.username')" prop="username" class="form-item">
        <el-input v-model="registerForm.username" placeholder="请输入邮箱" class="custom-input">
          <template #prefix>
            <el-icon class="input-icon">
              <UserFilled />
            </el-icon>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item :label="$t('login.password')" prop="password" class="form-item">
        <el-input v-model="registerForm.password" type="password" placeholder="请输入密码" class="custom-input"
          show-password>
          <template #prefix>
            <el-icon class="input-icon">
              <Lock />
            </el-icon>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item :label="$t('login.repassword')" prop="repassword" class="form-item">
        <el-input v-model="registerForm.repassword" type="password" placeholder="请再次输入密码" class="custom-input"
          show-password>
          <template #prefix>
            <el-icon class="input-icon">
              <Lock />
            </el-icon>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item class="register-button-item">
        <el-button class="register-button" type="primary" @click="register" :loading="loading">
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
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { FormInstance, FormItemRule } from "element-plus";
import { useRouter, LocationQuery, useRoute } from "vue-router";
import { useSettingsStore } from "@/store/modules/settings";
import { ThemeEnum } from "@/enums/ThemeEnum";
import WechatApi from "@/api/v1/wechat";
import Token from "@/store/modules/token";

const registerFormRef = ref<FormInstance>();
const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === ThemeEnum.DARK);
const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const loading = ref<boolean>(false);
const token = computed(() => route.query.token as string || '');

const emit = defineEmits(['register-success', 'back-to-login']);

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
    password: [
      {
        required: true,
        message: t("login.rules.password.message1"),
        trigger: "blur",
      },
      {
        min: 6,
        max: 20,
        message: t("login.rules.password.message2"),
        trigger: "blur",
      },
      {
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/,
        message: t("login.rules.password.message3"),
        trigger: "blur",
      },
    ],
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
          ElMessage({ type: "success", message: t("login.success") });
          Token.setToken(data.token);
          emit('register-success');
          const { path, queryParams } = parseRedirect();
          router.push({ path: path, query: queryParams });
        } else {
          ElMessage({ type: "error", message: t("login.error") });
        }
      } catch (error: any) {
        ElMessage({
          type: "error",
          message: error?.response?.data?.message || t("login.error")
        });
      } finally {
        loading.value = false;
      }
    } else {
      ElMessage({ type: "warning", message: t("login.error") });
    }
  });
};

const backToLogin = () => {
  emit('back-to-login');
};
</script>

<style scoped lang="scss">
.register-form {
  width: 100%;

  &.dark-theme {
    .form-item :deep(.el-form-item__label) {
      color: #ddd;
    }

    .custom-input {
      background-color: #2a2a2a;

      :deep(.el-input__wrapper) {
        background-color: rgba(255, 255, 255, 0.05);
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1) inset;

        &.is-focus {
          box-shadow: 0 0 0 1px #00dbde inset;
        }
      }

      :deep(.el-input__inner) {
        color: #eee;

        &::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
      }

      .input-icon {
        color: rgba(255, 255, 255, 0.5);
      }
    }

    .register-button-item {
      margin-top: 8px;
    }

    .login-link {
      color: #bbb;

      a {
        color: #00dbde;

        &:hover {
          color: #6cffff;
        }
      }
    }
  }
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
    color: #333;
    line-height: 1;
  }
}

.custom-input {
  height: 42px;
  border-radius: 8px;

  :deep(.el-input__wrapper) {
    padding: 0 12px;
    border-radius: 8px;
    background-color: #f8f8f8;
    box-shadow: 0 0 0 1px #e0e0e0 inset;
    transition: all 0.3s;

    &.is-focus {
      box-shadow: 0 0 0 1px #00a8ab inset;
    }
  }

  :deep(.el-input__inner) {
    color: #333;
    font-size: 14px;

    &::placeholder {
      color: #999;
    }
  }

  .input-icon {
    margin-right: 8px;
    font-size: 16px;
    color: #999;
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
  background: linear-gradient(135deg, #00a8ab 0%, #00dbde 100%);
  border: none;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 171, 173, 0.15);
  }

  &:active {
    transform: translateY(0);
  }
}

.login-link {
  margin-top: 16px;
  text-align: center;
  font-size: 14px;
  color: #666;

  a {
    margin-left: 4px;
    color: #00a8ab;
    font-weight: 500;
    text-decoration: none;
    transition: color 0.3s;

    &:hover {
      color: #00dbde;
      text-decoration: underline;
    }
  }
}
</style>