/**
 * Prefab（预制体）相关类型定义
 */

import type { Author, FileInfo } from "./common";
import type { ResourceInfo } from "@/api/v1/resources/model";
import type { CyberType } from "./meta";

/** Prefab 数据 */
export interface PrefabData {
  id: number;
  author_id: number;
  info: Record<string, unknown> | null;
  data: string | null;
  image_id: number | null;
  uuid: string;
  events: string | null;
  title: string;
  prefab: number;
  image: FileInfo;
  resources: ResourceInfo[];
  editable: boolean;
  viewable: boolean;
  custome?: boolean;
  cyber?: CyberType;
  author?: Author;
}

/** 创建 Prefab 请求 */
export interface CreatePrefabRequest {
  title: string;
  image_id?: number;
  data?: string;
  info?: Record<string, unknown>;
  events?: string;
  prefab?: number;
  [key: string]: unknown;
}

/** 更新 Prefab 请求 */
export interface UpdatePrefabRequest extends Partial<CreatePrefabRequest> {
  id: number;
}
