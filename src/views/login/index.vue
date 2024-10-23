<template>
  <body :class="{ 'dark-theme': isDark }">
    <div :class="['header', { 'dark-theme': isDark }]">
      <RouterLink to="/" class="logo">
        <img src="/favicon.ico" alt="" />
        <span class="project_title">{{ $t("login.title") }}</span>
      </RouterLink>
      <div class="link" style="margin-left: 250px">
        <el-link
          href="https://testflight.apple.com/join/V4XNEG6t"
          target="_blank"
          :underline="false"
        >
          <img src="/testflight.ico" style="width: 25px" alt="" />
          <span style="margin-left: 5px">TestFlight</span>
        </el-link>

        <el-link
          href="https://discord.gg/KhkJySu7bb"
          target="_blank"
          :underline="false"
          style="margin-left: 30px"
        >
          <img src="/discord.ico" style="width: 25px" alt="" />
          <span style="margin-left: 5px">Discord</span>
        </el-link>

        <el-link
          href="https://x.com/GD_Geek"
          target="_blank"
          :underline="false"
          style="margin-left: 30px"
        >
          <img src="/x3.png" style="width: 25px; border-radius: 25%" alt="" />
          <span style="margin-left: 5px">X.com</span>
        </el-link>
      </div>
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
      </div>
    </div>
    <div v-if="route.path === '/login'" class="content">
      <login-form
        v-if="!appleIdToken"
        ref="loginFormRef"
        @enter="enter"
        @register="register"
      ></login-form>
      <register-form
        v-else
        @enter="enter"
        :idToken="appleIdToken"
      ></register-form>
    </div>
    <div v-else-if="route.path === '/logout'" class="content">
      <div :class="['box', { 'dark-theme': isDark }]">
        <el-card shadow="hover" :body-style="{ padding: '15px' }">
          <div class="logout-head">
            <h1 class="logout-welcome">{{ t("login.logout.title") }}</h1>
            <p class="logout-text">{{ t("login.logout.text") }}</p>
            <div>
              <p class="logout-lead"></p>
            </div>
          </div>
        </el-card>
      </div>
    </div>
    <el-card
      style="
        height: 7%;
        width: 100%;
        display: flex;
        justify-content: flex-end;
        align-items: center;
      "
    >
      <div class="background-screen-max">
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
import { useRouter, LocationQuery, useRoute } from "vue-router";
import { AppleIdToken } from "@/api/auth/model";
import LoginForm from "@/components/LoginForm.vue";
import RegisterForm from "@/components/RegisterForm.vue";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { useSettingsStore } from "@/store/modules/settings";
import { useInfomationStore } from "@/store/modules/information";
import { useTagsViewStore, useUserStore } from "@/store";
import { TOKEN_KEY } from "@/enums/CacheEnum";
import AuthAPI from "@/api/auth";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const tagsViewStore = useTagsViewStore();
const informationStore = useInfomationStore();
const settingsStore = useSettingsStore();
const { t } = useI18n();
const isDark = ref<boolean>(settingsStore.theme === ThemeEnum.DARK);
const loginFormRef = ref<InstanceType<typeof LoginForm>>();

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

const enter = async (
  user: any,
  form: any,
  resolve: () => void,
  reject: (message: string) => void
) => {
  try {
    ElMessage.success(t("login.success"));
    const token = user.auth;
    if (token) {
      localStorage.setItem(TOKEN_KEY, "Bearer " + token);
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
  }
};

const appleIdToken = ref<AppleIdToken | null>(null);
const register = (idToken: AppleIdToken) => {
  appleIdToken.value = idToken;
};
/** 主题切换 */
const toggleTheme = () => {
  const newTheme =
    settingsStore.theme === ThemeEnum.DARK ? ThemeEnum.LIGHT : ThemeEnum.DARK;
  settingsStore.changeTheme(newTheme);
};

watch(
  () => route.path,
  async (newPath) => {
    if (newPath === "/logout") {
      await userStore.logout();
      await tagsViewStore.delAllViews();
      setTimeout(() => {
        router.push("/login?redirect=/home/index");
      }, 1000);
    }
  },
  { immediate: true }
);
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
    // font-size: 14px;
    font-weight: 600;

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

.box {
  position: relative;
  height: auto;
  width: 400px;
  max-width: 100%;
  padding: 10px 10px 10px 10px;
  margin: 0 auto;
  margin-bottom: 20px;
  border-radius: 5px;
  background-color: #fff;
  overflow: hidden;

  transition: all 0.3s ease;

  &.dark-theme {
    background-color: rgb(63, 63, 63);
    border-color: #494949;
    color: white;
  }
}

.logout-head {
  padding: 10px;
  max-width: 100%;
}

.logout-title {
  font-size: 14px;
  padding: 10px;
  text-align: center;
  color: #666;
}

.logout-welcome {
  margin-top: 20px;
  font-size: 36px;
  font-weight: normal;
  color: #666;
}

.logout-text {
  font-size: 21px;
  font-weight: lighter;
  color: #666;
}

.logout-lead {
  font-size: 21px;
  font-weight: lighter;
  color: #666;
}
</style>
