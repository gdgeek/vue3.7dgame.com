/**
 * Verse（场景）相关类型定义
 */

import type { Author, JsonValue } from "./common";
import type { MetaInfo as MetaInfoFull } from "./meta";

/** 图片详情 */
export interface ImageDetails {
  id: number;
  md5: string;
  type: string;
  url: string;
  filename: string;
  size: number;
  key: string;
}

/** 场景发布信息 */
export interface VerseRelease {
  id: number;
  code: string;
}

/** 场景分享信息 */
export interface VerseShare {
  id: number;
  verse_id: number;
  info: string;
  editable: 1 | 0;
  user: Author;
}

/** 多语言信息 */
export interface VerseLanguage {
  id: number;
  verse_id: number;
  language: string;
  name: string;
  description: string;
}

/** 场景代码 */
export interface VerseCode {
  blockly: string;
  lua?: string;
  js?: string;
}

/** 脚本信息 */
export interface Script {
  id: number;
  created_at: string;
  verse_id: number;
  script: string;
  title: string;
  uuid: string;
  workspace: string;
}

/** Meta 信息（复用 Meta 类型） */
export type MetaInfo = MetaInfoFull;

/** 标签 */
export interface VerseTag {
  id: number;
  name: string;
  type?: string;
}

/** 场景数据 */
export interface VerseData {
  id: number;
  author_id: number;
  created_at?: string;
  name: string;
  info: string | null;
  description: string | null;
  public?: boolean;
  data: JsonValue; // 场景配置数据
  version: number;
  uuid: string;
  editable: boolean;
  viewable: boolean;
  verseRelease: VerseRelease | null;
  verseShare?: VerseShare;
  image: ImageDetails;
  image_id?: number;
  author?: Author;
  languages?: VerseLanguage[];
  metas?: MetaInfo[];
  script?: Script;
  verseCode?: VerseCode | null;
  verseTags?: VerseTag[];
  tags?: VerseTag[];
  updated_at?: string;
}

/** 创建/更新场景请求 */
export interface PostVerseData {
  image_id?: number;
  description: string;
  name: string;
  uuid: string;
  version?: number;
}

/** 更新场景请求（部分字段） */
export interface PutVerseData {
  image_id?: number;
  description?: string;
  name?: string;
  uuid?: string;
  version?: number;
  data?: string | JsonValue;
}

/** 场景列表查询参数 */
export interface VerseListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  public?: boolean;
  author_id?: number;
}

/** 场景列表响应 */
export interface VerseListResponse {
  data: VerseData[];
  total: number;
  page: number;
  pageSize: number;
}

/** 场景详情响应 */
export interface VerseDetailResponse {
  data: VerseData;
}

/** 场景创建响应 */
export interface VerseCreateResponse {
  data: VerseData;
  message?: string;
}

/** 场景更新响应 */
export interface VerseUpdateResponse {
  data: VerseData;
  message?: string;
}

/** 场景删除响应 */
export interface VerseDeleteResponse {
  message: string;
}
