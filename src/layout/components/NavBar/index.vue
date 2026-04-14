<template>
  <!-- 顶部导航栏 - 现代化毛玻璃效果 -->
  <header class="navbar-container header-glass">
    <!-- 左侧 - 汉堡按钮 & 面包屑 -->
    <div class="navbar-left">
      <Hamburger
        id="hamburger-container"
        :is-active="appStore.sidebar.opened"
        class="hamburger-container"
        @toggle-click="toggleSideBar"
      ></Hamburger>
      <IdentityChips
        :site-label="identityDisplay.siteLabel"
        :visible-organizations="identityDisplay.visibleOrganizations"
        :overflow-count="identityDisplay.overflowCount"
      ></IdentityChips>
      <Breadcrumb></Breadcrumb>
      <EditorVersionToolbar></EditorVersionToolbar>
    </div>

    <!-- 右侧 - 操作按钮和用户信息 -->
    <div class="navbar-right">
      <HeaderActions></HeaderActions>
      <UserDropdown></UserDropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useIdentityDisplay } from "@/composables/useIdentityDisplay";
import { useAppStore } from "@/store";
import Breadcrumb from "./components/Breadcrumb.vue";
import IdentityChips from "./components/IdentityChips.vue";
import EditorVersionToolbar from "./components/EditorVersionToolbar.vue";
import HeaderActions from "./components/HeaderActions.vue";
import UserDropdown from "./components/UserDropdown.vue";
import Hamburger from "@/components/Hamburger/index.vue";

const appStore = useAppStore();
const identityDisplay = useIdentityDisplay(2);

function toggleSideBar() {
  appStore.toggleSidebar();
}
</script>

<style lang="scss" scoped>
.navbar-container {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  height: $navbar-height;
  padding: 0 32px;
}

.navbar-left {
  display: flex;
  flex: 1 1 auto;
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.navbar-right {
  display: flex;
  flex-shrink: 0;
  gap: 16px;
  align-items: center;
}
</style>
