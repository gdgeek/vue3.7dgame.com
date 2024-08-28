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

const { t } = useI18n();

console.log("book");

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
      { label: t("homepage.dashboard"), type: "document", id: 999 },
      { label: t("homepage.news"), type: "category", id: 74 },
      { label: t("homepage.relatedDownload"), type: "category", id: 84 },
      { label: t("homepage.caseCourse"), type: "category", id: 79 },
    ]
);

const documentPath = computed(() => props.documentPath ?? "/home/document");
const categoryPath = computed(() => props.categoryPath ?? "/home/category");
const category = computed(() => props.category ?? true);
</script>
