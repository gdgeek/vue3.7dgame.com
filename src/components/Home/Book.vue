<template>
  <el-tabs type="border-card" lazy>
    <el-tab-pane v-for="item in items" :key="item.label" :label="item.label">
      <Document
        v-if="item.type === 'document'"
        :post-id="item.id"
        :category="category"
        :category-path="categoryPath"
      >
      </Document>
      <DocumentList
        v-if="item.type === 'category'"
        :category-id="item.id"
        :document-path="documentPath"
      ></DocumentList>
    </el-tab-pane>
  </el-tabs>
</template>

<script setup lang="ts">
import Document from "@/components/Home/Document.vue";
import DocumentList from "@/components/Home/DocumentList.vue";

console.log("book");
// 定义 props 类型
const props = defineProps<{
  items?: { label: string; type: string; id: number }[];
  documentPath?: string;
  categoryPath?: string;
  category?: boolean;
}>();

// 提供默认值
const items = computed(
  () =>
    props.items ?? [
      { label: "首页", type: "document", id: 999 },
      { label: "新闻", type: "category", id: 74 },
      { label: "相关下载", type: "category", id: 84 },
      { label: "案例教程", type: "category", id: 79 },
    ]
);

const documentPath = computed(() => props.documentPath ?? "/home/document");
const categoryPath = computed(() => props.categoryPath ?? "/home/category");
const category = computed(() => props.category ?? true);
</script>
