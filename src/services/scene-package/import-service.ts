// 场景导入服务（简化版）
// Requirements: 3.1, 3.2, 3.3, 3.4, 3.5

import { postVerseImportZip } from "@/api/v1/scene-package";

export interface ImportResult {
  success: boolean;
  verseId: number;
  error?: string;
}

/**
 * 导入场景包 ZIP 文件。
 */
export async function importScene(file: File): Promise<ImportResult> {
  try {
    const response = await postVerseImportZip(file);
    return {
      success: true,
      verseId: response.data.verseId,
    };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "导入失败，请重试";
    return {
      success: false,
      verseId: 0,
      error: errorMessage,
    };
  }
}
