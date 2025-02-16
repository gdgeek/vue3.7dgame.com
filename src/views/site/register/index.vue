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
            <Back />
          </el-icon>
          &nbsp;&nbsp;

          返回
        </el-button>
      </div>
    </div>
  </div>

</template>

<script setup lang="ts">
import "@/assets/font/font.css";
import { LocationQuery, useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useSettingsStore } from "@/store/modules/settings";
import { FormInstance ,FormItemRule} from "element-plus";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { onMounted, watch, ref } from "vue";
import { useI18n } from "vue-i18n"; // Ensure you have this import
import type { AppleIdToken } from "@/api/auth/model";
import WechatApi from "@/api/v1/wechat";
import { RegisterData, } from "@/api/auth/model";
import Token from "@/store/modules/token";
const { t } = useI18n(); // I18n for translations
const token = computed(() => route.query.token as string);
const settingsStore = useSettingsStore();
const route = useRoute();
const router = useRouter();
const registerFormRef = ref<FormInstance>(); // Separate formRef for register

const isDark = ref<boolean>(settingsStore.theme === ThemeEnum.DARK);

const back = async () => {
  try {

    await ElMessageBox.confirm('确认放弃注册？', '警告', {
      confirmButtonText: '确认',
      cancelButtonText: '继续注册',
      type: 'warning',
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
type Arrayable<T> = T | T[];
const registerRules: Partial<Record<string, Arrayable<FormItemRule>>> = {
  username: [
    {
      required: true,
      message: t("login.rules.username.message1"),
      trigger: "blur",
    },
    {
      type: "email",
      message: 'need email',
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
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/i,
      message: t("login.rules.password.message3"),
      trigger: "blur",
    },
  ],
  repassword: [
    {
      required: true,
      message: t("login.rules.password.message1"),
      trigger: "blur",
    },
    { validator: validatePass2, trigger: "blur" }],
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
      const response = await WechatApi.register({
        username: registerForm.value.username,
        password: registerForm.value.password, token: token.value
      });
      const data = response.data;
      if (data.success) {
        ElMessage({ type: "success", message: t("login.success") });
        Token.setToken(data.token);
        const { path, queryParams } = parseRedirect();
        router.push({ path: path, query: queryParams });
      } else {
        ElMessage({ type: "error", message: t("login.error") });
      }
    } else {
      ElMessage({ type: "error", message: t("login.error") });
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

.header {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 7%;
  margin-right: 10px;
  background-color: #f1f1f1;

  transition: background-color 0.3s ease;
  padding: 10px;

  &.dark-theme {
    background-color: rgb(37, 37, 37);
    // color: white;
  }
}

.logo {
  position: absolute;
  left: 10px;

  img {
    width: 32px;
    height: 32px;
    margin-left: 12px;
    vertical-align: middle;
  }

  .project_title {
    margin-left: 10px;
    font-family: "KaiTi", sans-serif;
    font-size: 14px;
    font-weight: 400;

    &:hover {
      color: #3876c2;
    }
  }
}

.header-right {
  position: absolute;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;

  .top-bar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-right: 20px;
    width: 100%;
    padding: 10px;
  }
}

.content {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  // width: 100%;
  // background-image: url("/media/bg/02.jpg");
  // background-size: 100% auto;

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
