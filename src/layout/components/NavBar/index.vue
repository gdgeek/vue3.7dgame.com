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
      <Breadcrumb></Breadcrumb>
    </div>

    <!-- 右侧 - 操作按钮和用户信息 -->
    <div class="navbar-right">
      <HeaderActions></HeaderActions>
      <UserDropdown></UserDropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useAppStore } from "@/store";
import Breadcrumb from "./components/Breadcrumb.vue";
import HeaderActions from "./components/HeaderActions.vue";
import UserDropdown from "./components/UserDropdown.vue";
import Hamburger from "@/components/Hamburger/index.vue";

const appStore = useAppStore();

function toggleSideBar() {
  appStore.toggleSidebar();
}
</script>

<style lang="scss" scoped>
.navbar-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: $navbar-height;
  padding: 0 32px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
</style>
