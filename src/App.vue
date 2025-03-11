<template>
  <!-- 一级路由出口组件 -->
  <!-- <RouterView></RouterView> -->

  <!-- <router-view v-slot="{ Component }" v-mouse-effect v-particle-effect> -->
  <!-- <router-view v-slot="{ Component }">
    <transition name="page" mode="out-in">
      <keep-alive>
        <component :is="Component"></component>
      </keep-alive>
    </transition>
  </router-view> -->
  <router-view v-slot="{ Component, route }">
    <transition name="page" mode="out-in" :key="route.fullPath">
      <component :is="Component"></component>
    </transition>
  </router-view>
</template>
<script setup>
import { UpdateAbility } from "@/utils/ability";
import { useAbility } from "@casl/vue";
import { useUserStore } from "@/store/modules/user";
import { UpdateRoutes } from "@/router";
import Token from "@/store/modules/token";
const userStore = useUserStore();
const ability = useAbility(); // 提取到 setup 顶层


watch(() => userStore.userInfo, (newUserInfo) => {

  if (newUserInfo == null || newUserInfo.id === 0 || userStore.userInfo == null) {
    return;
  }
  UpdateAbility(ability, userStore.userInfo.roles, userStore.userInfo.id);
  UpdateRoutes(ability);

}, { deep: true, immediate: true });


onMounted(async () => {

  const hasToken = Token.getToken();
  if (hasToken) {
    userStore.getUserInfo();
    userStore.setupRefreshInterval();
  }
});
</script>
<style scoped lang="scss">
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter-from,
.fade-leave-to

/* .fade-leave-active in <2.1.8 */
  {
  opacity: 0;
}

/* 新增页面过渡效果 */
.page-enter-active,
.page-leave-active {
  transition: all 0.4s cubic-bezier(0.55, 0, 0.1, 1);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}

canvas {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  /* 确保 canvas 在最上层 */
}
</style>
