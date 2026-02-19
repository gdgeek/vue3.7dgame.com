// ===== PageActionBar =====
export interface PageActionBarProps {
  /** 页面标题, e.g. "所有音频素材" */
  title: string;
  /** 副标题, e.g. "从我们精心设计的示例开始…" */
  subtitle?: string;
  /** 搜索框占位符 */
  searchPlaceholder?: string;
  /** 是否显示搜索框 */
  showSearch?: boolean;
  /** 是否显示排序按钮 */
  showSort?: boolean;
  /** 是否显示视图切换 */
  showViewToggle?: boolean;
  /** 默认视图模式 */
  defaultView?: "grid" | "list";
  /** 默认排序 */
  defaultSort?: string;
  /** 排序字段名 – name */
  sortByName?: string;
  /** 排序字段名 – time */
  sortByTime?: string;
}

export type ViewMode = "grid" | "list";
export type SortDirection = string; // e.g. "-created_at", "name"

// ===== ViewContainer =====
export interface ViewContainerProps {
  items: any[] | null;
  viewMode: ViewMode;
  loading?: boolean;
  showEmpty?: boolean;
  emptyText?: string;
  /** 网格模式：卡片固定宽度 */
  cardWidth?: number;
  /** 网格模式：卡片间距 */
  cardGutter?: number;
  /** 自定义断点设置 */
  breakpoints?: Record<number, { rowPerView: number }>;
}

// ===== PagePagination =====
export interface PagePaginationProps {
  currentPage: number;
  totalPages: number;
}
