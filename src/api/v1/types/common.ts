/**
 * 通用类型定义
 */

/** 作者/用户信息 */
export interface Author {
  id: number;
  nickname: string;
  email: string | null;
  username: string;
  avatar?: string;
}

/** 分页参数 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/** 分页响应 */
export interface PaginationResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 通用响应 */
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  code?: number;
}

/** 通用删除响应 */
export interface DeleteResponse {
  message: string;
}

/** 文件信息 */
export interface FileInfo {
  id: number;
  md5: string;
  type: string;
  url: string;
  filename: string;
  size: number;
  key: string;
}
