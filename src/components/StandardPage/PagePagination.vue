<template>
  <div class="page-pagination" :class="{ sticky: props.sticky }">
    <el-button
      round
      class="page-btn"
      :disabled="currentPage <= 1"
      @click="changePage(currentPage - 1)"
    >
      <font-awesome-icon
        :icon="['fas', 'chevron-left']"
        class="btn-icon"
        style="margin-right: 4px; font-size: 18px"
      ></font-awesome-icon>
      上一页
    </el-button>

    <span class="page-info">
      第
      <el-input
        v-model="targetPageInput"
        class="page-input"
        size="small"
        @keyup.enter="jumpToPage"
        @blur="jumpToPage"
      ></el-input>
      页 / 共 {{ totalPages }} 页
    </span>

    <el-button
      round
      class="page-btn"
      :disabled="currentPage >= totalPages"
      @click="changePage(currentPage + 1)"
    >
      下一页
      <font-awesome-icon
        :icon="['fas', 'chevron-right']"
        class="btn-icon"
        style="margin-left: 4px; font-size: 18px"
      ></font-awesome-icon>
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type { PagePaginationProps } from "./types";

const props = withDefaults(defineProps<PagePaginationProps>(), {
  sticky: false,
});
const emit = defineEmits<{
  (e: "page-change", page: number): void;
}>();

const safeTotalPages = computed(() => Math.max(1, props.totalPages || 1));
const targetPageInput = ref(String(props.currentPage));
let autoJumpTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.currentPage,
  (page) => {
    targetPageInput.value = String(page);
  }
);

const changePage = (page: number) => {
  if (page < 1 || page > safeTotalPages.value) return;
  if (page === props.currentPage) return;
  emit("page-change", page);
};

const jumpToPage = () => {
  const parsedPage = Number.parseInt(targetPageInput.value, 10);
  if (Number.isNaN(parsedPage)) {
    targetPageInput.value = String(props.currentPage);
    return;
  }

  const page = Math.min(Math.max(parsedPage, 1), safeTotalPages.value);
  targetPageInput.value = String(page);
  changePage(page);
};

watch(targetPageInput, (value) => {
  if (autoJumpTimer) {
    clearTimeout(autoJumpTimer);
  }

  const parsedPage = Number.parseInt(value, 10);
  if (Number.isNaN(parsedPage)) return;
  if (String(parsedPage) !== value.trim()) return;

  autoJumpTimer = setTimeout(() => {
    jumpToPage();
  }, 200);
});

onBeforeUnmount(() => {
  if (autoJumpTimer) {
    clearTimeout(autoJumpTimer);
  }
});
</script>

<style scoped lang="scss">
.page-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px 0;

  &.sticky {
    position: sticky;
    bottom: 10px;
    z-index: 20;
    width: fit-content;
    margin: 12px auto 0;
    padding: 10px 14px;
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: var(--radius-full, 9999px);
    background: var(--bg-page, #f8fafc);
    backdrop-filter: blur(6px);
  }
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
  display: inline-flex;
  align-items: center;
  gap: 6px;

  strong {
    color: var(--el-text-color-primary, #303133);
    font-weight: 600;
  }
}

.page-input {
  width: 46px;

  :deep(.el-input__inner) {
    text-align: center;
    padding-left: 4px;
    padding-right: 4px;
  }
}
</style>
