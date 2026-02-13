<template>
  <div class="name-password-form" :class="{ 'dark-theme': isDark }" v-loading="loading">
    <el-card class="login-card" :body-style="{ padding: '20px' }">
      <el-form ref="formRef" class="login-form" :rules="rules" :model="form" label-position="top">
        <el-form-item :label="''" prop="username" class="form-item">
          <el-input v-model="form.username" placeholder="请输入用户名/邮箱" class="custom-input">
            <template #prefix>
              <el-icon class="input-icon">
                <UserFilled></UserFilled>
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item :label="''" prop="password" class="form-item">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" class="custom-input" show-password>
            <template #prefix>
              <el-icon class="input-icon">
                <Lock></Lock>
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <!-- 记住我和忘记密码
        <div class="login-options">
          <el-checkbox v-model="rememberMe" label="记住我" class="remember-me" />
          <a class="forgot-password" href="#" @click.prevent="handleForgotPassword">忘记密码?</a>
  </div>
  -->

        <el-form-item class="login-button-item">
          <el-button class="login-button" type="primary" @click="submit" :loading="loading">
            {{ $t("login.login") }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import "@/assets/font/font.css";
import { FormInstance } from "element-plus";
import { useRouter, LocationQuery, useRoute } from "vue-router";
import { useUserStore } from "@/store";
import { useSettingsStore } from "@/store/modules/settings";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { Message } from "@/components/Dialog";

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
  const redirect = (query.redirect as string) ?? "/";
  const url = new URL(redirect, window.location.origin);
  const path = url.pathname;
  const queryParams: Record<string, string> = {};

  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  return { path, queryParams };
};

import type { FormItemRule } from "element-plus";

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
      } catch (e: any) {
        loading.value = false;
        let errorMessage = "登录失败，请稍后再试";
        Message.error(errorMessage);
      }
    } else {
      Message.warning("请输入正确的登录信息");
    }
  });
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
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  .remember-me {
    :deep(.el-checkbox__label) {
      font-size: 14px;
      color: var(--text-secondary, #666);
    }
  }

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
