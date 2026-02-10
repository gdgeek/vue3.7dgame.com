// 场景导出/导入 API 模块
// 后端 API 路径：/v1/scene-package/verses/...
// 文档：docs/scene-package-api.md

import axios from "axios";

import request from "@/utils/request";
import env from "@/environment";
import Token from "@/store/modules/token";

// ---- 类型定义 ----

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

/** 场景代码 */
export interface VerseCode {
  blockly?: string;
  lua?: string;
  js?: string;
}

/** Meta 代码 */
export interface MetaCode {
  blockly?: string;
  lua?: string;
}

/** 导出的 Resource */
export interface ExportResource {
  id: number;
  uuid: string;
  name: string;
  type: string;
  info: string;
  created_at: string;
  file: FileInfo;
}

/** 导出的 Meta */
export interface ExportMeta {
  id: number;
  author_id: number;
  uuid: string;
  title: string;
  data: Record<string, unknown> | null;
  events: Record<string, unknown> | null;
  image_id: number | null;
  image: FileInfo | null;
  prefab: number;
  resources: ExportResource[];
  editable: boolean;
  viewable: boolean;
  metaCode: MetaCode | null;
}

/** 导出的 Verse */
export interface ExportVerse {
  id: number;
  author_id: number;
  name: string;
  description: string | null;
  info: Record<string, unknown> | null;
  data: Record<string, unknown>;
  uuid: string;
  version: number;
  verseRelease: unknown | null;
  image: FileInfo | null;
  verseCode: VerseCode | null;
}

/** Meta-Resource 关联 */
export interface MetaResourceLink {
  meta_id: number;
  resource_id: number;
}

/** JSON 导出完整响应 (Scene_Data_Tree) */
export interface SceneExportData {
  verse: ExportVerse;
  metas: ExportMeta[];
  resources: ExportResource[];
  metaResourceLinks: MetaResourceLink[];
}

/** 导入请求中的 Resource 文件映射 */
export interface ResourceFileMapping {
  originalUuid: string;
  fileId: number;
  name: string;
  type: string;
  info: string;
}

/** 导入请求中的 Meta */
export interface ImportMeta {
  title: string;
  uuid: string;
  data?: Record<string, unknown>;
  events?: Record<string, unknown>;
  prefab?: number;
  resourceFileIds?: number[];
  metaCode?: MetaCode;
}

/** 导入请求中的 Verse */
export interface ImportVerse {
  name: string;
  data: Record<string, unknown>;
  uuid: string;
  version: number;
  description?: string;
  verseCode?: VerseCode;
}

/** JSON 导入请求体 */
export interface SceneImportPayload {
  verse: ImportVerse;
  metas?: ImportMeta[];
  resourceFileMappings?: ResourceFileMapping[];
}

/** 导入响应 */
export interface VerseImportResponse {
  verseId: number;
  metaIdMap: Record<string, number>;
  resourceIdMap: Record<string, number>;
}

// ---- API 函数 ----

/** JSON 格式导出（返回 Scene_Data_Tree） */
export const getVerseExportJson = (verseId: number) => {
  return request<SceneExportData>({
    url: `/v1/scene-package/verses/${verseId}/export`,
    method: "get",
  });
};

/** ZIP 格式导出（返回 Blob），使用原生 axios 以支持 blob 响应 */
export const getVerseExportZip = (verseId: number) => {
  const token = Token.getToken();
  return axios.get(`${env.api}/v1/scene-package/verses/${verseId}/export-zip`, {
    headers: {
      Accept: "application/zip",
      Authorization: token ? `Bearer ${token.accessToken}` : "",
    },
    responseType: "blob",
    timeout: 120000,
  });
};

/** JSON 格式导入 */
export const postVerseImportJson = (payload: SceneImportPayload) => {
  return request<VerseImportResponse>({
    url: `/v1/scene-package/verses/import`,
    method: "post",
    data: payload,
  });
};

/** ZIP 文件导入（multipart/form-data） */
export const postVerseImportZip = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return request<VerseImportResponse>({
    url: `/v1/scene-package/verses/import-zip`,
    method: "post",
    data: formData,
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
  });
};
