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
      </div>
    </div>

    <div class="content">
      <login-form
        v-if="!registerToken"
        @login="login"
        @register="register"
      ></login-form>
      <register-form
        v-else
        @login="login"
        :token="registerToken"
      ></register-form>
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
import { ref, onMounted } from "vue";
import { useRouter, LocationQuery, useRoute } from "vue-router";
import LoginForm from "@/components/LoginForm.vue";
import RegisterForm from "@/components/RegisterForm.vue";
//import { initRoutes } from "@/router";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { useSettingsStore } from "@/store/modules/settings";
import { useInfomationStore } from "@/store/modules/information";

const router = useRouter();
const route = useRoute();

const informationStore = useInfomationStore();

const settingsStore = useSettingsStore();

const isDark = ref<boolean>(settingsStore.theme === ThemeEnum.DARK);
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
const login = () => {
  const { path, queryParams } = parseRedirect();
  router.push({ path: path, query: queryParams });
};
const registerToken = ref<string | null>(null);
const register = (token: string) => {
  registerToken.value = token;
};
/** 主题切换 */
const toggleTheme = () => {
  const newTheme =
    settingsStore.theme === ThemeEnum.DARK ? ThemeEnum.LIGHT : ThemeEnum.DARK;
  settingsStore.changeTheme(newTheme);
};

onMounted(() => {});
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
}
</style>
