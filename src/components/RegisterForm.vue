<template>
  <div :class="['box1', { 'dark-theme': isDark }]">
    <div :class="['box2', { 'dark-theme': isDark }]">
      <h1>{{ $t("login.h1") }}</h1>
      <h4>{{ $t("login.h4") }}</h4>
      <br />
      <el-tabs style="width: 100%" type="border-card" :stretch="true">
        <el-tab-pane :label="$t('login.createAccount')">
          <h2 class="login-title">{{ $t("login.createAccount") }}</h2>
          <el-form
            ref="formRef"
            class="login-form"
            :rules="rules"
            :model="form"
            label-width="auto"
          >
            <el-form-item :label="$t('login.username')" prop="username">
              <el-input v-model="form.username" suffix-icon="User"></el-input>
            </el-form-item>
            <el-form-item :label="$t('login.password')" prop="password">
              <el-input
                v-model="form.password"
                type="password"
                suffix-icon="Lock"
              ></el-input>
            </el-form-item>

            <el-form-item :label="$t('login.repassword')" prop="repassword">
              <el-input
                v-model="form.repassword"
                type="password"
                suffix-icon="Lock"
              ></el-input>
            </el-form-item>

            <el-form-item class="login-button">
              <el-button style="width: 100%" type="primary" @click="submit">
                {{ $t("login.create") }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane :label="$t('login.linkAccount')">
          <h2 class="login-title">{{ $t("login.linkAccount") }}</h2>
          <el-form
            ref="formRef"
            class="login-form"
            :rules="rules"
            :model="form"
            label-width="auto"
          >
            <el-form-item :label="$t('login.username')" prop="username">
              <el-input v-model="form.username" suffix-icon="User"></el-input>
            </el-form-item>
            <el-form-item :label="$t('login.password')" prop="password">
              <el-input
                v-model="form.password"
                type="password"
                suffix-icon="Lock"
              ></el-input>
            </el-form-item>

            <el-form-item class="login-button">
              <el-button style="width: 100%" type="primary" @click="submit">
                {{ $t("login.link") }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>
<script setup lang="ts">
import "@/assets/font/font.css";
import { ref, computed, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter, LocationQuery, useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import { useUserStore } from "@/store/modules/user";
import { useSettingsStore } from "@/store/modules/settings";
import { FormInstance } from "element-plus";

const router = useRouter();
const formRef = ref<FormInstance>();
const isShow = ref(false);
const title = ref<string | Record<string, string>>("");

// 加密
import { ThemeEnum } from "@/enums/ThemeEnum";
import type { AppleIdReturn } from "@/api/v1/site";

import AuthAPI from "@/api/auth/index";
import { PostSiteAppleId } from "@/api/v1/site";
import { VueAppleLoginConfig } from "@/utils/helper";
import { TOKEN_KEY } from "@/enums/CacheEnum";
import { RegisterData } from "@/api/auth/model";
const settingsStore = useSettingsStore();
const route = useRoute();

const isDark = ref<boolean>(settingsStore.theme === ThemeEnum.DARK);

const { t } = useI18n();
const form = ref<RegisterData>({
  username: "",
  password: "",
  repassword: "",
});
const validatePass2 = (rule: any, value: any, callback: any) => {
  if (value === "") {
    callback(new Error("Please input the password again"));
  } else if (value !== form.value.password) {
    callback(new Error("Two inputs don't match!"));
  } else {
    callback();
  }
};
const rules = computed(() => {
  return {
    username: [
      {
        required: true,
        message: t("login.rules.username.message1"),
        trigger: "blur",
      },
      { min: 5, message: t("login.rules.username.message2"), trigger: "blur" },
    ],
    password: [
      {
        required: true,
        message: t("login.rules.password.message1"),
        trigger: "blur",
      },
      { min: 6, message: t("login.rules.password.message2"), trigger: "blur" },
    ],
    repassword: [{ validator: validatePass2, trigger: "blur" }],
  };
});
const userStore = useUserStore();

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

const login = async (data: any) => {
  await succeed(data);
  const userin = await userStore.getUserInfo();
  console.log("userin:", userin);
  const { path, queryParams } = await parseRedirect();
  console.log("path:", path, "queryParams:", queryParams);

  await router.push({ path: path, query: queryParams });
};
const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, "Bearer " + token);
};

const succeed = (data: any) => {
  ElMessage.success(t("login.success"));
  const token = data.auth;
  if (token) {
    setToken(token);
    const res = localStorage.getItem(TOKEN_KEY);
    console.log("Token set successfully", res);
    nextTick(() => {
      router.push("/");
      console.log("Routing to home");
    });
  } else {
    failed("The login response is missing the access_token");
  }
};
const error = (msg: string | Record<string, string>) => {
  title.value =
    typeof msg === "string"
      ? msg
      : Object.keys(msg)
          .map((key) => `${key} : ${msg[key]}`)
          .join("\n");
  isShow.value = true;
};

const submit = () => {
  formRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      try {
        const respose = await AuthAPI.login(form.value);

        await login(respose.data);
      } catch (error) {
        failed(error);
      }
    } else {
      ElMessage({ type: "error", message: t("login.error") });
    }
  });
};

const failed = (message: any) => {
  error(message);
};
const onFailure = async (error: any) => {
  ElMessage({ type: "error", message: t("login.appleLoginFail") });
  console.error(error);
  return;
};
const onSuccess = async (data: any) => {
  const respose = await PostSiteAppleId({
    key: "APPLE_MRPP_KEY_ID",
    url: VueAppleLoginConfig.redirectURI,
    data: data,
  });
  const ret: AppleIdReturn = respose.data;
  if (ret.user === null) {
    alert("User does not exist, redirecting to register page");
    // 用户不存在，跳转到注册页面
  } else {
    // 用户存在，跳转到首页
    alert("User exists, redirecting to home page");
    await login(ret.user);
  }
};
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

.blog {
  position: absolute;
  height: 60px;
  margin-left: 300px;
  font-size: 14px;
  font-weight: 400;
  line-height: 60px;
  color: #909399;

  &:hover {
    color: #000;
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
      height: 90%;
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
    padding: 10px 0px 10px 0px;
    margin-top: 36px;
  }

  .login-button {
    text-align: right;
  }

  .login-link {
    padding: 0 10px;
    margin-bottom: 20px;
  }

  .login-link a {
    font-family: "KaiTi", sans-serif;
    font-size: 16px;
    color: rgb(28 160 212);
  }

  .error-message {
    margin-top: 10px;
    font-family: "KaiTi", sans-serif;
    color: red;
    text-align: center;
  }
}
</style>
