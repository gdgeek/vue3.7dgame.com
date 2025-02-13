<template>
  <div v-loading="loading" :class="['box1', { mobile: isMobile, 'dark-theme': isDark }]">
    <div :class="['box2', { 'dark-theme': isDark }]">
      <h1>{{ $t("login.h1") }}</h1>
      <h4>{{ $t("login.h4") }}</h4>
      <br />
      <el-card style="width: 100%" shadow="never">
        <span>登录账号</span>
        <br>
        <br>
        <name-password />
      </el-card>
      <br />
      <div style="width: 100%" shadow="never" class="apple-login-container">


        <wechat />


        <vue-apple-login style="width: 100%; height: 28px; margin-top: 5px; " @click="loading = true"
          class="appleid_button" width="100%" height="20px" mode="center-align" type="sign in" :color="appleLoginColor"
          :key="isDark" :onSuccess="onSuccess" :onFailure="onFailure"></vue-apple-login>

      </div>


      <br>


    </div>
  </div>
</template>
<script setup lang="ts">
import "@/assets/font/font.css";
import { useSettingsStore } from "@/store/modules/settings";
import { ThemeEnum } from "@/enums/ThemeEnum";
import type { AppleIdReturn } from "@/api/v1/site";
import { PostSiteAppleId } from "@/api/v1/site";
import { VueAppleLoginConfig } from "@/utils/helper";
import NamePassword from "./Account/NamePassword.vue";
import Wechat from "./Account/Wechat.vue";
import { useUserStore } from "@/store";
const settingsStore = useSettingsStore();
const userStore = useUserStore();
const isDark = computed<boolean>(() => settingsStore.theme === ThemeEnum.DARK);
const appleLoginColor = computed(() => (isDark.value ? "black" : "white"));
import { TOKEN_KEY } from "@/enums/CacheEnum";
const loading = ref<boolean>(false);

import { useRouter, LocationQuery, useRoute } from "vue-router";
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
const emit = defineEmits(["register", "enter"]);
const login = async (user: any) => {

  return new Promise<void>(async (resolve, reject) => {
    try {
      ElMessage.success(t("login.success"));
      const token = user.auth;
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        nextTick();
      } else {
        ElMessage.error("The login response is missing the access_token");
      }
      await userStore.getUserInfo();

      userStore.setupRefreshInterval(form.value);

      const { path, queryParams } = parseRedirect();
      router.push({ path: path, query: queryParams });
      resolve();
    } catch (e: any) {
      reject(e.message);

    };
  });
}

const onFailure = async (error: any) => {
  loading.value = false;
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
    emit("register", {
      apple_id: ret.apple_id,
      token: ret.token,
    });
    // 用户不存在，跳转到注册页面
  } else {
    try {
      await login(ret.user);
    } catch (e: any) {
      ElMessage.error(e.message);
      loading.value = false;
    }
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

  .box1 {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 450px;
    height: 90%;
    background-color: #fff;
    transition: all 0.3s ease;

    &.dark-theme {
      background-color: rgb(63, 63, 63);
      border-color: #494949;
      color: white;
    }

    &.mobile {
      width: 430;
      height: 100%;
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
    // padding: 10px 0px 10px 0px;
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

  .apple-login-container {
    justify-content: center;
    width: 100%;
  }
}
</style>
