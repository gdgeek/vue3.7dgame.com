<template>
  <div :class="wrapperClass || 'card-list-page'">
    <el-container>
      <el-header v-if="showHeader">
        <MrPPHeader
          :sorted="sorted"
          :searched="searched"
          @search="handleSearch"
          @sort="handleSort"
        >
          <slot name="header-actions"></slot>
        </MrPPHeader>
      </el-header>
      <el-main>
        <el-card style="width: 100%; min-height: 400px">
          <!-- Slot for content before cards (e.g., school info) -->
          <slot name="before-cards"></slot>

          <!-- 自适应填充模式 - 使用 Waterfall 配合 breakpoints 实现响应式 -->
          <Waterfall
            v-if="autoFill && items && items.length > 0"
            :list="items"
            :breakpoints="breakpoints"
            :gutter="cardGutter"
            :backgroundColor="'rgba(255, 255, 255, .05)'"
          >
            <template #default="{ item }">
              <slot name="card" :item="item"></slot>
            </template>
          </Waterfall>
          <!-- 固定宽度模式 - 使用 Waterfall -->
          <Waterfall
            v-else-if="!autoFill && items && items.length > 0"
            :list="items"
            :width="cardWidth"
            :gutter="cardGutter"
            :align="align"
            :backgroundColor="'rgba(255, 255, 255, .05)'"
          >
            <template #default="{ item }">
              <slot name="card" :item="item"></slot>
            </template>
          </Waterfall>
          <div v-else-if="!loading && showEmpty">
            <slot name="empty">
              <el-empty
                :description="emptyText || $t('common.noData')"
              ></el-empty>
            </slot>
          </div>
          <el-skeleton
            v-else-if="loading && showSkeleton"
            :rows="8"
            animated
          ></el-skeleton>
        </el-card>
      </el-main>
      <el-footer>
        <el-card class="box-card">
          <el-pagination
            :current-page="pagination.current"
            :page-size="pagination.size"
            :total="pagination.total"
            layout="prev, pager, next, jumper"
            background
            @current-change="handleCurrentChange"
          >
          </el-pagination>
        </el-card>
      </el-footer>
    </el-container>

    <!-- Slot for dialogs and other external components -->
    <slot name="dialogs"></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import { Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";
import type {
  CardListPageProps,
  CardListPageEmits,
  Pagination,
  FetchParams,
} from "./types";

const props = withDefaults(defineProps<CardListPageProps>(), {
  defaultSort: "-created_at",
  pageSize: 20,
  cardWidth: 320,
  cardGutter: 20,
  align: "left",
  autoFill: false,
  minCardWidth: 280,
  showSkeleton: true,
  showEmpty: true,
  showHeader: true, // Default to true
  emptyText: "",
  wrapperClass: "card-list-page",
});

const emit = defineEmits<CardListPageEmits>();

// State
const items = ref<any[] | null>(null);
const loading = ref(false);
const sorted = ref(props.defaultSort);
const searched = ref("");
const pagination = reactive<Pagination>({
  current: 1,
  count: 1,
  size: props.pageSize,
  total: 0,
});

// 响应式断点配置 - 根据容器宽度自动调整列数
// rowPerView 表示每行显示的卡片数量
const breakpoints = computed(() => ({
  1600: { rowPerView: 4 }, // >= 1600px: 4列
  1200: { rowPerView: 3 }, // >= 1200px: 3列
  800: { rowPerView: 2 }, // >= 800px: 2列
  400: { rowPerView: 1 }, // >= 400px: 1列
}));

// Methods
const handleSearch = (value: string) => {
  searched.value = value;
  pagination.current = 1; // Reset to first page on search
  refresh();
};

const handleSort = (value: string) => {
  sorted.value = value;
  refresh();
};

const handleCurrentChange = (page: number) => {
  pagination.current = page;
  refresh();
};

const refresh = async () => {
  loading.value = true;
  try {
    const params: FetchParams = {
      sort: sorted.value,
      search: searched.value,
      page: pagination.current,
    };

    const response = await props.fetchData(params);

    // Update pagination from headers
    pagination.current = parseInt(
      response.headers["x-pagination-current-page"] || "1"
    );
    pagination.count = parseInt(
      response.headers["x-pagination-page-count"] || "1"
    );
    pagination.size = parseInt(
      response.headers["x-pagination-per-page"] || String(props.pageSize)
    );
    pagination.total = parseInt(
      response.headers["x-pagination-total-count"] || "0"
    );

    // Update items
    items.value = response.data || [];

    // Emit refresh event
    emit("refresh", items.value);
  } catch (error) {
    console.error("Failed to fetch data:", error);
    items.value = [];
  } finally {
    loading.value = false;
  }
};

// Expose refresh method for parent components
defineExpose({
  refresh,
});

// Initial load
onMounted(() => {
  refresh();
});
</script>

<style scoped>
.card-list-page {
  padding: 20px;
}
</style>
