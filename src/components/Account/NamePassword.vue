<template>
  <div class="name-password-form" :class="{ 'dark-theme': isDark }" v-loading="loading">
    <el-card class="login-card" :body-style="{ padding: '20px' }">

      <el-form ref="formRef" class="login-form" :rules="rules" :model="form" label-position="top">
        <el-form-item :label="''" prop="username" class="form-item">
          <el-input v-model="form.username" placeholder="请输入用户名/邮箱" class="custom-input">
            <template #prefix>
              <el-icon class="input-icon">
                <UserFilled />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item :label="''" prop="password" class="form-item">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" class="custom-input" show-password>
            <template #prefix>
              <el-icon class="input-icon">
                <Lock />
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
import request from "@/utils/request";
import { UserInfoReturnType } from "@/api/user/model";
import "@/assets/font/font.css";
import { FormInstance } from "element-plus";
import { useRouter, LocationQuery, useRoute } from "vue-router";
import { useUserStore } from "@/store";
import { useSettingsStore } from "@/store/modules/settings";
import { ThemeEnum } from "@/enums/ThemeEnum";

const formRef = ref<FormInstance>();
const userStore = useUserStore();
const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === ThemeEnum.DARK);
const rememberMe = ref(false);

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

const emit = defineEmits(['login-success', 'switch-to-register']);

const submit = () => {
  formRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      loading.value = true;
      try {
        await userStore.login(form.value);
        await userStore.getUserInfo();
        const { path, queryParams } = parseRedirect();
        emit('login-success');
        router.push({ path: path, query: queryParams });
      } catch (e: any) {
        loading.value = false;
        let errorMessage = "登录失败，请稍后再试";
        ElMessage.error(errorMessage);
      }
    } else {
      ElMessage.warning("请输入正确的登录信息");
    }
  });
};

// 处理忘记密码
const handleForgotPassword = () => {
  ElMessage.info('请联系管理员重置密码');
  // 或者可以跳转到密码重置页面
  // router.push('/reset-password');
};

// 处理注册新账号
const handleRegister = () => {
  router.push('/signup');
};

// 切换到注册选项卡
const switchToRegister = () => {
  emit('switch-to-register');
};
</script>

<style scoped lang="scss">
.name-password-form {
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

    .login-options {
      .remember-me {
        :deep(.el-checkbox__label) {
          color: #ddd;
        }
      }

      .forgot-password {
        color: #00dbde;

        &:hover {
          color: #6cffff;
        }
      }
    }

    .register-link {
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
    font-size: 16px;
    color: #999;
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
      color: #666;
    }
  }

  .forgot-password {
    font-size: 14px;
    color: #00a8ab;
    text-decoration: none;
    transition: color 0.2s;

    &:hover {
      color: #008385;
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
  background: linear-gradient(90deg, #00a8ab 0%, #bfbfbf 100%);
  border: none;
  font-weight: 500;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
    background: linear-gradient(90deg, #bfbfbf 0%, #00a8ab 100%);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(0);
  }
}

.register-link {
  text-align: center;
  font-size: 14px;
  color: #666;

  a {
    margin-left: 4px;
    color: #00a8ab;
    text-decoration: none;
    transition: color 0.2s;

    &:hover {
      color: #008385;
      text-decoration: underline;
    }
  }
}
</style>
