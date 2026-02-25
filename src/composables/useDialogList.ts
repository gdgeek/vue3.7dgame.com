import { ref, type Ref } from "vue";

type Pagination = {
  current: number;
  count: number;
  size: number;
  total: number;
};

type ActiveState<T> = {
  items: T[];
  sorted: string;
  searched: string;
  pagination: Pagination;
};

const DEFAULT_PAGINATION: Pagination = {
  current: 1,
  count: 1,
  size: 20,
  total: 20,
};

/** 从响应头中解析 yii2 分页信息（x-pagination-* 头） */
export function parsePaginationHeaders(
  headers: Record<string, unknown>
): Pagination {
  return {
    current: parseInt(String(headers["x-pagination-current-page"] ?? "1")),
    count: parseInt(String(headers["x-pagination-page-count"] ?? "1")),
    size: parseInt(String(headers["x-pagination-per-page"] ?? "20")),
    total: parseInt(String(headers["x-pagination-total-count"] ?? "0")),
  };
}

// 使用宽松的返回类型以兼容 AxiosResponse（其 headers 不是 Record<string,string>）
export type DialogListFetchFn<T> = (
  sorted: string,
  searched: string,
  page: number
) => Promise<{ data: T[]; headers?: Record<string, unknown> }>;

/**
 * 为 MrPP 弹窗（MetaDialog / PrefabDialog / VerseDialog / ResourceDialog 等）
 * 提取公共的列表状态管理：搜索、排序、分页、弹窗可见性。
 *
 * @param fetchFn 异步数据获取函数，接收 (sorted, searched, page) 三个参数
 */
export function useDialogList<T>(
  fetchFn: (
    sorted: string,
    searched: string,
    page: number
  ) => Promise<{ data: T[]; headers?: Record<string, unknown> }>
) {
  const dialogVisible = ref(false);

  // 使用显式 Ref 类型规避 Vue 泛型 ref 的 UnwrapRefSimple 冲突
  const active = ref<ActiveState<T>>({
    items: [],
    sorted: "-created_at",
    searched: "",
    pagination: { ...DEFAULT_PAGINATION },
  }) as Ref<ActiveState<T>>;

  const refresh = async () => {
    const response = await fetchFn(
      active.value.sorted,
      active.value.searched,
      active.value.pagination.current
    );
    active.value.items = response.data;
    const h = response.headers;
    if (h?.["x-pagination-current-page"] !== undefined) {
      active.value.pagination = parsePaginationHeaders(h);
    }
  };

  const resetState = () => {
    active.value = {
      items: [],
      sorted: "-created_at",
      searched: "",
      pagination: { ...DEFAULT_PAGINATION },
    };
  };

  /** 重置状态并打开弹窗（可在组件 open() 中调用） */
  const openDialog = async () => {
    resetState();
    await refresh();
    dialogVisible.value = true;
  };

  const sort = (value: string) => {
    active.value.sorted = value;
    refresh();
  };

  const search = (value: string) => {
    active.value.searched = value;
    refresh();
  };

  const clearSearched = () => {
    active.value.searched = "";
    refresh();
  };

  const handleCurrentChange = (page: number) => {
    active.value.pagination.current = page;
    refresh();
  };

  return {
    dialogVisible,
    active,
    refresh,
    resetState,
    openDialog,
    sort,
    search,
    clearSearched,
    handleCurrentChange,
  };
}
