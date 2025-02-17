<template>
  <div class="flex">
    <template v-if="!isMobile">
      <!--全屏 -->
      <div class="setting-item" @click="toggle">
        <svg-icon :icon-class="isFullscreen ? 'fullscreen-exit' : 'fullscreen'"></svg-icon>
      </div>

      <!-- 布局大小 -->
      <!-- <el-tooltip
        :content="$t('sizeSelect.tooltip')"
        effect="dark"
        placement="bottom"
      >
        <size-select class="setting-item"></size-select>
      </el-tooltip> -->

      <!-- 语言选择 -->
      <lang-select class="setting-item"></lang-select>
    </template>
    <div>

      <!-- 或者独立使用它，不从父级获取属性 -->

    </div>
    <!-- 用户头像 -->
    <el-dropdown class="setting-item" trigger="click">
      <div class="flex-center h100% p10px">

        <img v-if="avatarUrl !== null" :src="avatarUrl + '?imageView2/1/w/80/h/80'"
          class="rounded-md mr-10px w24px w24px" />

        <el-avatar v-else shape="square" :size="24" class="mr-10px "
          src="https://cube.elemecdn.com/9/c2/f0ee8a3c7c9638a54940382568c9dpng.png" />

        <span :class="['gradient-text', { mobile: isMobile }]">{{
          nickname
          }}</span>
      </div>
      <template #dropdown>
        <el-dropdown-menu>
          <RouterLink to="/home/index">
            <el-dropdown-item>{{
              $t("navbar.personalCenter")
            }}</el-dropdown-item>
          </RouterLink>
          <!-- <RouterLink to="/settings/account">
            <el-dropdown-item>{{
              $t("navbar.AccountSetting")
            }}</el-dropdown-item>
          </RouterLink> -->
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
const { t } = useI18n();

const isMobile = computed(() => appStore.device === DeviceEnum.MOBILE);
const nickname = ref<string | null>(null);
const avatarUrl = ref<string | null>(null);
const { isFullscreen, toggle } = useFullscreen();
watch(() => userStore.userInfo, (newUserInfo) => {

  if (newUserInfo.id !== 0) {
    nickname.value = newUserInfo.userData.nickname ?? newUserInfo.userData.username;

    avatarUrl.value = newUserInfo.userInfo?.avatar?.url ?? null;
  }
}, { deep: true, immediate: true });
/**
 * 注销
 */
const logout = async () => {
  try {
    await ElMessageBox.confirm(t("login.logout.message1"), t("login.logout.message2"), {
      confirmButtonText: t("login.logout.confirm"),
      cancelButtonText: t("login.logout.cancel"),
      type: "warning",
      lockScroll: false,
    })

    await userStore.logout();
    router.push("/site/logout");
  } catch (e) {
    console.error(e);
  }

};

//onBeforeMount(() => userStore.getUserInfo());
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

  font-size: 14px;

}
</style>
