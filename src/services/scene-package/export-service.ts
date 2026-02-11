// 场景导出服务（简化版）
// 后端直接返回 ZIP 文件，前端仅需触发浏览器下载
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5

import { getVerseExportZip } from "@/api/v1/scene-package";

export interface ExportResult {
  success: boolean;
  error?: string;
}

/**
 * 从 Content-Disposition 响应头提取文件名。
 *
 * 支持 `filename="xxx.zip"` 和 `filename=xxx.zip` 两种格式。
 * 当 Content-Disposition 为空或不包含 filename 时，返回 `scene_{id}.zip` 格式的默认文件名。
 */
export function extractFilename(
  contentDisposition: string | undefined,
  fallbackId: number
): string {
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^";\s]+)"?/);
    if (match?.[1]) return match[1];
  }
  return `scene_${fallbackId}.zip`;
}

/**
 * 导出场景为 ZIP 文件并触发浏览器下载。
 *
 * 流程：
 * 1. 调用 getVerseExportZip 获取后端生成的 ZIP 二进制流
 * 2. 从 Content-Disposition 响应头提取文件名
 * 3. 使用原生 DOM API 触发浏览器下载
 */
export async function exportScene(verseId: number): Promise<ExportResult> {
  const response = await getVerseExportZip(verseId);
  const disposition = response.headers["content-disposition"];
  const filename = extractFilename(disposition, verseId);

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);

  return { success: true };
}
