import COS from 'cos-js-sdk-v5';
import { token, store, cloud } from '@/api/v1/tencent-cloud';
import { fileMD5, fileOpen, sleep } from './base';
import path from "path-browserify";
import { FileHandler } from "./server"

// 文件处理程序类型
// type FileHandler = {
//   cos: COS; // COS 实例，用于进行 COS 操作
//   bucket: string; // 存储桶名称
//   region: string; // 区域
// }

// 文件信息类型
type FileInfo = {
  bucket: {
    bucket: string; 
    region: string; 
  };
  path: string; 
  root: string; 
}

// 进度回调函数类型
interface ProgressCallback {
  (percent: number): void; // 进度百分比
}

// 获取公共处理程序
const publicHandler = async (): Promise<FileHandler> => {
 
  const response = await cloud();
  return fileHandler(response.data.public.bucket, response.data.public.region);
};

// 获取私有处理程序
const privateHandler = async (): Promise<FileHandler> => {
  const response = await cloud();
  return fileHandler(response.data.private.bucket, response.data.private.region);
};

// 获取原始处理程序
const rawHandler = async (): Promise<FileHandler> => {
  const response = await store();
  return fileHandler(response.data.raw.bucket, response.data.raw.region);
};

// 创建文件处理程序
const fileHandler = async (bucket: string, region: string): Promise<FileHandler> => {
  return new Promise<FileHandler>(async (resolve, reject) => {
    try {
      const cos = new COS({
        // 获取授权信息
        getAuthorization: async (options, callback) => {
          try {
            const response = await token(bucket, region);
            const data = response.data;
            const credentials = data?.Credentials;

            if (!data || !credentials) {
              reject('credentials invalid');
              return;
            }

            // 调用回调函数，传递授权信息
            callback({
              TmpSecretId: credentials.TmpSecretId,
              TmpSecretKey: credentials.TmpSecretKey,
              SecurityToken: credentials.Token,
              StartTime: data.StartTime,
              ExpiredTime: data.ExpiredTime,
            });
          } catch (error) {
            reject(error);
          }
        },
      });

      resolve({ cos, bucket, region });
    } catch (error) {
      reject(error);
    }
  });
};

// 文件处理逻辑，包括检查、下载和处理超时
const fileProcess = async (
  md5: string,
  extension: string,
  progress: ProgressCallback,
  handler: FileHandler,
  dir = '',
  time = 1000
): Promise<any> => {
  return new Promise<any>(async (resolve, reject) => {
    try {
      const start = Date.now();

      // 循环检查文件是否存在
      do {
        const has = await fileHas(md5, extension, handler, dir);

        if (!has) {
          progress((Date.now() - start) / (2 * time)); // 更新进度
          await sleep(500); // 等待 500 毫秒
        } else {
          const data = await fileDownload(
            md5,
            extension,
            (p) => progress((1 + p) / 2), // 更新下载进度
            handler,
            dir
          );
          progress(1); // 完成进度
          resolve(data);
          return;
        }
      } while (Date.now() < start + time); // 超过时间限制

      throw new Error('处理超时！'); // 抛出超时错误
    } catch (error) {
      reject(error);
    }
  });
};

// 文件下载
const fileDownload = async (
  name: string,
  extension: string,
  progress: ProgressCallback,
  handler: FileHandler,
  dir = ''
): Promise<any> => {
  const filename = path.join(dir, name + extension);

  return new Promise<any>(async (resolve, reject) => {
    try {
      const data = await handler.cos.getObject({
        Bucket: handler.bucket,
        Region: handler.region,
        Key: filename,
        onProgress: (progressData: { percent: number; }) => {
          progress(progressData.percent); // 更新进度
        },
      });

      resolve(JSON.parse(data.Body as string)); // 解析并返回文件内容
    } catch (error) {
      reject(error);
    }
  });
};

// 文件上传
const fileUpload = async (
  md5: string,
  extension: string,
  file: File,
  progress: ProgressCallback,
  handler: FileHandler,
  dir = ''
): Promise<any> => {
  const filename = path.join(dir, md5 + extension);


  return new Promise<any>(async (resolve, reject) => {
    try {
      const data = await handler.cos.uploadFile({
        Bucket: handler.bucket,
        Region: handler.region,
        Key: filename,
        Body: file,
        onHashProgress: (progressData: any) => {
          console.log('校验中', JSON.stringify(progressData)); // 校验进度
        },
        onProgress: (progressData: { percent: number; }) => {
          progress(progressData.percent); // 上传进度
          console.log('上传中', JSON.stringify(progressData));
        },
      });

      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
};

// 获取文件 URL
const getUrl = (info: FileInfo, file: { md5: string; ext: string }, handler: FileHandler): string => {
  return handler.cos.getObjectUrl(
    {
      Bucket: info.bucket.bucket,
      Region: info.bucket.region,
      Key: path.join(info.path, info.root, file.md5 + file.ext),
      Expires: 60,
      Sign: true,
    },
    (err: any, data: { Url: string; }) => {
      console.log(err || (data && data.Url));
    }
  );
};

// 文件 URL
const fileUrl = (md5: string, extension: string, handler: FileHandler, dir = ''): string => {
  const filename = path.join(dir, md5 + extension);

  return handler.cos.getObjectUrl(
    {
      Bucket: handler.bucket,
      Region: handler.region,
      Key: filename,
      Expires: 60,
      Sign: true,
    },
    (err: any, data: { Url: any; }) => {
      console.log(err || (data && data.Url));
    }
  );
};

// 检查文件是否存在
const fileHas = async (md5: string, extension: string, handler: FileHandler, dir = ''): Promise<boolean> => {
  const filename = path.join(dir, md5 + extension);

  return new Promise<boolean>(async (resolve, reject) => {
    try {
      await handler.cos.headObject({
        Bucket: handler.bucket,
        Region: handler.region,
        Key: filename,
      });

      resolve(true); // 文件存在
    } catch (error) {
      resolve(false); // 文件不存在
    }
  });
};

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
  getUrl,
};
