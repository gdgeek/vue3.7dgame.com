<template>
  <div class="content-section">
    <Book :items="book"></Book>
  </div>
</template>

<script setup lang="ts">
import Book from "@/components/Home/Book.vue";

const book = [
  { label: "新闻", type: "category", id: 74 },
  { label: "案例教程", type: "category", id: 79 },
];
</script>

<style lang="scss" scoped></style>
