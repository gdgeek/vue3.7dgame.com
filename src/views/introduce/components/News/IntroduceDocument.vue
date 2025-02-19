<template>
  <el-card>
    <Document
      :post-id="id"
      :category="true"
      category-path="/introduce/news/category"
    ></Document>
  </el-card>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import Document from "@/components/Home/Document.vue";

const route = useRoute();
const id = computed(() => parseInt(route.query.id as string));
onMounted(() => {
  console.error(id.value);
});
</script>
