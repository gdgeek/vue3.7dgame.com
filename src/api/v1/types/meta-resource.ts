/**
 * Meta Resource 相关类型定义
 */

import type { ResourceInfo } from "../resources/model";

export interface MetaResourceItem {
  id: number;
  meta_id: number;
  resource_id: number;
  type: string;
  created_at?: string;
  resource?: ResourceInfo;
  [key: string]: unknown;
}

export interface CreateMetaResourceRequest {
  meta_id: number | string;
  resource_id?: number;
  type: string;
  info?: string;
  [key: string]: unknown;
}

export type UpdateMetaResourceRequest = Partial<CreateMetaResourceRequest>;
