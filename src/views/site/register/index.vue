<template>
  <div class="content">
    <div :class="['box1', { 'dark-theme': isDark }]">
      <div :class="['box2', { 'dark-theme': isDark }]">
        <h1>{{ $t("login.h1") }}</h1>
        <h4>{{ $t("login.h4") }}</h4>
        <br />
        <el-tabs style="width: 100%" type="border-card" :stretch="true">
          <el-tab-pane :label="$t('login.createAccount')">
            <el-form ref="registerFormRef" class="login-form" :rules="registerRules" :model="registerForm"
              label-width="auto">
              <el-form-item :label="$t('login.username')" prop="username">
                <el-input v-model="registerForm.username" suffix-icon="Message"></el-input>
              </el-form-item>

              <el-form-item :label="$t('login.password')" prop="password">
                <el-input v-model="registerForm.password" type="password" suffix-icon="Lock"></el-input>
                <PasswordStrength :password="registerForm.password" />
              </el-form-item>

              <el-form-item :label="$t('login.repassword')" prop="repassword">
                <el-input v-model="registerForm.repassword" type="password" suffix-icon="Lock"></el-input>
              </el-form-item>

              <el-form-item class="login-button">
                <el-button style="width: 100%" type="primary" @click="register">
                  {{ $t("login.create") }}
                </el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>
        </el-tabs>
        <br />
        <el-button style="width: 100%" @click="back">
          <el-icon>
            <Back></Back>
          </el-icon>
          &nbsp;&nbsp; {{ $t("login.back") }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import "@/assets/font/font.css";
import { LocationQuery, useRoute, useRouter } from "vue-router";
// import { ElMessage } from "element-plus";
import { Message, MessageBox } from "@/components/Dialog";
import { useSettingsStore } from "@/store/modules/settings";
import { FormInstance } from "element-plus";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { onMounted, watch, ref } from "vue";
import { useI18n } from "vue-i18n"; // Ensure you have this import

import WechatApi from "@/api/v1/wechat";
import { RegisterData } from "@/api/auth/model";
import Token from "@/store/modules/token";
import { createPasswordFormRules } from "@/utils/password-validator";
import PasswordStrength from "@/components/PasswordStrength/index.vue";
const { t } = useI18n(); // I18n for translations
const token = computed(() => route.query.token as string);
const settingsStore = useSettingsStore();
const route = useRoute();
const router = useRouter();
const registerFormRef = ref<FormInstance>(); // Separate formRef for register

const isDark = ref<boolean>(settingsStore.theme === ThemeEnum.DARK);

const back = async () => {
  try {
    await MessageBox.confirm("确认放弃注册？", "警告", {
      confirmButtonText: "确认",
      cancelButtonText: "继续注册",
      type: "warning",
    });
    router.push("/site/login");
  } catch (e) {
    console.error(e);
  }
};
const registerForm = ref<RegisterData>({
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
const registerRules = {
  username: [
    {
      required: true,
      message: t("login.rules.username.message1"),
      trigger: "blur",
    },
    {
      type: "email" as const,
      message: "need email",
      trigger: "blur",
    },
  ],
  password: createPasswordFormRules(t),
  repassword: [
    {
      required: true,
      message: t("login.rules.password.message1"),
      trigger: "blur",
    },
    { validator: validatePass2, trigger: "blur" },
  ],
};

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
      try {
        const response = await WechatApi.register({
          username: registerForm.value.username,
          password: registerForm.value.password,
          token: token.value,
        });
        const data = response.data;
        if (data.success) {
          Message.success(t("login.success"));
          Token.setToken(data.token);
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
      }
    } else {
      Message.error(t("login.error"));
    }
  });
};

// Automatically toggle dark theme on mount
onMounted(() => {
  document.body.classList.toggle("dark-theme", isDark.value);
});

// Watch for theme change
watch(isDark, (newValue) => {
  document.body.classList.toggle("dark-theme", newValue);
});
</script>

<style scoped lang="scss">
body {
  position: fixed;
  display: flex;
  flex-direction: column;
  height: 100%;
  margin: 0;
  background-image: url("/media/bg/02.jpg");
  background-size: 100% auto;
  // transition:  0.3s ease;

  &.dark-theme {
    background-image: url("/media/bg/02.jpg");
    filter: brightness(80%);
  }
}

.content {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;

  .box1 {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 450px;
    height: 600px;
    background-color: #fff;

    transition: all 0.3s ease;

    &.dark-theme {
      background-color: rgb(63, 63, 63);
      border-color: #494949;
      color: white;
    }

    .box2 {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: 90%;
      padding: 25px;
      border: 1px solid #ebeefe;
      border-radius: 4px;

      transition: all 0.3s ease;

      &.dark-theme {
        background-color: rgb(52, 52, 52);
        border-color: #494949;
        color: white;
      }

      &:hover {
        box-shadow: 0 0 10px rgb(0 0 0 / 10%);
        transition: all 0.4s;
      }

      h1 {
        margin-top: 0;
        font-family: "KaiTi", sans-serif;
        font-size: 36px;
        font-weight: 400;
      }

      h4 {
        margin-top: 0;
        font-family: "KaiTi", sans-serif;
        font-size: 18px;
        font-weight: 400;
      }

      el-button {
        align-self: center;
        margin-top: 2px;
      }
    }
  }

  .login-title {
    margin: 20px 0;
    font-family: "KaiTi", sans-serif;
    font-weight: bold;
    text-align: center;
  }

  .login-form {
    max-width: 100%;
    height: 100%;
    padding: 0px 0px 0px 0px;
    margin-top: 10px;
  }

  .login-button {
    text-align: right;
  }

  .error-message {
    margin-top: 10px;
    font-family: "KaiTi", sans-serif;
    color: red;
    text-align: center;
  }
}
</style>
