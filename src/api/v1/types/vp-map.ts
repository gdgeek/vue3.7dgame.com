/**
 * VP Map 相关类型定义
 */

export interface VpMapGuide {
  id: number;
  order: number;
  level_id: number;
  level?: {
    id?: number;
    name?: string;
  };
  [key: string]: unknown;
}

export interface VpMap {
  id: number;
  page: number;
  guides: VpMapGuide[];
  [key: string]: unknown;
}

export interface CreateVpMapRequest {
  page: number;
}
