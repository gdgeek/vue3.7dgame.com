<template>
  <el-card>
    <Document :post-id="id" :category="true"></Document>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import Document from "@/components/Home/Document.vue";

const route = useRoute();
const id = computed(() => parseInt(route.query.id as string));
</script>
