<template>
  <el-tabs type="border-card" lazy>
    <el-tab-pane v-for="item in items" :key="item.label" :label="item.label">
      <Document
        v-if="item.type === 'document'"
        :post-id="item.id"
        :category="category"
        :category-path="categoryPath"
      ></Document>
      <DocumentList
        v-if="item.type === 'category'"
        :category-id="item.id"
        :document-path="documentPath"
      ></DocumentList>
    </el-tab-pane>
  </el-tabs>
</template>

<script setup lang="ts">
import { defineProps } from "vue";
import Document from "@/components/Home/Document.vue";
import DocumentList from "@/components/Home/DocumentList.vue";

interface Item {
  label: string;
  type: string;
  id: number;
}

const props = defineProps<{
  items: Item[];
  documentPath: string;
  categoryPath: string;
  category: boolean;
}>();

const { items, documentPath, categoryPath, category } = props;
</script>
