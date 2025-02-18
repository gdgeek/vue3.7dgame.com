<template>
  <div class="content-section">
    <div class="products-container">
      <ScreenShow></ScreenShow>
      <Screen :bgUrl="imageUrl" :item="screen"></Screen>
    </div>
  </div>
</template>

<script setup lang="ts">
import ScreenShow from "./ScreenShow.vue";
import Screen from "./Screen.vue";
import { computed } from "vue";

defineOptions({
  name: "Products",
});

const imageUrl = computed(() => {
  return "/media/bg/education.jpg";
});

const screen = computed(() => {
  return {
    title: "为您私有部署",
    title2: "元宇宙数字化教育方案",
    color: "#1d1d1f",
    tel: "15000159790",
    align: "left",
  };
});
</script>

<style scoped lang="scss">
@import "@/styles/sandtable.scss";
@import "@/styles/responsive-style.scss";

</style>
