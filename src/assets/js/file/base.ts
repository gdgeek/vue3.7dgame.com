import SparkMD5 from 'spark-md5';

// 添加 extension 属性
interface ExtendedFile extends File {
  extension?: string;
}

// 进度回调函数类型
type ProgressCallback = (percent: number) => void;

// 计算文件的 MD5 值
const fileMD5 = (file: ExtendedFile, progress: ProgressCallback = (p: number) => {}): Promise<string> => {
  return new Promise((resolve, reject) => {
    const spark = new SparkMD5(); 
    const reader = new FileReader();
    const blobSlice = (File.prototype as any).mozSlice || 
                      (File.prototype as any).webkitSlice || 
                      (File.prototype as any).slice;
    const chunkSize = 2097152; // 2MB
    const chunks = Math.ceil(file.size / chunkSize);
    let currentChunk = 0;

    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (e.target?.result) {
        spark.append(e.target.result as ArrayBuffer);
        currentChunk++;
        progress((currentChunk + 1) / chunks);
        if (currentChunk < chunks) {
          doLoad();
        } else {
          resolve(spark.end());
        }
      } else {
        reject(new Error('Failed to read file.'));
      }
    };

    const doLoad = () => {
      const start = currentChunk * chunkSize;
      const end = start + chunkSize >= file.size ? file.size : start + chunkSize;

      const chunk = blobSlice.call(file, start, end);
      reader.readAsArrayBuffer(chunk);
    };

    doLoad();
  });
};

// 打开文件选择对话框并返回选中的文件
const fileOpen = async (accept: string): Promise<ExtendedFile> => {
  return new Promise((resolve, reject) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;

      input.onchange = (e: Event) => {
        const fileInput = e.target as HTMLInputElement;
        if (fileInput.files?.length) {
          const file = fileInput.files[0] as ExtendedFile;
          const patternFileExtension = /\.([0-9a-z]+)(?:[\\?#]|$)/i;
          const extension = file.name.match(patternFileExtension);
          if (extension) {
            file.extension = extension[0];
          }
          resolve(file);
        } else {
          reject(new Error('No file selected.'));
        }
      };

      input.click();
    } catch (err) {
      alert(err);
      reject(err);
    }
  });
};

// 睡眠函数，延迟指定时间
const sleep = async (time: number): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

export { fileOpen, fileMD5, sleep };
