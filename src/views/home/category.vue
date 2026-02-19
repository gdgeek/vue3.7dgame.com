<template>
  <div class="category-page">
    <DocumentList :category-id="id"></DocumentList>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import DocumentList from "@/components/Home/DocumentList.vue";
import { useRoute } from "vue-router";

const route = useRoute();
const id = computed(() => parseInt(route.query.id as string));
</script>

<style lang="scss" scoped>
.category-page {
  padding: var(--spacing-lg);
  background: var(--bg-page);
  min-height: 100%;
}
</style>
