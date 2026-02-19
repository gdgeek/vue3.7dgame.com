<template>
  <div class="document-page">
    <Document :post-id="id" :category="true"></Document>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import Document from "@/components/Home/Document.vue";

const route = useRoute();
const id = computed(() => parseInt(route.query.id as string));
</script>

<style lang="scss" scoped>
.document-page {
  padding: var(--spacing-lg);
  background: var(--bg-page);
  min-height: 100%;
}
</style>
