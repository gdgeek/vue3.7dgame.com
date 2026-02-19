<template>
  <div class="view-container">
    <!-- Grid Mode: Waterfall layout -->
    <div v-if="viewMode === 'grid'" class="grid-view">
      <Waterfall
        v-if="items && items.length > 0"
        :list="items"
        :breakpoints="breakpoints"
        :gutter="cardGutter"
        backgroundColor="transparent"
      >
        <template #default="{ item }">
          <slot name="grid-card" :item="item"></slot>
        </template>
      </Waterfall>
    </div>

    <!-- List Mode: Modern card-based rows -->
    <div v-else-if="viewMode === 'list'" class="list-view">
      <div v-if="items && items.length > 0" class="list-container">
        <!-- List Header -->
        <div class="list-header">
          <slot name="list-header">
            <div class="col-checkbox"></div>
            <div class="col-name">名称</div>
            <div class="col-size">大小</div>
            <div class="col-date">修改日期</div>
            <div class="col-actions"></div>
          </slot>
        </div>
        <!-- List Items -->
        <div class="list-items">
          <div
            v-for="(item, index) in items"
            :key="item.id || index"
            class="list-row"
            @click="emit('row-click', item)"
          >
            <slot name="list-item" :item="item" :index="index">
              <!-- Default list row fallback -->
              <div class="col-checkbox" @click.stop>
                <el-checkbox></el-checkbox>
              </div>
              <div class="col-name">
                <div class="item-thumb">
                  <img
                    v-if="item.image?.url"
                    :src="item.image.url"
                    :alt="item.name || item.title"
                  />
                  <div v-else class="thumb-placeholder">
                    <span class="material-symbols-outlined">image</span>
                  </div>
                </div>
                <span class="item-name">{{
                  item.name || item.title || "—"
                }}</span>
              </div>
              <div class="col-size">{{ formatSize(item.file?.size) }}</div>
              <div class="col-date">
                {{ formatDate(item.updated_at || item.created_at) }}
              </div>
              <div class="col-actions" @click.stop>
                <slot name="list-actions" :item="item">
                  <span class="material-symbols-outlined actions-icon"
                    >more_horiz</span
                  >
                </slot>
              </div>
            </slot>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="!loading && showEmpty && (!items || items.length === 0)"
      class="empty-state"
    >
      <slot name="empty">
        <el-empty :description="emptyText || '暂无数据'"></el-empty>
      </slot>
    </div>

    <!-- Loading skeleton -->
    <el-skeleton v-if="loading" :rows="8" animated></el-skeleton>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";
import type { ViewContainerProps } from "./types";

const props = withDefaults(defineProps<ViewContainerProps>(), {
  viewMode: "grid",
  loading: false,
  showEmpty: true,
  emptyText: "",
  cardWidth: 320,
  cardGutter: 20,
});

const emit = defineEmits<{
  (e: "row-click", item: any): void;
}>();

const defaultBreakpoints = {
  1800: { rowPerView: 6 },
  1400: { rowPerView: 5 },
  1100: { rowPerView: 4 },
  800: { rowPerView: 3 },
  500: { rowPerView: 2 },
  300: { rowPerView: 1 },
};

const breakpoints = computed(() => props.breakpoints || defaultBreakpoints);

const formatSize = (bytes?: number) => {
  if (!bytes) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
};
</script>

<style scoped lang="scss">
.view-container {
  min-height: 300px;
}

// ===== List Mode - Modern Card Design =====
.list-view {
  width: 100%;
}

.list-container {
  width: 100%;
  background: var(--bg-card, #ffffff);
  border-radius: var(--radius-md, 20px);
  border: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
  overflow: hidden;
}

.list-header {
  display: flex;
  align-items: center;
  padding: 14px 24px;
  background: var(--bg-hover, #f8fafc);
  font-size: var(--font-size-sm, 13px);
  font-weight: var(--font-weight-medium, 500);
  color: var(--text-secondary, #64748b);
  border-bottom: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
}

.list-items {
  display: flex;
  flex-direction: column;
}

.list-row {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background: var(--bg-card, #ffffff);
  border-bottom: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
  transition: all var(--transition-fast, 0.15s ease);
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--bg-hover, #f8fafc);

    .item-thumb {
      transform: scale(1.02);
    }

    .actions-icon {
      opacity: 1;
    }
  }
}

// Column definitions
.col-checkbox {
  width: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  :deep(.el-checkbox__inner) {
    border-radius: 6px;
  }
}

.col-name {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.col-size {
  width: 100px;
  text-align: right;
  font-size: var(--font-size-sm, 13px);
  color: var(--text-secondary, #64748b);
  flex-shrink: 0;
  padding-right: 24px;
}

.col-date {
  width: 120px;
  text-align: right;
  font-size: var(--font-size-sm, 13px);
  color: var(--text-secondary, #64748b);
  flex-shrink: 0;
  padding-right: 24px;
}

.col-actions {
  width: 48px;
  text-align: center;
  flex-shrink: 0;
}

// Thumbnail styles
.item-thumb {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-sm, 12px);
  overflow: hidden;
  background: var(--bg-hover, #f8fafc);
  border: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform var(--transition-fast, 0.15s ease);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.thumb-placeholder {
  color: var(--text-muted, #94a3b8);

  .material-symbols-outlined {
    font-size: 24px;
  }
}

// Item name
.item-name {
  font-size: var(--font-size-md, 14px);
  font-weight: var(--font-weight-medium, 500);
  color: var(--text-primary, #1e293b);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// Actions icon
.actions-icon {
  font-size: 22px;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  padding: 6px;
  border-radius: var(--radius-sm, 12px);
  transition: all var(--transition-fast, 0.15s ease);
  opacity: 0.6;

  &:hover {
    background: var(--bg-active, #e2e8f0);
    color: var(--text-primary, #1e293b);
    opacity: 1;
  }
}

.empty-state {
  padding: 60px 0;
}

// Responsive adjustments
@media (max-width: 768px) {
  .list-header,
  .list-row {
    padding: 12px 16px;
  }

  .col-size {
    display: none;
  }

  .col-date {
    width: 90px;
    padding-right: 12px;
  }

  .item-thumb {
    width: 44px;
    height: 44px;
  }
}
</style>
