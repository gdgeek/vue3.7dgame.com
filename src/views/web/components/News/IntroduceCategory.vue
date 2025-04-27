<template>
  <el-card>
    <DocumentList :category-id="id" document-path="/web/news/document"></DocumentList>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import DocumentList from "@/components/Home/DocumentList.vue";
import { useRoute } from "vue-router";

const route = useRoute();
const id = computed(() => parseInt(route.query.id as string));
onMounted(() => {
  console.error(id.value);
});
</script>
