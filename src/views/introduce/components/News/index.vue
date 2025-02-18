<template>
  <div class="content-section">
    <div class="news-container">
      <!-- 当路由是 /introduce/news 时显示 Book 组件 -->
      <template v-if="route.path === '/introduce/news'">
        <Book
          :items="book"
          document-path="/introduce/news/document"
          category-path="/introduce/news/category"
        ></Book>
      </template>
      <!-- 用于显示子路由内容 -->
      <router-view v-else></router-view>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import Book from "@/components/Home/Book.vue";

const route = useRoute();

const book = computed(() => {
  return [
    { label: "新闻", type: "category", id: 74 },
    { label: "案例教程", type: "category", id: 79 },
  ];
});

defineOptions({
  name: "News",
});
</script>

<style lang="scss" scoped>
.news-container {
  margin-top: 64px;
  padding: 20px;
}
</style>
