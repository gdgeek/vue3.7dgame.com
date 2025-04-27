import SparkMD5 from 'spark-md5';

// 文件对象类型
type FileWithExtension = File & { extension?: string };
function fileMD5(file: File, progress: (p: number) => void = () => {}): Promise<string> {
  return new Promise((resolve, reject) => {
   
    const spark = new (SparkMD5 as any).ArrayBuffer();
    const reader = new FileReader()
    const blobSlice = File.prototype.slice 
    const chunkSize = 2097152
    const chunks = Math.ceil(file.size / chunkSize)
    let currentChunk = 0

    reader.onload = function (e: ProgressEvent<FileReader>) {
      if (e.target?.result) {
        spark.append(e.target.result as ArrayBuffer)
      }
      currentChunk++
      progress((currentChunk + 1) / chunks)
      if (currentChunk < chunks) {
        doLoad()
      } else {
        resolve(spark.end())
      }
    }

    reader.onerror = function () {
      reject(new Error("File reading failed"))
    }

    function doLoad() {
      const start = currentChunk * chunkSize
      const end = start + chunkSize >= file.size ? file.size : start + chunkSize
      const chunk = blobSlice.call(file, start, end)
      reader.readAsArrayBuffer(chunk)
    }

    doLoad()
  })
}

// 打开文件选择对话框并返回选择的文件
const fileOpen = (accept: string, multiple = false): Promise<FileWithExtension[]> =>
  new Promise((resolve, reject) => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.multiple = multiple; // 启用多文件选择

      input.onchange = (e: Event) => {
        const files = Array.from((e.target as HTMLInputElement).files || []);
        if (files.length > 0) {
          // 为每个文件添加扩展名
          const processedFiles = files.map((file) => {
            const patternFileExtension = /\.([0-9a-z]+)(?:[\\?#]|$)/i;
            const extensionMatch = file.name.match(patternFileExtension);
            if (extensionMatch) {
              (file as FileWithExtension).extension = extensionMatch[1]; // 提取扩展名部分
            }
            return file as FileWithExtension;
          });
          resolve(processedFiles);
        } else {
          reject(new Error("No files selected"));
        }
      };

      input.click();
    } catch (err) {
      console.error(err);
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
