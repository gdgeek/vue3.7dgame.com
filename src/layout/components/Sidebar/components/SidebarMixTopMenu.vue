<!-- 混合布局菜单(top) -->
<template>
  <el-scrollbar>
    <el-menu mode="horizontal" :default-active="activePath" :background-color="variables['menu-background']"
      :text-color="variables['menu-text']" :active-text-color="variables['menu-active-text']"
      @select="handleMenuSelect">
      <el-menu-item v-for="route in mixTopMenus" :key="route.path" :index="route.path">
        <template #title>
          <svg-icon v-if="route.meta && route.meta.icon" :icon-class="route.meta.icon"></svg-icon>
          <span v-if="route.path === '/'">首页</span>
          <template v-else>
            <span v-if="route.meta && route.meta.title" class="ml-1">
              {{ translateRouteTitle(route.meta.title) }}
            </span>
          </template>
        </template>
      </el-menu-item>
    </el-menu>
  </el-scrollbar>
</template>

<script lang="ts" setup>
import { usePermissionStore, useAppStore } from "@/store";
import { translateRouteTitle } from "@/utils/i18n";
import variables from "@/styles/variables.module.scss";
import { RouteRecordRaw } from "vue-router";
import { RouteVO } from "@/api/menu/model";
import { routerData } from "@/router";

const appStore = useAppStore();
const permissionStore = usePermissionStore();
const router = useRouter();

// 避免 activeTopMenuPath 缓存被清理，从当前路由路径获取顶部菜单路径，eg. /system/user → /system
const activeTopMenuPath = useRoute().path.replace(/\/[^\/]+$/, "") || "/";
appStore.activeTopMenu(activeTopMenuPath);

// 激活的顶部菜单路径
const activePath = computed(() => appStore.activeTopMenuPath);

// 混合模式顶部菜单集合
const mixTopMenus = ref<RouteVO[]>([]);

/**
 * 菜单选择事件
 */
const handleMenuSelect = (routePath: string) => {
  appStore.activeTopMenu(routePath);
  permissionStore.setMixLeftMenus(routePath);
  // 获取左侧菜单集合，默认跳转到第一个菜单
  const mixLeftMenus = permissionStore.mixLeftMenus;
  goToFirstMenu(mixLeftMenus);
};

/**
 * 默认跳转到左侧第一个菜单
 */
const goToFirstMenu = (menus: RouteVO[]) => {
  if (menus.length === 0) return;

  const [first] = menus;

  if (first.children && first.children.length > 0) {
    goToFirstMenu(first.children as RouteVO[]);
  } else if (first.name) {
    router.push({
      name: first.name,
    });
  }
};

// 初始化顶部菜单
onMounted(() => {
  mixTopMenus.value = routerData.value.filter(
    (item) => !item.meta || !item.meta.hidden
  );
});
</script>
