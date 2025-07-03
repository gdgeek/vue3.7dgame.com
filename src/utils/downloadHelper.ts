/**
 * 通用文件下载工具
 */
import { ElMessage } from "element-plus";

export interface DownloadableResource {
  name: string;
  file: {
    url: string;
  };
}

/**
 * 下载资源文件到本地
 * @param resource 要下载的资源对象
 * @param fileExtension 文件扩展名，如 '.glb', '.mp3'等
 * @param t 国际化函数
 * @param translationPrefix 国际化前缀，如 'polygen.view.download'
 */
export async function downloadResource(
  resource: DownloadableResource,
  fileExtension: string,
  t: Function,
  translationPrefix: string
): Promise<void> {
  try {
    if (!resource || !resource.file) {
      ElMessage.error(t(`${translationPrefix}.error`));
      return;
    }

    const fileUrl = resource.file.url;

    // 确保文件名有正确的扩展名
    let fileName = resource.name || "download";
    if (!fileName.toLowerCase().endsWith(fileExtension)) {
      fileName += fileExtension;
    }

    // 使用fetch获取文件内容，然后使用blob创建下载
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    // 创建一个a标签用于下载
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;

    // 添加到页面，触发点击，然后移除
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 释放blob URL
    window.URL.revokeObjectURL(blobUrl);

    ElMessage.success(t(`${translationPrefix}.success`));
  } catch (error) {
    console.error(error);
    ElMessage.error(t(`${translationPrefix}.error`) + error);
  }
}
