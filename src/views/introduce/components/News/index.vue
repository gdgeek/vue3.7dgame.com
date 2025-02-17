<template>
  <div class="news-container">
    <Book
      :items="book"
      document_path="/introduce/news/document"
      category_path="/introduce/news/category"
    ></Book>
  </div>
</template>

<script setup lang="ts">
import Book from "@/components/Home/Book.vue";

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
