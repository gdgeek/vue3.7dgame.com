<template>
  <div class="view-container">
    <!-- Grid Mode -->
    <div
      v-if="viewMode === 'grid'"
      class="grid-view"
      @load.capture="refreshWaterfall"
    >
      <Waterfall
        v-if="items && items.length > 0"
        ref="waterfallRef"
        :list="items"
        :width="cardWidth"
        :breakpoints="breakpoints"
        :gutter="cardGutter"
        :has-around-gutter="false"
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
            v-long-press="
              (
                typeof longPressEnabled === 'function'
                  ? longPressEnabled(item)
                  : longPressEnabled
              )
                ? () => emit('row-long-press', item)
                : undefined
            "
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
                    :src="toHttps(item.image.url)"
                    :alt="item.name || item.title"
                  />
                  <div v-else class="thumb-placeholder">
                    <font-awesome-icon
                      :icon="['fas', 'image']"
                    ></font-awesome-icon>
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
                  <font-awesome-icon
                    :icon="['fas', 'ellipsis']"
                    class="actions-icon"
                  ></font-awesome-icon>
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

<script
  setup
  lang="ts"
  generic="
    T extends {
      id?: number | string;
      name?: string;
      title?: string;
      image?: { url?: string } | null;
      file?: { size?: number; url?: string } | null;
      updated_at?: string;
      created_at?: string;
    } = Record<string, unknown>
  "
>
import { computed, nextTick, ref } from "vue";
import { Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";
import type { ViewMode } from "./types";
import { toHttps } from "@/utils/helper";
import { vLongPress } from "@/directive/longPress";

interface Props {
  items: T[] | null;
  viewMode?: ViewMode;
  loading?: boolean;
  showEmpty?: boolean;
  emptyText?: string;
  cardWidth?: number;
  cardGutter?: number;
  breakpoints?: Record<number, { rowPerView: number }>;
  longPressEnabled?: boolean | ((item: NoInfer<T>) => boolean);
}

const props = withDefaults(defineProps<Props>(), {
  viewMode: "grid",
  loading: false,
  showEmpty: true,
  emptyText: "",
  cardWidth: 208,
  cardGutter: 20,
  longPressEnabled: false,
});

const emit = defineEmits<{
  (e: "row-click", item: T): void;
  (e: "row-long-press", item: T): void;
}>();

const waterfallRef = ref<{ renderer: () => void } | null>(null);
const refreshWaterfall = () => {
  nextTick(() => waterfallRef.value?.renderer?.());
};

const breakpoints = computed(() => {
  if (props.breakpoints) return props.breakpoints;
  const result: Record<number, { rowPerView: number }> = {};
  for (let columns = 1; columns < 6; columns++) {
    const nextWidth =
      (columns + 1) * props.cardWidth + columns * props.cardGutter;
    result[nextWidth - 1] = { rowPerView: columns };
  }
  result[Number.MAX_SAFE_INTEGER] = { rowPerView: 6 };
  return result;
});

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
  container: resource-collection / inline-size;
  min-width: 0;
  min-height: 300px;
}

.grid-view {
  width: 100%;
}

// ===== List Mode - Modern Card Design =====
.list-view {
  width: 100%;
}

.list-container {
  width: 100%;
  overflow: hidden;
  background: var(--bg-card, #fff);
  border: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-md, 20px);
}

.list-header {
  display: flex;
  align-items: center;
  padding: 14px 24px;
  font-size: var(--font-size-sm, 13px);
  font-weight: var(--font-weight-medium, 500);
  color: var(--text-secondary, #64748b);
  background: var(--bg-hover, #f8fafc);
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
  cursor: pointer;
  background: var(--bg-card, #fff);
  border-bottom: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
  transition: all var(--transition-fast, 0.15s ease);

  &.supports-long-press {
    -webkit-touch-callout: none;
    user-select: none;
  }

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
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;

  :deep(.el-checkbox__inner) {
    border-radius: 6px;
  }
}

.col-name {
  display: flex;
  flex: 1;
  gap: 16px;
  align-items: center;
  min-width: 0;
}

.col-size {
  flex-shrink: 0;
  width: 100px;
  padding-right: 24px;
  font-size: var(--font-size-sm, 13px);
  color: var(--text-secondary, #64748b);
  text-align: right;
}

.col-date {
  flex-shrink: 0;
  width: 120px;
  padding-right: 24px;
  font-size: var(--font-size-sm, 13px);
  color: var(--text-secondary, #64748b);
  text-align: right;
}

.col-actions {
  flex-shrink: 0;
  width: 48px;
  text-align: center;
}

// Thumbnail styles
.item-thumb {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  overflow: hidden;
  background: var(--bg-hover, #f8fafc);
  border: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-sm, 12px);
  transition: transform var(--transition-fast, 0.15s ease);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.thumb-placeholder {
  color: var(--text-muted, #94a3b8);

  .svg-inline--fa {
    font-size: 24px;
  }
}

// Item name
.item-name {
  overflow: hidden;
  font-size: var(--font-size-md, 14px);
  font-weight: var(--font-weight-medium, 500);
  color: var(--text-primary, #1e293b);
  text-overflow: ellipsis;
  white-space: nowrap;
}

// Actions icon
.actions-icon {
  padding: 6px;
  font-size: 22px;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  border-radius: var(--radius-sm, 12px);
  opacity: 0.6;
  transition: all var(--transition-fast, 0.15s ease);

  &:hover {
    color: var(--text-primary, #1e293b);
    background: var(--bg-active, #e2e8f0);
    opacity: 1;
  }
}

.empty-state {
  padding: 60px 0;
}

// Responsive adjustments
@media (width <= 768px) {
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

@container resource-collection (width <= 640px) {
  .list-header {
    display: none;
  }

  .list-view .list-row {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) 32px;
    gap: var(--spacing-sm, 8px) 12px;
    padding: var(--spacing-md, 16px);

    :deep(.col-checkbox) {
      grid-row: 1;
      grid-column: 1;
      width: auto;
      min-width: 0;
    }

    :deep(.col-name) {
      grid-row: 1;
      grid-column: 2;
      gap: 12px;
      min-width: 0;
    }

    :deep(.col-actions) {
      grid-row: 1;
      grid-column: 3;
      width: auto;
      min-width: 0;
    }

    :deep(.actions-icon) {
      opacity: 1;
    }

    :deep(.col-size),
    :deep(.col-date),
    :deep(.col-author),
    :deep(.col-resources) {
      display: block;
      grid-column: 2 / -1;
      width: auto;
      min-width: 0;
      padding: 0;
      overflow: hidden;
      text-align: left;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    :deep(.item-thumb) {
      width: 44px;
      height: 44px;
    }

    :deep(.item-name) {
      display: -webkit-box;
      min-width: 0;
      overflow: hidden;
      overflow-wrap: anywhere;
      white-space: normal;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  }
}
</style>
