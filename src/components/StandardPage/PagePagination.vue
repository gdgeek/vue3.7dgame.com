<template>
  <div class="page-pagination">
    <el-button
      round
      class="page-btn"
      :disabled="currentPage <= 1"
      @click="changePage(currentPage - 1)"
    >
      <span
        class="material-symbols-outlined btn-icon"
        style="margin-right: 4px; font-size: 18px"
        >chevron_left</span
      >
      上一页
    </el-button>

    <span class="page-info">
      第 <strong>{{ currentPage }}</strong> 页 / 共 {{ totalPages }} 页
    </span>

    <el-button
      round
      class="page-btn"
      :disabled="currentPage >= totalPages"
      @click="changePage(currentPage + 1)"
    >
      下一页
      <span
        class="material-symbols-outlined btn-icon"
        style="margin-left: 4px; font-size: 18px"
        >chevron_right</span
      >
    </el-button>
  </div>
</template>

<script setup lang="ts">
import type { PagePaginationProps } from "./types";

const props = defineProps<PagePaginationProps>();
const emit = defineEmits<{
  (e: "page-change", page: number): void;
}>();

const changePage = (page: number) => {
  if (page < 1 || page > props.totalPages) return;
  emit("page-change", page);
};
</script>

<style scoped lang="scss">
.page-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px 0;
}

.page-btn {
  // el-button handles most styles. We just ensure alignment if needed.
  display: inline-flex;
  align-items: center;
}

.page-info {
  font-size: 14px;
  color: var(--el-text-color-secondary, #909399);
  user-select: none;

  strong {
    color: var(--el-text-color-primary, #303133);
    font-weight: 600;
  }
}
</style>
