<template>
  <el-tabs type="border-card" lazy v-model="activeTab" @tab-click="handleTabClick">
    <el-tab-pane v-for="(item, index) in items" :key="item.label" :label="item.label" :name="index">
      <Document v-if="item.type === 'document'" :post-id="item.id" :category="category" :category-path="categoryPath">
      </Document>
      <DocumentList v-if="item.type === 'category'" :category-id="item.id" :document-path="documentPath"></DocumentList>
    </el-tab-pane>
  </el-tabs>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Document from "@/components/Home/Document.vue";
import DocumentList from "@/components/Home/DocumentList.vue";

const { t } = useI18n();

const props = defineProps<{
  items?: { label: string; type: string; id: number }[];
  documentPath?: string;
  categoryPath?: string;
  category?: boolean;
  modelValue?: number;
}>();

const emit = defineEmits(['tab-change']);

const activeTab = computed({
  get: () => props.modelValue ?? 0,
  set: (value) => emit('tab-change', value)
});

const handleTabClick = (tab: any) => {
  emit('tab-change', Number(tab.props.name));
};

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
