export interface FetchParams {
  sort: string;
  search: string;
  page: number;
  [key: string]: any; // Allow additional params
}

export interface FetchResponse {
  data: any[];
  headers: any; // Use any to be compatible with AxiosResponseHeaders
}

export interface Pagination {
  current: number;
  count: number;
  size: number;
  total: number;
}

export interface CardListPageProps {
  // Data fetching function
  fetchData: (params: FetchParams) => Promise<FetchResponse>;

  // Optional customization
  defaultSort?: string;
  pageSize?: number;
  cardWidth?: number;
  cardGutter?: number;

  // Feature flags
  showSkeleton?: boolean;
  showEmpty?: boolean;
  emptyText?: string;

  // Styling
  wrapperClass?: string;
}

export interface CardListPageEmits {
  (e: "refresh", data: any[]): void;
  (e: "item-click", item: any): void;
}
