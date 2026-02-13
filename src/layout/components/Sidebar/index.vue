<template>
  <div :class="{ 'has-logo': sidebarLogo }">
    <!--混合布局-->
    <div class="flex w-full" v-if="layout == LayoutEnum.MIX">
      <SidebarLogo
        v-if="sidebarLogo"
        :collapse="!appStore.sidebar.opened"
      ></SidebarLogo>
      <SidebarMixTopMenu class="flex-1"></SidebarMixTopMenu>
      <NavbarRight></NavbarRight>
    </div>
    <!--左侧布局 - 使用新的现代化侧边栏 -->
    <template v-else-if="layout === LayoutEnum.LEFT">
      <SidebarLeft :collapsed="!appStore.sidebar.opened"></SidebarLeft>
    </template>
    <!-- 顶部布局 -->
    <template v-else>
      <SidebarLogo
        v-if="sidebarLogo"
        :collapse="!appStore.sidebar.opened"
      ></SidebarLogo>
      <el-scrollbar>
        <SidebarMenu :menu-list="routes" base-path=""></SidebarMenu>
      </el-scrollbar>
      <NavbarRight v-if="layout === LayoutEnum.TOP"></NavbarRight>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore, usePermissionStore, useAppStore } from "@/store";
import { LayoutEnum } from "@/enums/LayoutEnum";
import { routerData } from "@/router";
import SidebarLeft from "./SidebarLeft.vue";

const routes = computed(() => routerData.value);
const appStore = useAppStore();
const settingsStore = useSettingsStore();

const sidebarLogo = computed(() => settingsStore.sidebarLogo);
const layout = computed(() => settingsStore.layout);
</script>

<style lang="scss" scoped>
.has-logo {
  .el-scrollbar {
    height: calc(100vh - $navbar-height);
  }
}
</style>
