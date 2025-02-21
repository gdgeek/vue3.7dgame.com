<template>
  <body :class="{ 'dark-theme': isDark }">
    <div :class="['header', { 'dark-theme': isDark }]">
      <div style="height: 30px" v-if="!isMobile">
        <RouterLink to="/introduce" class="logo">
          <img src="/favicon.ico" alt="" />
          <span class="project_title">{{ $t("login.title") }}</span>
        </RouterLink>
        <div class="link" style="margin-left: 250px">
          <!--
          <el-link href="https://testflight.apple.com/join/V4XNEG6t" target="_blank" :underline="false">
            <img src="/testflight.ico" style="width: 25px" alt="" />
            <span style="margin-left: 5px">TestFlight</span>
          </el-link>

          <el-link href="https://discord.gg/KhkJySu7bb" target="_blank" :underline="false" style="margin-left: 30px">
            <img src="/discord.ico" style="width: 25px" alt="" />
            <span style="margin-left: 5px">Discord</span>
          </el-link>

          <el-link href="https://x.com/GD_Geek" target="_blank" :underline="false" style="margin-left: 30px">
            <img src="/x3.png" style="width: 26px; border-radius: 25%" alt="" />
            <span style="margin-left: 5px">X.com</span>
          </el-link>-->
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
      <!-- 移动端 -->
      <div class="mobile" v-else>
        <el-dropdown>
          <span class="">
            <img
              src="/favicon.ico"
              alt=""
              style="margin-left: 10px; width: auto"
            />
            <span class="project_title">{{ $t("login.title") }}</span>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                ><el-link
                  href="https://testflight.apple.com/join/V4XNEG6t"
                  target="_blank"
                  :underline="false"
                >
                  <img src="/testflight.ico" style="width: 25px" alt="" />
                  <span style="margin-left: 5px">TestFlight</span>
                </el-link></el-dropdown-item
              >
              <el-dropdown-item
                ><el-link
                  href="https://discord.gg/KhkJySu7bb"
                  target="_blank"
                  :underline="false"
                >
                  <img src="/discord.ico" style="width: 25px" alt="" />
                  <span style="margin-left: 5px">Discord</span>
                </el-link></el-dropdown-item
              >
              <el-dropdown-item
                ><el-link
                  href="https://x.com/GD_Geek"
                  target="_blank"
                  :underline="false"
                >
                  <img
                    src="/x3.png"
                    style="width: 26px; border-radius: 25%"
                    alt=""
                  />
                  <span style="margin-left: 5px">X.com</span>
                </el-link></el-dropdown-item
              >
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <div class="header-right">
          <div :class="['top-bar', { mobile: isMobile }]">
            <el-switch
              v-model="isDark"
              inline-prompt
              active-icon="Moon"
              inactive-icon="Sunny"
              @change="toggleTheme"
            ></el-switch>
            <lang-select
              class="ml-2 cursor-pointer"
              style="margin-left: 10px"
            ></lang-select>
          </div>
        </div>
      </div>
    </div>
    <!-- 子路由内容将渲染在这里 -->
    <router-view></router-view>

    <el-card
      v-if="!isMobile"
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
            v-if="informationStore.privacyPolicy"
            style="display: flex; align-items: center"
          >
            |
            <el-link
              :href="informationStore.privacyPolicy.url"
              target="_blank"
              :underline="false"
              style="display: flex; align-items: center; margin-left: 10px"
            >
              <el-icon>
                <Briefcase></Briefcase>
              </el-icon>
              <span class="font-text" style="margin-left: 5px">
                {{ informationStore.privacyPolicy.name }}
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

    <el-card v-if="isMobile" style="width: 100%">
      <div class="background-screen-max">
        <div
          style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap"
        >
          <span
            v-for="item in informationStore.companies"
            :key="item.name"
            style="display: flex; align-items: center; width: 100%"
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
        </div>
        <div
          style="
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
          "
        >
          <span
            v-if="informationStore.beian"
            style="display: flex; align-items: center; flex: 2"
          >
            <el-link
              href="https://beian.miit.gov.cn/"
              target="_blank"
              :underline="false"
              style="display: flex; align-items: center"
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
            v-if="informationStore.privacyPolicy"
            style="
              display: flex;
              align-items: center;
              flex: 1;
              justify-content: center;
            "
          >
            <el-link
              :href="informationStore.privacyPolicy.url"
              target="_blank"
              :underline="false"
              style="display: flex; align-items: center"
            >
              <el-icon>
                <Briefcase></Briefcase>
              </el-icon>
              <span class="font-text" style="margin-left: 5px">
                {{ informationStore.privacyPolicy.name }}
              </span>
            </el-link>
          </span>

          <span
            v-if="informationStore.version"
            style="
              display: flex;
              align-items: center;
              flex: 1;
              justify-content: flex-end;
            "
          >
            <el-link
              target="_blank"
              :underline="false"
              style="display: flex; align-items: center"
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
import { useRouter, useRoute } from "vue-router";

import { ThemeEnum } from "@/enums/ThemeEnum";
import { useSettingsStore } from "@/store/modules/settings";
import { useInfomationStore } from "@/store/modules/information";
import { useTagsViewStore, useUserStore, useScreenStore } from "@/store";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const tagsViewStore = useTagsViewStore();
const informationStore = useInfomationStore();
const settingsStore = useSettingsStore();
const isDark = ref<boolean>(settingsStore.theme === ThemeEnum.DARK);
const screenStore = useScreenStore();
const isMobile = computed(() => screenStore.isMobile);

/** 主题切换 */
const toggleTheme = () => {
  const newTheme =
    settingsStore.theme === ThemeEnum.DARK ? ThemeEnum.LIGHT : ThemeEnum.DARK;
  settingsStore.changeTheme(newTheme);
};

watch(
  () => route.path,
  async (newPath) => {
    if (newPath === "/site/logout") {
      await userStore.logout();
      await tagsViewStore.delAllViews();
      setTimeout(() => {
        router.push("/");
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

  &.dark-theme {
    filter: brightness(80%);
  }
}

.header {
  position: relative;
  display: flex;
  align-items: center;
  width: 102%;
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
    width: 30px;
    height: 30px;
    margin-left: 20px;
    vertical-align: middle;
  }
}

.project_title {
  margin-left: 10px;
  font-size: 20px;
  font-family: "KaiTi", "STKaiti", "华文楷体", "楷体", serif;
  font-weight: 600;

  &:hover {
    color: #3876c2;
  }
}

.header-right {
  position: absolute;
  top: 0px;
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

    &.mobile {
      margin-right: 0px;
    }
  }
}
</style>
