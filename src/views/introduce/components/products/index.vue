<template>
  <div class="content-section">
    <div class="products-container">
      <Screen :bgUrl="imageUrl" :item="screen"></Screen>
      <Solution></Solution>
      <Cloud></Cloud>
    </div>
  </div>
</template>

<script setup lang="ts">
import Screen from "./Screen.vue";
import Solution from "./Solution.vue";
import Cloud from "./Cloud.vue";
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
@use "@/styles/sandtable.scss";
@use "@/styles/responsive-style.scss";

.content-section {
  height: 100%;

  // 添加移动端适配
  @media (max-width: 768px) {
    margin-top: 50px;
  }
}
</style>
