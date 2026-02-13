<template>
  <el-tabs type="border-card" lazy v-model="activeTab" @tab-click="handleTabClick" class="home-tabs">
    <el-tab-pane v-for="(item, index) in items" :key="item.label" :label="item.label" :name="index">
      <Document v-if="item.type === 'document'" :post-id="item.id" :category="category" :category-path="categoryPath">
      </Document>
      <DocumentList v-if="item.type === 'category'" :category-id="item.id" :document-path="documentPath"></DocumentList>
    </el-tab-pane>
  </el-tabs>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
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

const emit = defineEmits(["tab-change"]);

const activeTab = computed({
  get: () => props.modelValue ?? 0,
  set: (value) => emit("tab-change", value),
});

const handleTabClick = (tab: any) => {
  emit("tab-change", Number(tab.props.name));
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

<style lang="scss" scoped>
.home-tabs {
  background: var(--bg-card);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);

  :deep(.el-tabs__header) {
    background: var(--bg-hover);
    border-bottom: var(--border-width) solid var(--border-color);
    margin: 0;
  }

  :deep(.el-tabs__nav) {
    border: none !important;
  }

  :deep(.el-tabs__item) {
    color: var(--text-secondary);
    font-size: var(--font-size-md);
    font-weight: 500;
    border: none !important;
    padding: 0 var(--spacing-lg);
    height: 44px;
    line-height: 44px;
    transition: color var(--transition-fast);

    &:hover {
      color: var(--primary-color);
    }

    &.is-active {
      color: var(--primary-color);
      background: var(--bg-card);
      font-weight: 600;
    }
  }

  :deep(.el-tabs__content) {
    padding: var(--spacing-lg);
  }
}
</style>
