// 场景导出/导入 API 模块（重构版）
// 后端 API 路径：/v1/scene-package/verses/...
// Requirements: 1.1, 1.2, 1.3

import axios from "axios";

import request from "@/utils/request";
import env from "@/environment";
import Token from "@/store/modules/token";

// ---- 导入响应类型 ----

export interface VerseImportResponse {
  verseId: number;
  metaIdMap: Record<string, number>;
  resourceIdMap: Record<string, number>;
}

// ---- API 函数 ----

/** ZIP 格式导出（返回 Blob），使用原生 axios 以支持 blob 响应 */
export const getVerseExportZip = (verseId: number) => {
  const token = Token.getToken();
  return axios.get(`${env.api}/v1/scene-package/verses/${verseId}/export`, {
    headers: {
      Accept: "application/zip",
      Authorization: token ? `Bearer ${token.accessToken}` : "",
    },
    responseType: "blob",
    timeout: 120000,
  });
};

/** ZIP 文件导入（multipart/form-data） */
export const postVerseImportZip = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return request<VerseImportResponse>({
    url: `/v1/scene-package/verses/import`,
    method: "post",
    data: formData,
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
  });
};
