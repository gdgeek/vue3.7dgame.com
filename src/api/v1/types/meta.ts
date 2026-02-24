/**
 * Meta（实体）相关类型定义
 */

import type { Author, FileInfo, JsonValue } from "./common";
import type { ResourceInfo } from "@/api/v1/resources/model";
import type { CyberType } from "./cyber";

/** Meta 代码 */
export interface MetaCode {
  blockly: string;
  lua?: string;
  js?: string;
}

/** 事件定义 */
export interface Events {
  inputs: EventInput[];
  outputs: EventOutput[];
}

/** 事件输入 */
export interface EventInput {
  name: string;
  type: string;
  [key: string]: unknown;
}

/** 事件输出 */
export interface EventOutput {
  name: string;
  type: string;
  [key: string]: unknown;
}

/** Meta 信息 */
export interface MetaInfo {
  id: number;
  author_id: number;
  info: string | null;
  data: JsonValue | null;
  created_at?: string;
  updated_at?: string;
  image_id: number | null;
  uuid: string;
  events: Events | null;
  title: string;
  name?: string;
  prefab: number;
  image: FileInfo;
  resources: ResourceInfo[];
  editable: boolean;
  viewable: boolean;
  custome?: boolean;
  cyber: CyberType;
  author?: Author;
  verseMetas: VerseMetaRelation[];
  metaCode?: MetaCode | null;
}

/** Verse-Meta 关联 */
export interface VerseMetaRelation {
  id: number;
  verse_id: number;
  meta_id: number;
  [key: string]: unknown;
}

/** 创建 Meta 请求 */
export interface CreateMetaRequest {
  title: string;
  image_id?: number | null;
  prefab?: number;
  data?: JsonValue | null;
  events?: Events | null;
  info?: string | null;
  uuid?: string; // 支持 uuid
  custom?: boolean; // 支持 custom 字段
  [key: string]: unknown; // 允许其他字段
}

/** 更新 Meta 请求 */
export interface UpdateMetaRequest {
  id?: number; // 可选，因为有时通过 URL 传递
  title?: string;
  image_id?: number | null;
  prefab?: number;
  data?: JsonValue | null;
  events?: Events | null;
  info?: string | null;
  uuid?: string;
  custom?: boolean;
  [key: string]: unknown;
}

/** Meta 列表查询参数 */
export interface MetaListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  prefab?: number;
  author_id?: number;
}

/** Meta 列表响应 */
export interface MetaListResponse {
  data: MetaInfo[];
  total: number;
  page: number;
  pageSize: number;
}
