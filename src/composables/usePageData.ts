import { logger } from "@/utils/logger";
import { ref, reactive, computed, onMounted } from "vue";
import type { ViewMode } from "@/components/StandardPage/types";
import type { FetchParams, FetchResponse } from "@/types/api";
import { sortByMultilingualField } from "@/utils/multilingualSort";

export type { FetchParams, FetchResponse };

type FetchExtraParams = Record<string, unknown>;

export interface UsePageDataOptions<T = unknown> {
  fetchFn: (
    params: FetchParams & FetchExtraParams
  ) => Promise<FetchResponse<T>>;
  defaultSort?: string;
  pageSize?: number;
  /**
   * 对这些字段启用前端多语言自然排序（兼容中/英/日/泰与数字混排）
   */
  localeSortFields?: string[];
  /** 是否自动在挂载时加载 */
  immediate?: boolean;
}

export function usePageData<T = unknown>(options: UsePageDataOptions<T>) {
  const {
    fetchFn,
    defaultSort = "-created_at",
    pageSize = 20,
    localeSortFields = ["name", "title"],
    immediate = true,
  } = options;

  // Data state
  const items = ref<T[] | null>(null);
  const loading = ref(false);

  // Filter state
  const sorted = ref(defaultSort);
  const searched = ref("");
  const tags = ref<number[]>([]);

  // Pagination
  const pagination = reactive({
    current: 1,
    count: 1,
    size: pageSize,
    total: 0,
  });

  // View mode
  const viewMode = ref<ViewMode>("grid");

  // Computed total pages
  const totalPages = computed(() => pagination.count || 1);

  // 请求序号：用于丢弃过期响应，防止快速翻页/搜索时旧请求覆盖新结果
  let fetchSeq = 0;

  // Fetch
  const refresh = async () => {
    const seq = ++fetchSeq;
    loading.value = true;
    try {
      const params: FetchParams = {
        sort: sorted.value,
        search: searched.value,
        page: pagination.current,
      };
      if (tags.value.length > 0) {
        params.tags = tags.value;
      }

      const response = await fetchFn(params);

      // 响应已过期，丢弃
      if (seq !== fetchSeq) return;

      // Parse pagination headers
      const currentPageHeader = response.headers["x-pagination-current-page"];
      const pageCountHeader = response.headers["x-pagination-page-count"];
      const pageSizeHeader = response.headers["x-pagination-per-page"];
      const totalCountHeader = response.headers["x-pagination-total-count"];

      pagination.current = parseInt(String(currentPageHeader ?? "1"));
      pagination.count = parseInt(String(pageCountHeader ?? "1"));
      pagination.size = parseInt(String(pageSizeHeader ?? pageSize));
      pagination.total = parseInt(String(totalCountHeader ?? "0"));

      const rawItems = response.data || [];
      const descending = sorted.value.startsWith("-");
      const sortField = descending ? sorted.value.slice(1) : sorted.value;

      if (
        localeSortFields.includes(sortField) &&
        Array.isArray(rawItems) &&
        rawItems.length > 0
      ) {
        items.value = sortByMultilingualField(rawItems, sortField, descending);
      } else {
        items.value = rawItems;
      }
    } catch (error) {
      if (seq !== fetchSeq) return;
      logger.error("Failed to fetch data:", error);
      items.value = [];
    } finally {
      if (seq === fetchSeq) loading.value = false;
    }
  };

  // Event handlers
  const handleSearch = (value: string) => {
    searched.value = value;
    pagination.current = 1;
    refresh();
  };

  const handleSortChange = (value: string) => {
    sorted.value = value;
    refresh();
  };

  const handlePageChange = (page: number) => {
    pagination.current = page;
    refresh();
  };

  const handleViewChange = (mode: ViewMode) => {
    viewMode.value = mode;
  };

  const handleTagsChange = (tagIds: number[]) => {
    tags.value = tagIds;
    pagination.current = 1;
    refresh();
  };

  // Auto-load on mount
  if (immediate) {
    onMounted(refresh);
  }

  return {
    // State
    items,
    loading,
    sorted,
    searched,
    tags,
    pagination,
    viewMode,
    totalPages,

    // Methods
    refresh,
    handleSearch,
    handleSortChange,
    handlePageChange,
    handleViewChange,
    handleTagsChange,
  };
}
