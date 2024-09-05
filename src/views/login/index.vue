<template>
  <body :class="{ 'dark-theme': isDark }">
    <div :class="['header', { 'dark-theme': isDark }]">
      <RouterLink to="/" class="logo">
        <img src="/favicon.ico" alt="" />
        <span class="project_title">{{ $t("login.title") }}</span>
      </RouterLink>
      <div class="header-right">
        <div class="top-bar">
          <el-switch
            v-model="isDark"
            inline-prompt
            active-icon="Moon"
            inactive-icon="Sunny"
            @change="toggleTheme"
          ></el-switch>
          <lang-select
            class="ml-2 cursor-pointer"
            style="margin-left: 25px"
          ></lang-select>
        </div>
        <el-button>{{ $t("login.register") }}</el-button>
      </div>
    </div>
    <div class="content">
      <div :class="['box1', { 'dark-theme': isDark }]">
        <div :class="['box2', { 'dark-theme': isDark }]">
          <h1>{{ $t("login.h1") }}</h1>
          <h4>{{ $t("login.h4") }}</h4>
          <div :class="['box3', { 'dark-theme': isDark }]">
            <h2 class="login-title">{{ $t("login.loginTitle") }}</h2>
            <el-form
              ref="formRef"
              class="login-form"
              :rules="rules"
              :model="form"
              label-width="75px"
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
                  {{ $t("login.login") }}
                </el-button>
              </el-form-item>
            </el-form>
            <!-- <div class="login-link">
          <router-link to="/site/signup">
            <el-link type="primary" :underline="false">注册用户</el-link>
          </router-link>
          <br />
          <router-link to="/site/request-password-reset">
            <el-link type="primary" :underline="false">找回密码</el-link>
          </router-link>
          <br />
        </div> -->
            <!-- <div v-if="isShow" class="error-message">{{ title }}</div> -->
          </div>
          <el-button style="width: 100%" size="small">
            {{ $t("login.download") }}
          </el-button>
        </div>
      </div>
    </div>
    <el-card style="width: 100%">
      <div
        class="background-screen-max"
        style="display: flex; justify-content: flex-end"
      >
        <div style="display: flex; align-items: center; gap: 10px">
          <span
            v-for="item in informationStore.companies"
            :key="item.name"
            style="display: flex; align-items: center"
          >
            <el-link
              :href="item.url"
              target="_blank"
              :underline="false"
              style="display: flex; align-items: center"
            >
              <el-icon>
                <HomeFilled></HomeFilled>
              </el-icon>
              <span class="font-text" style="margin-left: 5px">
                {{ item.name }} ({{ informationStore.description }})
              </span>
            </el-link>
          </span>

          <span
            v-if="informationStore.beian"
            style="display: flex; align-items: center"
          >
            |
            <el-link
              href="https://beian.miit.gov.cn/"
              target="_blank"
              :underline="false"
              style="display: flex; align-items: center; margin-left: 10px"
            >
              <el-icon>
                <Grid></Grid>
              </el-icon>
              <span class="font-text" style="margin-left: 5px">
                {{ informationStore.beian }}
              </span>
            </el-link>
          </span>

          <span
            v-if="informationStore.version"
            style="display: flex; align-items: center"
          >
            |
            <el-link
              target="_blank"
              :underline="false"
              style="display: flex; align-items: center; margin-left: 10px"
            >
              <el-icon>
                <InfoFilled></InfoFilled>
              </el-icon>
              <span class="font-text" style="margin-left: 5px">
                {{ informationStore.version }}
              </span>
            </el-link>
          </span>
        </div>
      </div>
    </el-card>
  </body>
</template>

<script setup lang="ts">
import "@/assets/font/font.css";
import { ref, computed, nextTick, onMounted } from "vue";
import { RouterLink, useRouter, LocationQuery, useRoute } from "vue-router";
import { FormInstance } from "element-plus";
import { useUserStore } from "@/store/modules/user";
import { LoginData } from "@/api/auth/model";
import { TOKEN_KEY } from "@/enums/CacheEnum";
import AuthAPI from "@/api/auth/index";
import { initRoutes } from "@/router";
import CryptoJS from "crypto-js";
import defaultSettings from "@/settings";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { useSettingsStore } from "@/store/modules/settings";
import { useInfomationStore } from "@/store/modules/information";

const informationStore = useInfomationStore();
const { t } = useI18n();

const secretKey = "bujiaban"; // 密钥

const userStore = useUserStore();
const settingsStore = useSettingsStore();
const route = useRoute();

const isDark = ref(settingsStore.theme === ThemeEnum.DARK);

const form = ref<LoginData>({
  username: "",
  password: "",
});

// 加密
const encryptedPassword = (password: string): string => {
  return CryptoJS.AES.encrypt(password, secretKey).toString();
};
// 解密
const decryptPassword = (encryptedPassword: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedPassword, secretKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// 保存用户数据到本地
const saveLoginData = () => {
  const expirationTime = Date.now() + 24 * 60 * 60 * 1000; // 24小时有效
  localStorage.setItem("username", form.value.username);
  localStorage.setItem("password", encryptedPassword(form.value.password));
  localStorage.setItem("expirationTime", expirationTime.toString());
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
  };
});

const router = useRouter();
const formRef = ref<FormInstance>();
const isShow = ref(false);
const title = ref<string | Record<string, string>>("");

/** 主题切换 */
const toggleTheme = () => {
  const newTheme =
    settingsStore.theme === ThemeEnum.DARK ? ThemeEnum.LIGHT : ThemeEnum.DARK;
  settingsStore.changeTheme(newTheme);
};

const succeed = (data: any) => {
  ElMessage.success(t("login.success"));
  const token = data.access_token;
  if (token) {
    setToken(token);
    saveLoginData();
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

const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, "Bearer " + token);
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

const failed = (message: any) => {
  error(message);
};

const submit = () => {
  formRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      try {
        const res = await AuthAPI.login(form.value);
        await initRoutes();
        // await setupRoutes(1);
        await window.location.reload();
        await succeed(res.data);
        const userin = await userStore.getUserInfo();
        console.log("userin:", userin);
        const { path, queryParams } = await parseRedirect();
        console.log("path:", path, "queryParams:", queryParams);
        await router.push({ path: path, query: queryParams });
      } catch (error) {
        failed(error);
      }
    } else {
      ElMessage({ type: "error", message: t("login.error") });
    }
  });
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

onMounted(() => {
  const savedUsername = localStorage.getItem("username");
  const savedPassword = localStorage.getItem("password");
  const savedExpirationTime = localStorage.getItem("expirationTime");

  if (savedExpirationTime) {
    const expirationTime = parseInt(savedExpirationTime, 10);
    if (Date.now() > expirationTime) {
      // 密码已过期，清除保存的密码
      // localStorage.removeItem("username");
      localStorage.removeItem("password");
      localStorage.removeItem("expirationTime");
    } else {
      if (savedUsername) {
        form.value.username = savedUsername;
      }
      if (savedPassword) {
        form.value.password = decryptPassword(savedPassword);
      }
    }
  }
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
    color: #909399;
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
        color: #666;
      }

      h4 {
        margin-top: 0;
        font-family: "KaiTi", sans-serif;
        font-size: 18px;
        font-weight: 400;
        color: #666;
      }

      .box3 {
        align-self: center;
        width: 350px;
        height: 300px;
        margin-top: 20px;
        margin-bottom: 20px;
        background-color: #fff;
        border: 1px solid #ebeefe;

        transition: all 0.3s ease;

        &.dark-theme {
          background-color: rgb(41, 41, 41);
          border-color: #1f1f1f;
          font-style: white;
        }

        &:hover {
          box-shadow: 0 0 10px rgb(0 0 0 / 20%);
          transition: all 0.4s;
        }
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
    color: #444;
    text-align: center;
  }

  .login-form {
    max-width: 100%;
    height: 100%;
    padding: 10px 40px 0 10px;
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
