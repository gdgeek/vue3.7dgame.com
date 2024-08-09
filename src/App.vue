<script setup></script>

<template>
  <!-- 一级路由出口组件 -->
  <!-- <RouterView></RouterView> -->
  <router-view v-slot="{ Component }">
    <transition name="fade">
      <keep-alive>
        <component :is="Component"></component>
      </keep-alive>
    </transition>
  </router-view>
</template>

<style scoped lang="scss">
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from, .fade-leave-to /* .fade-leave-active in <2.1.8 */ {
  opacity: 0;
}
</style>
