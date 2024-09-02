<template>
  <div class="flex">
    <template v-if="!isMobile">
      <!--全屏 -->
      <div class="setting-item" @click="toggle">
        <svg-icon
          :icon-class="isFullscreen ? 'fullscreen-exit' : 'fullscreen'"
        ></svg-icon>
      </div>

      <!-- 布局大小 -->
      <el-tooltip
        :content="$t('sizeSelect.tooltip')"
        effect="dark"
        placement="bottom"
      >
        <size-select class="setting-item"></size-select>
      </el-tooltip>

      <!-- 语言选择 -->
      <lang-select class="setting-item"></lang-select>
    </template>

    <!-- 用户头像 -->
    <el-dropdown class="setting-item" trigger="click">
      <div class="flex-center h100% p10px">
        <img
          v-if="userStore.userInfo.data.avatar !== null"
          :src="userStore.userInfo.data.avatar.url + '?imageView2/1/w/80/h/80'"
          class="rounded-full mr-10px w24px w24px"
        />
        <span class="gradient-text">{{
          userStore.userInfo.data.nickname || userStore.userInfo.data.username
        }}</span>
      </div>
      <template #dropdown>
        <el-dropdown-menu>
          <RouterLink to="/home/index">
            <el-dropdown-item>{{
              $t("navbar.personalCenter")
            }}</el-dropdown-item>
          </RouterLink>
          <RouterLink to="/settings/account">
            <el-dropdown-item>{{
              $t("navbar.AccountSetting")
            }}</el-dropdown-item>
          </RouterLink>
          <RouterLink to="/">
            <el-dropdown-item>{{ $t("navbar.helpSupport") }}</el-dropdown-item>
          </RouterLink>
          <el-dropdown-item divided @click="logout">
            {{ $t("navbar.logout") }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- 设置 -->
    <template v-if="defaultSettings.showSettings">
      <div class="setting-item" @click="settingStore.settingsVisible = true">
        <svg-icon icon-class="setting"></svg-icon>
      </div>
    </template>
  </div>
</template>
<script setup lang="ts">
import {
  useAppStore,
  useTagsViewStore,
  useUserStore,
  useSettingsStore,
} from "@/store";
import defaultSettings from "@/settings";
import { DeviceEnum } from "@/enums/DeviceEnum";

const appStore = useAppStore();
const tagsViewStore = useTagsViewStore();
const userStore = useUserStore();
const settingStore = useSettingsStore();

const route = useRoute();
const router = useRouter();

const isMobile = computed(() => appStore.device === DeviceEnum.MOBILE);

const { isFullscreen, toggle } = useFullscreen();

/**
 * 注销
 */
const logout = () => {
  ElMessageBox.confirm("确定注销并退出系统吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
    lockScroll: false,
  }).then(() => {
    userStore
      .logout()
      .then(() => {
        tagsViewStore.delAllViews();
      })
      .then(() => {
        router.push(`/login?redirect=${route.fullPath}`);
      });
  });
};

onBeforeMount(() => userStore.getUserInfo());
</script>
<style lang="scss" scoped>
.setting-item {
  display: inline-block;
  min-width: 40px;
  height: $navbar-height;
  line-height: $navbar-height;
  color: var(--el-text-color);
  text-align: center;
  cursor: pointer;

  &:hover {
    background: rgb(0 0 0 / 10%);
  }
}

.layout-top,
.layout-mix {
  .setting-item,
  .el-icon {
    color: var(--el-color-white);
  }
}

.dark .setting-item:hover {
  background: rgb(255 255 255 / 20%);
}

.gradient-text {
  font-family: "KaiTi", "Arial", sans-serif;
  font-size: 16px;
  font-weight: bold;
  background: linear-gradient(
    45deg,
    #ff6a00,
    #7ece6c,
    #9376df,
    #040404
  ); /* 渐变颜色 */
  background-clip: text; /* 标准属性：背景裁剪到文本 */
  -webkit-background-clip: text; /* 使背景渐变应用于文字 */
  -webkit-text-fill-color: transparent; /* 使文字颜色透明以显示背景渐变 */
  text-align: center;
}
</style>
