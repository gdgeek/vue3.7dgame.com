<script setup></script>

<template>
  <!-- 一级路由出口组件 -->
  <!-- <RouterView></RouterView> -->

  <!-- <router-view v-slot="{ Component }" v-mouse-effect v-particle-effect> -->
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

.fade-enter-from,
.fade-leave-to

/* .fade-leave-active in <2.1.8 */ {
  opacity: 0;
}

canvas {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999; /* 确保 canvas 在最上层 */
}
</style>
