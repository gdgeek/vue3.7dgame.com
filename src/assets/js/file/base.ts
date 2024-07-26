import SparkMD5 from 'spark-md5';

// 文件对象类型
type FileWithExtension = File & { extension?: string };

// 计算文件的 MD5 值
const fileMD5 = (file: File, progress: (p: number) => void = (p: number) => {}): Promise<string> =>
  new Promise((resolve, reject) => {
    const spark = new SparkMD5();
    const reader = new FileReader();
    const chunkSize = 2097152; // 每个块的大小为2MB
    const chunks = Math.ceil(file.size / chunkSize); // 总块数
    let currentChunk = 0;

    reader.onload = (e: ProgressEvent<FileReader>) => {
      spark.append(e.target!.result as ArrayBuffer);
      currentChunk++;
      progress((currentChunk + 1) / chunks); // 更新进度
      if (currentChunk < chunks) {
        doLoad();
      } else {
        resolve(spark.end()); // 计算完成后返回MD5值
      }
    };

    const doLoad = () => {
      const start = currentChunk * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end); // 读取文件块
      reader.readAsArrayBuffer(chunk);
    };

    doLoad();
  });

// 打开文件选择对话框并返回选择的文件
const fileOpen = (accept: string): Promise<FileWithExtension> =>
  new Promise((resolve, reject) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;

      input.onchange = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const patternFileExtension = /\.([0-9a-z]+)(?:[\\?#]|$)/i;
          const extensionMatch = file.name.match(patternFileExtension);
          if (extensionMatch) {
            (file as FileWithExtension).extension = extensionMatch[0];
          }
          resolve(file as FileWithExtension);
        } else {
          reject(new Error('No file selected')); 
        }
      };

      input.click();
    } catch (err) {
      alert(err);
      reject(err); 
    }
  });

// 延迟函数
const sleep = (time: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, time);
  });

export { fileOpen, fileMD5, sleep };
