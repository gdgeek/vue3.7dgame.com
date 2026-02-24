export interface FetchParams {
  sort: string;
  search: string;
  page: number;
  [key: string]: unknown; // Allow additional params
}

type PaginationHeaderValue = string | number | undefined;

export interface FetchResponse<T = unknown> {
  data: T[];
  headers: Record<string, PaginationHeaderValue>;
}

export interface Pagination {
  current: number;
  count: number;
  size: number;
  total: number;
}

export interface CardListPageProps<T = unknown> {
  // Data fetching function
  fetchData: (params: FetchParams) => Promise<FetchResponse<T>>;

  // Optional customization
  defaultSort?: string;
  pageSize?: number;
  cardWidth?: number;
  cardGutter?: number;
  align?: "left" | "center" | "right";
  autoFill?: boolean; // 卡片自适应填充模式
  minCardWidth?: number; // 自适应模式下的最小卡片宽度

  // Feature flags
  showSkeleton?: boolean;
  showEmpty?: boolean;
  showHeader?: boolean; // New prop to control header visibility
  emptyText?: string;

  // Styling
  wrapperClass?: string;
}

export interface CardListPageEmits<T = unknown> {
  (e: "refresh", data: T[]): void;
  (e: "item-click", item: T): void;
}
