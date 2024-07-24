import { fileMD5, fileOpen, sleep } from './base';
import env from '@/environment';
import axios from 'axios';
import { uploadFile } from '@/api/v1/upload';
import path from 'path-browserify';

// 文件处理程序类型
export type FileHandler = {
  bucket: string;
  region?: string; // 如果需要 region 属性
  cos?: any; // 如果需要 cos 属性
};


// 文件信息类型
type FileInfo = {
  bucket: string;
}

// 进度回调函数类型
type ProgressCallback = (percent: number) => void;

// 生成文件 URL
const fileUrl = (name: string, extension: string, handler: FileHandler | null = null, dir: string = ''): string => {
  const filename = name + extension;
  const url = `${env.api}/${path.join('storage', handler?.bucket || '', dir, filename)}`;
  return url;
};

// 检查文件是否存在
const fileHas = (name: string, extension: string, handler: FileHandler | null = null, dir: string = ''): Promise<boolean> => {
  return new Promise((resolve) => {
    axios.head(env.replaceIP(fileUrl(name, extension, handler, dir)))
      .then(() => resolve(true))
      .catch(() => resolve(false));
  });
};

// 获取公共处理程序
const publicHandler = async (): Promise<FileHandler> => fileHandler('store');

// 获取私有处理程序
const privateHandler = async (): Promise<FileHandler> => fileHandler('raw');

// 创建文件处理程序
const fileHandler = (bucket: string): Promise<FileHandler> => new Promise((resolve) => resolve({ bucket }));

// 实际的文件更新实现
const fileUpdateImpl = async (
  md5: string,
  extension: string,
  file: File,
  progress: ProgressCallback,
  handler: FileHandler,
  dir: string,
  skip: number
): Promise<any> => {
  const filename = md5 + extension;
  const data = new FormData();
  const blockSize = 1048576; // 每块大小
  const nextSize = Math.min((skip + 1) * blockSize, file.size); // 读取到结束位置
  const fileData = file.slice(skip * blockSize, nextSize); // 截取部分文件块

  data.append('file', fileData);
  data.append('filename', filename);
  data.append('md5', md5);
  data.append('skip', skip.toString());
  data.append('block_size', blockSize.toString());
  data.append('upload_size', nextSize.toString());
  data.append('size', file.size.toString());
  data.append('directory', dir);
  data.append('bucket', handler.bucket);

  try {
    const response = await uploadFile(data);
    if (file.size <= nextSize) {
      progress(1);
      return response;
    } else {
      progress(nextSize / file.size);
      return fileUpdateImpl(md5, extension, file, progress, handler, dir, ++skip);
    }
  } catch (e) {
    throw e;
  }
};

// 文件上传
const fileUpload = (
  md5: string,
  extension: string,
  file: File,
  progress: ProgressCallback,
  handler: FileHandler,
  dir: string = ''
): Promise<any> => fileUpdateImpl(md5, extension, file, progress, handler, dir, 0);

// 获取文件 URL (示例方法，没有实际实现)
const getUrl = (info: FileInfo, file: { md5: string; ext: string }, handler: FileHandler): string => {
  return ''; // 需要实现 URL 生成逻辑
};

// 文件下载
const fileDownload = async (
  name: string,
  extension: string,
  progress: ProgressCallback,
  handler: FileHandler,
  dir: string = ''
): Promise<any> => {
  try {
    const url = fileUrl(name, extension, handler, dir);
    const response = await axios.get(env.replaceIP(url), { responseType: 'arraybuffer' });
    // 根据实际需要处理下载的文件数据
    return response.data;
  } catch (err) {
    return null;
  }
};

// 文件处理
const fileProcess = async (
  md5: string,
  extension: string,
  progress: ProgressCallback,
  handler: FileHandler,
  dir: string = '',
  time: number = 1000
): Promise<any> => {
  const start = Date.now();
  while (Date.now() < start + time) {
    console.log(handler);
    const has = await fileHas(md5, extension, handler, dir);

    if (!has) {
      progress((Date.now() - start) / (2 * time));
      await sleep(500);
    } else {
      const file = await fileDownload(
        md5,
        extension,
        (p) => progress((1 + p) / 2),
        handler,
        dir
      );
      progress(1);
      return file;
    }
  }
  throw new Error('处理超时！');
}

export default {
  fileMD5,
  fileOpen,
  fileHas,
  fileUrl,
  fileUpload,
  fileProcess,
  fileDownload,
  publicHandler,
  privateHandler,
  getUrl
};
