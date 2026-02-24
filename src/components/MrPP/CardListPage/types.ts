import type { FetchParams, FetchResponse, Pagination } from "@/types/api";

export type { FetchParams, FetchResponse, Pagination };

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
