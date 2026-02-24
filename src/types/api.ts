/**
 * 通用 API 分页和请求类型
 */

export type PaginationHeaderValue = string | number | undefined;

export interface FetchParams {
  sort: string;
  search: string;
  page: number;
  tags?: number[];
  [key: string]: unknown;
}

export interface FetchResponse<T = unknown> {
  data: T[];
  headers: Record<string, unknown>;
}

export interface Pagination {
  current: number;
  count: number;
  size: number;
  total: number;
}
