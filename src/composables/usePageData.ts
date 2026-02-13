import { ref, reactive, computed, onMounted } from "vue";
import type { ViewMode } from "@/components/StandardPage/types";

export interface FetchParams {
  sort: string;
  search: string;
  page: number;
  tags?: number[];
  [key: string]: any;
}

export interface FetchResponse {
  data: any[];
  headers: any;
}

export interface UsePageDataOptions {
  fetchFn: (params: FetchParams) => Promise<FetchResponse>;
  defaultSort?: string;
  pageSize?: number;
  /** 是否自动在挂载时加载 */
  immediate?: boolean;
}

export function usePageData(options: UsePageDataOptions) {
  const {
    fetchFn,
    defaultSort = "-created_at",
    pageSize = 20,
    immediate = true,
  } = options;

  // Data state
  const items = ref<any[] | null>(null);
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

  // Fetch
  const refresh = async () => {
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

      // Parse pagination headers
      pagination.current = parseInt(
        response.headers["x-pagination-current-page"] || "1"
      );
      pagination.count = parseInt(
        response.headers["x-pagination-page-count"] || "1"
      );
      pagination.size = parseInt(
        response.headers["x-pagination-per-page"] || String(pageSize)
      );
      pagination.total = parseInt(
        response.headers["x-pagination-total-count"] || "0"
      );

      items.value = response.data || [];
    } catch (error) {
      console.error("Failed to fetch data:", error);
      items.value = [];
    } finally {
      loading.value = false;
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
