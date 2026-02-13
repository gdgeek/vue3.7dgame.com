<template>
  <div class="page-action-bar">
    <!-- Row 1: Title line -->
    <div class="title-row">
      <div class="title-area">
        <h2 class="page-title">{{ title }}</h2>
        <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
        <!-- Selection count -->
        <p v-if="selectionCount > 0" class="selection-count">
          {{ selectionCount }}个已选择
        </p>
      </div>
    </div>

    <!-- Row 2: Controls toolbar -->
    <div class="controls-row">
      <div class="controls-left">
        <!-- Search - Hide in selection mode -->
        <div v-if="showSearch && selectionCount === 0" class="search-box">
          <span class="material-symbols-outlined search-icon">search</span>
          <input
            v-model="searchValue"
            type="text"
            class="search-input"
            :placeholder="searchPlaceholder || '搜索...'"
            @keyup.enter="handleSearch"
          />
        </div>

        <!-- Custom filters slot (tags, visibility, etc.) - Hide in selection mode -->
        <slot v-if="selectionCount === 0" name="filters"></slot>
      </div>

      <div class="controls-right">
        <!-- Batch actions - Show in selection mode -->
        <template v-if="selectionCount > 0">
          <el-button
            v-if="isPageSelected"
            @click="$emit('cancel-select-all-page')"
          >
            <span
              class="material-symbols-outlined"
              style="font-size: 18px; margin-right: 4px"
              >remove_done</span
            >
            取消全选
          </el-button>
          <el-button v-else @click="$emit('select-all-page')">
            <span
              class="material-symbols-outlined"
              style="font-size: 18px; margin-right: 4px"
              >done_all</span
            >
            全选本页
          </el-button>
          <el-button @click="$emit('batch-download')">
            <span
              class="material-symbols-outlined"
              style="font-size: 18px; margin-right: 4px"
              >download</span
            >
            批量下载
          </el-button>
          <el-button type="danger" @click="$emit('batch-delete')">
            <span
              class="material-symbols-outlined"
              style="font-size: 18px; margin-right: 4px"
              >delete</span
            >
            批量删除
          </el-button>
          <el-button @click="$emit('cancel-selection')">取消</el-button>
        </template>

        <!-- Normal actions - Hide in selection mode -->
        <template v-else>
          <!-- Sort buttons -->
          <!-- Sort buttons -->
          <template v-if="showSort">
            <div class="sort-control">
              <button
                class="sort-btn"
                :class="{ active: isSortedByTime }"
                @click="toggleSort(sortByTime)"
              >
                <span class="material-symbols-outlined sort-icon"
                  >schedule</span
                >
                时间
                <span
                  v-if="isSortedByTime"
                  class="material-symbols-outlined sort-arrow"
                >
                  {{ sortAscending ? "expand_more" : "expand_less" }}
                </span>
              </button>

              <button
                class="sort-btn"
                :class="{ active: isSortedByName }"
                @click="toggleSort(sortByNameField)"
              >
                <span class="sort-az">A<small>Z</small></span>
                名称
                <span
                  v-if="isSortedByName"
                  class="material-symbols-outlined sort-arrow"
                >
                  {{ sortAscending ? "expand_more" : "expand_less" }}
                </span>
              </button>
            </div>
          </template>

          <!-- Vertical Divider -->
          <div v-if="showSort && showViewToggle" class="vertical-divider"></div>

          <!-- View toggle -->
          <div v-if="showViewToggle" class="view-toggle">
            <div class="segment-control">
              <button
                class="segment-btn"
                :class="{ active: currentView === 'grid' }"
                title="网格视图"
                @click="setView('grid')"
              >
                <span class="material-symbols-outlined">grid_view</span>
              </button>
              <button
                class="segment-btn"
                :class="{ active: currentView === 'list' }"
                title="列表视图"
                @click="setView('list')"
              >
                <span class="material-symbols-outlined">view_list</span>
              </button>
            </div>
          </div>

          <slot name="actions"></slot>
        </template>
      </div>
    </div>

    <!-- Row 3 (optional): Tabs slot -->
    <div v-if="$slots.tabs" class="tabs-row">
      <slot name="tabs"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { PageActionBarProps, ViewMode } from "./types";

const props = withDefaults(
  defineProps<
    PageActionBarProps & { selectionCount?: number; isPageSelected?: boolean }
  >(),
  {
    showSearch: true,
    showSort: true,
    showViewToggle: true,
    defaultView: "grid",
    defaultSort: "-created_at",
    sortByName: "name",
    sortByTime: "created_at",
    selectionCount: 0,
    isPageSelected: false,
  }
);

const emit = defineEmits<{
  (e: "search", value: string): void;
  (e: "sort-change", value: string): void;
  (e: "view-change", mode: ViewMode): void;
  (e: "batch-download"): void;
  (e: "batch-delete"): void;
  (e: "cancel-selection"): void;
  (e: "select-all-page"): void;
  (e: "cancel-select-all-page"): void;
}>();

const searchValue = ref("");
const currentSort = ref(props.defaultSort);
const currentView = ref<ViewMode>(props.defaultView);

const sortByNameField = computed(() => props.sortByName || "name");

const isSortedByTime = computed(() =>
  currentSort.value.includes(props.sortByTime)
);
const isSortedByName = computed(() =>
  currentSort.value.includes(sortByNameField.value)
);
const sortAscending = computed(() => !currentSort.value.startsWith("-"));

const handleSearch = () => {
  emit("search", searchValue.value);
};

const toggleSort = (field: string) => {
  if (currentSort.value === field) {
    currentSort.value = "-" + field;
  } else if (currentSort.value === "-" + field) {
    currentSort.value = field;
  } else {
    currentSort.value = "-" + field;
  }
  emit("sort-change", currentSort.value);
};

const setView = (mode: ViewMode) => {
  currentView.value = mode;
  emit("view-change", mode);
};

watch(
  () => searchValue.value,
  (val) => {
    if (val === "") {
      emit("search", "");
    }
  }
);

defineExpose({
  searchValue,
  currentSort,
  currentView,
});
</script>

<style scoped lang="scss">
.page-action-bar {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-bottom: 4px;
  margin-bottom: 16px;
  border-bottom: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
}

// ===== Title Row =====
.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 0 16px;
}

.title-area {
  flex: 1;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  line-height: 1.3;
}

.page-subtitle {
  margin: 6px 0 0;
  font-size: var(--font-size-md, 14px);
  color: var(--text-secondary, #64748b);
  line-height: 1.5;
}

// Selection info container
.selection-info {
  margin-top: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.selection-count {
  margin: 0;
  font-size: var(--font-size-md, 14px);
  color: var(--primary-color, #00baff);
  font-weight: var(--font-weight-medium, 500);
  line-height: 1.5;
}

.select-all-btn {
  padding: 0;
  height: auto;
  font-size: 12px;
  font-weight: normal;

  &:hover {
    text-decoration: underline;
  }
}

// ===== Controls Row =====
.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 16px;
  gap: 12px;
  flex-wrap: wrap;
}

.controls-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.controls-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;

  // Customize action buttons to be pill-shaped
  :deep(.el-button) {
    border-radius: var(--radius-full, 9999px);
    padding: 8px 20px; // Ensure enough padding for pill shape
  }
}

// ===== Search Box =====
.search-box {
  position: relative;
  display: flex;
  align-items: center;
  width: 280px;
}

.search-icon {
  position: absolute;
  left: 16px;
  font-size: 20px;
  color: var(--text-muted, #94a3b8);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 44px;
  padding: 0 16px 0 48px;
  border: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-full, 9999px);
  background: var(--bg-card, #fff);
  font-size: var(--font-size-md, 14px);
  color: var(--text-primary, #1e293b);
  outline: none;
  transition: all var(--transition-fast, 0.15s ease);

  &::placeholder {
    color: var(--text-muted, #94a3b8);
  }

  &:focus {
    border-color: var(--primary-color, #00baff);
    box-shadow: 0 0 0 3px var(--primary-light, rgba(0, 186, 255, 0.1));
  }
}

// ===== Vertical Divider =====
// Updated to separate Sort and View groups visually
.vertical-divider {
  width: 1px;
  height: 24px;
  background-color: var(--border-color, #e2e8f0);
  margin: 0 4px 0 0;
}

// ===== Sort Buttons =====
.sort-control {
  display: flex;
  align-items: center;
  gap: 8px; // Increased gap for pill buttons
  margin-right: 12px;
  padding: 2px; // Add padding to avoid shadow clipping
}

.sort-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px; // Match view toggle height
  padding: 0 16px; // More horizontal padding
  border-radius: 8px; // Standard rounded rectangle
  background: transparent;
  border: none;
  color: var(--text-secondary, #64748b);
  font-size: var(--font-size-sm, 13px);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
  gap: 6px;

  &:hover {
    background: var(--bg-tertiary, #e2e8f0);
    color: var(--text-primary, #1e293b);
  }

  &.active {
    background: var(--bg-card, #fff);
    color: var(--primary-color, #00baff);
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.1),
      0 1px 2px rgba(0, 0, 0, 0.06); // Soft shadow
    font-weight: 600;

    &:hover {
      background: var(--bg-card, #fff); // Keep white on hover
    }
  }

  .sort-icon {
    font-size: 18px;
  }

  .sort-az {
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    display: flex;
    align-items: center;

    small {
      font-size: 10px;
    }
  }

  .sort-arrow {
    font-size: 18px; // Matching icon size
    margin-left: 0;
  }
}

// ===== View Toggle (Segment Control) =====
.view-toggle {
  .segment-control {
    display: flex;
    padding: 3px;
    background-color: var(--bg-secondary, #f1f5f9);

    :global(.dark) & {
      background-color: var(--bg-page);
      border-color: var(--border-color);
    }

    border: var(--border-width, 1px) solid var(--border-color, #e2e8f0); // Added border
    border-radius: 8px;
    gap: 2px;
    height: 40px;
    box-sizing: border-box;
    align-items: center;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05); // Optional: slight inset for track depth
  }

  .segment-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 32px; // Slightly smaller to fit with padding
    border: none;
    border-radius: 6px;
    background: transparent;
    padding: 0;
    color: var(--text-secondary, #64748b);
    cursor: pointer;
    transition: all var(--transition-fast, 0.15s ease);

    .material-symbols-outlined {
      font-size: 20px;
    }

    &:hover:not(.active) {
      color: var(--text-primary, #1e293b);
    }

    &.active {
      background-color: var(--bg-card, #fff);
      color: var(--primary-color, #00baff);
      box-shadow:
        0 1px 2px rgba(0, 0, 0, 0.1),
        0 1px 1px rgba(0, 0, 0, 0.05); // Enhanced shadow

      .material-symbols-outlined {
        font-variation-settings: "FILL" 1;
      }
    }
  }
}

// ===== Tabs Row =====
.tabs-row {
  padding: 8px 0 0;
}
</style>
